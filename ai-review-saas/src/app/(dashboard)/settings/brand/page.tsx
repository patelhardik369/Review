import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export default async function BrandSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)

  const businessId = businesses?.[0]?.id

  const { data: brandSettings } = businessId
    ? await supabase
        .from('brand_settings')
        .select('*')
        .eq('business_id', businessId)
        .single()
    : { data: null }

  async function saveBrandSettings(formData: FormData) {
    'use server'
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (!businesses?.[0]) return

    const tone = formData.get('tone') as string
    const greeting = formData.get('greeting') as string
    const closing = formData.get('closing') as string
    const responseLength = formData.get('response_length') as string
    const includeCoupon = formData.get('include_coupon') === 'on'
    const couponCode = formData.get('coupon_code') as string
    const autoPublish = formData.get('auto_publish') === 'on'
    const notifyOnNegative = formData.get('notify_on_negative') === 'on'

    await supabase.from('brand_settings').upsert({
      business_id: businesses[0].id,
      user_id: user.id,
      tone,
      greeting,
      closing,
      response_length: responseLength,
      include_coupon: includeCoupon,
      coupon_code: includeCoupon ? couponCode : null,
      auto_publish: autoPublish,
      notify_on_negative: notifyOnNegative,
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/settings/brand')
  }

  if (!businesses || businesses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Voice Settings</h1>
          <p className="text-sm text-gray-600">Customize AI responses to match your brand</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Please add a business first to configure brand settings.</p>
          <a href="/settings" className="text-primary hover:underline mt-2 inline-block">
            Go to Settings
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brand Voice Settings</h1>
        <p className="text-sm text-gray-600">Customize AI responses to match your brand</p>
      </div>

      <form action={saveBrandSettings} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tone & Style</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {['professional', 'friendly', 'casual', 'formal'].map((tone) => (
              <label key={tone} className="cursor-pointer">
                <input
                  type="radio"
                  name="tone"
                  value={tone}
                  defaultChecked={brandSettings?.tone === tone || (!brandSettings && tone === 'professional')}
                  className="sr-only peer"
                />
                <div className="p-4 border-2 border-gray-200 rounded-lg text-center peer-checked:border-primary peer-checked:bg-primary/5 hover:border-gray-300 transition">
                  <span className="capitalize font-medium">{tone}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Greeting
              </label>
              <input
                type="text"
                name="greeting"
                defaultValue={brandSettings?.greeting || ''}
                placeholder="e.g., Thank you for your feedback!"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Closing
              </label>
              <input
                type="text"
                name="closing"
                defaultValue={brandSettings?.closing || ''}
                placeholder="e.g., We look forward to serving you again!"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Response Length</label>
              <div className="flex gap-4">
                {['short', 'medium', 'long'].map((length) => (
                  <label key={length} className="cursor-pointer flex items-center gap-2">
                    <input
                      type="radio"
                      name="response_length"
                      value={length}
                      defaultChecked={brandSettings?.response_length === length || (!brandSettings && length === 'medium')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="capitalize text-sm">{length}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Short: ~50 words • Medium: ~100 words • Long: ~150 words
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Automation</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="auto_publish"
                defaultChecked={brandSettings?.auto_publish || false}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Auto-publish approved responses</span>
                <p className="text-sm text-gray-500">Automatically publish to Google after approval</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="notify_on_negative"
                defaultChecked={brandSettings?.notify_on_negative !== false}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Notify on negative reviews</span>
                <p className="text-sm text-gray-500">Get email alerts for 1-2 star reviews</p>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coupons (Optional)</h2>
          
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              name="include_coupon"
              defaultChecked={brandSettings?.include_coupon || false}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <span className="font-medium text-gray-900">Include coupon code in responses</span>
          </label>

          <div className={brandSettings?.include_coupon ? '' : 'opacity-50 pointer-events-none'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coupon Code
            </label>
            <input
              type="text"
              name="coupon_code"
              defaultValue={brandSettings?.coupon_code || ''}
              placeholder="e.g., SAVE20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 font-medium"
        >
          Save Brand Settings
        </button>
      </form>
    </div>
  )
}
