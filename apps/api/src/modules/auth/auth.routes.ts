import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginStaff, getStaffById } from './auth.service'
import { requireAnyRole, JWTPayload } from '../../shared/middleware/rbac'

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) })

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(422).send({ error: 'Validation failed', details: body.error.errors })
    const staff = await loginStaff(body.data.email, body.data.password)
    const accessToken  = fastify.jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, branchId: staff.branchId },
      { expiresIn: '8h' }
    )
    const refreshToken = fastify.jwt.sign(
      { id: staff.id, type: 'refresh' },
      { expiresIn: '30d' }
    )
    return reply.send({ accessToken, refreshToken, user: staff })
  })

  fastify.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }
    if (!refreshToken) return reply.status(400).send({ error: 'Refresh token required' })
    try {
      const decoded = fastify.jwt.verify(refreshToken) as { id: string; type: string }
      if (decoded.type !== 'refresh') return reply.status(401).send({ error: 'Invalid refresh token' })
      const staff = await getStaffById(decoded.id)
      if (!staff) return reply.status(401).send({ error: 'User not found' })
      const accessToken = fastify.jwt.sign(
        { id: staff.id, email: staff.email, role: staff.role, branchId: staff.branchId },
        { expiresIn: '8h' }
      )
      return reply.send({ accessToken, user: staff })
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' })
    }
  })

  fastify.get('/auth/me', { preHandler: requireAnyRole() }, async (request, reply) => {
    const user = request.user as JWTPayload
    const staff = await getStaffById(user.id)
    if (!staff) return reply.status(404).send({ error: 'User not found' })
    return reply.send(staff)
  })

  fastify.post('/auth/logout', { preHandler: requireAnyRole() }, async (_request, reply) => {
    return reply.send({ message: 'Logged out successfully' })
  })
}