import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `https://app.tumainiautismcentre.adnyeri.org/reset-password?token=${resetToken}`

  try {
    const result = await resend.emails.send({
      from: 'Tumaini St. Thorlak <onboarding@resend.dev>',
      to,
      subject: 'Reset Your Tumaini Care Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #1a8c6e; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Tumaini St. Thorlak Autism Centre</h1>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #d6e8e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #1a2724; font-size: 15px;">Dear ${name},</p>
            <p style="color: #4a6359; font-size: 14px; line-height: 1.6;">
              We received a request to reset your Tumaini Care password. Click below to set a new password. This link expires in <strong>1 hour</strong>.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="background: #1a8c6e; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="color: #8aab9e; font-size: 12px;">If you did not request this, please ignore this email.</p>
            <p style="color: #8aab9e; font-size: 12px;">Or copy this link: ${resetUrl}</p>
          </div>
        </div>
      `,
    })
    console.log(`[EMAIL] ✓ Password reset email sent via Resend to ${to}`, result)
    return result
  } catch (err) {
    console.error(`[EMAIL] ✗ Resend failed to send to ${to}:`, err)
    throw err
  }
}