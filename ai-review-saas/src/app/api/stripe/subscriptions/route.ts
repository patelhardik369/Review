import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, PLANS, getPlanByPriceId } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription from database
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return NextResponse.json({ subscription: null })
    }

    // Get plan details
    const plan = getPlanByPriceId(subscription.stripe_price_id || '')

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan: plan || null,
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

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
    const { action, priceId, cancelImmediately } = body

    const stripe = getStripeServer()

    // Get current subscription from database
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!currentSub) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    const subscriptionId = currentSub.stripe_subscription_id

    switch (action) {
      case 'upgrade':
      case 'downgrade': {
        if (!priceId) {
          return NextResponse.json(
            { error: 'priceId is required for upgrade/downgrade' },
            { status: 400 }
          )
        }

        // Get current subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        
        // Get the subscription item ID
        const itemId = subscription.items.data[0]?.id
        
        if (!itemId) {
          return NextResponse.json(
            { error: 'No subscription item found' },
            { status: 400 }
          )
        }

        // Update the subscription with new price
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          items: [
            {
              id: itemId,
              price: priceId,
            },
          ],
          proration_behavior: 'create_prorations',
        })

        // Update in database
        const newPlan = getPlanByPriceId(priceId)
        await supabase
          .from('subscriptions')
          .update({
            stripe_price_id: priceId,
            plan_type: newPlan?.name.toLowerCase() || 'starter',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)

        return NextResponse.json({
          success: true,
          subscription: updatedSubscription,
        })
      }

      case 'cancel': {
        let canceledSubscription

        if (cancelImmediately) {
          canceledSubscription = await stripe.subscriptions.cancel(subscriptionId)
        } else {
          canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          })
        }

        // Update in database
        await supabase
          .from('subscriptions')
          .update({
            status: canceledSubscription.status === 'active' ? 'canceled' : canceledSubscription.status,
            cancel_at_period_end: canceledSubscription.cancel_at_period_end,
            canceled_at: canceledSubscription.canceled_at 
              ? new Date(canceledSubscription.canceled_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)

        return NextResponse.json({
          success: true,
          canceledAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        })
      }

      case 'resume': {
        // If canceled at period end, we can resume
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        })

        // Update in database
        await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: false,
            status: updatedSubscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)

        return NextResponse.json({
          success: true,
          subscription: updatedSubscription,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: upgrade, downgrade, cancel, resume' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Subscription action error:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription action' },
      { status: 500 }
    )
  }
}
