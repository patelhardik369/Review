'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotificationPreferences = {
  id?: string
  user_id: string
  email_enabled: boolean
  email_for_new_reviews: boolean
  email_for_responses_needed: boolean
  email_for_negative_reviews: boolean
  email_digest: 'none' | 'daily' | 'weekly'
  digest_send_day: number | null
  digest_send_time: string
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    email_enabled: data.email_enabled ?? true,
    email_for_new_reviews: data.email_for_new_reviews ?? true,
    email_for_responses_needed: data.email_for_responses_needed ?? true,
    email_for_negative_reviews: data.email_for_negative_reviews ?? true,
    email_digest: data.email_digest ?? 'none',
    digest_send_day: data.digest_send_day,
    digest_send_time: data.digest_send_time ?? '09:00',
  }
}

export async function saveNotificationPreferences(formData: FormData): Promise<void> {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  const emailEnabled = formData.get('email_enabled') === 'true'
  const emailForNewReviews = formData.get('email_for_new_reviews') === 'true'
  const emailForResponsesNeeded = formData.get('email_for_responses_needed') === 'true'
  const emailForNegativeReviews = formData.get('email_for_negative_reviews') === 'true'
  const emailDigest = formData.get('email_digest') as 'none' | 'daily' | 'weekly'
  const digestSendDay = formData.get('digest_send_day') 
    ? parseInt(formData.get('digest_send_day') as string, 10) 
    : null
  const digestSendTime = formData.get('digest_send_time') as string || '09:00'

  await supabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      email_enabled: emailEnabled,
      email_for_new_reviews: emailForNewReviews,
      email_for_responses_needed: emailForResponsesNeeded,
      email_for_negative_reviews: emailForNegativeReviews,
      email_digest: emailDigest,
      digest_send_day: emailDigest === 'weekly' ? digestSendDay : null,
      digest_send_time: digestSendTime,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  revalidatePath('/settings')
}

export async function shouldSendReviewNotification(
  userId: string,
  reviewStarRating: number
): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId)
  
  if (!prefs || !prefs.email_enabled) {
    return false
  }

  if (reviewStarRating <= 2) {
    return prefs.email_for_negative_reviews
  }

  return prefs.email_for_new_reviews
}
