'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SubscriptionData {
  stripe_subscription_id: string
  stripe_customer_id: string
  stripe_price_id: string
  status: string
  plan_type: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_start: string | null
  trial_end: string | null
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Failed to create checkout session' }
    }

    return { url: data.url }
  } catch (error) {
    console.error('Create checkout session error:', error)
    return { error: 'Failed to create checkout session' }
  }
}

export async function getSubscription(): Promise<{ subscription: SubscriptionData | null } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/subscriptions`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Failed to get subscription' }
    }

    return { subscription: data.subscription }
  } catch (error) {
    console.error('Get subscription error:', error)
    return { error: 'Failed to get subscription' }
  }
}

export async function changePlan(
  priceId: string,
  action: 'upgrade' | 'downgrade'
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, priceId }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || `Failed to ${action} plan` }
    }

    revalidatePath('/billing')
    return { success: true }
  } catch (error) {
    console.error('Change plan error:', error)
    return { error: `Failed to ${action} plan` }
  }
}

export async function cancelSubscription(
  cancelImmediately: boolean = false
): Promise<{ success: boolean; canceledAtPeriodEnd?: boolean } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel', cancelImmediately }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Failed to cancel subscription' }
    }

    revalidatePath('/billing')
    return { success: true, canceledAtPeriodEnd: !cancelImmediately }
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return { error: 'Failed to cancel subscription' }
  }
}

export async function resumeSubscription(): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'resume' }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Failed to resume subscription' }
    }

    revalidatePath('/billing')
    return { success: true }
  } catch (error) {
    console.error('Resume subscription error:', error)
    return { error: 'Failed to resume subscription' }
  }
}

export async function createPortalSession(): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/portal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Failed to create portal session' }
    }

    return { url: data.url }
  } catch (error) {
    console.error('Create portal session error:', error)
    return { error: 'Failed to create portal session' }
  }
}
