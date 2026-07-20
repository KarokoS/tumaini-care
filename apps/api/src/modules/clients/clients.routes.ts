import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getAllClients, getClientById, createClient, updateClient, getClientTimeline } from './clients.service'
import { requireRole, JWTPayload } from '../../shared/middleware/rbac'
import { logAction } from '../../shared/middleware/audit'
import { sendWelcomeSMS } from '../../shared/sms'

const createClientSchema = z.object({
  fullName:     z.string().min(2),
  dob:          z.string(),
  gender:       z.string(),
  diagnosis:    z.string().optional(),
  coOccurring:  z.string().optional(),
  allergies:    z.string().optional(),
  referralSrc:  z.string().optional(),
  schoolName:   z.string().optional(),
  guardian: z.object({
    fullName:     z.string().min(2),
    relationship: z.string(),
    phone:        z.string().min(10),
    email:        z.string().email().optional()
  })
})

export async function clientRoutes(fastify: FastifyInstance) {

  // ── Get all clients ──
  fastify.get('/clients', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST')
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { q } = request.query as { q?: string }
    const clients = await getAllClients(user.branchId, q)
    await logAction(request, 'READ', 'Client', 'all')
    return reply.send(clients)
  })

  // ── Get single client ──
  fastify.get('/clients/:id', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const client = await getClientById(id)
    await logAction(request, 'READ', 'Client', id)
    return reply.send(client)
  })

  // ── Create client ──
  fastify.post('/clients', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = createClientSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(422).send({ error: 'Validation failed', details: body.error.errors })
    }

    const client = await createClient({ ...body.data, branchId: user.branchId })
    await logAction(request, 'CREATE', 'Client', client.id)

    // Send welcome SMS to primary guardian
    try {
      const guardian = (client as any).guardians?.[0]
      if (guardian?.phone) {
        await sendWelcomeSMS(
          guardian.phone,
          guardian.fullName,
          client.fullName
        )
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Welcome SMS failed')
    }

    return reply.status(201).send(client)
  })

  // ── Update client ──
  fastify.patch('/clients/:id', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const client = await updateClient(id, request.body as Record<string, any>)
    await logAction(request, 'UPDATE', 'Client', id)
    return reply.send(client)
  })

  // ── Update client status ──
  fastify.patch('/clients/:id/status', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { id }     = request.params as { id: string }
    const { status } = request.body as { status: string }
    const { prisma } = await import('../../shared/prisma')
    const client = await prisma.client.update({ where: { id }, data: { status } })
    await logAction(request, 'UPDATE', 'Client', id)
    return reply.send(client)
  })

  // ── Client timeline ──
  fastify.get('/clients/:id/timeline', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST')
  }, async (request, reply) => {
    const { id }   = request.params as { id: string }
    const timeline = await getClientTimeline(id)
    return reply.send(timeline)
  })

  // ── Delete client ──
  fastify.delete('/clients/:id', {
    preHandler: requireRole('SUPER_ADMIN')
  }, async (request, reply) => {
    const { id }     = request.params as { id: string }
    const { prisma } = await import('../../shared/prisma')

    await prisma.guardian.deleteMany({ where: { clientId: id } })
    await prisma.document.deleteMany({ where: { clientId: id } })

    const sessionNotes = await prisma.sessionNote.findMany({
      where: { appointment: { clientId: id } },
      select: { id: true }
    })
    await prisma.document.deleteMany({
      where: { sessionNoteId: { in: sessionNotes.map(s => s.id) } }
    })
    await prisma.sessionNote.deleteMany({
      where: { appointment: { clientId: id } }
    })
    await prisma.appointment.deleteMany({ where: { clientId: id } })

    const itps = await prisma.iTP.findMany({
      where: { clientId: id }, select: { id: true }
    })
    await prisma.goalProgressLog.deleteMany({
      where: { goal: { itpId: { in: itps.map(i => i.id) } } }
    })
    await prisma.goal.deleteMany({
      where: { itpId: { in: itps.map(i => i.id) } }
    })
    await prisma.iTP.deleteMany({ where: { clientId: id } })

    const invoices = await prisma.invoice.findMany({
      where: { clientId: id }, select: { id: true }
    })
    await prisma.payment.deleteMany({
      where: { invoiceId: { in: invoices.map(i => i.id) } }
    })
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: { in: invoices.map(i => i.id) } }
    })
    await prisma.invoice.deleteMany({ where: { clientId: id } })

    await prisma.assessment.deleteMany({ where: { clientId: id } })
    await prisma.client.delete({ where: { id } })

    await logAction(request, 'DELETE', 'Client', id)
    return reply.send({ success: true })
  })

  // ── Bulk import ──
  fastify.post('/clients/bulk-import', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { clients } = request.body as { clients: any[] }
    const { prisma }  = await import('../../shared/prisma')

    if (!Array.isArray(clients) || clients.length === 0) {
      return reply.status(422).send({ message: 'No clients provided' })
    }

    let imported     = 0
    let skipped      = 0
    const errors: string[] = []

    for (const row of clients) {
      try {
        if (row.clientId) {
          const existing = await prisma.client.findUnique({
            where: { externalId: row.clientId }
          })
          if (existing) { skipped++; continue }
        }

        const dobDate = row.dob ? new Date(row.dob) : new Date()
        const regDate = row.registrationDate ? new Date(row.registrationDate) : new Date()

        await prisma.client.create({
          data: {
            fullName:         row.fullName,
            dob:              dobDate,
            gender:           row.gender,
            diagnosis:        row.diagnosis || null,
            status:           'ACTIVE',
            externalId:       row.clientId || null,
            registrationDate: regDate,
            branchId:         user.branchId,
            guardians: {
              create: {
                fullName:     row.guardianName,
                relationship: row.relationship || 'Parent',
                phone:        row.phone,
                email:        row.email || null,
                isPrimary:    true,
              }
            }
          }
        })
        imported++
      } catch (err: any) {
        errors.push(`${row.fullName || 'Unknown'}: ${err.message}`)
      }
    }

    await logAction(request, 'CREATE', 'Client', `bulk-import-${imported}`)
    return reply.send({ imported, skipped, errors })
  })

  // ── Session frequency alerts ──
  fastify.get('/clients/alerts/missing-sessions', {
    preHandler: requireRole('SUPER_ADMIN','MANAGER','THERAPIST','RECEPTIONIST','FINANCE')
  }, async (request, reply) => {
    const user      = request.user as JWTPayload
    const { prisma } = await import('../../shared/prisma')
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    // Get all active clients
    const clients = await prisma.client.findMany({
      where: { branchId: user.branchId, status: 'ACTIVE' },
      include: {
        guardians: { where: { isPrimary: true }, select: { fullName: true, phone: true } },
        appointments: {
          where: {
            status: { in: ['COMPLETED', 'SCHEDULED', 'CONFIRMED'] },
            scheduledAt: { gte: twoWeeksAgo }
          },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          include: { therapist: { select: { fullName: true } } }
        },
        itps: {
          where: { status: 'ACTIVE' },
          select: { id: true },
          take: 1
        }
      },
      orderBy: { fullName: 'asc' }
    })

    // Find clients with no recent activity
    const missing = clients
      .filter(c => c.appointments.length === 0)
      .map(c => {
        // Find their last appointment ever
        return {
          id:           c.id,
          fullName:     c.fullName,
          guardian:     c.guardians[0] ?? null,
          hasActivePlan: c.itps.length > 0,
          isProBono:    (c as any).isProBono ?? false,
        }
      })

    // Also get last appointment date for each missing client
    const missingWithLastAppt = await Promise.all(
      missing.map(async c => {
        const last = await prisma.appointment.findFirst({
          where:   { clientId: c.id },
          orderBy: { scheduledAt: 'desc' },
          select:  { scheduledAt: true, status: true, therapyType: true, therapist: { select: { fullName: true } } }
        })
        const daysSince = last
          ? Math.floor((new Date().getTime() - new Date(last.scheduledAt).getTime()) / (1000*60*60*24))
          : null
        return { ...c, lastAppointment: last, daysSince }
      })
    )

    return reply.send({
      count:   missingWithLastAppt.length,
      clients: missingWithLastAppt.sort((a,b) => (b.daysSince??999) - (a.daysSince??999))
    })
  })
  // ── Client progress data for charts ──
  fastify.get('/clients/:id/progress', {
    preHandler: requireRole('SUPER_ADMIN','MANAGER','THERAPIST','RECEPTIONIST')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { prisma } = await import('../../shared/prisma')

    // Get all appointments
    const appointments = await prisma.appointment.findMany({
      where:   { clientId: id },
      orderBy: { scheduledAt: 'asc' },
      select:  { scheduledAt: true, status: true, therapyType: true }
    })

    // Get all ITPs with goals and progress logs
    const itps = await prisma.iTP.findMany({
      where:   { clientId: id },
      include: {
        goals: {
  include: {
    progressLogs: {
      orderBy: { loggedAt: 'asc' },
      select:  { loggedAt: true, pct: true, note: true }
    }
  }
}
      },
      orderBy: { createdAt: 'asc' }
    })

    // Build monthly attendance summary
    const monthlyAttendance: Record<string, { attended: number; missed: number; cancelled: number }> = {}
    appointments.forEach(a => {
      const key = new Date(a.scheduledAt).toLocaleDateString('en-KE', { month:'short', year:'numeric' })
      if (!monthlyAttendance[key]) monthlyAttendance[key] = { attended:0, missed:0, cancelled:0 }
      if (a.status === 'COMPLETED')                         monthlyAttendance[key].attended++
      else if (a.status === 'NO_SHOW')                      monthlyAttendance[key].missed++
      else if (a.status === 'CANCELLED')                    monthlyAttendance[key].cancelled++
    })

    // Build goal progress timeline
    const goals = itps.flatMap(itp => itp.goals.map(g => ({
      id:           g.id,
      title:        g.title,
      currentPct:   g.progressPct,
      isAchieved:   g.isAchieved,
      logs: g.progressLogs.map(l => ({
  date:        l.loggedAt,
  progressPct: (l as any).pct,
  note:        l.note,
}))
    })))

    // Summary stats
    const completed  = appointments.filter(a => a.status === 'COMPLETED').length
    const total      = appointments.length
    const noShows    = appointments.filter(a => a.status === 'NO_SHOW').length
    const attendRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return reply.send({
      monthlyAttendance,
      goals,
      summary: {
        totalSessions:    total,
        completedSessions: completed,
        missedSessions:   noShows,
        attendanceRate:   attendRate,
        goalsTotal:       goals.length,
        goalsAchieved:    goals.filter(g => g.isAchieved).length,
      }
    })
  })
}