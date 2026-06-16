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
}