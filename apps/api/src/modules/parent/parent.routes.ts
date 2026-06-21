import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function parentRoutes(fastify: FastifyInstance) {
  fastify.get("/parent/dashboard", {
    preHandler: requireRole("PARENT")
  }, async (request, reply) => {
    const user = request.user as JWTPayload

    const client = await prisma.client.findFirst({
      where: { parentUserId: user.id },
    })

    if (!client) {
      return reply.status(404).send({ message: "No client linked to this account" })
    }

    const [upcomingAppts, completedAppts, itps, invoices] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          clientId: client.id,
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        include: { therapist: { select: { fullName: true } } },
      }),
      prisma.appointment.findMany({
        where: {
          clientId: client.id,
          status: "COMPLETED",
          scheduledAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        include: { sessionNote: true },
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.iTP.findMany({
        where: { clientId: client.id },
        include: { goals: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      prisma.invoice.findMany({
        where: {
          clientId: client.id,
          status: { not: "PAID" },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ])

    const nextAppt = upcomingAppts[0] ?? null

    const allGoals = itps[0]?.goals ?? []
    const avgProgress = allGoals.length > 0
      ? Math.round(allGoals.reduce((s: number, g: { progressPct: number }) => s + g.progressPct, 0) / allGoals.length)
      : 0

    const recentNotes = completedAppts
      .filter((a: any) => a.sessionNote)
      .slice(0, 3)
      .map((a: any) => ({
        date:        a.scheduledAt,
        therapyType: a.therapyType,
        plan:        a.sessionNote?.plan,
      }))

    return reply.send({
      childName:     client.fullName,
      sessionsMonth: completedAppts.length,
      goalProgress:  avgProgress,
      nextAppt: nextAppt ? {
        date:      new Date(nextAppt.scheduledAt).toLocaleDateString("en-KE", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit"
        }),
        type:      nextAppt.therapyType,
        therapist: nextAppt.therapist?.fullName ?? "",
      } : null,
      recentNotes,
      invoices,
    })
  })
}