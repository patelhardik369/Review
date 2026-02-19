import { OAuth2Client } from 'google-auth-library'

const GMB_API_BASE = 'https://mybusiness.googleapis.com/v4'
const MAX_RETRIES = 3
const INITIAL_DELAY = 1000
const MAX_DELAY = 10000

export interface GMBReview {
  reviewId: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
  }
  starRating: number
  comment: string
  createTime: string
  updateTime: string
}

export interface GMBLocation {
  name: string
  locationName: string
  address: {
    addressLines: string[]
    locality: string
    administrativeArea: string
    postalCode: string
    regionCode: string
  }
  phoneNumbers?: {
    primary: string
  }
  websiteUri?: string
}

class RateLimitError extends Error {
  retryAfter: number
  constructor(retryAfter: number = 5000) {
    super('Rate limit exceeded')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      const isRateLimit = error?.status === 429 || 
                         error?.message?.includes('429') ||
                         error?.message?.includes('rate limit') ||
                         error?.message?.includes('RESOURCE_EXHAUSTED')
      
      const isServerError = error?.status >= 500 && error?.status < 600
      
      if (!isRateLimit && !isServerError && attempt === maxRetries - 1) {
        throw error
      }
      
      if (isRateLimit) {
        const retryAfter = error.retryAfter || Math.min(
          INITIAL_DELAY * Math.pow(2, attempt),
          MAX_DELAY
        )
        console.log(`Rate limited. Retrying after ${retryAfter}ms...`)
        await sleep(retryAfter)
      } else {
        const delay = INITIAL_DELAY * Math.pow(2, attempt)
        console.log(`Request failed. Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }
  
  throw lastError!
}

export class GoogleMyBusinessClient {
  private client: OAuth2Client

  constructor(client: OAuth2Client) {
    this.client = client
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const makeRequest = async (): Promise<T> => {
      const accessToken = await this.client.getAccessToken()
      const response = await fetch(`${GMB_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        throw new RateLimitError(retryAfter ? parseInt(retryAfter) * 1000 : undefined)
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const err = new Error(error.error?.message || `GMB API error: ${response.status}`)
        ;(err as any).status = response.status
        throw err
      }

      return response.json()
    }

    return exponentialBackoff(makeRequest)
  }

  async getAccounts(): Promise<{ accounts: { name: string; accountName: string }[] }> {
    return this.request('/accounts')
  }

  async getLocations(
    accountName: string
  ): Promise<{ locations: GMBLocation[] }> {
    return this.request(`/${accountName}/locations`)
  }

  async getReviews(accountName: string, locationName: string): Promise<{ reviews: GMBReview[] }> {
    return this.request(`/${accountName}/${locationName}/reviews`)
  }

  async getReviewReplies(accountName: string, locationName: string, reviewId: string) {
    return this.request(`/${accountName}/${locationName}/reviews/${reviewId}/replies`)
  }

  async postReply(
    accountName: string,
    locationName: string,
    reviewId: string,
    comment: string
  ): Promise<{ comment: string; createTime: string }> {
    return this.request(`/${accountName}/${locationName}/reviews/${reviewId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  }

  async deleteReply(
    accountName: string,
    locationName: string,
    reviewId: string,
    replyId: string
  ): Promise<void> {
    await this.request(`/${accountName}/${locationName}/reviews/${reviewId}/replies/${replyId}`, {
      method: 'DELETE',
    })
  }
}

export async function createGMBClient(userId: string): Promise<GoogleMyBusinessClient | null> {
  const { getAuthenticatedClient } = await import('./oauth')
  const client = await getAuthenticatedClient(userId)
  if (!client) return null
  return new GoogleMyBusinessClient(client)
}
