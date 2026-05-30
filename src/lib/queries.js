import { supabase } from './supabase'

// ── FILE UPLOAD VALIDATION ───────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_CHAT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateUploadFile(file, { allowedTypes = ALLOWED_IMAGE_TYPES, maxSize = MAX_FILE_SIZE } = {}) {
  if (!file) return 'No file selected.';
  if (file.size > maxSize) return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
  if (!allowedTypes.includes(file.type)) return `File type not allowed. Accepted: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}.`;
  return null;
}

// ── GEO HELPERS ──────────────────────────────────────────────────────────────

/** Great-circle distance in miles between two lat/lng pairs */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeNominatim(query) {
  const q = encodeURIComponent(`${query}, USA`);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

/** Geocode a shop address via Nominatim (free, no API key).
 *  Returns { lat, lon } or null on failure. */
export async function geocodeCityState(city, state, address, zip) {
  if (!city && !state && !address && !zip) return null;
  const candidates = [
    [address, city, state, zip].filter(Boolean).join(', '),
    [city, state, zip].filter(Boolean).join(', '),
    [zip].filter(Boolean).join(', '),
    [city, state].filter(Boolean).join(', '),
  ].filter(Boolean);

  for (const query of [...new Set(candidates)]) {
    try {
      const coords = await geocodeNominatim(query);
      if (coords) return coords;
    } catch {
      // Try the next fallback query.
    }
  }
  return null;
}

/** Geocode any free-form query (zip code, city, address) via Nominatim.
 *  Returns { lat, lon } or null on failure. */
export async function geocodeSearch(query) {
  if (!query) return null;
  const q = encodeURIComponent(query + ', USA');
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'WrapBridge/1.0' },
    });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

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

export async function setHeroPortfolioImage(imageId, shopId) {
  // Reset existing hero back to 0
  await supabase
    .from('portfolio_images')
    .update({ display_order: 0 })
    .eq('shop_id', shopId)
    .eq('display_order', -1)
  // Set new hero to -1 (sorts first)
  const { error } = await supabase
    .from('portfolio_images')
    .update({ display_order: -1 })
    .eq('id', imageId)
  if (error) { console.error('setHeroPortfolioImage:', error) }
  return { error }
}

// ── SHOPS ────────────────────────────────────────────────────────────────────

export async function fetchShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('*, portfolio_images(url, display_order), shop_slots(label, is_active)')
    .not('banner_url', 'is', null)
    .neq('banner_url', '')
    .eq('is_listed', true)
    .eq('stripe_onboarded', true)
    .eq('insurance_verified', true)
    .eq('insurance_status', 'verified')
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

