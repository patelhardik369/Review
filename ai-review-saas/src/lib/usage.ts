import { createClient } from '@/lib/supabase/server'

const PLAN_LIMITS: Record<string, number> = {
  starter: 50,
  professional: 200,
  business: -1,
  agency: -1,
}

const PLAN_LOCATIONS: Record<string, number> = {
  starter: 1,
  professional: 3,
  business: 10,
  agency: -1,
}

export interface UsageCheck {
  canGenerateResponse: boolean
  responsesUsed: number
  responsesLimit: number
  responsesRemaining: number
  reason?: string
}

export async function checkUsageLimit(userId: string, businessId: string): Promise<UsageCheck> {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('action', 'ai_response')

  const responsesUsed = usageLogs?.length || 0
  const planType = subscription?.plan_type || 'free'
  const limit = PLAN_LIMITS[planType] || 5

  if (limit !== -1 && responsesUsed >= limit) {
    return {
      canGenerateResponse: false,
      responsesUsed,
      responsesLimit: limit,
      responsesRemaining: 0,
      reason: `You have reached your ${planType} plan limit of ${limit} AI responses. Upgrade to continue generating responses.`,
    }
  }

  return {
    canGenerateResponse: true,
    responsesUsed,
    responsesLimit: limit,
    responsesRemaining: limit === -1 ? -1 : limit - responsesUsed,
  }
}

export async function checkLocationLimit(userId: string): Promise<{ canAddLocation: boolean; locationsUsed: number; locationsLimit: number; reason?: string }> {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', userId)

  const locationsUsed = businesses?.length || 0
  const planType = subscription?.plan_type || 'free'
  const limit = PLAN_LOCATIONS[planType] || 1

  if (limit !== -1 && locationsUsed >= limit) {
    return {
      canAddLocation: false,
      locationsUsed,
      locationsLimit: limit,
      reason: `You have reached your ${planType} plan limit of ${limit} location(s). Upgrade to add more.`,
    }
  }

  return {
    canAddLocation: true,
    locationsUsed,
    locationsLimit: limit,
  }
}

export async function logUsage(
  userId: string,
  businessId: string,
  action: 'review_fetch' | 'ai_response' | 'email_sent' | 'api_call',
  tokensUsed: number = 0,
  costCents: number = 0
) {
  const supabase = await createClient()

  await supabase.from('usage_logs').insert({
    user_id: userId,
    business_id: businessId,
    action,
    tokens_used: tokensUsed,
    cost_cents: costCents,
  })
}

export function getPlanInfo(planType: string | null) {
  const plans = {
    starter: { name: 'Starter', price: '$49/mo', responses: 50, locations: 1 },
    professional: { name: 'Professional', price: '$99/mo', responses: 200, locations: 3 },
    business: { name: 'Business', price: '$199/mo', responses: 'Unlimited', locations: 10 },
    agency: { name: 'Agency', price: '$499/mo', responses: 'Unlimited', locations: 'Unlimited' },
    free: { name: 'Free', price: '$0', responses: 5, locations: 1 },
  }
  return plans[planType as keyof typeof plans] || plans.free
}
