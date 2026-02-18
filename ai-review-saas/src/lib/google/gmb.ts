import { OAuth2Client } from 'google-auth-library'

const GMB_API_BASE = 'https://mybusiness.googleapis.com/v4'

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

export class GoogleMyBusinessClient {
  private client: OAuth2Client

  constructor(client: OAuth2Client) {
    this.client = client
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await this.client.getAccessToken()
    const response = await fetch(`${GMB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || `GMB API error: ${response.status}`)
    }

    return response.json()
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
