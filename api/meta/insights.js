// Vercel serverless proxy for Meta Marketing API insights.
// Keeps META_ACCESS_TOKEN server-side.
// Ownership enforcement: clients may only query their own adAccountId (from Supabase profile).

import { verifyAuth } from '../_lib/auth.js'

const BASE = 'https://graph.facebook.com/v25.0'

export default async function handler(req, res) {
  const auth = await verifyAuth(req, ['admin', 'client'])
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' })
  }

  const token = process.env.META_ACCESS_TOKEN
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' })

  const {
    act_id,
    fields,
    date_preset,
    time_range,
    level,
    breakdowns,
    filtering,
    limit,
    time_increment,
    after,
  } = req.query

  if (!act_id) return res.status(400).json({ error: 'act_id required' })

  // Ownership check: clients can only access their own ad account.
  // Normalize: Meta IDs may be stored with or without the 'act_' prefix.
  const normalize = (v) => String(v ?? '').replace(/^act_/, '')
  if (auth.role === 'client') {
    const profileActId = auth.profile?.adAccountId ?? null
    if (!profileActId || normalize(act_id) !== normalize(profileActId)) {
      return res.status(403).json({ error: 'Access denied: act_id does not match your profile' })
    }
  }
  const actIdClean = normalize(act_id)
  if (!/^\d+$/.test(actIdClean)) return res.status(400).json({ error: 'invalid_act_id' })

  const params = new URLSearchParams()
  params.set('access_token', token)
  if (fields) params.set('fields', String(fields))
  if (date_preset) params.set('date_preset', String(date_preset))
  if (time_range) params.set('time_range', String(time_range))
  if (level) params.set('level', String(level))
  if (breakdowns) params.set('breakdowns', String(breakdowns))
  if (filtering) params.set('filtering', String(filtering))
  if (limit) params.set('limit', String(limit))
  if (time_increment) params.set('time_increment', String(time_increment))
  if (after) params.set('after', String(after))

  const url = `${BASE}/act_${actIdClean}/insights?${params.toString()}`

  try {
    const r = await fetch(url)
    const data = await r.json().catch(() => ({}))
    res.status(r.status).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Meta proxy error', detail: err.message })
  }
}
