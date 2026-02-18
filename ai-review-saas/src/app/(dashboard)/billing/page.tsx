import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPlanInfo } from '@/lib/usage'
import Link from 'next/link'

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('action', 'ai_response')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)

  const planInfo = getPlanInfo(subscription?.plan_type || null)
  const responsesUsed = usageLogs?.length || 0

  const plans = [
    {
      name: 'Starter',
      price: '$49',
      interval: 'month',
      priceId: 'price_starter',
      features: ['50 AI responses/month', '1 location', 'Email support', 'Google Reviews'],
      current: subscription?.plan_type === 'starter',
    },
    {
      name: 'Professional',
      price: '$99',
      interval: 'month',
      priceId: 'price_professional',
      features: ['200 AI responses/month', '3 locations', 'Priority support', 'Analytics'],
      current: subscription?.plan_type === 'professional',
    },
    {
      name: 'Business',
      price: '$199',
      interval: 'month',
      priceId: 'price_business',
      features: ['Unlimited responses', '10 locations', '24/7 support', 'White-label'],
      current: subscription?.plan_type === 'business',
    },
  ]

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-600">Manage your subscription and billing</p>
      </div>

      {hasActiveSubscription && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-primary capitalize">
                {subscription?.plan_type || 'Free'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {responsesUsed} / {planInfo.responses === 'Unlimited' ? '∞' : planInfo.responses} AI responses used
              </p>
              <p className="text-sm text-gray-500">
                {(businesses?.length || 0)} / {planInfo.locations === 'Unlimited' ? '∞' : planInfo.locations} locations
              </p>
              {subscription?.status === 'trialing' && subscription?.trial_end && (
                <p className="text-sm text-blue-600 mt-1">
                  Trial ends {new Date(subscription.trial_end).toLocaleDateString()}
                </p>
              )}
              {subscription?.status === 'active' && subscription?.current_period_end && (
                <p className="text-sm text-gray-500">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                subscription?.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : subscription?.status === 'trialing'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {subscription?.status}
            </span>
          </div>
          
          {!hasActiveSubscription && (
            <div className="mt-4 pt-4 border-t">
              <Link
                href="/onboarding"
                className="text-primary hover:text-primary/80 text-sm"
              >
                Complete onboarding to activate →
              </Link>
            </div>
          )}
        </div>
      )}

      {!hasActiveSubscription && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900">Start your free trial</h2>
          <p className="mt-2 text-sm text-gray-600">
            Get started with 14-day free trial. Complete onboarding to activate your trial.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Start Free Trial
          </Link>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-lg p-6 ${
                plan.current ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
            >
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-gray-500">/{plan.interval}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-green-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-6 w-full py-2 px-4 rounded-md text-sm font-medium ${
                  plan.current
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
        <p className="text-sm text-gray-600">
          Manage your payment methods and billing history.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Stripe integration coming soon. Add your payment details to upgrade.
        </p>
      </div>
    </div>
  )
}
