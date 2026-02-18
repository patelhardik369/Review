import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewsList } from '@/components/ReviewsList'

export default async function ReviewsPage() {
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

  const businessIds = businesses?.map((b) => b.id) || []

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .in('business_id', businessIds.length > 0 ? businessIds : [''])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-600">Manage your business reviews</p>
        </div>
      </div>

      {(!businesses || businesses.length === 0) && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No businesses connected</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Google Business location to start managing reviews.
          </p>
          <a
            href="/settings"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Go to Settings
          </a>
        </div>
      )}

      {businesses && businesses.length > 0 && reviews && (
        <ReviewsList 
          reviews={reviews} 
          businesses={businesses}
          userId={user.id}
        />
      )}
    </div>
  )
}
