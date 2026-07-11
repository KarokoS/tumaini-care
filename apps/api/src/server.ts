import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
dotenv.config()
import { authRoutes } from './modules/auth/auth.routes'
import { clientRoutes } from './modules/clients/clients.routes'
import { staffRoutes } from './modules/staff/staff.routes'
import { appointmentRoutes } from './modules/appointments/appointments.routes'
import { sessionRoutes } from './modules/sessions/sessions.routes'
import { itpRoutes } from './modules/itps/itps.routes'
import { billingRoutes } from './modules/billing/billing.routes'
import { assessmentRoutes } from './modules/assessments/assessments.routes'
import { parentRoutes } from './modules/parent/parent.routes'
import { mpesaRoutes } from './modules/mpesa/mpesa.routes'
import { inventoryRoutes } from './modules/inventory/inventory.routes'
import { AppError } from './shared/errors'

const fastify = Fastify({ logger: true })

async function buildServer() {
  await fastify.register(fastifyCors, {
  origin: true,
  credentials: true,
  })
  await fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET ?? 'fallback-secret' })
  await fastify.register(fastifyRateLimit, { max: 200, timeWindow: '1 minute' })

  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'Tumaini Care API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }))

  await fastify.register(authRoutes,        { prefix: '/api/v1' })
  await fastify.register(clientRoutes,      { prefix: '/api/v1' })
  await fastify.register(staffRoutes,       { prefix: '/api/v1' })
  await fastify.register(appointmentRoutes, { prefix: '/api/v1' })
  await fastify.register(sessionRoutes,     { prefix: '/api/v1' })
  await fastify.register(itpRoutes,         { prefix: '/api/v1' })
  await fastify.register(billingRoutes,     { prefix: '/api/v1' })
  await fastify.register(assessmentRoutes,  { prefix: '/api/v1' })
  await fastify.register(parentRoutes,      { prefix: '/api/v1' })
  await fastify.register(mpesaRoutes,       { prefix: '/api/v1' })
  await fastify.register(inventoryRoutes,   { prefix: '/api/v1' })

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.code, message: error.message })
    }
    fastify.log.error(error)
    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' })
  })

  return fastify
}

async function start() {
  const server = await buildServer()
  const port = parseInt(process.env.PORT ?? '4000')
  try {
    await server.listen({ port, host: '0.0.0.0' })
    console.log('')
    console.log('╔════════════════════════════════════════╗')
    console.log('║   Tumaini Care API — Running           ║')
    console.log(`║   http://localhost:${port}             ║`)
    console.log('╚════════════════════════════════════════╝')

    // Keep-alive ping — starts AFTER server is ready
    const selfUrl = 'https://tumaini-api.onrender.com'
    setInterval(async () => {
      try {
        const res = await fetch(`${selfUrl}/health`)
        fastify.log.info(`Keep-alive ping: ${res.status}`)
      } catch (e) {
        fastify.log.warn('Keep-alive ping failed')
      }
    }, 13 * 60 * 1000) // every 13 minutes

  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

import { sendTomorrowReminders } from './shared/reminder'

// Daily reminder at 5PM Kenya time (15:00 UTC)
function scheduleDailyReminders() {
  const now     = new Date()
  const next5PM = new Date()
  next5PM.setUTCHours(15, 0, 0, 0)
  if (next5PM <= now) next5PM.setDate(next5PM.getDate() + 1)
  const msUntil5PM = next5PM.getTime() - now.getTime()

  setTimeout(() => {
    sendTomorrowReminders()
    setInterval(sendTomorrowReminders, 24 * 60 * 60 * 1000)
  }, msUntil5PM)

  fastify.log.info(`Daily reminders scheduled — first run in ${Math.round(msUntil5PM/1000/60)} minutes`)
}

scheduleDailyReminders()

start()