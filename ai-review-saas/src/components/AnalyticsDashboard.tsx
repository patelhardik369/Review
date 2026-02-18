'use client'

import { createClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

interface Stats {
  totalReviews: number
  respondedReviews: number
  pendingReviews: number
  avgRating: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  weeklyData: { name: string; reviews: number; responses: number }[]
}

const COLORS = ['#22c55e', '#eab308', '#ef4444']

export function AnalyticsDashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()
      
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', userId)

      const businessIds = businesses?.map(b => b.id) || []
      if (businessIds.length === 0) {
        setStats({
          totalReviews: 0,
          respondedReviews: 0,
          pendingReviews: 0,
          avgRating: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          weeklyData: []
        })
        setLoading(false)
        return
      }

      const { data: reviews } = await supabase
        .from('reviews')
        .select('star_rating, sentiment, is_responded, created_at')
        .in('business_id', businessIds)

      const total = reviews?.length || 0
      const responded = reviews?.filter(r => r.is_responded).length || 0
      const pending = total - responded
      
      const ratings = reviews?.filter(r => r.star_rating).map(r => r.star_rating!) || []
      const avgRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0

      const positive = reviews?.filter(r => r.sentiment === 'positive').length || 0
      const neutral = reviews?.filter(r => r.sentiment === 'neutral').length || 0
      const negative = reviews?.filter(r => r.sentiment === 'negative').length || 0

      const { data: responses } = await supabase
        .from('responses')
        .select('created_at')
        .in('business_id', businessIds)
        .eq('status', 'published')

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        return {
          name: date.toLocaleDateString('en-US', { weekday: 'short' }),
          reviews: reviews?.filter(r => 
            r.created_at?.startsWith(dateStr)
          ).length || 0,
          responses: responses?.filter(r => 
            r.created_at?.startsWith(dateStr)
          ).length || 0
        }
      })

      setStats({
        totalReviews: total,
        respondedReviews: responded,
        pendingReviews: pending,
        avgRating: Math.round(avgRating * 10) / 10,
        positiveCount: positive,
        neutralCount: neutral,
        negativeCount: negative,
        weeklyData: last7Days
      })
      setLoading(false)
    }

    fetchStats()
  }, [userId])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading analytics...</div>
  }

  const sentimentData = [
    { name: 'Positive', value: stats?.positiveCount || 0 },
    { name: 'Neutral', value: stats?.neutralCount || 0 },
    { name: 'Negative', value: stats?.negativeCount || 0 },
  ].filter(d => d.value > 0)

  const responseRate = stats?.totalReviews 
    ? Math.round((stats.respondedReviews / stats.totalReviews) * 100) 
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Reviews</p>
          <p className="text-2xl font-bold">{stats?.totalReviews || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Response Rate</p>
          <p className="text-2xl font-bold text-green-600">{responseRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Avg Rating</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.avgRating || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{stats?.pendingReviews || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Reviews & Responses (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.weeklyData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="reviews" fill="#4f46e5" name="Reviews" />
              <Bar dataKey="responses" fill="#22c55e" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sentiment Distribution</h3>
          {sentimentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">No sentiment data yet</div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Response Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stats?.weeklyData || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="reviews" stroke="#4f46e5" strokeWidth={2} />
            <Line type="monotone" dataKey="responses" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
