import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'mail.tumainiautismcentre.adnyeri.org',
  port:   parseInt(process.env.SMTP_PORT ?? '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `https://app.tumainiautismcentre.adnyeri.org/reset-password?token=${resetToken}`

  await transporter.sendMail({
    from:    process.env.SMTP_FROM ?? 'Tumaini St. Thorlak <info@tumainiautismcentre.adnyeri.org>',
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
            We received a request to reset your password for the Tumaini Care system.
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background: #1a8c6e; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #8aab9e; font-size: 12px;">
            If you did not request a password reset, please ignore this email. Your password will not change.
          </p>
          <hr style="border: none; border-top: 1px solid #f0f4f2; margin: 20px 0;" />
          <p style="color: #8aab9e; font-size: 11px; text-align: center;">
            Tumaini St. Thorlak Autism Centre · Nanyuki, Laikipia, Kenya
          </p>
        </div>
      </div>
    `,
  })
}

export async function sendWelcomeEmail(to: string, name: string, tempPassword: string) {
  await transporter.sendMail({
    from:    process.env.SMTP_FROM ?? 'Tumaini St. Thorlak <info@tumainiautismcentre.adnyeri.org>',
    to,
    subject: 'Welcome to Tumaini Care — Your Login Details',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #1a8c6e; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Welcome to Tumaini Care</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #d6e8e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1a2724; font-size: 15px;">Dear ${name},</p>
          <p style="color: #4a6359; font-size: 14px; line-height: 1.6;">
            Your account has been created on the Tumaini St. Thorlak Autism Centre management system.
          </p>
          <div style="background: #f8faf9; border: 1px solid #d6e8e0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #8aab9e; font-size: 12px; text-transform: uppercase; font-weight: 600;">Your login details</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>URL:</strong> <a href="https://app.tumainiautismcentre.adnyeri.org" style="color: #1a8c6e;">app.tumainiautismcentre.adnyeri.org</a></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${to}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Temporary password:</strong> <code style="background: #e6f4ef; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          <p style="color: #d97706; font-size: 13px; font-weight: 500;">
            ⚠ You will be asked to set a new personal password when you first log in.
          </p>
          <hr style="border: none; border-top: 1px solid #f0f4f2; margin: 20px 0;" />
          <p style="color: #8aab9e; font-size: 11px; text-align: center;">
            Tumaini St. Thorlak Autism Centre · Nanyuki, Laikipia, Kenya
          </p>
        </div>
      </div>
    `,
  })
}