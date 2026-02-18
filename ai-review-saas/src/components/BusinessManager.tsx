'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'

interface Business {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  gmb_location_id: string | null
  gmb_location_name: string | null
}

export function BusinessManager({ businesses: initialBusinesses, userId }: { businesses: Business[], userId: string }) {
  const [businesses, setBusinesses] = useState(initialBusinesses)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    website: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.from('businesses').insert({
      user_id: userId,
      name: formData.name,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      phone: formData.phone,
      website: formData.website,
    }).select().single()

    if (!error && data) {
      setBusinesses([...businesses, data])
      setShowForm(false)
      setFormData({ name: '', address: '', city: '', state: '', phone: '', website: '' })
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this business?')) return
    
    const supabase = createClient()
    await supabase.from('businesses').delete().eq('id', id)
    setBusinesses(businesses.filter(b => b.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Businesses</h2>
          <p className="text-sm text-gray-500">Manage your business locations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : 'Add Business'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Business'}
          </button>
        </form>
      )}

      {businesses.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500">
          No businesses added yet. Click "Add Business" to get started.
        </div>
      )}

      <div className="space-y-4">
        {businesses.map((business) => (
          <div key={business.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{business.name}</h3>
                {business.address && (
                  <p className="text-sm text-gray-500">
                    {business.address}, {business.city}, {business.state}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {business.gmb_location_id ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Google Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(business.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
