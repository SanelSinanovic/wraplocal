import { supabase } from './supabase'

// ── PORTFOLIO IMAGES ─────────────────────────────────────────────────────────

export async function fetchPortfolioImages(shopId) {
  const { data, error } = await supabase
    .from('portfolio_images')
    .select('id, url, display_order')
    .eq('shop_id', shopId)
    .order('display_order', { ascending: true })
  if (error) { console.error('fetchPortfolioImages:', error); return { data: [], error } }
  return { data: data || [], error: null }
}

export async function addPortfolioImage(shopId, url, displayOrder) {
  const { data, error } = await supabase
    .from('portfolio_images')
    .insert({ shop_id: shopId, url, display_order: displayOrder })
    .select()
    .single()
  if (error) { console.error('addPortfolioImage:', error); return { data: null, error } }
  return { data, error: null }
}

export async function deletePortfolioImage(id) {
  const { error } = await supabase
    .from('portfolio_images')
    .delete()
    .eq('id', id)
  if (error) { console.error('deletePortfolioImage:', error); return { error } }
  return { error: null }
}

// ── SHOPS ────────────────────────────────────────────────────────────────────

export async function fetchShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('*, portfolio_images(url, display_order), shop_slots(label, is_active)')
    .not('banner_url', 'is', null)
    .neq('banner_url', '')
    .eq('is_listed', true)
    .order('rating', { ascending: false })
  if (error) { console.error('fetchShops:', error); return null }
  return data.map(shop => ({
    ...shop,
    // Alias DB columns to match existing component field names
    reviews: shop.review_count,
    price: shop.price_from,
    about: shop.bio,
    portfolio: (shop.portfolio_images || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(p => p.url),
    slots: (shop.shop_slots || [])
      .filter(s => s.is_active)
      .map(s => s.label),
  }))
}

export async function fetchUserShop(ownerId) {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', ownerId)
    .limit(1)
  if (error) {
    console.error('fetchUserShop:', error)
    return { data: null, error }
  }
  return { data: (data && data.length > 0) ? data[0] : null, error: null }
}

export async function updateShop(shopId, fields) {
  const { data, error } = await supabase
    .from('shops')
    .update(fields)
    .eq('id', shopId)
    .select()
    .single()
  if (error) { console.error('updateShop:', error); return null }
  return data
}

export async function createShop({ ownerId, name, city = '' }) {
  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: ownerId,
      name: name || 'My Wrap Shop',
      city,
      rating: 0,
      review_count: 0,
      price_from: 0,
      color: '#FF4D00',
    })
    .select()
    .limit(1)
  if (error) {
    // If a shop already exists for this owner (race condition), just fetch it
    if (error.code === '23505') {
      return fetchUserShop(ownerId)
    }
    console.error('createShop:', error)
    return { data: null, error }
  }
  if (!data || data.length === 0) {
    return fetchUserShop(ownerId)
  }
  return { data: data[0], error: null }
}

// ── PROFILES ─────────────────────────────────────────────────────────────────

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) { return null }
  return data
}

// ── BOOKINGS ─────────────────────────────────────────────────────────────────

export async function fetchCustomerBookings(customerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, shop:shops(id, name, phone, color, avatar, banner_url)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchCustomerBookings:', error); return null }
  // Normalize to match component expectations
  return data.map(b => ({
    ...b,
    shop: b.shop?.name || '',
    shopAvatar: b.shop?.avatar || (b.shop?.name ? b.shop.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'),
    shopColor: b.shop?.color || '#FF4D00',
    shopImage: b.shop?.banner_url || null,
    shopPhone: b.shop?.phone || '',
    shopId: b.shop?.id || b.shop_id,
    time: b.time_slot,
  }))
}

export async function scheduleBooking(bookingId, date, timeSlot) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ date, time_slot: timeSlot })
    .eq('id', bookingId)
    .select()
    .single()
  if (error) { console.error('scheduleBooking:', error); return { data: null, error } }
  return { data, error: null }
}

