import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function sessionRoutes(fastify: FastifyInstance) {

  // ── Create or update session note by appointmentId ──
  fastify.post("/sessions", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any

    const existing = await prisma.sessionNote.findUnique({
      where: { appointmentId: body.appointmentId }
    })

    let note
    if (existing) {
      note = await prisma.sessionNote.update({
        where: { appointmentId: body.appointmentId },
        data: {
          subjective:  body.subjective  ?? existing.subjective,
          objective:   body.objective   ?? existing.objective,
          assessment:  body.assessment  ?? existing.assessment,
          plan:        body.plan        ?? existing.plan,
        }
      })
    } else {
      note = await prisma.sessionNote.create({
        data: {
          appointmentId: body.appointmentId,
          authorId:      user.id,
          subjective:    body.subjective,
          objective:     body.objective,
          assessment:    body.assessment,
          plan:          body.plan,
        }
      })
    }

    return reply.status(201).send(note)
  })

  // ── Update session note by note ID ──
  fastify.patch("/sessions/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body   = request.body as any

    const existing = await prisma.sessionNote.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({ message: "Session note not found" })
    }

    const note = await prisma.sessionNote.update({
      where: { id },
      data: {
        subjective:  body.subjective  ?? existing.subjective,
        objective:   body.objective   ?? existing.objective,
        assessment:  body.assessment  ?? existing.assessment,
        plan:        body.plan        ?? existing.plan,
      }
    })

    return reply.send(note)
  })

  // ── Get session note by appointmentId ──
  fastify.get("/sessions/:appointmentId", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { appointmentId } = request.params as { appointmentId: string }
    const note = await prisma.sessionNote.findUnique({
      where:   { appointmentId },
      include: { author: { select: { fullName: true } } }
    })
    return reply.send(note)
  })
}