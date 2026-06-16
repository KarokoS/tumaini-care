import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"
import bcrypt from "bcryptjs"

export async function staffRoutes(fastify: FastifyInstance) {
  fastify.get("/staff", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST","RECEPTIONIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const staff = await prisma.staff.findMany({
      where: { branchId: user.branchId, isActive: true },
      select: { id:true, fullName:true, email:true, role:true, specialty:true, phone:true, isActive:true },
      orderBy: { fullName: "asc" },
    })
    return reply.send(staff)
  })

  fastify.post("/staff", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any
    const existing = await prisma.staff.findUnique({ where: { email: body.email } })
    if (existing) {
      return reply.status(400).send({ error:"Email already exists" })
    }
    const pwHash = await bcrypt.hash(body.password, 12)
    const staff = await prisma.staff.create({
      data: {
        fullName: body.fullName,
        email: body.email.toLowerCase().trim(),
        role: body.role,
        specialty: body.specialty || null,
        phone: body.phone || null,
        pwHash,
        branchId: user.branchId,
      },
      select: { id:true, fullName:true, email:true, role:true, specialty:true, phone:true, isActive:true },
    })
    return reply.status(201).send(staff)
  })
}