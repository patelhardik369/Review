import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export const googleOAuth = oAuth2Client

export function getAuthUrl() {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/business.manage',
    ],
    prompt: 'consent',
  })
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oAuth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  })
  const { credentials } = await oAuth2Client.refreshAccessToken()
  return credentials
}

export async function saveGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date | null
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.from('api_keys').upsert(
    {
      user_id: userId,
      provider: 'google',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt?.toISOString() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  )

  if (error) throw error
}

export async function getGoogleTokens(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single()

  if (error) return null
  return data
}

export async function getAuthenticatedClient(userId: string) {
  const tokens = await getGoogleTokens(userId)
  if (!tokens) return null

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
    const newTokens = await refreshAccessToken(tokens.refresh_token!)
    await saveGoogleTokens(
      userId,
      newTokens.access_token!,
      newTokens.refresh_token || tokens.refresh_token,
      newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
    )
    client.setCredentials({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
    })
  } else {
    client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })
  }

  return client
}
