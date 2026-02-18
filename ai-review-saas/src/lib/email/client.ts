import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.log('Email (mock):', { to, subject })
    return { success: true, mock: true }
  }

  try {
    const result = await resend.emails.send({
      from: 'AI Review Response <noreply@yourdomain.com>',
      to,
      subject,
      html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}

export async function sendNewReviewNotification(
  to: string,
  businessName: string,
  reviewerName: string,
  rating: number,
  reviewText: string,
  reviewUrl: string
) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
  const sentiment = rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative'
  
  const subject = `New ${rating}-star review for ${businessName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Review Notification</h2>
      <p>You have a new review for <strong>${businessName}</strong></p>
      
      <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <div style="color: #fbbf24; font-size: 20px;">${stars}</div>
        <p style="margin: 8px 0;"><strong>${reviewerName}</strong> (${sentiment})</p>
        <p style="color: #666;">${reviewText.substring(0, 200)}${reviewText.length > 200 ? '...' : ''}</p>
      </div>
      
      <a href="${reviewUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View & Respond
      </a>
      
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Powered by AI Review Response
      </p>
    </div>
  `

  return sendEmail({ to, subject, html })
}

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = 'Welcome to AI Review Response!'
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome${name ? `, ${name}` : ''}!</h2>
      <p>Thank you for signing up for AI Review Response.</p>
      <p>Here's how to get started:</p>
      <ol>
        <li>Connect your Google Business account in Settings</li>
        <li>Add your business locations</li>
        <li>Configure your brand voice settings</li>
        <li>Start responding to reviews automatically!</li>
      </ol>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Get Started
      </a>
    </div>
  `

  return sendEmail({ to, subject, html })
}

export async function sendTrialEndingEmail(to: string, daysLeft: number) {
  const subject = `Your trial ends in ${daysLeft} days`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Don't lose your AI responses!</h2>
      <p>Your free trial ends in <strong>${daysLeft} days</strong>.</p>
      <p>Upgrade now to continue using AI-powered review responses.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Upgrade Now
      </a>
    </div>
  `

  return sendEmail({ to, subject, html })
}
