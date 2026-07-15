import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginStaff, getStaffById } from './auth.service'
import { requireAnyRole, JWTPayload } from '../../shared/middleware/rbac'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '../../shared/email'
import { prisma } from '../../shared/prisma'
import bcrypt from 'bcryptjs'

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) })

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(422).send({ error: 'Validation failed', details: body.error.errors })
    const staff = await loginStaff(body.data.email, body.data.password)
    const accessToken = fastify.jwt.sign(
  {
    id:                staff.id,
    email:             staff.email,
    role:              staff.role,
    branchId:          staff.branchId,
    mustChangePassword: staff.mustChangePassword,
  },
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
        {
          id:                staff.id,
          email:             staff.email,
          role:              staff.role,
          branchId:          staff.branchId,
          mustChangePassword: staff.mustChangePassword,
        },
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

  // ── Request password reset ──
  fastify.post('/auth/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string }
    const staff = await prisma.staff.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Always return success to prevent email enumeration
    if (!staff) return reply.send({ message: 'If that email exists, a reset link has been sent.' })

    const token     = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.staff.update({
      where: { id: staff.id },
      data: { resetToken: token, resetTokenExpiry: expiresAt } as any
    })

    try {
      await sendPasswordResetEmail(staff.email, staff.fullName, token)
    } catch (err) {
      fastify.log.error(err instanceof Error ? err : new Error(String(err)), 'Failed to send reset email')
    }

    return reply.send({ message: 'If that email exists, a reset link has been sent.' })
  })

  // ── Reset password with token ──
  fastify.post('/auth/reset-password', async (request, reply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string }

    const staff = await prisma.staff.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      } as any
    })

    if (!staff) return reply.status(400).send({ message: 'Invalid or expired reset link. Please request a new one.' })

    const pwHash = await bcrypt.hash(newPassword, 12)
    await prisma.staff.update({
      where: { id: staff.id },
      data: { pwHash, mustChangePassword: false, resetToken: null, resetTokenExpiry: null } as any
    })

    return reply.send({ message: 'Password reset successfully. You can now log in.' })
  })
}