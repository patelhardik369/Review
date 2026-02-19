import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import SettingsClient from '@/components/SettingsClient'
import { BusinessManager } from '@/components/BusinessManager'
import { getNotificationPreferences, saveNotificationPreferences } from '@/app/actions/notifications'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)

  const notificationPrefs = await getNotificationPreferences(user.id)

  async function updateProfile(formData: FormData) {
    'use server'
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const fullName = formData.get('full_name') as string
    const companyName = formData.get('company_name') as string

    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      company_name: companyName,
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/settings')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <form action={updateProfile} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={profile?.full_name || ''}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              defaultValue={profile?.company_name || ''}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Save Changes
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <BusinessManager businesses={businesses || []} userId={user.id} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Brand Voice</h2>
        <a
          href="/settings/brand"
          className="text-primary hover:text-primary/80 text-sm"
        >
          Configure brand voice settings →
        </a>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
        <form action={saveNotificationPreferences} className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-500">Receive email alerts for review activity</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="email_enabled" 
                value="true"
                defaultChecked={notificationPrefs?.email_enabled ?? true}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">When to notify</h3>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="email_for_new_reviews" 
                value="true"
                defaultChecked={notificationPrefs?.email_for_new_reviews ?? true}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900">New reviews</span>
                <p className="text-sm text-gray-500">Get notified when you receive new reviews</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="email_for_responses_needed" 
                value="true"
                defaultChecked={notificationPrefs?.email_for_responses_needed ?? true}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900">Responses needed</span>
                <p className="text-sm text-gray-500">Get notified when reviews need a response</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="email_for_negative_reviews" 
                value="true"
                defaultChecked={notificationPrefs?.email_for_negative_reviews ?? true}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-gray-900">Negative reviews (1-2 stars)</span>
                <p className="text-sm text-gray-500">Get immediate alerts for negative reviews</p>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-4">Email Digest</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digest frequency
                </label>
                <select 
                  name="email_digest" 
                  defaultValue={notificationPrefs?.email_digest ?? 'none'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="none">No digest</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Receive a summary of your review activity instead of individual notifications
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of week (for weekly)
                  </label>
                  <select 
                    name="digest_send_day" 
                    defaultValue={notificationPrefs?.digest_send_day ?? 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send time
                  </label>
                  <input 
                    type="time" 
                    name="digest_send_time"
                    defaultValue={notificationPrefs?.digest_send_time ?? '09:00'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Save Notification Preferences
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Services</h2>
        <SettingsClient userId={user.id} profile={profile} />
      </div>
    </div>
  )
}
