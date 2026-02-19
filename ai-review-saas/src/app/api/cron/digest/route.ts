import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { sendDigestEmail, DigestStats } from '@/lib/email/digest'

const RATE_LIMIT_DELAY = 500

type AppSupabase = SupabaseClient<any, any, any>

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface BusinessRow {
  id: string
  name: string
}

interface ReviewRow {
  id: string
  business_id: string
  star_rating: number | null
  is_responded: boolean
  created_at: string
}

async function getUserDigestStats(
  supabase: AppSupabase,
  userId: string,
  daysBack: number
): Promise<DigestStats[]> {
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (bizError || !businesses || businesses.length === 0) {
    return []
  }

  const typedBusinesses = businesses as unknown as BusinessRow[]
  const businessIds = typedBusinesses.map(b => b.id)
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - daysBack)

  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('id, business_id, star_rating, is_responded, created_at')
    .in('business_id', businessIds)
    .gte('created_at', sinceDate.toISOString())

  if (reviewsError || !reviews) {
    return []
  }

  const typedReviews = reviews as unknown as ReviewRow[]

  const stats: DigestStats[] = typedBusinesses.map(business => {
    const bizReviews = typedReviews.filter(r => r.business_id === business.id)
    const newReviews = bizReviews.length
    const totalRatings = bizReviews.filter(r => r.star_rating)
    const avgRating = totalRatings.length > 0
      ? totalRatings.reduce((sum, r) => sum + (r.star_rating || 0), 0) / totalRatings.length
      : 0

    const fiveStar = bizReviews.filter(r => r.star_rating === 5).length
    const fourStar = bizReviews.filter(r => r.star_rating === 4).length
    const threeStar = bizReviews.filter(r => r.star_rating === 3).length
    const twoStar = bizReviews.filter(r => r.star_rating === 2).length
    const oneStar = bizReviews.filter(r => r.star_rating === 1).length

    const respondedCount = bizReviews.filter(r => r.is_responded).length
    const pendingCount = newReviews - respondedCount
    const positivePercentage = newReviews > 0
      ? ((fiveStar + fourStar) / newReviews) * 100
      : 100

    return {
      businessName: business.name,
      totalReviews: newReviews,
      newReviews,
      avgRating,
      fiveStar,
      fourStar,
      threeStar,
      twoStar,
      oneStar,
      respondedCount,
      pendingCount,
      positivePercentage,
    }
  })

  return stats
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (process.env.VERCEL_ENV === 'production' && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const dayOfWeek = new Date().getDay()

  type PrefRow = {
    user_id: string
    email: string | null
    digest_send_day: number | null
    digest_send_time: string
  }

  type ProfileRow = {
    full_name: string | null
    email: string | null
  }

  try {
    const { data: dailyUsers, error: dailyError } = await supabase
      .from('notification_preferences')
      .select('user_id, email, digest_send_time')
      .eq('email_enabled', true)
      .eq('email_digest', 'daily')

    if (dailyError) {
      console.error('Error fetching daily digest users:', dailyError)
    }

    const { data: weeklyUsers, error: weeklyError } = await supabase
      .from('notification_preferences')
      .select('user_id, email, digest_send_day, digest_send_time')
      .eq('email_enabled', true)
      .eq('email_digest', 'weekly')
      .eq('digest_send_day', dayOfWeek)

    if (weeklyError) {
      console.error('Error fetching weekly digest users:', weeklyError)
    }

    const results = {
      dailySent: 0,
      dailyErrors: 0,
      weeklySent: 0,
      weeklyErrors: 0,
      users: [] as { userId: string; status: string }[]
    }

    const typedDailyUsers = (dailyUsers || []) as PrefRow[]
    const typedWeeklyUsers = (weeklyUsers || []) as PrefRow[]

    const processUsers = async (
      users: PrefRow[], 
      period: 'daily' | 'weekly'
    ) => {
      for (const userPref of users) {
        try {
          await sleep(RATE_LIMIT_DELAY)

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', userPref.user_id)
            .single()

          const typedProfile = profile as ProfileRow | null
          const userEmail = userPref.email || typedProfile?.email
          if (!userEmail) {
            results.users.push({ userId: userPref.user_id, status: 'error: no email' })
            continue
          }

          const daysBack = period === 'daily' ? 1 : 7
          const businesses = await getUserDigestStats(supabase, userPref.user_id, daysBack)

          if (businesses.length === 0 || businesses.every(b => b.newReviews === 0)) {
            results.users.push({ userId: userPref.user_id, status: 'skipped: no activity' })
            continue
          }

          const result = await sendDigestEmail(
            userEmail,
            typedProfile?.full_name || '',
            businesses,
            period
          )

          if (result.success) {
            await supabase
              .from('notification_preferences')
              .update({ last_digest_sent: new Date().toISOString() })
              .eq('user_id', userPref.user_id)

            results.users.push({ userId: userPref.user_id, status: 'sent' })
          } else {
            results.users.push({ userId: userPref.user_id, status: 'error: send failed' })
          }
        } catch (error: unknown) {
          const err = error as Error & { message?: string }
          console.error(`Error processing digest for user ${userPref.user_id}:`, err.message)
          results.users.push({ userId: userPref.user_id, status: `error: ${err.message}` })
        }
      }
    }

    if (typedDailyUsers.length > 0) {
      await processUsers(typedDailyUsers, 'daily')
      results.dailySent = typedDailyUsers.length
    }

    if (typedWeeklyUsers.length > 0) {
      await processUsers(typedWeeklyUsers, 'weekly')
      results.weeklySent = typedWeeklyUsers.length
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dayOfWeek,
      ...results
    })

  } catch (error: unknown) {
    const err = error as Error & { message?: string }
    console.error('Digest cron error:', err)
    return NextResponse.json({ 
      error: 'Digest cron failed',
      message: err.message 
    }, { status: 500 })
  }
}
