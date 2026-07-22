import { FastifyInstance } from 'fastify'
import { prisma } from '../../shared/prisma'
import { requireRole, JWTPayload } from '../../shared/middleware/rbac'
import { generateRecurringDates } from '../../shared/holidays'
import { randomUUID } from 'crypto'
import {
  sendAppointmentConfirmation,
  sendSessionCompleted,
} from '../../shared/sms'

export async function appointmentRoutes(fastify: FastifyInstance) {

  // ── Get all appointments ──
  fastify.get('/appointments', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST')
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { from, to } = request.query as { from?: string; to?: string }

    const appointments = await prisma.appointment.findMany({
      where: {
        client: { branchId: user.branchId },
        ...(from && to && {
          scheduledAt: { gte: new Date(from), lte: new Date(to) }
        })
      },
      include: {
        client:      { select: { id: true, fullName: true } },
        therapist:   { select: { id: true, fullName: true } },
        sessionNote: { select: { id: true, isLocked: true, subjective: true, objective: true, assessment: true, plan: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })
    return reply.send(appointments)
  })

  // ── Create single appointment ──
  fastify.post('/appointments', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'THERAPIST')
  }, async (request, reply) => {
    const body = request.body as any

    const appointment = await prisma.appointment.create({
      data: {
        clientId:    body.clientId,
        therapistId: body.therapistId || null,
        therapyType: body.therapyType,
        scheduledAt: new Date(body.scheduledAt),
        durationMin: body.durationMin ?? 50,
        notes:       body.notes ?? '',
        status:      'SCHEDULED',
      },
      include: {
        client:    { select: { id: true, fullName: true } },
        therapist: { select: { id: true, fullName: true } },
      },
    })

    // Send SMS confirmation to guardian
    try {
      const guardian = await prisma.guardian.findFirst({
        where: { clientId: body.clientId, isPrimary: true }
      })
      if (guardian?.phone && appointment.client?.fullName) {
        await sendAppointmentConfirmation(
          guardian.phone,
          appointment.client.fullName,
          appointment.therapyType,
          new Date(appointment.scheduledAt),
          appointment.therapist?.fullName ?? 'your therapist'
        )
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Appointment confirmation SMS failed')
    }

    return reply.status(201).send(appointment)
  })

  // ── Update appointment ──
  fastify.patch('/appointments/:id', {
  preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'THERAPIST')
}, async (request, reply) => {
  const { id } = request.params as { id: string }
  const body   = request.body as any
  const data: any = {}
  if (body.status)      data.status      = body.status
  if (body.therapistId !== undefined) data.therapistId = body.therapistId
  if (body.therapyType) data.therapyType = body.therapyType
  if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt)
  if (body.durationMin) data.durationMin = body.durationMin
  if (body.notes !== undefined) data.notes = body.notes

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
      include: {
        client: {
          include: { guardians: { where: { isPrimary: true } } }
        },
        therapist: { select: { fullName: true } },
      },
    })

    // Send SMS when session marked completed
    try {
      if (body.status === 'COMPLETED') {
        const guardian = (appointment.client as any)?.guardians?.[0]
        if (guardian?.phone && appointment.client?.fullName) {
          await sendSessionCompleted(
            guardian.phone,
            appointment.client.fullName,
            appointment.therapyType,
            appointment.therapist?.fullName ?? 'your therapist'
          )
        }
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Session completed SMS failed')
    }

    return reply.send(appointment)
  })

  // ── Delete single appointment ──
  fastify.delete('/appointments/:id', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.sessionNote.deleteMany({ where: { appointmentId: id } })
    await prisma.appointment.delete({ where: { id } })
    return reply.send({ success: true })
  })

  // ── Bulk attendance import ──
  fastify.post('/appointments/bulk-import', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'),
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { rows } = request.body as { rows: any[] }

    if (!Array.isArray(rows) || rows.length === 0) {
      return reply.status(422).send({ message: 'No rows provided' })
    }

    let imported     = 0
    let placeholders = 0
    let skipped      = 0
    const errors: string[] = []
    const clientCache:   Record<string, string> = {}
    const therapistCache: Record<string, string> = {}

    for (const row of rows) {
      try {
        const nameKey = row.childName.trim().toLowerCase()
        let clientId  = clientCache[nameKey]

        if (!clientId) {
          let client = await prisma.client.findFirst({
            where: {
              branchId: user.branchId,
              fullName: { equals: row.childName.trim(), mode: 'insensitive' }
            }
          })
          if (!client) {
            client = await prisma.client.create({
              data: {
                fullName:    row.childName.trim(),
                dob:         new Date('2015-01-01'),
                gender:      'OTHER',
                status:      'ACTIVE',
                branchId:    user.branchId,
                referralSrc: 'Imported from attendance records — needs review',
              }
            })
            placeholders++
          }
          clientId = client.id
          clientCache[nameKey] = clientId
        }

        let therapistId: string | undefined = undefined
        if (row.therapistName) {
          const tKey = row.therapistName.trim().toLowerCase()
          therapistId = therapistCache[tKey]
          if (!therapistId) {
            const nameParts = row.therapistName.trim().split(" ")
            const firstName = nameParts[0]
            const lastName  = nameParts[nameParts.length - 1]
            const therapist = await prisma.staff.findFirst({
              where: {
                branchId: user.branchId,
                OR: [
                  { fullName: { equals: row.therapistName.trim(), mode: 'insensitive' } },
                  { fullName: { startsWith: firstName, mode: 'insensitive' } },
                  { fullName: { endsWith: lastName,   mode: 'insensitive' } },
                  { fullName: { contains: firstName,  mode: 'insensitive' } },
                ]
              }
            })
            if (therapist) {
              therapistId = therapist.id
              therapistCache[tKey] = therapistId
            }
          }
        }

        const timeStr    = row.startTime && /^\d{1,2}:\d{2}$/.test(row.startTime) ? row.startTime : '09:00'
        const scheduledAt = new Date(`${row.date}T${timeStr}:00`)

        if (isNaN(scheduledAt.getTime())) {
          errors.push(`${row.childName}: invalid date/time`)
          skipped++
          continue
        }

        // Check for duplicate
        const existing = await prisma.appointment.findFirst({
          where: {
            clientId,
            therapyType: row.therapyType,
            scheduledAt: {
              gte: new Date(`${row.date}T00:00:00`),
              lte: new Date(`${row.date}T23:59:59`),
            }
          }
        })
        if (existing) { skipped++; continue }

        await prisma.appointment.create({
          data: {
            clientId,
            therapistId: therapistId ?? null,
            therapyType: row.therapyType,
            scheduledAt,
            status:      row.status,
          }
        })
        imported++
      } catch (err: any) {
        errors.push(`${row.childName ?? 'Unknown'}: ${err.message}`)
        skipped++
      }
    }

    return reply.send({ imported, placeholders, skipped, errors: errors.slice(0, 20) })
  })

  // ── Create recurring appointments ──
  fastify.post('/appointments/recurring', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
  }, async (request, reply) => {
    const body = request.body as {
      clientId:    string
      therapistId: string
      therapyType: string
      startDate:   string
      startTime:   string
      durationMin: number
      pattern:     "WEEKLY" | "FORTNIGHTLY" | "CUSTOM"
      customDays:  number[]
      weeks:       number
      notes:       string
    }

    const [year, month, day] = body.startDate.split('-').map(Number)
    const [hour, minute]     = body.startTime.split(':').map(Number)
    const startDate          = new Date(year, month - 1, day, hour, minute)

    const dates = generateRecurringDates(
      startDate,
      body.pattern,
      body.customDays ?? [],
      body.weeks ?? 12
    )

    if (dates.length === 0) {
      return reply.status(400).send({
        message: "No valid dates generated — all dates may fall on public holidays."
      })
    }

    const groupId = randomUUID()

    const appointments = await Promise.all(
      dates.map(date =>
        prisma.appointment.create({
          data: {
            clientId:         body.clientId,
            therapistId:      body.therapistId || null,
            therapyType:      body.therapyType,
            scheduledAt:      date,
            durationMin:      body.durationMin ?? 50,
            status:           'SCHEDULED',
            notes:            body.notes ?? '',
            isRecurring:      true,
            recurringGroupId: groupId,
            recurPattern:     body.pattern,
            recurDays:        body.customDays?.join(',') ?? '',
          } as any
        })
      )
    )

    // Send SMS for first appointment only to avoid spam
    try {
      const guardian = await prisma.guardian.findFirst({
        where: { clientId: body.clientId, isPrimary: true }
      })
      const client = await prisma.client.findUnique({
        where: { id: body.clientId },
        select: { fullName: true }
      })
      const therapist = body.therapistId ? await prisma.staff.findUnique({
        where: { id: body.therapistId },
        select: { fullName: true }
      }) : null

      if (guardian?.phone && client?.fullName && appointments[0]) {
        await sendAppointmentConfirmation(
          guardian.phone,
          client.fullName,
          body.therapyType,
          new Date(appointments[0].scheduledAt),
          therapist?.fullName ?? 'your therapist'
        )
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Recurring appointment SMS failed')
    }

    return reply.status(201).send({
      count:   appointments.length,
      groupId,
      skipped: 0,
      first:   appointments[0]?.scheduledAt,
      last:    appointments[appointments.length - 1]?.scheduledAt,
    })
  })

  // ── Delete recurring group ──
  fastify.delete('/appointments/recurring/:groupId', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
  }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const { from }    = request.query as { from?: string }

    const where: any = { recurringGroupId: groupId }
    if (from) where.scheduledAt = { gte: new Date(from) }

    await prisma.sessionNote.deleteMany({
      where: { appointment: where }
    })
    const result = await prisma.appointment.deleteMany({ where })
    return reply.send({ deleted: result.count })
  })
}