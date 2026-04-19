// Sync Olist/Tiny ERP orders → sales_data for a specific client.
// POST /api/erp/olist-sync  { client_id, days? }  (admin only)

import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '../_lib/auth.js'

const TINY_BASE = 'https://api.tiny.com.br/api2'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

function adminDb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// DD/MM/YYYY ← Date object
function tinyDate(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function normalizePayment(raw) {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('pix')) return 'pix'
  if (s.includes('crédito') || s.includes('credito') || s.includes('credit')) return 'credit_card'
  if (s.includes('débito') || s.includes('debito') || s.includes('debit')) return 'debit_card'
  if (s.includes('boleto')) return 'boleto'
  if (s.includes('dinheiro') || s.includes('cash')) return 'cash'
  return raw || null
}

function normalizeStatus(raw) {
  const s = (raw ?? '').toLowerCase()
  if (['aprovado', 'faturado', 'entregue', 'pago'].some(x => s.includes(x))) return 'paid'
  if (['cancelado'].some(x => s.includes(x))) return 'cancelled'
  if (['aberto', 'aguardando', 'pendente'].some(x => s.includes(x))) return 'pending'
  return raw || null
}

// Parse DD/MM/YYYY → ISO date string
function parseOrderDate(str) {
  if (!str) return null
  const [dd, mm, yyyy] = str.split('/')
  if (!dd || !mm || !yyyy) return null
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00-03:00`).toISOString()
}

async function fetchTinyOrdersPage(token, dataInicial, dataFinal, pagina) {
  const params = new URLSearchParams({ token, formato: 'JSON', dataInicial, dataFinal, pagina })
  const res = await fetch(`${TINY_BASE}/pedidos.pesquisa.php?${params}`, {
    headers: { 'User-Agent': 'MindorGrowth/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Tiny API error ${res.status}`)
  const json = await res.json()
  const ret = json?.retorno
  if (ret?.status === 'Erro') throw new Error(ret?.erros?.[0]?.erro || 'Tiny API error')
  return ret
}

async function fetchTinyOrderDetail(token, id) {
  const params = new URLSearchParams({ token, formato: 'JSON', id })
  const res = await fetch(`${TINY_BASE}/pedido.obter.php?${params}`, {
    headers: { 'User-Agent': 'MindorGrowth/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.retorno?.pedido ?? null
}

function normalizeOrder(p, clientId) {
  return {
    client_id: clientId,
    integration_type: 'olist',
    order_id: String(p.id ?? p.numero),
    order_date: parseOrderDate(p.data_pedido),
    total_value: parseFloat(p.valor ?? '0') || 0,
    payment_method: normalizePayment(p.forma_pagamento),
    seller_id: p.id_vendedor ? String(p.id_vendedor) : null,
    seller_name: p.nome_vendedor || null,
    status: normalizeStatus(p.situacao),
    state_code: p.state_code ?? null,
    city: p.city ?? null,
    items: p.items ?? [],
    raw: p,
    synced_at: new Date().toISOString(),
  }
}

export async function syncClient(clientId, apiKey, days = 30) {
  const db = adminDb()
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const dataInicial = tinyDate(since)
  const dataFinal = tinyDate(until)

  let allOrders = []
  let pagina = 1
  let totalPages = 1

  while (pagina <= totalPages && pagina <= 20) {
    const ret = await fetchTinyOrdersPage(apiKey, dataInicial, dataFinal, pagina)
    totalPages = parseInt(ret?.numero_paginas ?? '1', 10) || 1
    const pedidos = ret?.pedidos ?? []
    for (const row of pedidos) {
      allOrders.push(row.pedido ?? row)
    }
    if (pedidos.length === 0) break
    pagina++
  }

  if (allOrders.length === 0) return { synced: 0 }

  // Fetch details in batches of 10 to get items + address
  const detailed = []
  for (let i = 0; i < allOrders.length; i += 10) {
    const batch = allOrders.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map(p => fetchTinyOrderDetail(apiKey, p.id).then(detail => {
        if (!detail) return p
        // Extract state/city from shipping address
        const addr = detail.enderecoEntrega ?? {}
        const items = (detail.itens ?? []).map(it => {
          const item = it.item ?? it
          return {
            product_id: String(item.codigo ?? ''),
            product_name: item.descricao ?? item.nome ?? '',
            qty: parseFloat(item.quantidade ?? '1') || 1,
            unit_price: parseFloat(item.valor_unitario ?? item.preco_unitario ?? '0') || 0,
          }
        })
        return {
          ...p,
          state_code: addr.uf || addr.estado || null,
          city: addr.cidade || null,
          items,
        }
      }))
    )
    for (const r of results) {
      detailed.push(r.status === 'fulfilled' ? r.value : batch[results.indexOf(r)])
    }
  }

  const rows = detailed
    .filter(p => p.id || p.numero)
    .map(p => normalizeOrder(p, clientId))
    .filter(r => r.order_date)

  if (rows.length === 0) return { synced: 0 }

  const { error } = await db.from('sales_data').upsert(rows, {
    onConflict: 'client_id,integration_type,order_id',
    ignoreDuplicates: false,
  })
  if (error) throw new Error(error.message)

  return { synced: rows.length }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await verifyAuth(req, ['admin', 'client'])
  if (!auth.ok) return res.status(auth.status || 401).json({ error: auth.error })

  const db = adminDb()
  let clientId = req.body?.client_id ?? null
  const days = Math.min(parseInt(req.body?.days ?? '90', 10) || 90, 90)

  // Clients can only sync their own data
  if (auth.role === 'client') {
    clientId = auth.profile.client_id
    if (!clientId) return res.status(403).json({ error: 'No client linked to your profile' })
  } else if (!clientId) {
    return res.status(400).json({ error: 'client_id required' })
  }

  const { data: client, error: cErr } = await db
    .from('clients')
    .select('id, name, api_sistema, sistema')
    .eq('id', clientId)
    .single()

  if (cErr || !client) return res.status(404).json({ error: 'Client not found' })
  if (!client.api_sistema) return res.status(400).json({ error: 'Este cliente não possui integração ERP configurada.' })
  if (client.sistema !== 'olist') return res.status(400).json({ error: `Sistema "${client.sistema}" ainda não suportado.` })

  try {
    const result = await syncClient(client.id, client.api_sistema, days)
    return res.status(200).json({ ok: true, client: client.name, ...result })
  } catch (e) {
    console.error('[olist-sync]', client.name, e.message)
    return res.status(502).json({ error: e.message })
  }
}
