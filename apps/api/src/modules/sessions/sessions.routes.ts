import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.post("/sessions", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any
    const existing = await prisma.sessionNote.findUnique({
      where: { appointmentId: body.appointmentId }
    })
    if (existing) {
      const updated = await prisma.sessionNote.update({
        where: { appointmentId: body.appointmentId },
        data: { subjective: body.subjective, objective: body.objective, assessment: body.assessment, plan: body.plan }
      })
      return reply.send(updated)
    }
    const note = await prisma.sessionNote.create({
      data: {
        appointmentId: body.appointmentId,
        authorId: user.id,
        subjective: body.subjective,
        objective: body.objective,
        assessment: body.assessment,
        plan: body.plan
      }
    })
    await prisma.appointment.update({
      where: { id: body.appointmentId },
      data: { status: "COMPLETED" }
    })
    return reply.status(201).send(note)
  })

  fastify.get("/sessions/:appointmentId", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { appointmentId } = request.params as { appointmentId: string }
    const note = await prisma.sessionNote.findUnique({
      where: { appointmentId },
      include: { author: { select: { fullName: true } } }
    })
    return reply.send(note)
  })
}