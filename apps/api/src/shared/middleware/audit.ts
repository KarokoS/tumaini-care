import { FastifyRequest } from 'fastify'
import { prisma } from '../prisma'
import { JWTPayload } from './rbac'
export async function logAction(req: FastifyRequest, action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE', entity: string, entityId: string, metadata?: Record<string, unknown>) {
  try {
    const user = req.user as JWTPayload
    if (!user?.id) return
    await prisma.auditLog.create({ data: { staffId: user.id, action, entity, entityId, ipAddress: req.ip, userAgent: req.headers['user-agent'] ?? null, metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null } })
  } catch { console.error('Audit log failed silently') }
}
