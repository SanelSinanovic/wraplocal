import { supabase } from './supabase'

// ── SHOPS ────────────────────────────────────────────────────────────────────

export async function fetchShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('*, portfolio_images(url, display_order), shop_slots(label, is_active)')
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
    .single()
  if (error) { return null }
  return data
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

export async function createShop({ ownerId, name, city = '', state = '' }) {
  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: ownerId,
      name: name || 'My Wrap Shop',
      city,
      state,
      rating: 0,
      review_count: 0,
      price_from: 0,
      turnaround: 'TBD',
      avatar: name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'WS',
      color: '#FF4D00',
    })
    .select()
    .single()
  if (error) { console.error('createShop:', error); return null }
  return data
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
    .select('*, shop:shops(id, name, phone, color, avatar)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchCustomerBookings:', error); return null }
  // Normalize to match component expectations
  return data.map(b => ({
    ...b,
    shop: b.shop?.name || '',
    shopAvatar: b.shop?.avatar || '??',
    shopColor: b.shop?.color || '#FF4D00',
    shopPhone: b.shop?.phone || '',
    shopId: b.shop?.id || b.shop_id,
    time: b.time_slot,
  }))
}

export async function fetchCompanyBookings(shopId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, customer:profiles(name)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchCompanyBookings:', error); return null }
  return data.map(b => ({
    ...b,
    customer: b.customer?.name || 'Unknown',
    payout: b.amount ? Math.round(b.amount * 0.93 * 100) / 100 : 0,
  }))
}

export async function createBooking({ shopId, customerId, service, date, timeSlot, vehicle, designOption, designFileUrl, amount }) {
  const fee = Math.round(amount * 0.07 * 100) / 100
  const total = Math.round((amount + fee) * 100) / 100
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      shop_id: shopId,
      customer_id: customerId,
      service,
      date,
      time_slot: timeSlot,
      vehicle,
      design_option: designOption || null,
      design_file_url: designFileUrl || null,
      amount,
      fee,
      total,
      status: 'pending',
    })
    .select()
    .single()
  if (error) { console.error('createBooking:', error); return null }
  return data
}

// ── MESSAGES ─────────────────────────────────────────────────────────────────

export async function fetchMessages(bookingId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('sent_at', { ascending: true })
  if (error) { console.error('fetchMessages:', error); return [] }
  // Normalize to { from, text, time } shape the chat UI expects
  return data.map(m => ({
    id: m.id,
    from: m.sender_role === 'customer' ? 'me' : 'shop',
    text: m.text,
    time: new Date(m.sent_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }),
  }))
}

export async function sendMessage({ bookingId, senderId, senderRole, text }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: senderId, sender_role: senderRole, text })
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
      callback({
        id: m.id,
        from: m.sender_role === 'customer' ? 'me' : 'shop',
        text: m.text,
        time: new Date(m.sent_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        }),
      })
    })
    .subscribe()
}
