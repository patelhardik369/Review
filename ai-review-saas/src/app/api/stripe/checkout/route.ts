import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, PLANS } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { priceId, planType } = body

    if (!priceId && !planType) {
      return NextResponse.json(
        { error: 'priceId or planType is required' },
        { status: 400 }
      )
    }

    const stripe = getStripeServer()

    // Get user's Stripe customer ID from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || '',
        name: profile?.full_name || '',
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Determine the price ID
    let selectedPriceId = priceId
    if (!selectedPriceId && planType) {
      const plan = PLANS[planType as keyof typeof PLANS]
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
      }
      selectedPriceId = plan.priceId
    }

    // Get the plan info
    const planInfo = Object.values(PLANS).find(p => p.priceId === selectedPriceId)

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          planType: planInfo?.name || 'Unknown',
        },
      },
      metadata: {
        userId: user.id,
        planType: planInfo?.name || 'Unknown',
      },
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
