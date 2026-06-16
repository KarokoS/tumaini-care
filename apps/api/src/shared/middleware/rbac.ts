import { FastifyRequest, FastifyReply } from 'fastify'
export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'THERAPIST' | 'RECEPTIONIST' | 'FINANCE' | 'PARENT'
export interface JWTPayload { id: string; email: string; role: Role; branchId: string }
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
      const user = req.user as JWTPayload
      if (!roles.includes(user.role)) {
        return reply.status(403).send({ error: 'Forbidden', message: `Access requires one of: ${roles.join(', ')}` })
      }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }
  }
}
export function requireAnyRole() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try { await req.jwtVerify() }
    catch { return reply.status(401).send({ error: 'Unauthorized', message: 'Please log in' }) }
  }
}
