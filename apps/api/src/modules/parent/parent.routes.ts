import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function parentRoutes(fastify: FastifyInstance) {
  fastify.get("/parent/dashboard", {
    preHandler: requireRole("PARENT")
  }, async (request, reply) => {
    const user = request.user as JWTPayload

    const client = await prisma.client.findFirst({
      where: { parentUserId: user.userId },
      include: {
        appointments: {
          orderBy: { scheduledAt: "asc" },
          where: { scheduledAt: { gte: new Date() } },
          take: 1,
          include: { therapist: { select: { fullName: true } } },
        },
        itps: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          where: { status: { not: "PAID" } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    })

    if (!client) return reply.status(404).send({ message: "No client linked to this account" })

    const completedAppts = await prisma.appointment.findMany({
      where: {
        clientId: client.id,
        status: "COMPLETED",
        scheduledAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      include: { sessionNote: true },
    })

    const allGoals = (client.itps[0] as any)?.goals ?? []
    const avgProgress = allGoals.length > 0
      ? Math.round(allGoals.reduce((s: number, g: any) => s + g.progressPct, 0) / allGoals.length)
      : 0

    const nextAppt = client.appointments[0]
    const recentNotes = completedAppts
      .filter((a: any) => a.sessionNote)
      .slice(0, 3)
      .map((a: any) => ({
        date: a.scheduledAt,
        therapyType: a.therapyType,
        plan: a.sessionNote?.plan,
      }))

    return reply.send({
      childName: client.fullName,
      sessionsMonth: completedAppts.length,
      goalProgress: avgProgress,
      nextAppt: nextAppt ? {
        date: new Date(nextAppt.scheduledAt).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        type: nextAppt.therapyType,
        therapist: nextAppt.therapist?.fullName ?? "",
        room: nextAppt.room ?? "",
      } : null,
      recentNotes,
      invoices: client.invoices,
    })
  })
}