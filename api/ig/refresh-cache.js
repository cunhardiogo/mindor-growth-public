// Serverless endpoint to refresh the IG media insights cache.
// Called from ConfiguracoesPage — requires admin or the client that owns ig_user_id.
// Uses service role key to write to instagram_media_insights_cache (RLS: service_role only).

import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '../_lib/auth.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const META_TOKEN = process.env.META_ACCESS_TOKEN
const BASE = 'https://graph.facebook.com/v25.0'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifyAuth(req, ['admin', 'client'])
  if (!auth.ok) return res.status(auth.status || 401).json({ error: auth.error })

  if (!META_TOKEN) return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Supabase not configured' })

  const { ig_user_id, client_id } = req.body ?? {}
  if (!ig_user_id || !client_id) return res.status(400).json({ error: 'ig_user_id and client_id required' })

  // Ownership: clients may only refresh their own account
  if (auth.role === 'client' && auth.profile.instagramId !== String(ig_user_id)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // Fetch up to 24 recent media items
  const fields = 'id,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count'
  const mediaUrl = `${BASE}/${ig_user_id}/media?fields=${fields}&limit=24&access_token=${META_TOKEN}`

  let media = []
  try {
    const r = await fetch(mediaUrl)
    const data = await r.json()
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Meta API error' })
    media = data.data || []
  } catch (e) {
    return res.status(502).json({ error: 'Failed to fetch media from Meta' })
  }

  if (media.length === 0) return res.status(200).json({ count: 0 })

  // Fetch per-media insights
  const PER_MEDIA_METRICS = 'saved,shares,reach,views'
  const enriched = await Promise.all(media.map(async (m) => {
    let saved = 0, shares = 0, reach = 0, views = 0, plays = 0
    try {
      const insUrl = `${BASE}/${m.id}/insights?metric=${PER_MEDIA_METRICS}&access_token=${META_TOKEN}`
      const insR = await fetch(insUrl)
      const ins = await insR.json()
      const arr = ins?.data ?? []
      for (const metric of arr) {
        const val = metric?.values?.[0]?.value ?? metric?.total_value?.value ?? 0
        switch (metric.name) {
          case 'saved': saved = Number(val); break
          case 'shares': shares = Number(val); break
          case 'reach': reach = Number(val); break
          case 'views': views = Number(val); break
          case 'plays': plays = Number(val); break
        }
      }
    } catch { /* archived/old posts may reject insights */ }
    return {
      media_id: String(m.id),
      ig_user_id: String(ig_user_id),
      client_id,
      media_type: m.media_type ?? null,
      media_product_type: m.media_product_type ?? null,
      thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
      permalink: m.permalink ?? null,
      timestamp: m.timestamp ?? null,
      like_count: Number(m.like_count ?? 0),
      comments_count: Number(m.comments_count ?? 0),
      saved, shares, reach, views, plays,
      fetched_at: new Date().toISOString(),
    }
  }))

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: dbErr } = await supa
    .from('instagram_media_insights_cache')
    .upsert(enriched, { onConflict: 'media_id' })

  if (dbErr) {
    console.error('[refresh-cache] Supabase error:', dbErr.message)
    return res.status(500).json({ error: dbErr.message })
  }

  res.status(200).json({ count: enriched.length })
}
