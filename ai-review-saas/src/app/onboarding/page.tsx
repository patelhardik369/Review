'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

const steps = [
  { id: 1, name: 'Welcome', description: 'Get started' },
  { id: 2, name: 'Connect Google', description: 'Link your GMB' },
  { id: 3, name: 'Add Business', description: 'Your locations' },
  { id: 4, name: 'Brand Voice', description: 'Customize responses' },
  { id: 5, name: 'Ready!', description: 'Start using' },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    website: '',
  })
  const [brandData, setBrandData] = useState({
    tone: 'professional',
    greeting: '',
    closing: '',
  })
  const router = useRouter()
  const supabase = createClient()

  async function handleConnectGoogle() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()
      
      if (apiKey) {
        setCurrentStep(3)
      } else {
        const { initiateGoogleOAuth } = await import('@/app/actions/google')
        await initiateGoogleOAuth()
      }
    }
    setLoading(false)
  }

  async function handleAddBusiness(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    await supabase.from('businesses').insert({
      user_id: user.id,
      ...businessData,
    })

    setCurrentStep(4)
    setLoading(false)
  }

  async function handleSaveBrand(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (business) {
      await supabase.from('brand_settings').upsert({
        business_id: business.id,
        user_id: user.id,
        ...brandData,
      })
    }

    setCurrentStep(5)
    setLoading(false)
  }

  function handleComplete() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-900">Welcome to AI Review Response</h1>
          <p className="mt-2 text-center text-gray-600">Let&apos;s set up your account in just a few steps</p>
        </div>

        <div className="mb-8">
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center justify-between">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
                  {step.id < currentStep ? (
                    <div className="absolute inset-0 flex items-center">
                      <div className="h-0.5 w-full bg-primary"></div>
                    </div>
                  ) : step.id === currentStep ? (
                    <div className="absolute inset-0 flex items-center">
                      <div className="h-0.5 w-full bg-gray-200"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center">
                      <div className="h-0.5 w-full bg-gray-200"></div>
                    </div>
                  )}
                  <div className="relative flex items-center justify-center">
                    {step.id < currentStep ? (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : step.id === currentStep ? (
                      <div className="h-8 w-8 rounded-full border-2 border-primary bg-white flex items-center justify-center">
                        <span className="text-primary font-medium">{step.id}</span>
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
                        <span className="text-gray-500 font-medium">{step.id}</span>
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block absolute top-10 left-1/2 -translate-x-1/2 w-20 text-center">
                    <span className="text-xs font-medium text-gray-900">{step.name}</span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {currentStep === 1 && (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Automate Your Review Responses</h2>
              <p className="mt-2 text-gray-600">
                Save time by automatically generating professional responses to your Google Business reviews using AI.
              </p>
              <ul className="mt-6 text-left text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AI-powered response generation
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Customizable brand voice
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Automatic sync with Google My Business
                </li>
              </ul>
              <button
                onClick={() => setCurrentStep(2)}
                className="mt-8 bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 font-medium"
              >
                Get Started
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-10 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Connect Google My Business</h2>
              <p className="mt-2 text-gray-600">
                Link your Google Business account to automatically fetch and respond to reviews.
              </p>
              <button
                onClick={handleConnectGoogle}
                disabled={loading}
                className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Google Account'}
              </button>
              <p className="mt-4 text-sm text-gray-500">
                <button onClick={() => setCurrentStep(3)} className="text-primary hover:underline">
                  Skip for now →
                </button>
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <form onSubmit={handleAddBusiness}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Your Business</h2>
              <p className="text-gray-600 mb-6">Tell us about your business location</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={businessData.name}
                    onChange={e => setBusinessData({ ...businessData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={businessData.address}
                    onChange={e => setBusinessData({ ...businessData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={businessData.city}
                      onChange={e => setBusinessData({ ...businessData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={businessData.state}
                      onChange={e => setBusinessData({ ...businessData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {currentStep === 4 && (
            <form onSubmit={handleSaveBrand}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Brand Voice</h2>
              <p className="text-gray-600 mb-6">Customize how AI responds to your reviews</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['professional', 'friendly', 'casual', 'formal'].map(tone => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setBrandData({ ...brandData, tone })}
                        className={`py-2 px-3 rounded-md text-sm capitalize ${
                          brandData.tone === tone
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Greeting (optional)</label>
                  <input
                    type="text"
                    value={brandData.greeting}
                    onChange={e => setBrandData({ ...brandData, greeting: e.target.value })}
                    placeholder="e.g., Thank you for your feedback!"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Closing (optional)</label>
                  <input
                    type="text"
                    value={brandData.closing}
                    onChange={e => setBrandData({ ...brandData, closing: e.target.value })}
                    placeholder="e.g., We look forward to serving you again!"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          )}

          {currentStep === 5 && (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">You&apos;re All Set!</h2>
              <p className="mt-2 text-gray-600">
                Your account is ready. Start managing your reviews with AI-powered responses.
              </p>
              <button
                onClick={handleComplete}
                className="mt-8 bg-primary text-white px-8 py-3 rounded-md hover:bg-primary/90 font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
