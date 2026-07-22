import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"
import { sendSMS } from "../../shared/sms"

export async function itpRoutes(fastify: FastifyInstance) {

  // ── Get all ITPs ──
  fastify.get("/itps", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const itps = await prisma.iTP.findMany({
      where:   { client: { branchId: user.branchId } },
      include: {
        client: { select: { fullName: true } },
        goals:  { orderBy: { progressPct: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    })
    return reply.send(itps)
  })

  // ── ITP review alerts ──
  fastify.get("/itps/review-alerts", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST","RECEPTIONIST")
  }, async (request, reply) => {
    const user        = request.user as JWTPayload
    const now         = new Date()
    const in7Days     = new Date()
    in7Days.setDate(in7Days.getDate() + 7)

    const itps = await prisma.iTP.findMany({
      where: {
        client: { branchId: user.branchId, status: "ACTIVE" },
        status: "ACTIVE",
        reviewDate: { not: null },
      },
      include: {
        client: {
          include: {
            guardians: { where: { isPrimary: true }, select: { fullName: true, phone: true } }
          }
        },
        goals: { select: { id: true, isAchieved: true, progressPct: true } },
      },
      orderBy: { reviewDate: "asc" },
    })

    const overdue  = itps.filter(i => i.reviewDate && new Date(i.reviewDate) < now)
    const upcoming = itps.filter(i => i.reviewDate && new Date(i.reviewDate) >= now && new Date(i.reviewDate) <= in7Days)
    const noDate   = await prisma.iTP.findMany({
      where: {
        client: { branchId: user.branchId, status: "ACTIVE" },
        status: "ACTIVE",
        reviewDate: null,
      },
      include: { client: { select: { fullName: true } } }
    })

    return reply.send({
      overdue:  overdue.map(i => ({
        id:          i.id,
        clientName:  i.client.fullName,
        clientId:    i.clientId,
        reviewDate:  i.reviewDate,
        daysOverdue: Math.floor((now.getTime() - new Date(i.reviewDate!).getTime()) / (1000*60*60*24)),
        goalsTotal:  i.goals.length,
        goalsAchieved: i.goals.filter(g=>g.isAchieved).length,
        guardian:    i.client.guardians[0] ?? null,
      })),
      upcoming: upcoming.map(i => ({
        id:         i.id,
        clientName: i.client.fullName,
        clientId:   i.clientId,
        reviewDate: i.reviewDate,
        daysUntil:  Math.ceil((new Date(i.reviewDate!).getTime() - now.getTime()) / (1000*60*60*24)),
        goalsTotal: i.goals.length,
        goalsAchieved: i.goals.filter(g=>g.isAchieved).length,
        guardian:   i.client.guardians[0] ?? null,
      })),
      noReviewDate: noDate.map(i => ({
        id:         i.id,
        clientName: i.client.fullName,
        clientId:   i.clientId,
      })),
      counts: {
        overdue:  overdue.length,
        upcoming: upcoming.length,
        noDate:   noDate.length,
        total:    overdue.length + upcoming.length,
      }
    })
  })

  // ── Send ITP review SMS reminders ──
  fastify.post("/itps/send-review-reminders", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER")
  }, async (request, reply) => {
    const user    = request.user as JWTPayload
    const now     = new Date()
    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)

    const upcoming = await prisma.iTP.findMany({
      where: {
        client: { branchId: user.branchId, status: "ACTIVE" },
        status: "ACTIVE",
        reviewDate: { gte: now, lte: in7Days },
      },
      include: {
        client: {
          include: { guardians: { where: { isPrimary: true } } }
        }
      }
    })

    let sent = 0
    for (const itp of upcoming) {
      const guardian = itp.client.guardians[0]
      if (guardian?.phone) {
        const reviewDateStr = new Date(itp.reviewDate!).toLocaleDateString('en-KE',{ weekday:'long', day:'numeric', month:'long' })
        const message = `Tumaini St. Thorlak: Reminder — ${itp.client.fullName}'s therapy plan review is due on ${reviewDateStr}. Please contact us to schedule. Tel: 0797496129`
        const ok = await sendSMS(guardian.phone, message)
        if (ok) sent++
      }
    }

    return reply.send({ sent, total: upcoming.length })
  })

  // ── Create ITP ──
  fastify.post("/itps", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any
    const itp  = await prisma.iTP.create({
      data: {
        clientId:    body.clientId,
        createdById: user.id,
        reviewDate:  body.reviewDate ? new Date(body.reviewDate) : null,
      },
      include: {
        client: { select: { fullName: true } },
        goals:  true,
      },
    })
    return reply.status(201).send(itp)
  })

  // ── Update ITP ──
  fastify.patch("/itps/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body   = request.body as any
    const data: any = {}
    if (body.status)     data.status     = body.status
    if (body.reviewDate !== undefined) data.reviewDate = body.reviewDate ? new Date(body.reviewDate) : null
    const itp = await prisma.iTP.update({
      where: { id },
      data,
      include: { client: { select: { fullName: true } }, goals: true }
    })
    return reply.send(itp)
  })

  // ── Create goal ──
  fastify.post("/goals", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const body = request.body as any
    const goal = await prisma.goal.create({
      data: {
        itpId:       body.itpId,
        title:       body.title,
        description: body.description,
        term:        body.term,
        therapyType: body.therapyType,
        progressPct: 0,
      },
    })
    return reply.status(201).send(goal)
  })

  // ── Update goal progress ──
  fastify.patch("/goals/:id", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body   = request.body as any
    const isAchieved = body.progressPct >= 100
    const goal   = await prisma.goal.update({
      where: { id },
      data: {
        progressPct: body.progressPct,
        isAchieved,
        achievedAt:  isAchieved ? new Date() : null,
      },
    })
    return reply.send(goal)
  })
}