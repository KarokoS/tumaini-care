import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function inventoryRoutes(fastify: FastifyInstance) {

  fastify.get("/inventory", {
    preHandler: requireRole("SUPER_ADMIN", "MANAGER", "THERAPIST", "RECEPTIONIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const items = await prisma.inventoryItem.findMany({
      where: { branchId: user.branchId },
      orderBy: { name: "asc" },
    })
    return reply.send(items)
  })

  fastify.post("/inventory", {
    preHandler: requireRole("SUPER_ADMIN", "MANAGER")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any
    const item = await prisma.inventoryItem.create({
      data: {
        name: body.name,
        category: body.category,
        quantity: body.quantity ?? 0,
        location: body.location,
        status: body.status ?? "OK",
        notes: body.notes,
        branchId: user.branchId,
      },
    })
    return reply.status(201).send(item)
  })

  fastify.patch("/inventory/:id", {
    preHandler: requireRole("SUPER_ADMIN", "MANAGER")
  }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        location: body.location,
        status: body.status,
        notes: body.notes,
        updatedAt: new Date(),
      },
    })
    return reply.send(item)
  })
}