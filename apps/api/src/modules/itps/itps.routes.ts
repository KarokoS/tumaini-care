import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function itpRoutes(fastify: FastifyInstance) {
  fastify.get("/itps", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const itps = await prisma.iTP.findMany({
      where: { client: { branchId: user.branchId } },
      include: {
        client: { select: { fullName: true } },
        goals: { orderBy: { progressPct: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    })
    return reply.send(itps)
  })

  fastify.post("/itps", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any
    const itp = await prisma.iTP.create({
      data: {
        clientId: body.clientId,
        createdById: user.id,
        reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      },
      include: {
        client: { select: { fullName: true } },
        goals: true,
      },
    })
    return reply.status(201).send(itp)
  })

  fastify.post("/goals", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const body = request.body as any
    const goal = await prisma.goal.create({
      data: {
        itpId: body.itpId,
        title: body.title,
        description: body.description,
        term: body.term,
        therapyType: body.therapyType,
        progressPct: 0,
      },
    })
    return reply.status(201).send(goal)
  })

  fastify.patch("/goals/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const isAchieved = body.progressPct >= 100
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        progressPct: body.progressPct,
        isAchieved,
        achievedAt: isAchieved ? new Date() : null,
      },
    })
    return reply.send(goal)
  })
}