export async function fetchShopById(shopId) {
  const { data, error } = await supabase
    .from('shops')
    .select('*, portfolio_images(url, display_order), shop_slots(label, is_active)')
    .eq('id', shopId)
    .eq('is_listed', true)
    .eq('stripe_onboarded', true)
    .eq('insurance_verified', true)
    .eq('insurance_status', 'verified')
    .single()
  if (error) { console.error('fetchShopById:', error); return null }
  if (!data) return null
  return {
    ...data,
    reviews: data.review_count,
    price: data.price_from,
    about: data.bio,
    portfolio: (data.portfolio_images || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map(p => p.url),
    slots: (data.shop_slots || [])
      .filter(s => s.is_active)
      .map(s => s.label),
  }
}

export async function fetchUserShop(ownerId) {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
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
  // Always check first — never create a second shop for the same owner
  const existing = await fetchUserShop(ownerId)
  if (existing.data) return existing
  if (existing.error) return existing

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
    amount: Number(b.amount) || 0,
    fee: Number(b.fee) || 0,
    total: Number(b.total) || 0,
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

  // Fetch customer names from profiles in one batch
  const customerIds = [...new Set(data.map(b => b.customer_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', customerIds)
  const nameById = Object.fromEntries((profiles || []).map(p => [p.id, p.name]))

  // For bookings where the profile name is missing or still the default 'Customer',
  // fall back to the contact-info message that BookingFlow sends on every booking.
  const bookingIds = data.map(b => b.id)
  const { data: contactMsgs } = await supabase
    .from('messages')
    .select('booking_id, text')
    .in('booking_id', bookingIds)
    .like('text', '📋 Contact info%')
  // Parse "📋 Contact info — Full Name · email · phone"
  const nameFromMsg = {}
  for (const msg of contactMsgs || []) {
    const match = msg.text.match(/📋 Contact info — ([^·]+)·/)
    if (match) nameFromMsg[msg.booking_id] = match[1].trim()
  }

  return {
    data: data.map(b => {
      const profileName = nameById[b.customer_id]
      const resolvedName =
        (profileName && profileName !== 'Customer' ? profileName : null) ||
        nameFromMsg[b.id] ||
        profileName ||
        'Customer'
      return {
        ...b,
        amount: Number(b.amount) || 0,
        fee: Number(b.fee) || 0,
        total: Number(b.total) || 0,
        customer: resolvedName,
        payout: b.amount ? Math.round(Number(b.amount) * 0.93 * 100) / 100 : 0,
      }
    }),
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

export async function createBooking({ shopId, customerId, service, date, timeSlot, preferredDates, vehicle, designOption, designFileUrl }) {
  // Build the row with only the required columns first
  const row = {
    shop_id: shopId,
    customer_id: customerId,
    service,
    date,
    time_slot: timeSlot,
    status: 'pending',
    amount: 0,
    fee: 0,
    total: 0,
  }
  // Add optional columns — these only work if the columns exist in your DB
  if (vehicle) row.vehicle = vehicle
  if (designOption) row.design_option = designOption
  if (designFileUrl) row.design_file_url = designFileUrl
  if (preferredDates) row.preferred_dates = preferredDates
  const { data, error } = await supabase
    .from('bookings')
    .insert(row)
    .select()
    .single()
  if (error) { console.error('createBooking:', error); return { data: null, error } }
  return { data, error: null }
}

// ── BOOKING QUOTES ─────────────────────────────────────────────────────────

export async function createBookingQuote({ bookingId, shopId, amount, paymentType = 'full', depositPct = 100, createdBy }) {
  const normalizedAmount = Math.round(Number(amount) * 100) / 100
  const normalizedPaymentType = paymentType === 'deposit' ? 'deposit' : 'full'
  const normalizedDepositPct = normalizedPaymentType === 'deposit'
    ? Math.min(100, Math.max(10, Number(depositPct) || 50))
    : 100

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return { data: null, error: new Error('Quote amount must be greater than $0.') }
  }

  await supabase
    .from('booking_quotes')
    .update({ status: 'cancelled' })
    .eq('booking_id', bookingId)
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('booking_quotes')
    .insert({
      booking_id: bookingId,
      shop_id: shopId,
      amount: normalizedAmount,
      payment_type: normalizedPaymentType,
      deposit_pct: normalizedDepositPct,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) { console.error('createBookingQuote:', error); return { data: null, error } }
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

  if (text.startsWith('QUOTE_OFFER_V2::')) {
    const parts = text.split('::')
    const quoteId = parts[1]
    const amount = Number(parts[2])
    const paymentType = parts[3] || 'full'
    const depositPct = parts[4] ? Number(parts[4]) : 100
    const depositStr = paymentType === 'deposit'
      ? ` · ${depositPct}% deposit ($${(amount * depositPct / 100).toFixed(2)}) due now`
      : ''
    return {
      id: m.id,
      from,
      text: Number.isFinite(amount) ? `Quote offer: $${amount.toFixed(2)}${depositStr}` : 'Quote offer received',
      time,
      quoteId,
      quoteOffer: Number.isFinite(amount) ? amount : null,
      paymentType,
      depositPct,
      rawText: text,
    }
  }

  if (text.startsWith('QUOTE_OFFER::')) {
    const parts = text.split('::')
    const amount = Number(parts[1])
    const paymentType = parts[2] || 'full'
    const depositPct = parts[3] ? Number(parts[3]) : 100
    const depositStr = paymentType === 'deposit'
      ? ` · ${depositPct}% deposit ($${(amount * depositPct / 100).toFixed(2)}) due now`
      : ''
    return {
      id: m.id,
      from,
      text: Number.isFinite(amount) ? `Quote offer: $${amount.toFixed(2)}${depositStr}` : 'Quote offer received',
      time,
      quoteId: null,
      quoteOffer: Number.isFinite(amount) ? amount : null,
      paymentType,
      depositPct,
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

export async function uploadChatFile(file, bookingId) {
  const valErr = validateUploadFile(file, { allowedTypes: ALLOWED_CHAT_TYPES });
  if (valErr) { console.error('uploadChatFile:', valErr); return null; }
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `chat/${bookingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('shop-images').upload(path, file, { upsert: true });
  if (error) { console.error('uploadChatFile:', error); return null; }
  const { data } = supabase.storage.from('shop-images').getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
}

export async function uploadDesignFile(file) {
  const valErr = validateUploadFile(file);
  if (valErr) { console.error('uploadDesignFile:', valErr); return null; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error('uploadDesignFile: user must be signed in'); return null; }
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `booking-designs/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('shop-images').upload(path, file, { upsert: true });
  if (error) { console.error('uploadDesignFile:', error); return null; }
  const { data } = supabase.storage.from('shop-images').getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
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

// ── SHOP AVAILABILITY ─────────────────────────────────────────────────────────

/**
 * Fetch a shop's working days and blocked dates.
 * Returns { workingDays: number[], blockedDates: string[] }
 * workingDays uses JS day-of-week numbers (0=Sun, 1=Mon … 6=Sat).
 * blockedDates are ISO strings: "YYYY-MM-DD".
 */
export async function fetchShopAvailability(shopId) {
  const [{ data: shop }, { data: blocked }] = await Promise.all([
    supabase.from('shops').select('working_days').eq('id', shopId).single(),
    supabase.from('shop_blocked_dates').select('blocked_date').eq('shop_id', shopId),
  ])
  return {
    workingDays: (shop?.working_days || '1,2,3,4,5,6').split(',').map(Number),
    blockedDates: (blocked || []).map(r => r.blocked_date),
  }
}

/**
 * Overwrite a shop's working-days configuration and its full set of blocked dates.
 * Blocked dates is a full replacement (delete-all + re-insert).
 */
export async function saveShopAvailability(shopId, workingDays, blockedDates) {
  await supabase.from('shops').update({ working_days: workingDays.join(',') }).eq('id', shopId)
  await supabase.from('shop_blocked_dates').delete().eq('shop_id', shopId)
  if (blockedDates.length > 0) {
    await supabase.from('shop_blocked_dates').insert(
      blockedDates.map(d => ({ shop_id: shopId, blocked_date: d }))
    )
  }
}

// ── EMAIL NOTIFICATIONS ───────────────────────────────────────────────────────
// Fire-and-forget: errors are swallowed so they never block the booking flow.
export async function sendNotification(type, bookingId) {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: { type, bookingId },
    })
    if (error) console.warn('sendNotification failed:', error)
  } catch (e) {
    console.warn('sendNotification failed:', e);
  }
}
