'use client'

import { createClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'

interface SettingsPageProps {
  userId: string
  profile: any
}

export default function SettingsClient({ userId, profile }: SettingsPageProps) {
  const [googleConnected, setGoogleConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkGoogleConnection() {
      const supabase = createClient()
      const { data } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()
      
      setGoogleConnected(!!data)
      setLoading(false)
    }

    checkGoogleConnection()
  }, [userId])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Services</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="font-medium text-gray-900">Google My Business</h3>
              <p className="text-sm text-gray-500">Connect to fetch and respond to reviews</p>
            </div>
            {loading ? (
              <span className="text-sm text-gray-500">Loading...</span>
            ) : (
              <GoogleConnectButton isConnected={googleConnected} />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">OpenAI</h3>
              <p className="text-sm text-gray-500">AI-powered response generation</p>
            </div>
            <span className="text-sm text-green-600">Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
