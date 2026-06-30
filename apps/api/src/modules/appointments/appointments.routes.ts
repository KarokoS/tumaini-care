import { FastifyInstance } from 'fastify'
import { prisma } from '../../shared/prisma'
import { requireRole, JWTPayload } from '../../shared/middleware/rbac'

export async function appointmentRoutes(fastify: FastifyInstance) {
  fastify.get('/appointments', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST')
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { from, to } = request.query as { from?: string; to?: string }

    const appointments = await prisma.appointment.findMany({
      where: {
        client: { branchId: user.branchId },
        ...(from && to && {
          scheduledAt: {
            gte: new Date(from),
            lte: new Date(to),
          }
        })
      },
      include: {
        client: { select: { id: true, fullName: true } },
        therapist: { select: { id: true, fullName: true } },
        sessionNote: { select: { id: true, isLocked: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })
    return reply.send(appointments)
  })

  fastify.post('/appointments', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'THERAPIST')
  }, async (request, reply) => {
    const body = request.body as any
    const appointment = await prisma.appointment.create({
      data: {
        clientId: body.clientId,
        therapistId: body.therapistId,
        therapyType: body.therapyType,
        scheduledAt: new Date(body.scheduledAt),
        durationMin: body.durationMin ?? 50,
        notes: body.notes ?? '',
        status: 'SCHEDULED',
      },
      include: {
        client: { select: { id: true, fullName: true } },
        therapist: { select: { id: true, fullName: true } },
      },
    })
    return reply.status(201).send(appointment)
  })

  fastify.patch('/appointments/:id', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const appointment = await prisma.appointment.update({
      where: { id },
      data: body,
      include: {
        client: { select: { id: true, fullName: true } },
        therapist: { select: { id: true, fullName: true } },
      },
    })
    return reply.send(appointment)
  })

  fastify.post('/appointments/bulk-import', {
    preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST')
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

    // Cache lookups to avoid repeated queries
    const clientCache: Record<string, string>    = {}
    const therapistCache: Record<string, string> = {}

    for (const row of rows) {
      try {
        const nameKey = row.childName.trim().toLowerCase()
        let clientId = clientCache[nameKey]

        if (!clientId) {
          let client = await prisma.client.findFirst({
            where: {
              branchId: user.branchId,
              fullName: { equals: row.childName.trim(), mode: 'insensitive' }
            }
          })

          if (!client) {
            // Create placeholder client
            client = await prisma.client.create({
              data: {
                fullName: row.childName.trim(),
                dob: new Date('2015-01-01'),
                gender: 'OTHER',
                status: 'ACTIVE',
                branchId: user.branchId,
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
            const therapist = await prisma.staff.findFirst({
              where: {
                branchId: user.branchId,
                fullName: { equals: row.therapistName.trim(), mode: 'insensitive' }
              }
            })
            if (therapist) {
              therapistId = therapist.id
              therapistCache[tKey] = therapistId
            }
          }
        }

        const timeStr = row.startTime && /^\d{1,2}:\d{2}$/.test(row.startTime) ? row.startTime : '09:00'
        const scheduledAt = new Date(`${row.date}T${timeStr}:00`)

        if (isNaN(scheduledAt.getTime())) {
          errors.push(`${row.childName}: invalid date/time`)
          skipped++
          continue
        }

        await prisma.appointment.create({
          data: {
            clientId,
            therapistId: therapistId ?? null,
            therapyType: row.therapyType,
            scheduledAt,
            status: row.status,
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
}