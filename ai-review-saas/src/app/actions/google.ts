'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthUrl, getTokensFromCode, saveGoogleTokens } from '@/lib/google/oauth'
import { redirect } from 'next/navigation'

export async function initiateGoogleOAuth() {
  const authUrl = getAuthUrl()
  redirect(authUrl)
}

export async function handleGoogleCallback(code: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  try {
    const tokens = await getTokensFromCode(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens from Google')
    }

    await saveGoogleTokens(
      user.id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date ? new Date(tokens.expiry_date) : null
    )

    redirect('/settings?success=google_connected')
  } catch (error) {
    console.error('Google OAuth error:', error)
    redirect('/settings?error=google_auth_failed')
  }
}
