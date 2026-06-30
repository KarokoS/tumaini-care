import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getAllClients, getClientById, createClient, updateClient, getClientTimeline } from './clients.service'
import { requireRole, JWTPayload } from '../../shared/middleware/rbac'
import { logAction } from '../../shared/middleware/audit'
const createClientSchema = z.object({ fullName: z.string().min(2), dob: z.string(), gender: z.string(), diagnosis: z.string().optional(), coOccurring: z.string().optional(), allergies: z.string().optional(), referralSrc: z.string().optional(), schoolName: z.string().optional(), guardian: z.object({ fullName: z.string().min(2), relationship: z.string(), phone: z.string().min(10), email: z.string().email().optional() }) })
export async function clientRoutes(fastify: FastifyInstance) {
  fastify.get('/clients', { preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST') }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { q } = request.query as { q?: string }
    const clients = await getAllClients(user.branchId, q)
    await logAction(request, 'READ', 'Client', 'all')
    return reply.send(clients)
  })
  fastify.get('/clients/:id', { preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const client = await getClientById(id)
    await logAction(request, 'READ', 'Client', id)
    return reply.send(client)
  })
  fastify.post('/clients', { preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST') }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = createClientSchema.safeParse(request.body)
    if (!body.success) return reply.status(422).send({ error: 'Validation failed', details: body.error.errors })
    const client = await createClient({ ...body.data, branchId: user.branchId })
    await logAction(request, 'CREATE', 'Client', client.id)
    return reply.status(201).send(client)
  })
  fastify.patch('/clients/:id', { preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST', 'RECEPTIONIST') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const client = await updateClient(id, request.body as Record<string, string>)
    await logAction(request, 'UPDATE', 'Client', id)
    return reply.send(client)
  })
  fastify.get('/clients/:id/timeline', { preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'THERAPIST') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const timeline = await getClientTimeline(id)
    return reply.send(timeline)
  })
  fastify.post('/clients/bulk-import', { preHandler: requireRole('SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST') }, async (request, reply) => {
    const user = request.user as JWTPayload
    const { clients } = request.body as { clients: any[] }

    if (!Array.isArray(clients) || clients.length === 0) {
      return reply.status(422).send({ message: 'No clients provided' })
    }

    const { prisma } = await import('../../shared/prisma')

    let imported = 0
    let skipped  = 0
    const errors: string[] = []

    for (const row of clients) {
      try {
        if (row.clientId) {
          const existing = await prisma.client.findUnique({
            where: { externalId: row.clientId }
          })
          if (existing) {
            skipped++
            continue
          }
        }

        const dobDate = row.dob ? new Date(row.dob) : new Date()
        const regDate = row.registrationDate ? new Date(row.registrationDate) : new Date()

        await prisma.client.create({
          data: {
            fullName:         row.fullName,
            dob:              dobDate,
            gender:           row.gender,
            diagnosis:        row.diagnosis || null,
            status:           'ACTIVE',
            externalId:       row.clientId || null,
            registrationDate: regDate,
            branchId:         user.branchId,
            guardians: {
              create: {
                fullName:     row.guardianName,
                relationship: row.relationship || 'Parent',
                phone:        row.phone,
                email:        row.email || null,
                isPrimary:    true,
              }
            }
          }
        })
        imported++
      } catch (err: any) {
        errors.push(`${row.fullName || 'Unknown'}: ${err.message}`)
      }
    }

    await logAction(request, 'CREATE', 'Client', `bulk-import-${imported}`)

    return reply.send({ imported, skipped, errors })
  })
}
