import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function billingRoutes(fastify: FastifyInstance) {

  fastify.get("/invoices", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","FINANCE","RECEPTIONIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const invoices = await prisma.invoice.findMany({
      where: { client: { branchId: user.branchId } },
      include: {
        client: { select: { id: true, fullName: true, isProBono: true } },
        lineItems: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    })
    return reply.send(invoices)
  })

  fastify.post("/invoices", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","FINANCE","RECEPTIONIST")
  }, async (request, reply) => {
    const body = request.body as any
    const total = body.lineItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice)
    }, 0)
    const count  = await prisma.invoice.count()
    const number = "INV-" + String(1001 + count).padStart(4, "0")
    const invoice = await prisma.invoice.create({
      data: {
        clientId: body.clientId,
        number,
        amountKes: total,
        status:    total === 0 ? "PAID" : "SENT",
        dueDate:   body.dueDate ? new Date(body.dueDate) : null,
        issuedAt:  new Date(),
        paidAt:    total === 0 ? new Date() : null,
        notes:     body.notes ?? null,
        lineItems: {
          create: body.lineItems.map((item: any) => ({
            description: item.description,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
          }))
        }
      },
      include: {
        client: { select: { id: true, fullName: true, isProBono: true } },
        lineItems: true,
      },
    })
    return reply.status(201).send(invoice)
  })

  fastify.patch("/invoices/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","FINANCE")
  }, async (request, reply) => {
    const { id }  = request.params as { id: string }
    const body    = request.body as any
    const invoice = await prisma.invoice.update({
      where: { id },
      data:  body,
    })
    return reply.send(invoice)
  })

  fastify.delete("/invoices/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.payment.deleteMany({ where: { invoiceId: id } })
    await prisma.invoice.delete({ where: { id } })
    return reply.send({ success: true })
  })
}