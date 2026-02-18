'use client'

import { useState } from 'react'
import { fetchGoogleReviews, generateAIResponse, approveResponse, publishResponse } from '@/app/actions/reviews'

interface Review {
  id: string
  author_name: string | null
  star_rating: number | null
  review_text: string | null
  review_time: string | null
  is_responded: boolean
  sentiment: string | null
}

interface Business {
  id: string
  name: string
}

export function ReviewsList({ reviews: initialReviews, businesses, userId }: { reviews: Review[], businesses: Business[], userId: string }) {
  const [reviews, setReviews] = useState(initialReviews)
  const [loading, setLoading] = useState<string | null>(null)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [responseContent, setResponseContent] = useState<Record<string, string>>({})
  const [responses, setResponses] = useState<Record<string, any>>({})

  async function handleFetchReviews(businessId: string) {
    setLoading(businessId)
    const result = await fetchGoogleReviews(userId, businessId)
    setLoading(null)
    if (result.error) {
      alert(result.error)
    } else {
      alert(`Fetched ${result.count} reviews!`)
    }
  }

  async function handleGenerateResponse(reviewId: string) {
    setGeneratingFor(reviewId)
    const result = await generateAIResponse(reviewId)
    setGeneratingFor(null)
    
    if (result.error) {
      alert(result.error)
    } else if (result.response) {
      setResponses({ ...responses, [reviewId]: result.response })
      setResponseContent({ ...responseContent, [reviewId]: result.response.content })
    }
  }

  async function handleApprove(reviewId: string) {
    const responseId = responses[reviewId]?.id
    if (!responseId) return
    
    const result = await approveResponse(responseId)
    if (!result.error) {
      setResponses({ 
        ...responses, 
        [reviewId]: { ...responses[reviewId], status: 'approved' } 
      })
    }
  }

  async function handlePublish(reviewId: string) {
    const responseId = responses[reviewId]?.id
    if (!responseId) return
    
    const result = await publishResponse(responseId)
    if (result.error) {
      alert(result.error)
    } else {
      setReviews(reviews.map(r => 
        r.id === reviewId ? { ...r, is_responded: true } : r
      ))
    }
  }

  return (
    <div className="space-y-8">
      {businesses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Sync Reviews</h3>
            {businesses.map(business => (
              <button
                key={business.id}
                onClick={() => handleFetchReviews(business.id)}
                disabled={loading === business.id}
                className="text-sm bg-primary text-white px-3 py-1.5 rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {loading === business.id ? 'Syncing...' : `Sync ${business.name}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {review.author_name?.[0] || '?'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {review.author_name || 'Anonymous'}
                </div>
                <div className="text-sm text-gray-500">
                  {review.review_time
                    ? new Date(review.review_time).toLocaleDateString()
                    : 'Unknown date'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`h-5 w-5 ${
                    i < (review.star_rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">{review.review_text}</p>
          
          <div className="mt-4 flex items-center gap-2">
            {review.is_responded ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Responded
              </span>
            ) : responses[review.id] ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Response Generated
              </span>
            ) : (
              <button
                onClick={() => handleGenerateResponse(review.id)}
                disabled={generatingFor === review.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {generatingFor === review.id ? 'Generating...' : 'Generate Response'}
              </button>
            )}
            {review.sentiment && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {review.sentiment}
              </span>
            )}
          </div>

          {responses[review.id] && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Generated Response</h4>
              <textarea
                value={responseContent[review.id] || ''}
                onChange={(e) => setResponseContent({ ...responseContent, [review.id]: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                rows={3}
              />
              <div className="mt-3 flex gap-2">
                {responses[review.id].status === 'generated' && (
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                )}
                {responses[review.id].status === 'approved' && (
                  <button
                    onClick={() => handlePublish(review.id)}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                  >
                    Publish to Google
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {reviews.length === 0 && businesses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No reviews yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Click "Sync" to fetch reviews from Google My Business
          </p>
        </div>
      )}
    </div>
  )
}
