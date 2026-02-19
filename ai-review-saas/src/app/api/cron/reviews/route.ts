import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGMBClient } from '@/lib/google/gmb'

const RATE_LIMIT_DELAY = 1000
const MAX_RETRIES = 3
const RETRY_DELAY = 5000

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const err = error as Error & { message?: string }
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        console.log(`Rate limited, retrying in ${RETRY_DELAY / 1000}s...`)
        await sleep(RETRY_DELAY)
      } else if (i === retries - 1) {
        throw error
      } else {
        await sleep(RATE_LIMIT_DELAY)
      }
    }
  }
  throw new Error('Max retries exceeded')
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

  try {
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, user_id, gmb_account_id, gmb_location_id, gmb_location_name')
      .eq('is_active', true)
      .not('gmb_account_id', 'is', null)
      .not('gmb_location_id', 'is', null)

    if (businessError) {
      console.error('Error fetching businesses:', businessError)
      return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 })
    }

    const results = {
      synced: 0,
      errors: 0,
      businesses: [] as { id: string; status: string; reviewsCount: number }[]
    }

    for (const business of businesses) {
      try {
        await sleep(RATE_LIMIT_DELAY)

        const client = await createGMBClient(business.user_id)
        
        if (!client) {
          results.errors++
          results.businesses.push({
            id: business.id,
            status: 'failed: no gmb client',
            reviewsCount: 0
          })
          continue
        }

        const accountName = `accounts/${business.gmb_account_id}`
        const locationName = `locations/${business.gmb_location_id}`

        const reviewsData = await fetchWithRetry(() => 
          client.getReviews(accountName, locationName)
        )

        const reviews = reviewsData.reviews || []

        for (const review of reviews) {
          const reviewData = {
            business_id: business.id,
            gmb_review_id: review.reviewId,
            author_name: review.reviewer?.displayName || 'Anonymous',
            author_photo_url: review.reviewer?.profilePhotoUrl || null,
            star_rating: review.starRating,
            review_text: review.comment || '',
            review_time: review.createTime ? new Date(review.createTime).toISOString() : null,
            create_time: review.createTime ? new Date(review.createTime).toISOString() : null,
            update_time: review.updateTime ? new Date(review.updateTime).toISOString() : null,
            sentiment: review.starRating >= 4 ? 'positive' : review.starRating === 3 ? 'neutral' : 'negative',
            is_responded: false,
          }

          const { error: upsertError } = await supabase
            .from('reviews')
            .upsert({ 
              ...reviewData 
            }, { 
              onConflict: 'gmb_review_id',
              ignoreDuplicates: false 
            })

          if (upsertError) {
            console.error('Error upserting review:', upsertError)
          }
        }

        await supabase
          .from('businesses')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', business.id)

        results.synced++
        results.businesses.push({
          id: business.id,
          status: 'success',
          reviewsCount: reviews.length
        })

      } catch (error: unknown) {
        const err = error as Error & { message?: string }
        console.error(`Error syncing business ${business.id}:`, err.message)
        results.errors++
        results.businesses.push({
          id: business.id,
          status: `error: ${err.message}`,
          reviewsCount: 0
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    })

  } catch (error: unknown) {
    const err = error as Error & { message?: string }
    console.error('Review sync error:', err)
    return NextResponse.json({ 
      error: 'Review sync failed',
      message: err.message 
    }, { status: 500 })
  }
}
