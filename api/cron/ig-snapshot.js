// Daily cron: snapshot follower counts for every active client with ig_user_id.
// Auth: requires Authorization: Bearer {CRON_SECRET}.
// Storage: upserts into public.instagram_followers_history (key: ig_user_id, snapshot_date).

import { createClient } from '@supabase/supabase-js'

const META_BASE = 'https://graph.facebook.com/v25.0'

export default async function handler(req, res) {
  // Auth check (Vercel Cron passes the secret; we accept the standard header form)
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' })
  }
  const header = req.headers.authorization || req.headers.Authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const META_TOKEN = process.env.META_ACCESS_TOKEN

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env not configured' })
  }
  if (!META_TOKEN) {
    return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Pull all clients that have an IG user id; status filter is loose (status === 1 = active)
  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, ig_user_id, status')
    .not('ig_user_id', 'is', null)

  if (clientsErr) {
    return res.status(500).json({ error: 'Failed to load clients', detail: clientsErr.message })
  }

  const today = new Date().toISOString().slice(0, 10)
  const results = []

  async function processClient(c) {
    const igUserId = c.ig_user_id
    if (!igUserId || !/^\d+$/.test(String(igUserId))) {
      return { client_id: c.id, ig_user_id: igUserId, status: 'skipped', reason: 'invalid id' }
    }
    try {
      const url = `${META_BASE}/${igUserId}?fields=followers_count,follows_count&access_token=${encodeURIComponent(META_TOKEN)}`
      const r = await fetch(url)
      const json = await r.json().catch(() => ({}))
      if (!r.ok) {
        return { client_id: c.id, ig_user_id: igUserId, status: 'error', reason: json?.error?.message || `http ${r.status}` }
      }
      const followers = Number(json.followers_count ?? 0)
      const follows = Number(json.follows_count ?? 0)

      const { error: upErr } = await supabase
        .from('instagram_followers_history')
        .upsert(
          {
            ig_user_id: String(igUserId),
            client_id: c.id,
            snapshot_date: today,
            followers_count: followers,
            follows_count: follows,
          },
          { onConflict: 'ig_user_id,snapshot_date' },
        )

      if (upErr) {
        return { client_id: c.id, ig_user_id: igUserId, status: 'error', reason: upErr.message }
      }
      return { client_id: c.id, ig_user_id: igUserId, status: 'ok', followers, follows }
    } catch (e) {
      return { client_id: c.id, ig_user_id: igUserId, status: 'error', reason: e?.message || 'fetch failed' }
    }
  }

  const BATCH_SIZE = 5
  const batches = []
  const clientList = clients || []
  for (let i = 0; i < clientList.length; i += BATCH_SIZE) {
    batches.push(clientList.slice(i, i + BATCH_SIZE))
  }
  for (const batch of batches) {
    const settled = await Promise.allSettled(batch.map((c) => processClient(c)))
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value)
      else results.push({ status: 'error', reason: r.reason?.message ?? 'unknown' })
    }
  }

  return res.status(200).json({
    snapshot_date: today,
    total_clients: clients?.length ?? 0,
    results,
  })
}