export async function fetchCompanyBookings(shopId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchCompanyBookings:', error); return { data: null, error } }
  if (!data || data.length === 0) return { data: [], error: null }

  // Fetch customer names from profiles in one batch (best-effort — may be empty if no profile row)
  const customerIds = [...new Set(data.map(b => b.customer_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', customerIds)
  const nameById = Object.fromEntries((profiles || []).map(p => [p.id, p.name]))

  return {
    data: data.map(b => ({
      ...b,
      customer: nameById[b.customer_id] || 'Customer',
      payout: b.amount ? Math.round(b.amount * 0.93 * 100) / 100 : 0,
    })),
    error: null,
  }
}

export function subscribeToShopBookings(shopId, callback) {
  return supabase
    .channel(`bookings-shop-${shopId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `shop_id=eq.${shopId}`,
    }, payload => callback(payload))
    .subscribe()
}

export async function createBooking({ shopId, customerId, service, date, timeSlot, preferredDates, vehicle, designOption, designFileUrl, amount = 0 }) {
  // Build the row with only the required columns first
  const row = {
    shop_id: shopId,
    customer_id: customerId,
    service,
    date,
    time_slot: timeSlot,
    status: 'pending',
  }
  // Add optional columns — these only work if the columns exist in your DB
  if (vehicle) row.vehicle = vehicle
  if (designOption) row.design_option = designOption
  if (designFileUrl) row.design_file_url = designFileUrl
  if (preferredDates) row.preferred_dates = preferredDates
  if (amount != null) {
    const fee = Math.round(amount * 0.07 * 100) / 100
    const total = Math.round((amount + fee) * 100) / 100
    row.amount = amount
    row.fee = fee
    row.total = total
  }
  const { data, error } = await supabase
    .from('bookings')
    .insert(row)
    .select()
    .single()
  if (error) { console.error('createBooking:', error); return { data: null, error } }
  return { data, error: null }
}

// ── MESSAGES ─────────────────────────────────────────────────────────────────

export async function fetchMessages(bookingId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('sent_at', { ascending: true })
  if (error) { console.error('fetchMessages:', error); return [] }
  return data.map(normalizeMessageRow)
}

function normalizeMessageRow(m) {
  const text = m.text || ''
  const from = m.sender_role === 'customer' ? 'me' : 'shop'
  const time = new Date(m.sent_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  if (text.startsWith('QUOTE_OFFER::')) {
    const amount = Number(text.split('::')[1])
    return {
      id: m.id,
      from,
      text: Number.isFinite(amount) ? `Quote offer: $${amount.toFixed(2)}` : 'Quote offer received',
      time,
      quoteOffer: Number.isFinite(amount) ? amount : null,
      rawText: text,
    }
  }

  if (text.startsWith('QUOTE_RESPONSE::')) {
    const [, decision, amountRaw] = text.split('::')
    const amount = Number(amountRaw)
    const decisionLabel = decision === 'accepted' ? 'accepted' : 'declined'
    return {
      id: m.id,
      from,
      text: Number.isFinite(amount)
        ? `Quote ${decisionLabel} (${decision === 'accepted' ? '$' + amount.toFixed(2) : '$' + amount.toFixed(2)})`
        : `Quote ${decisionLabel}`,
      time,
      quoteResponse: decision,
      quoteAmount: Number.isFinite(amount) ? amount : null,
      rawText: text,
    }
  }

  return {
    id: m.id,
    from,
    text,
    time,
    rawText: text,
  }
}

export async function sendMessage({ bookingId, senderId, senderRole, text }) {
  const normalizedSenderRole = senderRole === 'company' ? 'shop' : senderRole
  const { data, error } = await supabase
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: senderId, sender_role: normalizedSenderRole, text })
    .select()
    .single()
  if (error) { console.error('sendMessage:', error); return null }
  return data
}

export function subscribeToMessages(bookingId, callback) {
  return supabase
    .channel(`messages-${bookingId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `booking_id=eq.${bookingId}`,
    }, payload => {
      const m = payload.new
      callback(normalizeMessageRow(m))
    })
    .subscribe()
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────

export async function fetchBookingReview(bookingId) {
  const { data } = await supabase
    .from('reviews')
    .select('stars, comment')
    .eq('booking_id', bookingId)
    .maybeSingle()
  return data || null
}

export async function submitReview({ shopId, bookingId, customerId, stars, comment }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ shop_id: shopId, booking_id: bookingId, customer_id: customerId, stars, comment: comment || null })
    .select()
    .single()
  return { data, error }
}

export async function fetchShopReviews(shopId) {
  const { data } = await supabase
    .from('reviews')
    .select('stars, comment, created_at, customer:profiles(name)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  return (data || []).map(r => ({
    stars: r.stars,
    comment: r.comment,
    createdAt: r.created_at,
    customerName: r.customer?.name || 'Customer',
  }))
}
