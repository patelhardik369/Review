'use server'

import { createClient } from '@/lib/supabase/server'
import { createGMBClient } from '@/lib/google/gmb'
import { generateReviewResponse, analyzeSentiment, calculateCost } from '@/lib/openai/client'

export async function fetchGoogleReviews(userId: string, businessId: string) {
  const supabase = await createClient()
  
  const gmbClient = await createGMBClient(userId)
  if (!gmbClient) {
    return { error: 'Google not connected. Please connect your Google Business account.' }
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (!business || !business.gmb_account_id || !business.gmb_location_id) {
    return { error: 'Business location not configured' }
  }

  try {
    const accountName = `accounts/${business.gmb_account_id}`
    const locationName = `locations/${business.gmb_location_id}`
    
    const response = await gmbClient.getReviews(accountName, locationName)
    const reviews = response.reviews || []

    for (const review of reviews) {
      const sentiment = await analyzeSentiment(review.comment)
      
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('gmb_review_id', review.reviewId)
        .single()

      if (!existingReview) {
        await supabase.from('reviews').insert({
          business_id: businessId,
          gmb_review_id: review.reviewId,
          author_name: review.reviewer.displayName,
          author_photo_url: review.reviewer.profilePhotoUrl,
          star_rating: review.starRating,
          review_text: review.comment,
          review_time: review.createTime,
          create_time: review.createTime,
          update_time: review.updateTime,
          sentiment,
          is_responded: false,
        })
      }
    }

    return { success: true, count: reviews.length }
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return { error: 'Failed to fetch reviews from Google' }
  }
}

export async function generateAIResponse(reviewId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: review } = await supabase
    .from('reviews')
    .select('*, businesses(*)')
    .eq('id', reviewId)
    .single()

  if (!review) {
    return { error: 'Review not found' }
  }

  const { data: brandSettings } = await supabase
    .from('brand_settings')
    .select('*')
    .eq('business_id', review.business_id)
    .single()

  try {
    const { content, tokensUsed, model } = await generateReviewResponse({
      reviewText: review.review_text || '',
      rating: review.star_rating || 5,
      businessName: review.businesses.name,
      brandVoice: (brandSettings?.tone as any) || 'professional',
      greeting: brandSettings?.greeting,
      closing: brandSettings?.closing,
    })

    const costCents = calculateCost(tokensUsed)

    const { data: response, error } = await supabase
      .from('responses')
      .insert({
        review_id: reviewId,
        business_id: review.business_id,
        content,
        tone: brandSettings?.tone || 'professional',
        status: 'generated',
        ai_model: model,
        ai_tokens_used: tokensUsed,
        edit_history: [{ content, timestamp: new Date().toISOString() }],
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('usage_logs').insert({
      user_id: user.id,
      business_id: review.business_id,
      action: 'ai_response',
      tokens_used: tokensUsed,
      cost_cents: costCents,
    })

    return { success: true, response }
  } catch (error) {
    console.error('Error generating response:', error)
    return { error: 'Failed to generate AI response' }
  }
}

export async function approveResponse(responseId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('responses')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', responseId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function publishResponse(responseId: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: response } = await supabase
    .from('responses')
    .select('*, reviews(*, businesses(*))')
    .eq('id', responseId)
    .single()

  if (!response || !response.reviews) {
    return { error: 'Response not found' }
  }

  const business = response.reviews.businesses
  if (!business?.gmb_account_id || !business?.gmb_location_id) {
    return { error: 'Business not connected to Google' }
  }

  const gmbClient = await createGMBClient(user.id)
  if (!gmbClient) {
    return { error: 'Google not connected' }
  }

  try {
    const accountName = `accounts/${business.gmb_account_id}`
    const locationName = `locations/${business.gmb_location_id}`
    const reviewId = response.reviews.gmb_review_id

    const result = await gmbClient.postReply(
      accountName,
      locationName,
      reviewId,
      response.content
    )

    await supabase
      .from('responses')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        gmb_reply_id: result.createTime,
      })
      .eq('id', responseId)

    await supabase
      .from('reviews')
      .update({ is_responded: true })
      .eq('id', response.review_id)

    await supabase.rpc('increment_response_count', { business_uuid: response.business_id })

    return { success: true }
  } catch (error) {
    console.error('Error publishing response:', error)
    return { error: 'Failed to publish response to Google' }
  }
}

export async function updateResponseContent(responseId: string, newContent: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('responses')
    .select('edit_history')
    .eq('id', responseId)
    .single()

  const editHistory = existing?.edit_history || []
  editHistory.push({
    content: newContent,
    timestamp: new Date().toISOString(),
  })

  const { error } = await supabase
    .from('responses')
    .update({
      content: newContent,
      edit_history: editHistory,
      status: 'generated',
    })
    .eq('id', responseId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
