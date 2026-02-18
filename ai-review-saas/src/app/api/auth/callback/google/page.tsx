import { handleGoogleCallback } from '@/app/actions/google'
import { redirect } from 'next/navigation'

export default async function GoogleCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>
}) {
  const params = await searchParams
  const code = params.code
  const error = params.error

  if (error) {
    redirect('/settings?error=google_auth_failed')
  }

  if (!code) {
    redirect('/settings?error=missing_code')
  }

  await handleGoogleCallback(code)
}
