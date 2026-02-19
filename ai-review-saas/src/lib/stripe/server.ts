import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripeServer(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || key === 'your-stripe-secret' || key.startsWith('sk_test_') === false) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    })
  }
  return stripeInstance
}

export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    price: 4900,
    responses: 50,
    features: ['50 AI responses/month', '1 location', 'Email support'],
  },
  professional: {
    name: 'Professional',
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
    price: 9900,
    responses: 200,
    features: ['200 AI responses/month', '3 locations', 'Priority support', 'Analytics'],
  },
  business: {
    name: 'Business',
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business',
    price: 19900,
    responses: -1,
    features: ['Unlimited AI responses', '10 locations', '24/7 support', 'White-label'],
  },
}

export function getPlanByPriceId(priceId: string): typeof PLANS.starter | null {
  const plan = Object.values(PLANS).find(p => p.priceId === priceId)
  return plan || null
}

export function getPlanByType(planType: string): typeof PLANS.starter | null {
  const plan = PLANS[planType as keyof typeof PLANS]
  return plan || null
}
