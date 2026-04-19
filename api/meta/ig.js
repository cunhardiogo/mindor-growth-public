// Vercel serverless proxy for Instagram Graph API calls keyed by ig_user_id.
// Query: ig_user_id (required), endpoint (path after user id, e.g. 'insights' or 'media'),
// fields, and any additional params are forwarded (except reserved ones).
// Ownership enforcement: clients may only query their own instagramId (from Supabase profile).

import { verifyAuth } from '../_lib/auth.js'

const BASE = 'https://graph.facebook.com/v25.0'
const RESERVED = new Set(['ig_user_id', 'endpoint', 'access_token'])

// Only allow known safe endpoints
const ALLOWED_ENDPOINTS = new Set([
  'insights', 'media', 'stories', 'media_insights', 'live_media',
  'tags', 'mentioned_media', 'mentioned_comment',
])

export default async function handler(req, res) {
  const auth = await verifyAuth(req, ['admin', 'client'])
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' })
  }

  const token = process.env.META_ACCESS_TOKEN
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' })

  const { ig_user_id, endpoint } = req.query
  if (!ig_user_id) return res.status(400).json({ error: 'ig_user_id required' })

  // Validate ig_user_id is numeric
  if (!/^\d+$/.test(String(ig_user_id))) {
    return res.status(400).json({ error: 'ig_user_id must be numeric' })
  }

  // Validate endpoint against allowlist
  if (endpoint !== undefined && endpoint !== null && endpoint !== '') {
    const endpointClean = String(endpoint).replace(/^\/+/, '').split('/')[0]
    if (!ALLOWED_ENDPOINTS.has(endpointClean)) {
      return res.status(400).json({ error: `endpoint '${endpointClean}' is not allowed` })
    }
  }

  // Ownership check: clients can only access their own Instagram account
  if (auth.role === 'client') {
    const profileIgId = auth.profile?.instagramId ?? null
    if (!profileIgId || !/^\d+$/.test(String(profileIgId))) {
      return res.status(403).json({ error: 'Instagram account not configured for your profile' })
    }
    if (String(ig_user_id) !== String(profileIgId)) {
      return res.status(403).json({ error: 'Access denied: ig_user_id does not match your profile' })
    }
  }

  const params = new URLSearchParams()
  params.set('access_token', token)
  for (const [k, v] of Object.entries(req.query)) {
    if (RESERVED.has(k)) continue
    if (Array.isArray(v)) v.forEach(val => params.append(k, val))
    else if (v != null) params.append(k, String(v))
  }

  const suffix = endpoint ? `/${String(endpoint).replace(/^\/+/, '')}` : ''
  const url = `${BASE}/${ig_user_id}${suffix}?${params.toString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const r = await fetch(url, { signal: controller.signal })
    const data = await r.json().catch(() => ({}))
    res.status(r.status).json(data)
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' })
    }
    res.status(502).json({ error: 'Meta IG proxy error' })
  } finally {
    clearTimeout(timeout)
  }
}
