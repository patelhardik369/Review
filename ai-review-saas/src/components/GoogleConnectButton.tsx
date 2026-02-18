'use client'

import { initiateGoogleOAuth } from '@/app/actions/google'
import { useState, useEffect } from 'react'

interface GoogleConnectButtonProps {
  isConnected: boolean
}

export function GoogleConnectButton({ isConnected }: GoogleConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      await initiateGoogleOAuth()
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <svg className="mr-1.5 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Connected
      </span>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
    >
      {loading ? 'Connecting...' : 'Connect'}
    </button>
  )
}
