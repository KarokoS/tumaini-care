import AfricasTalking from 'africastalking'

const at = AfricasTalking({
  username: process.env.AT_USERNAME ?? 'sandbox',
  apiKey:   process.env.AT_API_KEY  ?? '',
})

const sms = at.SMS

function formatPhone(phone: string): string {
  return phone
    .replace(/\s+/g, '')
    .replace(/^0/, '+254')
    .replace(/^254/, '+254')
    .replace(/^\+254/, '+254')
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const phone     = formatPhone(to)
    const senderId  = process.env.AT_SENDER_ID || undefined
    const isSandbox = process.env.AT_ENV === 'sandbox'

    if (!process.env.AT_API_KEY) {
      console.log(`[SMS SKIPPED - no API key] To: ${phone} | ${message}`)
      return false
    }

    const options: any = {
      to:      [phone],
      message,
    }
    if (senderId && !isSandbox) options.from = senderId

    const result = await sms.send(options)
    const recipient = result.SMSMessageData?.Recipients?.[0]
    const success   = recipient?.status === 'Success' || recipient?.statusCode === 101

    if (success) {
      console.log(`✓ SMS sent to ${phone}`)
    } else {
      console.warn(`✗ SMS failed to ${phone}:`, recipient?.status)
    }

    return success
  } catch (err) {
    console.error('SMS error:', err)
    return false
  }
}

// ── SMS Templates ──

export async function sendAppointmentConfirmation(
  phone: string,
  childName: string,
  therapyType: string,
  date: Date,
  therapistName: string
) {
  const dateStr = date.toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const timeStr = date.toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit'
  })
  const message = `Tumaini St. Thorlak: ${childName}'s ${therapyType} session confirmed for ${dateStr} at ${timeStr} with ${therapistName}. Queries: 0797496129`
  return sendSMS(phone, message)
}

export async function sendAppointmentReminder(
  phone: string,
  childName: string,
  therapyType: string,
  date: Date,
  therapistName: string
) {
  const timeStr = date.toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit'
  })
  const message = `REMINDER - Tumaini St. Thorlak: ${childName} has a ${therapyType} session TOMORROW at ${timeStr} with ${therapistName}. Please arrive 5 mins early. Queries: 0797496129`
  return sendSMS(phone, message)
}

export async function sendSessionCompleted(
  phone: string,
  childName: string,
  therapyType: string,
  therapistName: string,
  nextDate?: Date
) {
  let message = `Tumaini St. Thorlak: ${childName}'s ${therapyType} session with ${therapistName} is complete.`
  if (nextDate) {
    const nextStr = nextDate.toLocaleDateString('en-KE', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
    message += ` Next session: ${nextStr}.`
  }
  message += ' Queries: 0797496129'
  return sendSMS(phone, message)
}

export async function sendPaymentRequest(
  phone: string,
  childName: string,
  amount: number,
  invoiceNumber: string
) {
  const message = `Tumaini St. Thorlak: Invoice ${invoiceNumber} for ${childName} - KSh ${amount.toLocaleString()}. Pay via M-Pesa Paybill 880100, Acc: 411511. Queries: 0797496129`
  return sendSMS(phone, message)
}

export async function sendPaymentConfirmation(
  phone: string,
  childName: string,
  amount: number,
  mpesaRef: string
) {
  const message = `Tumaini St. Thorlak: Payment of KSh ${amount.toLocaleString()} received for ${childName}. M-Pesa Ref: ${mpesaRef}. Thank you!`
  return sendSMS(phone, message)
}

export async function sendWelcomeSMS(
  phone: string,
  guardianName: string,
  childName: string
) {
  const message = `Welcome to Tumaini St. Thorlak Autism Centre, ${guardianName}! ${childName} has been registered. You will receive appointment reminders and updates via SMS. Queries: 0797496129`
  return sendSMS(phone, message)
}