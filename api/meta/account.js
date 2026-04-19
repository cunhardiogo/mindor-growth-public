// Vercel serverless proxy for Meta ad account metadata.

import { verifyAuth } from '../_lib/auth.js'

const BASE = 'https://graph.facebook.com/v25.0'

export default async function handler(req, res) {
  const auth = await verifyAuth(req, ['admin', 'client'])
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' })
  }

  const token = process.env.META_ACCESS_TOKEN
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' })

  const { act_id, fields } = req.query
  if (!act_id) return res.status(400).json({ error: 'act_id required' })

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
  params.set('fields', String(fields || 'name,currency,timezone_name'))

  const url = `${BASE}/act_${actIdClean}?${params.toString()}`

  try {
    const r = await fetch(url)
    const data = await r.json().catch(() => ({}))
    res.status(r.status).json(data)
  } catch (err) {
    res.status(502).json({ error: 'Meta proxy error', detail: err.message })
  }
}
