import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

// Parse FROM address: if it does not contain a '@', we should add '<onboarding@resend.dev>'
let fromAddress = env.smtpFrom
if (!fromAddress.includes('@')) {
  fromAddress = `${fromAddress} <onboarding@resend.dev>`
}

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465, // true for port 465, false for other ports (like 587)
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
})

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const verificationLink = `http://localhost:${env.port}/api/v1/auth/verify-email?token=${token}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0; font-family: Georgia, serif;">Welcome to Knowlix!</h1>
        <p style="font-size: 16px; color: #666; margin-top: 10px;">Your personal knowledge library</p>
      </div>
      <div style="background-color: #f9f9f9; border: 1px solid #eaeaea; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="font-size: 16px; line-height: 24px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 24px;">Thank you for signing up for Knowlix. To complete your registration and start building your library, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #000; color: #fff; text-decoration: none; padding: 12px 28px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block;">Verify email</a>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 20px; margin-bottom: 0;">If the button above does not work, you can also copy and paste the link below into your browser:<br>
        <a href="${verificationLink}" style="color: #0066cc; word-break: break-all;">${verificationLink}</a></p>
      </div>
      <div style="text-align: center; font-size: 12px; color: #999;">
        <p>© 2026 Knowlix. All rights reserved.</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: '[Knowlix] Verify your account',
    html,
  })
}
