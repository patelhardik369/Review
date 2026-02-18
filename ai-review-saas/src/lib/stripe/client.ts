import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || key === 'your-stripe-secret') {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-03-31.basil' as any,
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

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14,
    },
  })

  return session
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export async function getSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId)
}

export async function cancelSubscription(subscriptionId: string, immediately = false) {
  const stripe = getStripe()
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId)
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

export async function createCustomer(email: string, name?: string) {
  return getStripe().customers.create({
    email,
    name,
  })
}

export function constructWebhookEvent(payload: Buffer, signature: string) {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  )
}
