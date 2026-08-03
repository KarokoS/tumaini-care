import { FastifyInstance } from "fastify"
import { prisma } from "../../shared/prisma"
import { requireRole, JWTPayload } from "../../shared/middleware/rbac"

export async function aiRoutes(fastify: FastifyInstance) {

  // ── AI SOAP note draft ──
  fastify.post("/ai/soap-draft", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { clientId, therapyType, appointmentId } = request.body as {
      clientId:      string
      therapyType:   string
      appointmentId: string
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ message: "AI not configured" })
    }

    // Get client goals for context
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        itps: {
          include: { goals: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    const goals = client?.itps?.[0]?.goals ?? []
    const goalList = goals.length > 0
      ? goals.map(g => `- ${g.title} (${g.progressPct}% progress)`).join('\n')
      : 'No active goals on record'

    const prompt = `You are a clinical therapist assistant helping write a SOAP session note for a ${therapyType} therapy session at Tumaini St. Thorlak Autism Centre in Nanyuki, Kenya.

Client: ${client?.fullName ?? 'the client'}
Therapy type: ${therapyType}
Active goals:
${goalList}

Write a professional SOAP note with these four sections:
- Subjective: What the parent/guardian reported about the child's week and presentation today
- Objective: Observable behaviours and performance during the session (be specific to ${therapyType})
- Assessment: Clinical interpretation of the session and progress toward goals
- Plan: Next steps, home programme recommendations, and focus for next session

Keep each section 2-3 sentences. Write in professional clinical language appropriate for Kenya's health context. Do not use the client's name — use "the client" instead.

Return ONLY a JSON object with keys: subjective, objective, assessment, plan`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json() as any
      const text = data.content?.[0]?.text ?? ''

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const soap = JSON.parse(jsonMatch[0])

      return reply.send(soap)
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ message: 'AI generation failed' })
    }
  })

  // ── AI goal progress suggestion ──
fastify.post("/ai/goal-progress-suggest", {
  preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
}, async (request, reply) => {
  const { clientId, subjective, objective, assessment, plan } = request.body as {
    clientId: string
    subjective: string
    objective: string
    assessment: string
    plan: string
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return reply.status(503).send({ message: "AI not configured" })
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      itps: {
        where: { status: "ACTIVE" },
        include: { goals: { where: { isAchieved: false } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      }
    }
  })

  const goals = client?.itps?.[0]?.goals ?? []
  if (goals.length === 0) {
    return reply.send({ suggestions: [] })
  }

  const goalList = goals.map((g, i) => `${i+1}. [${g.id}] ${g.title} (currently ${g.progressPct}%)`).join('\n')

  const prompt = `You are reviewing a therapy session note to identify which of the client's active goals were worked on, and suggest a small progress increment.

Session note:
Subjective: ${subjective}
Objective: ${objective}
Assessment: ${assessment}
Plan: ${plan}

Active goals:
${goalList}

For each goal that the session note indicates was actually addressed in this session, suggest whether to increment progress by a small amount (typically 5%, but use 0 if no real progress was shown, or up to 10% if clear improvement was described). Do NOT suggest a goal that wasn't mentioned or worked on in the note.

Return ONLY a JSON array like:
[{"goalId": "...", "increment": 5, "reason": "one short sentence explaining why"}]

Only include goals that were genuinely addressed. If none were clearly addressed, return an empty array [].`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json() as any
    const text = data.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return reply.send({ suggestions: [] })

    const suggestions = JSON.parse(jsonMatch[0])

    // Attach current goal info for display
    const enriched = suggestions
      .filter((s: any) => goals.some(g => g.id === s.goalId))
      .map((s: any) => {
        const goal = goals.find(g => g.id === s.goalId)!
        return {
          goalId:      s.goalId,
          title:       goal.title,
          currentPct:  goal.progressPct,
          increment:   Math.max(0, Math.min(10, s.increment ?? 5)),
          newPct:      Math.min(100, goal.progressPct + Math.max(0, Math.min(10, s.increment ?? 5))),
          reason:      s.reason ?? "",
        }
      })
      .filter((s: any) => s.increment > 0)

    return reply.send({ suggestions: enriched })
  } catch (err) {
    fastify.log.error(err)
    return reply.status(500).send({ message: 'AI goal analysis failed' })
  }
})

  // ── AI assessment findings ──
  fastify.post("/ai/assessment-draft", {
    preHandler: requireRole("SUPER_ADMIN","MANAGER","THERAPIST")
  }, async (request, reply) => {
    const { clientId, templateName } = request.body as {
      clientId:     string
      templateName: string
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ message: "AI not configured" })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { fullName: true, diagnosis: true, dob: true }
    })

    const age = client?.dob
      ? Math.floor((new Date().getTime() - new Date(client.dob).getTime()) / (1000*60*60*24*365))
      : 'unknown'

    const templateDescriptions: Record<string, string> = {
      'ADOS-2':          'Autism Diagnostic Observation Schedule — structured play observation for autism diagnosis',
      'ADOS-2 Module 1': 'ADOS-2 for non-verbal or minimally verbal children',
      'CARS-2':          'Childhood Autism Rating Scale — 15-domain severity rating',
      'Vineland-3':      'Vineland Adaptive Behavior Scales — daily living skills via parent interview',
      'Sensory Profile 2': 'Dunn Sensory Profile — sensory processing questionnaire completed by parent',
      'FBA':             'Functional Behavior Assessment — identifying triggers and functions of challenging behaviours',
    }

    const prompt = `You are a clinical assessment assistant at Tumaini St. Thorlak Autism Centre, Nanyuki, Kenya.

Assessment tool: ${templateName}
Description: ${templateDescriptions[templateName] ?? templateName}
Child age: ${age} years
Diagnosis: ${client?.diagnosis ?? 'Not yet confirmed'}

Write professional assessment findings and recommendations for this ${templateName} assessment. 

Return ONLY a JSON object with keys:
- findings: 3-4 sentences describing typical findings structure for this assessment tool, with placeholders in [brackets] where the assessor should fill in specific scores or observations
- recommendations: 3-4 sentences of recommendations based on typical findings, with [brackets] for specifics`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json() as any
      const text = data.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const result = JSON.parse(jsonMatch[0])
      return reply.send(result)
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ message: 'AI generation failed' })
    }
  })
}