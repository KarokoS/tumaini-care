import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../prisma'

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'THERAPIST' | 'RECEPTIONIST' | 'FINANCE' | 'PARENT'

export interface JWTPayload {
  id:                 string
  email:              string
  role:               Role
  branchId:           string
  mustChangePassword?: boolean
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
      const user = req.user as JWTPayload

      // Check staff is still active in database
      const staff = await prisma.staff.findUnique({
        where:  { id: user.id },
        select: { isActive: true, email: true }
      })

      if (!staff || !staff.isActive) {
        return reply.status(401).send({
          error:   'Unauthorized',
          message: 'Your account has been deactivated. Please contact your administrator.'
        })
      }

      if (!roles.includes(user.role)) {
        return reply.status(403).send({
          error:   'Forbidden',
          message: `Access requires one of: ${roles.join(', ')}`
        })
      }
    } catch (err: any) {
      if (err.statusCode === 401 || err.statusCode === 403) return reply.send(err)
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }
  }
}

export function requireAnyRole() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
      const user = req.user as JWTPayload

      const staff = await prisma.staff.findUnique({
        where:  { id: user.id },
        select: { isActive: true }
      })

      if (!staff || !staff.isActive) {
        return reply.status(401).send({
          error:   'Unauthorized',
          message: 'Your account has been deactivated. Please contact your administrator.'
        })
      }
    } catch (err: any) {
      if (err.statusCode === 401) return reply.send(err)
      return reply.status(401).send({ error: 'Unauthorized', message: 'Please log in' })
    }
  }
}