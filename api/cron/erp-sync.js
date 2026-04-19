// Cron: sync ERP orders for all active clients with api_sistema configured.
// Triggered by Vercel cron — see vercel.json schedule.

import { createClient } from '@supabase/supabase-js'
import { syncClient } from '../erp/olist-sync.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: clients, error } = await db
    .from('clients')
    .select('id, name, api_sistema, sistema')
    .not('api_sistema', 'is', null)
    .eq('status', 1)

  if (error) return res.status(500).json({ error: error.message })
  if (!clients?.length) return res.status(200).json({ ok: true, message: 'No clients with ERP configured' })

  const results = []
  for (const client of clients) {
    try {
      if (client.sistema === 'olist') {
        const r = await syncClient(client.id, client.api_sistema, 2)
        results.push({ client: client.name, ...r })
      } else {
        results.push({ client: client.name, skipped: true, reason: `sistema ${client.sistema} not supported` })
      }
    } catch (e) {
      console.error('[erp-sync cron]', client.name, e.message)
      results.push({ client: client.name, error: e.message })
    }
  }

  return res.status(200).json({ ok: true, results })
}
