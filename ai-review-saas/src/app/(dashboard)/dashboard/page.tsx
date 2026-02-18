import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .in(
      'business_id',
      businesses?.map((b) => b.id) || []
    )
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('action', 'ai_response')

  const totalResponses = usageLogs?.length || 0
  
  const planLimits: Record<string, number> = {
    starter: 50,
    professional: 200,
    business: -1,
  }
  const limit = subscription?.plan_type ? planLimits[subscription.plan_type] : 5
  const responsesRemaining = limit === -1 ? 'Unlimited' : Math.max(0, limit - totalResponses)

  const totalReviews = reviews?.length || 0
  const respondedReviews = reviews?.filter((r) => r.is_responded).length || 0
  const pendingReviews = totalReviews - respondedReviews

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600">Welcome back! Here&apos;s an overview of your reviews.</p>
        </div>
        <a
          href="/dashboard/analytics"
          className="text-sm text-primary hover:text-primary/80"
        >
          View Analytics →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Reviews</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{totalReviews}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Responded</div>
          <div className="mt-2 text-3xl font-semibold text-green-600">{respondedReviews}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-2 text-3xl font-semibold text-yellow-600">{pendingReviews}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">AI Responses Left</div>
          <div className="mt-2 text-3xl font-semibold text-blue-600">{responsesRemaining}</div>
          {subscription?.plan_type && (
            <div className="text-xs text-gray-500 mt-1 capitalize">{subscription.plan_type} plan</div>
          )}
        </div>
      </div>

      {(!businesses || businesses.length === 0) && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Get Started</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Google Business location to start managing reviews.
          </p>
          <a
            href="/settings"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Connect Google Business
          </a>
        </div>
      )}

      {reviews && reviews.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
            <a href="/reviews" className="text-sm text-primary hover:text-primary/80">View All →</a>
          </div>
          <div className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <div key={review.id} className="px-6 py-4">
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
                          i < (review.star_rating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {review.review_text || 'No review text'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {review.is_responded ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Responded
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                  {review.sentiment && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {review.sentiment}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
