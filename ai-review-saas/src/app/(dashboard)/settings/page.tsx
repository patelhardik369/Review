import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import SettingsClient from '@/components/SettingsClient'
import { BusinessManager } from '@/components/BusinessManager'

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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Services</h2>
        <SettingsClient userId={user.id} profile={profile} />
      </div>
    </div>
  )
}
