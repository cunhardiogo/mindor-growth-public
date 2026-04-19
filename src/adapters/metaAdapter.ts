// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

export function formatM(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(Math.round(n))
}

export function delta(curr: number, prev: number): string {
  if (!prev) return '–'
  const pct = ((curr - prev) / prev) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sumActions(row: any, actionTypes: string[]): number {
  const actions: any[] = row?.actions ?? []
  return actions
    .filter((a: any) => actionTypes.includes(a.action_type))
    .reduce((s: number, a: any) => s + parseFloat(a.value || '0'), 0)
}

function getLeads(row: any): number {
  return sumActions(row, [
    'lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped',
    'contact_total', 'whatsapp_contact',
  ])
}

function getConversions(row: any): number {
  return sumActions(row, [
    'purchase', 'offsite_conversion.fb_pixel_purchase',
    'complete_registration', 'offsite_conversion.fb_pixel_complete_registration',
  ])
}

function getRevenue(row: any): number {
  const vals: any[] = row?.action_values ?? []
  return vals
    .filter((a: any) => ['purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type))
    .reduce((s: number, a: any) => s + parseFloat(a.value || '0'), 0)
}

function aggregateRows(rows: any[]) {
  const spend = rows.reduce((s, r) => s + parseFloat(r.spend || '0'), 0)
  const impressions = rows.reduce((s, r) => s + parseFloat(r.impressions || '0'), 0)
  const reach = rows.reduce((s, r) => s + parseFloat(r.reach || '0'), 0)
  const clicks = rows.reduce((s, r) => s + parseFloat(r.clicks || '0'), 0)
  const leads = rows.reduce((s, r) => s + getLeads(r), 0)
  const conversions = rows.reduce((s, r) => s + getConversions(r), 0)
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0)
  const roas = spend > 0 && revenue > 0 ? revenue / spend : 0
  const cpl = leads > 0 ? spend / leads : 0
  const cac = conversions > 0 ? spend / conversions : 0
  const aov = conversions > 0 ? revenue / conversions : 0
  const convRate = leads > 0 ? (conversions / leads) * 100 : 0
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : 0
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
  const freq = reach > 0 ? impressions / reach : 0
  return { spend, impressions, reach, clicks, leads, conversions, revenue, roas, cpl, cac, aov, convRate, ctr, cpc, cpm, freq }
}

type Aggregated = ReturnType<typeof aggregateRows>

// ─── FASE 3: Marketing ───────────────────────────────────────────────────────

export function toMarketingKPIs(data: any[], _timeSeries: any[], prev?: any) {
  const agg = aggregateRows(data)
  const prevAgg = prev ? aggregateRows([prev]) : null

  return [
    {
      label: 'Investimento Total',
      value: formatBRL(agg.spend),
      change: prevAgg ? delta(agg.spend, prevAgg.spend) : '–',
      status: prevAgg && agg.spend >= prevAgg.spend ? 'up' : 'down',
      sub: 'Budget Utilizado',
    },
    {
      label: 'Vendas Total',
      value: formatK(agg.conversions),
      change: prevAgg ? delta(agg.conversions, prevAgg.conversions) : '–',
      status: prevAgg && agg.conversions >= prevAgg.conversions ? 'up' : 'down',
      sub: 'Conversões',
    },
    {
      label: 'Custo por Venda',
      value: agg.cac > 0 ? formatBRL(agg.cac) : '–',
      change: prevAgg && prevAgg.cac > 0 ? delta(agg.cac, prevAgg.cac) : '–',
      // lower CAC = better
      status: prevAgg && prevAgg.cac > 0 && agg.cac <= prevAgg.cac ? 'up' : 'down',
      sub: 'CPA',
    },
    {
      label: 'Ticket Médio',
      value: agg.aov > 0 ? formatBRL(agg.aov) : '–',
      change: prevAgg && prevAgg.aov > 0 ? delta(agg.aov, prevAgg.aov) : '–',
      status: prevAgg && agg.aov >= prevAgg.aov ? 'up' : 'down',
      sub: 'AOV',
    },
    {
      label: 'ROAS',
      value: agg.roas > 0 ? `${agg.roas.toFixed(1)}x` : '–',
      change: prevAgg && prevAgg.roas > 0 ? delta(agg.roas, prevAgg.roas) : '–',
      status: prevAgg && agg.roas >= prevAgg.roas ? 'up' : 'down',
      sub: 'Retorno Ads',
    },
    {
      label: 'Leads',
      value: formatK(agg.leads),
      change: prevAgg ? delta(agg.leads, prevAgg.leads) : '–',
      status: prevAgg && agg.leads >= prevAgg.leads ? 'up' : 'down',
      sub: 'Novos Contatos',
    },
    {
      label: 'Custo por Lead',
      value: agg.cpl > 0 ? formatBRL(agg.cpl) : '–',
      change: prevAgg && prevAgg.cpl > 0 ? delta(agg.cpl, prevAgg.cpl) : '–',
      // lower CPL = better
      status: prevAgg && prevAgg.cpl > 0 && agg.cpl <= prevAgg.cpl ? 'up' : 'down',
      sub: 'CPL',
    },
  ]
}

export function toPerformanceChart(timeSeries: any[]): {
  name: string; investimento: number; leads: number; conversoes: number; receita: number
}[] {
  // Group by week
  if (!timeSeries.length) return []

  const weeks = new Map<string, { investimento: number; leads: number; conversoes: number; receita: number }>()
  timeSeries.forEach((row, i) => {
    const weekNum = Math.floor(i / 7) + 1
    const key = `Semana ${weekNum}`
    const ex = weeks.get(key) ?? { investimento: 0, leads: 0, conversoes: 0, receita: 0 }
    ex.investimento += parseFloat(row.spend || '0')
    ex.leads += getLeads(row)
    ex.conversoes += getConversions(row)
    ex.receita += getRevenue(row)
    weeks.set(key, ex)
  })

  return Array.from(weeks.entries()).map(([name, v]) => ({ name, ...v }))
}

export function toEfficiencyData(data: any[]): { name: string; cpl: number; roas: number; conversao: number }[] {
  // Group by campaign name prefix to guess channel
  const channels = new Map<string, { spend: number; leads: number; conversions: number; roas_w: number }>()

  for (const row of data) {
    const name = (row.campaign_name || '').toLowerCase()
    let channel = 'Meta Ads'
    if (name.includes('google')) channel = 'Google Ads'
    else if (name.includes('instagram') || name.includes(' ig ')) channel = 'Instagram'
    else if (name.includes('tiktok')) channel = 'TikTok Ads'

    const ex = channels.get(channel) ?? { spend: 0, leads: 0, conversions: 0, roas_w: 0 }
    const spend = parseFloat(row.spend || '0')
    ex.spend += spend
    ex.leads += getLeads(row)
    ex.conversions += getConversions(row)
    ex.roas_w += parseFloat(row.purchase_roas?.[0]?.value || '0') * spend
    channels.set(channel, ex)
  }

  return Array.from(channels.entries()).map(([name, v]) => ({
    name,
    cpl: v.leads > 0 ? v.spend / v.leads : 0,
    roas: v.spend > 0 ? v.roas_w / v.spend : 0,
    conversao: v.leads > 0 ? (v.conversions / v.leads) * 100 : 0,
  }))
}

export function toCampaignTable(data: any[]): {
  id: string; name: string; invest: string; leads: number; cpl: string; conv: string; roas: string; status: string
}[] {
  const map = new Map<string, {
    name: string; status: string; spend: number; leads: number; conversions: number; roas_w: number
  }>()

  for (const row of data) {
    const id = row.campaign_id || row.ad_id || String(Math.random())
    const ex = map.get(id)
    const spend = parseFloat(row.spend || '0')
    const leads = getLeads(row)
    const conversions = getConversions(row)
    const roas = parseFloat(row.purchase_roas?.[0]?.value || '0')
    if (ex) {
      ex.spend += spend
      ex.leads += leads
      ex.conversions += conversions
      ex.roas_w += roas * spend
      ex.status = row.effective_status ?? ex.status
    } else {
      map.set(id, {
        name: row.campaign_name || row.ad_name || id,
        status: row.effective_status ?? 'ACTIVE',
        spend,
        leads,
        conversions,
        roas_w: roas * spend,
      })
    }
  }

  return Array.from(map.entries()).map(([id, v]) => {
    const roas = v.spend > 0 ? v.roas_w / v.spend : 0
    const cpl = v.leads > 0 ? v.spend / v.leads : 0
    const convRate = v.leads > 0 ? (v.conversions / v.leads) * 100 : 0
    const statusMap: Record<string, string> = {
      ACTIVE: 'Bom', PAUSED: 'Médio', DELETED: 'Ruim', ARCHIVED: 'Ruim',
    }
    return {
      id,
      name: v.name,
      invest: formatBRL(v.spend),
      leads: v.leads,
      cpl: cpl > 0 ? formatBRL(cpl) : '–',
      conv: convRate > 0 ? `${convRate.toFixed(1)}%` : '–',
      roas: roas > 0 ? `${roas.toFixed(1)}x` : '–',
      status: statusMap[v.status] ?? 'Médio',
    }
  })
}

export function toSecondaryKPIs(data: any[]) {
  const agg = aggregateRows(data)
  return [
    { label: 'Impressões', value: formatM(agg.impressions) },
    { label: 'Alcance', value: formatM(agg.reach) },
    { label: 'Cliques', value: formatK(agg.clicks) },
    { label: 'CTR Médio', value: agg.ctr > 0 ? `${agg.ctr.toFixed(2)}%` : '–' },
    { label: 'CPC Médio', value: agg.cpc > 0 ? formatBRL(agg.cpc) : '–' },
    { label: 'Frequência', value: agg.freq > 0 ? `${agg.freq.toFixed(1)}x` : '–' },
  ]
}

// ─── FASE 4b: Overview ────────────────────────────────────────────────────────

export function toOverviewKPIs(data: any[], prev?: any) {
  const agg = aggregateRows(data)
  const prevAgg = prev ? aggregateRows([prev]) : null

  return [
    {
      label: 'Receita Gerada',
      value: formatBRL(agg.revenue > 0 ? agg.revenue : 0),
      change: prevAgg ? delta(agg.revenue, prevAgg.revenue) : '–',
      status: (prevAgg && agg.revenue >= prevAgg.revenue ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Investimento em Anúncios',
      value: formatBRL(agg.spend),
      change: prevAgg ? delta(agg.spend, prevAgg.spend) : '–',
      status: (prevAgg && agg.spend >= prevAgg.spend ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Leads Gerados',
      value: formatK(agg.leads),
      change: prevAgg ? delta(agg.leads, prevAgg.leads) : '–',
      status: (prevAgg && agg.leads >= prevAgg.leads ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Custo por Lead',
      value: agg.cpl > 0 ? formatBRL(agg.cpl) : '–',
      change: prevAgg && prevAgg.cpl > 0 ? delta(agg.cpl, prevAgg.cpl) : '–',
      status: (prevAgg && prevAgg.cpl > 0 && agg.cpl <= prevAgg.cpl ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'Quantidade de Vendas',
      value: formatK(agg.conversions),
      change: prevAgg ? delta(agg.conversions, prevAgg.conversions) : '–',
      status: (prevAgg && agg.conversions >= prevAgg.conversions ? 'up' : 'down') as 'up' | 'down',
    },
    {
      label: 'ROAS',
      value: agg.roas > 0 ? `${agg.roas.toFixed(1)}x` : '–',
      change: prevAgg && prevAgg.roas > 0 ? delta(agg.roas, prevAgg.roas) : '–',
      status: (prevAgg && agg.roas >= prevAgg.roas ? 'up' : 'down') as 'up' | 'down',
    },
  ]
}

// ─── Funil de Aquisição ──────────────────────────────────────────────────────
export interface FunnelStage {
  stage: string
  value: number | null
  rate: string
}

export function toAcquisitionFunnel(rows: any[]): FunnelStage[] | null {
  const sumAcross = (types: string[]) =>
    rows.reduce((s, r) => s + sumActions(r, types), 0)

  const visitsAgg = sumAcross([
    'landing_page_view', 'offsite_conversion.fb_pixel_view_content', 'view_content',
  ])
  const cartAgg = sumAcross([
    'add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart',
  ])
  const checkoutAgg = sumAcross([
    'initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout',
  ])
  const purchaseAgg = sumAcross([
    'purchase', 'offsite_conversion.fb_pixel_purchase',
  ])

  // No pixel events at all → indicate caller should show "no pixel" state
  if (visitsAgg === 0 && cartAgg === 0 && checkoutAgg === 0 && purchaseAgg === 0) {
    return null
  }

  const pct = (a: number, b: number): string => {
    if (!b || b <= 0) return '–'
    return `${((a / b) * 100).toFixed(1)}%`
  }

  return [
    { stage: 'Visitas à Landing Page', value: visitsAgg, rate: '100%' },
    { stage: 'Adicionar ao Carrinho', value: cartAgg, rate: pct(cartAgg, visitsAgg) },
    { stage: 'Iniciar Checkout', value: checkoutAgg, rate: pct(checkoutAgg, visitsAgg) },
    { stage: 'Compra', value: purchaseAgg, rate: pct(purchaseAgg, visitsAgg) },
    { stage: 'Taxa Final da Loja', value: null, rate: pct(purchaseAgg, visitsAgg) },
  ]
}

export function toGrowthChart(timeSeries: any[]): { name: string; faturamento: number; investimento: number; leads: number; roas: number }[] {
  if (!timeSeries.length) return []
  return timeSeries.slice(-7).map((row, i) => {
    const spend = parseFloat(row.spend || '0')
    const revenue = getRevenue(row)
    const leads = getLeads(row)
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const d = row.date_start ? new Date(row.date_start) : new Date()
    return {
      name: dayNames[d.getDay()] || `D${i + 1}`,
      faturamento: revenue > 0 ? revenue : spend,
      investimento: spend,
      leads,
      roas: spend > 0 && revenue > 0 ? revenue / spend : 0,
    }
  })
}

export function toAcquisitionChannels(data: any[]): { name: string; value: number; color: string }[] {
  const totalSpend = data.reduce((s, r) => s + parseFloat(r.spend || '0'), 0)
  if (!totalSpend) return [{ name: 'Meta Ads', value: 100, color: '#FE5000' }]

  const channels = new Map<string, number>()
  for (const row of data) {
    const name = (row.campaign_name || '').toLowerCase()
    let channel = 'Meta Ads'
    if (name.includes('google')) channel = 'Google Ads'
    const ex = channels.get(channel) ?? 0
    channels.set(channel, ex + parseFloat(row.spend || '0'))
  }

  const colors = ['#FE5000', '#FF8A4D', '#FFC1A1', '#1A1A1A']
  let i = 0
  return Array.from(channels.entries()).map(([name, spend]) => ({
    name,
    value: Math.round((spend / totalSpend) * 100),
    color: colors[i++] ?? '#999',
  }))
}

export function toCapitalDistribution(data: any[], asaasBalance?: number | null): {
  name: string; value: number; color: string
}[] {
  const agg = aggregateRows(data)
  if (asaasBalance != null) {
    return [
      { name: 'Receita', value: agg.revenue > 0 ? Math.round(agg.revenue) : 0, color: '#FE5000' },
      { name: 'Investimento', value: Math.round(agg.spend), color: '#000000' },
      { name: 'Lucro Estimado', value: Math.max(0, Math.round(agg.revenue - agg.spend)), color: '#FF8A4D' },
    ]
  }
  // client view: spend breakdown
  return [
    { name: 'Investido', value: Math.round(agg.spend), color: '#FE5000' },
    { name: 'Retorno', value: Math.round(agg.revenue > 0 ? agg.revenue : agg.spend * agg.roas), color: '#FF8A4D' },
  ]
}

export function toGrowthScore(data: any[]): { score: number; items: { label: string; value: number; color: string }[] } {
  const agg = aggregateRows(data)
  const roasScore = Math.min(100, Math.round((agg.roas / 4) * 100))
  const investScore = Math.min(100, agg.spend > 0 ? Math.round(Math.min(agg.roas, 4) * 25) : 0)
  const convScore = Math.min(100, Math.round(agg.convRate * 10))
  const overall = Math.round((roasScore * 0.4 + investScore * 0.3 + convScore * 0.3))
  return {
    score: overall,
    items: [
      { label: 'Anúncios', value: roasScore, color: '#FE5000' },
      { label: 'Investimento', value: investScore, color: '#FF8A4D' },
      { label: 'Engajamento', value: convScore, color: '#FFC1A1' },
    ],
  }
}
