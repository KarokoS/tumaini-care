import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function consentRoutes(fastify: FastifyInstance) {

  fastify.get("/consent/:clientId", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST","RECEPTIONIST")
  }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string }
    const consents = await prisma.consent.findMany({
      where: { clientId },
      orderBy: { signedAt: "desc" }
    })
    return reply.send(consents)
  })

  fastify.post("/consent", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST","RECEPTIONIST")
  }, async (request, reply) => {
    const user = request.user as JWTPayload
    const body = request.body as any
    const consent = await prisma.consent.create({
      data: {
        clientId:            body.clientId,
        guardianName:        body.guardianName,
        relationship:        body.relationship,
        consentAssessment:   body.consentAssessment ?? false,
        consentTherapy:      body.consentTherapy ?? false,
        consentDataStorage:  body.consentDataStorage ?? false,
        consentPhotoVideo:   body.consentPhotoVideo ?? false,
        signatureData:       body.signatureData ?? null,
        recordedById:        user.id,
      }
    })
    return reply.status(201).send(consent)
  })
}
