import { supabase } from './supabase'

// ── ADMIN VERIFICATION ──────────────────────────────────────────────────────

/** Check if the current user has role='admin' in profiles */
export async function isAdmin(userId) {
  if (!userId) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (error) console.error('isAdmin check failed:', error)
  return data?.role === 'admin'
}

// ── PLATFORM STATS ──────────────────────────────────────────────────────────

export async function fetchPlatformStats() {
  const [shops, bookings, profiles, reviews] = await Promise.all([
    supabase.from('shops').select('id, is_listed, stripe_onboarded, created_at', { count: 'exact' }),
    supabase.from('bookings').select('id, status, amount, fee, total, payment_verified, created_at', { count: 'exact' }),
    supabase.from('profiles').select('id, role, created_at', { count: 'exact' }),
    supabase.from('reviews').select('id', { count: 'exact' }),
  ])

  const allShops = shops.data || []
  const allBookings = bookings.data || []
  const allProfiles = profiles.data || []

  const totalShops = allShops.length
  const listedShops = allShops.filter(s => s.is_listed).length
  const stripeShops = allShops.filter(s => s.stripe_onboarded).length

  const totalBookings = allBookings.length
  const pendingBookings = allBookings.filter(b => b.status === 'pending').length
  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length
  const completedBookings = allBookings.filter(b => b.status === 'completed').length
  const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length

  const paidBookings = allBookings.filter(b => b.payment_verified)
  const totalGMV = paidBookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
  const totalRevenue = paidBookings.reduce((sum, b) => sum + (parseFloat(b.fee) || 0), 0)
  const totalCollected = paidBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0)

  const totalCustomers = allProfiles.filter(p => p.role === 'customer').length
  const totalCompanies = allProfiles.filter(p => p.role === 'company').length
  const totalReviews = reviews.count || 0

  // Monthly breakdown (last 6 months)
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const monthBookings = allBookings.filter(b => b.created_at?.startsWith(key))
    const monthPaid = monthBookings.filter(b => b.payment_verified)
    months.push({
      key, label,
      bookings: monthBookings.length,
      gmv: monthPaid.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0),
      revenue: monthPaid.reduce((s, b) => s + (parseFloat(b.fee) || 0), 0),
      newShops: allShops.filter(s => s.created_at?.startsWith(key)).length,
      newUsers: allProfiles.filter(p => p.created_at?.startsWith(key)).length,
    })
  }

  return {
    totalShops, listedShops, stripeShops,
    totalBookings, pendingBookings, confirmedBookings, completedBookings, cancelledBookings,
    totalGMV, totalRevenue, totalCollected,
    totalCustomers, totalCompanies, totalReviews,
    months,
  }
}

// ── SHOP LIST ───────────────────────────────────────────────────────────────

export async function fetchAllShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, city, state, is_listed, stripe_onboarded, insurance_verified, insurance_status, insurance_doc_url, rating, review_count, created_at, owner_id, banner_url, avatar')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchAllShops:', error); return [] }
  return data || []
}

export async function adminToggleShopListed(shopId, isListed) {
  const { error } = await supabase
    .from('shops')
    .update({ is_listed: isListed })
    .eq('id', shopId)
  return !error
}

export async function adminSetInsuranceStatus(shopId, status) {
  const verified = status === 'verified';
  const { error } = await supabase
    .from('shops')
    .update({ insurance_status: status, insurance_verified: verified })
    .eq('id', shopId)
  return !error
}

// ── BOOKING LIST ────────────────────────────────────────────────────────────

export async function fetchAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, shop_id, customer_id, service, status, amount, fee, total, payment_verified, stripe_payment_intent_id, refund_status, dispute_status, payment_confirmed_at, date, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error('fetchAllBookings:', error); return [] }
  return data || []
}

// ── USER LIST ───────────────────────────────────────────────────────────────

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, created_at')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchAllUsers:', error); return [] }
  return data || []
}
