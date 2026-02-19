import { sendEmail } from './client'

export interface DigestStats {
  businessName: string
  totalReviews: number
  newReviews: number
  avgRating: number
  fiveStar: number
  fourStar: number
  threeStar: number
  twoStar: number
  oneStar: number
  respondedCount: number
  pendingCount: number
  positivePercentage: number
}

export async function sendDigestEmail(
  to: string,
  userName: string,
  businesses: DigestStats[],
  period: 'daily' | 'weekly'
) {
  const periodText = period === 'daily' ? 'today' : 'this week'
  
  const businessRows = businesses.map(business => `
    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h3 style="margin: 0 0 12px 0; color: #1f2937;">${business.businessName}</h3>
      
      <div style="display: flex; gap: 24px; margin-bottom: 12px;">
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">${business.newReviews}</div>
          <div style="font-size: 12px; color: #6b7280;">New Reviews</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">${business.avgRating.toFixed(1)}</div>
          <div style="font-size: 12px; color: #6b7280;">Avg Rating</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: bold; ${business.pendingCount > 0 ? '#dc2626' : '#10b981'};">${business.pendingCount}</div>
          <div style="font-size: 12px; color: #6b7280;">Pending</div>
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Rating Distribution</div>
        <div style="display: flex; gap: 4px; height: 8px;">
          ${getStarBar(business.fiveStar, business.totalReviews, '#22c55e')}
          ${getStarBar(business.fourStar, business.totalReviews, '#84cc16')}
          ${getStarBar(business.threeStar, business.totalReviews, '#eab308')}
          ${getStarBar(business.twoStar, business.totalReviews, '#f97316')}
          ${getStarBar(business.oneStar, business.totalReviews, '#ef4444')}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; margin-top: 2px;">
          <span>5★</span><span>4★</span><span>3★</span><span>2★</span><span>1★</span>
        </div>
      </div>
    </div>
  `).join('')

  const subject = period === 'daily' 
    ? `Your daily review digest - ${new Date().toLocaleDateString()}`
    : `Your weekly review digest - Week of ${new Date().toLocaleDateString()}`

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Your Review Digest ${period === 'weekly' ? '📊' : '📅'}</h2>
      <p style="color: #6b7280;">Here's what happened ${periodText}, ${userName || 'there'}.</p>

      ${businessRows}

      ${businesses.some(b => b.pendingCount > 0) ? `
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #991b1b; font-weight: 600;">
            ⚠️ You have ${businesses.reduce((sum, b) => sum + b.pendingCount, 0)} reviews waiting for a response
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/reviews" style="display: inline-block; background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 12px; font-size: 14px;">
            Respond Now →
          </a>
        </div>
      ` : `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #166534; font-weight: 600;">
            🎉 All caught up! You've responded to all your reviews.
          </p>
        </div>
      `}

      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Manage your notification preferences in 
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #4f46e5;">Settings</a>
      </p>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
        Powered by AI Review Response
      </p>
    </div>
  `

  return sendEmail({ to, subject, html })
}

function getStarBar(count: number, total: number, color: string): string {
  const percentage = total > 0 ? (count / total) * 100 : 0
  return `<div style="flex: 1; background: ${color}; border-radius: 2px; min-width: 4px;" style="width: ${percentage}%;"></div>`
}

export async function sendResponsesNeededDigest(
  to: string,
  userName: string,
  businessName: string,
  pendingCount: number
) {
  const subject = `Action needed: ${pendingCount} reviews await your response`
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Reviews Need Your Attention</h2>
      <p>Hi ${userName || 'there'},</p>
      <p>You have <strong>${pendingCount} reviews</strong> awaiting a response for <strong>${businessName}</strong>.</p>
      
      <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">
          Don't let reviews go unanswered - customers appreciate a prompt response!
        </p>
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/reviews" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Pending Reviews →
      </a>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Manage your notification preferences in 
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #4f46e5;">Settings</a>
      </p>
    </div>
  `

  return sendEmail({ to, subject, html })
}
