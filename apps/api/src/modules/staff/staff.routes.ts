import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"
import bcrypt from "bcryptjs"
import { sendWelcomeEmail } from '../../shared/email'

export async function staffRoutes(fastify: FastifyInstance) {
  fastify.get("/staff", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST","RECEPTIONIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const staff = await prisma.staff.findMany({
      where: { branchId: user.branchId },
      select: {
        id:true, fullName:true, email:true, role:true, specialty:true,
        phone:true, isActive:true, isTrainee:true, institution:true,
      },
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
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
        isTrainee: body.isTrainee ?? false,
        institution: body.institution || null,
        pwHash,
        branchId: user.branchId,
      },
      select: {
        id:true, fullName:true, email:true, role:true, specialty:true,
        phone:true, isActive:true, isTrainee:true, institution:true,
      },
    })
    try {
  await sendWelcomeEmail(body.email, body.fullName, body.password)
} catch (err) {
  fastify.log.warn({ err: String(err) }, 'Welcome email failed to send')
}
    return reply.status(201).send(staff)
  })

  fastify.patch("/staff/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const data: any = {}
    if (typeof body.isActive === "boolean") data.isActive = body.isActive
    if (body.fullName) data.fullName = body.fullName
    if (body.phone !== undefined) data.phone = body.phone
    if (body.specialty !== undefined) data.specialty = body.specialty
    if (body.role) data.role = body.role
    if (typeof body.isTrainee === "boolean") data.isTrainee = body.isTrainee
    if (body.institution !== undefined) data.institution = body.institution

    const staff = await prisma.staff.update({
      where: { id },
      data,
      select: {
        id:true, fullName:true, email:true, role:true, specialty:true,
        phone:true, isActive:true, isTrainee:true, institution:true,
      },
    })
    return reply.send(staff)
  })
  fastify.delete("/staff/:id", {
    preHandler: requireRole("SUPER_ADMIN", "MANAGER")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.staff.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted_${Date.now()}_${id}@deleted.com`
      }
    })
    return reply.send({ success: true })
  })
}