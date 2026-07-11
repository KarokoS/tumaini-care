import { prisma } from './prisma'
import { sendAppointmentReminder } from './sms'

export async function sendTomorrowReminders() {
  const tomorrow      = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: tomorrow, lt: dayAfter },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    include: {
      client: {
        include: { guardians: { where: { isPrimary: true } } }
      },
      therapist: { select: { fullName: true } }
    }
  })

  let sent = 0
  for (const appt of appointments) {
    const guardian = appt.client?.guardians?.[0]
    if (guardian?.phone && appt.client?.fullName) {
      const success = await sendAppointmentReminder(
        guardian.phone,
        appt.client.fullName,
        appt.therapyType,
        new Date(appt.scheduledAt),
        appt.therapist?.fullName ?? 'your therapist'
      )
      if (success) sent++
    }
  }

  console.log(`✓ Sent ${sent}/${appointments.length} appointment reminders`)
  return { sent, total: appointments.length }
}