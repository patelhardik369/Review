'use client'

import { useState } from 'react'
import { createCheckoutSession, getSubscription, cancelSubscription } from '@/lib/actions/billing'
import Link from 'next/link'

interface Plan {
  name: string
  price: string
  interval: string
  priceId: string
  features: string[]
  current: boolean
}

interface Subscription {
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

function BillingClient({ 
  initialSubscription, 
  initialUsageCount,
  initialBusinessCount,
  plans 
}: { 
  initialSubscription: Subscription | null
  initialUsageCount: number
  initialBusinessCount: number
  plans: Plan[]
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(initialSubscription)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing'
  
  const currentPlan = plans.find(p => p.current) || plans[0]

  const handleCheckout = async (priceId: string) => {
    setLoading(priceId)
    setError(null)
    
    const result = await createCheckoutSession(priceId)
    
    if ('error' in result) {
      setError(result.error)
      setLoading(null)
      return
    }
    
    if (result.url) {
      window.location.href = result.url
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return
    }
    
    setLoading('cancel')
    setError(null)
    
    const result = await cancelSubscription(false)
    
    if ('error' in result) {
      setError(result.error)
    } else if (result.success) {
      setSuccessMessage('Your subscription will be canceled at the end of the billing period.')
      setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } : null)
    }
    
    setLoading(null)
  }

  const getPlanInfo = (planType: string | null) => {
    const planMap: Record<string, { responses: number | string; locations: number | string }> = {
      starter: { responses: 50, locations: 1 },
      professional: { responses: 200, locations: 3 },
      business: { responses: 'Unlimited', locations: 10 },
    }
    return planMap[planType || 'starter'] || { responses: 0, locations: 0 }
  }

  const planInfo = getPlanInfo(subscription?.plan_type || null)

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {hasActiveSubscription && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-primary capitalize">
                {subscription?.plan_type || 'Free'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {initialUsageCount} / {planInfo.responses === 'Unlimited' ? '∞' : planInfo.responses} AI responses used
              </p>
              <p className="text-sm text-gray-500">
                {initialBusinessCount} / {planInfo.locations === 'Unlimited' ? '∞' : planInfo.locations} locations
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
              {subscription?.cancel_at_period_end && (
                <p className="text-sm text-red-600 mt-1">
                  Canceling at end of billing period
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
          
          <div className="mt-4 pt-4 border-t flex gap-4">
            <button
              onClick={handleCancel}
              disabled={loading === 'cancel' || subscription?.cancel_at_period_end}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      )}

      {!hasActiveSubscription && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900">Start your free trial</h2>
          <p className="mt-2 text-sm text-gray-600">
            Get started with 14-day free trial. Select a plan below to begin.
          </p>
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
                onClick={() => handleCheckout(plan.priceId)}
                disabled={plan.current || loading === plan.priceId}
                className={`mt-6 w-full py-2 px-4 rounded-md text-sm font-medium ${
                  plan.current
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
                }`}
              >
                {loading === plan.priceId ? 'Processing...' : plan.current ? 'Current Plan' : 'Subscribe'}
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
          Managed through Stripe. Click any plan above to add payment details.
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <BillingClient 
      initialSubscription={null}
      initialUsageCount={0}
      initialBusinessCount={0}
      plans={[
        {
          name: 'Starter',
          price: '$49',
          interval: 'month',
          priceId: 'price_1T2QKYPKQTGcNVnelSJpssnt',
          features: ['50 AI responses/month', '1 location', 'Email support', 'Google Reviews'],
          current: false,
        },
        {
          name: 'Professional',
          price: '$99',
          interval: 'month',
          priceId: 'price_1T2QMNPKQTGcNVnefOeGDQco',
          features: ['200 AI responses/month', '3 locations', 'Priority support', 'Analytics'],
          current: false,
        },
        {
          name: 'Business',
          price: '$199',
          interval: 'month',
          priceId: 'price_1T2QO1PKQTGcNVneJZdXQHP6',
          features: ['Unlimited responses', '10 locations', '24/7 support', 'White-label'],
          current: false,
        },
      ]}
    />
  )
}
