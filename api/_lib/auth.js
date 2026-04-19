// Shared auth helper for Vercel serverless functions.
// Validates a Supabase JWT from the Authorization header and checks role.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// Singleton clients — created once per cold start, not per request
const adminClient = (SUPABASE_URL && SUPABASE_SERVICE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export async function verifyAuth(req, allowedRoles = ['admin']) {
  try {
    const header = req.headers.authorization || req.headers.Authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) {
      return { ok: false, status: 401, error: 'Missing Authorization bearer token' }
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY || !adminClient) {
      return { ok: false, status: 500, error: 'Supabase env vars not configured' }
    }

    // Validate JWT via anon client (must be per-request — uses user token)
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: userData, error: userErr } = await anon.auth.getUser(token)
    if (userErr || !userData?.user) {
      return { ok: false, status: 401, error: 'Invalid or expired token' }
    }
    const user = userData.user

    // Fetch role from profiles via service client (bypasses RLS)
    const { data: prof, error: profErr } = await adminClient
      .from('profiles')
      .select('id, role, client_id')
      .eq('id', user.id)
      .single()

    if (profErr || !prof) {
      return { ok: false, status: 401, error: 'Profile not found' }
    }
    if (!allowedRoles.includes(prof.role)) {
      return { ok: false, status: 403, error: 'Insufficient privileges' }
    }

    // Resolve ownership IDs from linked client (clients only — admins skip ownership)
    let adAccountId = null
    let instagramId = null
    if (prof.role === 'client' && prof.client_id) {
      const { data: client } = await adminClient
        .from('clients')
        .select('act_id, ig_user_id')
        .eq('id', prof.client_id)
        .single()
      adAccountId = client?.act_id ?? null
      instagramId = client?.ig_user_id ?? null
    }

    return {
      ok: true,
      user,
      role: prof.role,
      profile: {
        id: user.id,
        role: prof.role,
        client_id: prof.client_id ?? null,
        adAccountId,
        instagramId,
      },
    }
  } catch (e) {
    return { ok: false, status: 401, error: e.message || 'Auth error' }
  }
}
