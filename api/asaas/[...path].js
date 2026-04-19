// Vercel serverless function — proxies /asaas-api/* → https://api.asaas.com/v3/*
// API key stays server-side; never exposed to the browser bundle.

import { verifyAuth } from '../_lib/auth.js'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
}

// Strict allowlist: enumerate every permitted (method, path pattern) combination.
// Prefer allowlist over blocklist so new Asaas endpoints are denied by default.
const ALLOWED_ROUTES = [
  // Balance & transactions (read-only)
  { method: 'GET', pattern: /^\/finance\/balance$/ },
  { method: 'GET', pattern: /^\/finance\/transactions$/ },
  { method: 'GET', pattern: /^\/finance\/payment-statistics$/ },
  // Payments
  { method: 'GET',    pattern: /^\/payments(\/[a-zA-Z0-9_-]+)?$/ },
  { method: 'POST',   pattern: /^\/payments$/ },
  { method: 'POST',   pattern: /^\/payments\/[a-zA-Z0-9_-]+\/cancel$/ },
  { method: 'POST',   pattern: /^\/payments\/[a-zA-Z0-9_-]+\/refund$/ },
  { method: 'PUT',    pattern: /^\/payments\/[a-zA-Z0-9_-]+$/ },
  // Subscriptions
  { method: 'GET',    pattern: /^\/subscriptions(\/[a-zA-Z0-9_-]+)?$/ },
  { method: 'POST',   pattern: /^\/subscriptions$/ },
  { method: 'PUT',    pattern: /^\/subscriptions\/[a-zA-Z0-9_-]+$/ },
  { method: 'DELETE', pattern: /^\/subscriptions\/[a-zA-Z0-9_-]+$/ },
  // Customers
  { method: 'GET',    pattern: /^\/customers(\/[a-zA-Z0-9_-]+)?$/ },
  { method: 'POST',   pattern: /^\/customers$/ },
  { method: 'PUT',    pattern: /^\/customers\/[a-zA-Z0-9_-]+$/ },
  { method: 'DELETE', pattern: /^\/customers\/[a-zA-Z0-9_-]+$/ },
  // PIX
  { method: 'POST',   pattern: /^\/pix\/qrCodes$/ },
  { method: 'GET',    pattern: /^\/pix\/qrCodes\/[a-zA-Z0-9_-]+$/ },
]

// Paths that are never allowed regardless of method (defense-in-depth)
const BLOCKED_PATHS = /^\/(accounts|webhooks|transfers|apiKeys|finance\/transfer)/

export default async function handler(req, res) {
  const auth = await verifyAuth(req, ['admin'])
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error || 'Unauthorized' })
  }

  const apiKey = process.env.ASAAS_API_KEY || ''
  if (!apiKey) return res.status(500).json({ error: 'ASAAS_API_KEY not configured' })

  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean)
  const path = '/' + segments.join('/')

  if (BLOCKED_PATHS.test(path)) {
    return res.status(403).json({ error: 'Access to this resource is not permitted' })
  }

  const method = req.method.toUpperCase()
  const allowed = ALLOWED_ROUTES.some(r => r.method === method && r.pattern.test(path))
  if (!allowed) {
    return res.status(403).json({ error: `Method ${method} not allowed on ${path}` })
  }

  // Rebuild query string without the injected 'path' param
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue
    if (Array.isArray(v)) v.forEach(val => params.append(k, val))
    else params.append(k, v)
  }
  const qs = params.toString() ? '?' + params.toString() : ''
  const url = `https://api.asaas.com/v3${path}${qs}`

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method)

  // Audit log for mutations (non-blocking)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/audit_log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id: auth.profile?.id ?? null,
          action: `asaas.${method.toLowerCase()}`,
          details: { path },
        }),
      })
    } catch { /* non-blocking */ }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const proxyRes = await fetch(url, {
      method,
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'mindor-growth-portal/2.0',
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    })
    const data = await proxyRes.json().catch(() => ({}))
    res.status(proxyRes.status).json(data)
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' })
    }
    res.status(502).json({ error: 'Proxy error' })
  } finally {
    clearTimeout(timeout)
  }
}
