import { supabase } from './supabase'

const INSIGHTS_FIELDS = [
  'impressions', 'reach', 'frequency', 'spend', 'social_spend',
  'clicks', 'unique_clicks', 'inline_link_clicks', 'unique_inline_link_clicks',
  'outbound_clicks', 'unique_outbound_clicks',
  'ctr', 'unique_ctr', 'inline_link_click_ctr', 'outbound_clicks_ctr', 'website_ctr',
  'cpm', 'cpc', 'cpp',
  'cost_per_inline_link_click', 'cost_per_unique_click',
  'cost_per_action_type', 'cost_per_unique_action_type',
  'actions', 'action_values', 'conversions', 'conversion_values',
  'purchase_roas', 'website_purchase_roas',
  'video_play_actions', 'video_thruplay_watched_actions',
  'video_30_sec_watched_actions',
  'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p95_watched_actions',
  'video_p100_watched_actions',
  'video_avg_time_watched_actions',
  'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
  'estimated_ad_recall_rate', 'estimated_ad_recallers',
  'account_id', 'account_name', 'campaign_id', 'campaign_name',
  'adset_id', 'adset_name', 'ad_id', 'ad_name',
  'objective', 'date_start', 'date_stop',
].join(',')

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${token}` }
}

async function apiGet(path: string, query: Record<string, string | number | undefined | null>, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    params.set(k, String(v))
  }
  const headers = await authHeaders()
  const res = await fetch(`${path}?${params.toString()}`, { headers, signal })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as any)?.error?.message || (json as any)?.error || `API error ${res.status}`)
  }
  return json as any
}

interface InsightsParams {
  accountId: string
  level: string
  datePreset?: string | null
  since?: string | null
  until?: string | null
  breakdown?: string | null
}

async function fetchInsightsPaged(base: Record<string, string | number | undefined | null>, signal?: AbortSignal) {
  const results: any[] = []
  let after: string | undefined
  for (let i = 0; i < 20; i++) {
    if (signal?.aborted) break
    const data: any = await apiGet('/api/meta/insights', { ...base, after }, signal)
    if (data.data) results.push(...data.data)
    const next = data.paging?.cursors?.after
    if (!next || !data.paging?.next) break
    after = next
    if (results.length > 2000) break
  }
  return results
}

export async function fetchMetaInsights(params: InsightsParams, signal?: AbortSignal) {
  const { accountId, level, datePreset, since, until, breakdown } = params
  const time_range = (!datePreset && since && until) ? JSON.stringify({ since, until }) : undefined
  return fetchInsightsPaged({
    act_id: accountId,
    fields: INSIGHTS_FIELDS,
    level,
    date_preset: (!time_range ? (datePreset || 'last_30d') : undefined),
    time_range,
    breakdowns: breakdown || undefined,
    limit: 200,
  }, signal)
}

export async function fetchMetaInsightsTimeSeries(params: InsightsParams, signal?: AbortSignal) {
  const { accountId, level, datePreset, since, until } = params
  const time_range = (!datePreset && since && until) ? JSON.stringify({ since, until }) : undefined
  return fetchInsightsPaged({
    act_id: accountId,
    fields: 'impressions,reach,spend,clicks,ctr,cpc,cpm,frequency',
    level: level === 'account' ? 'account' : 'campaign',
    time_increment: '1',
    date_preset: (!time_range ? (datePreset || 'last_30d') : undefined),
    time_range,
    limit: 500,
  }, signal)
}

const IG_TIMESERIES_METRICS = ['reach']
const IG_TOTAL_METRICS = [
  'views', 'total_interactions', 'likes', 'comments', 'shares', 'saves',
  'follows_and_unfollows', 'profile_links_taps', 'accounts_engaged',
  'profile_views', 'website_clicks',
]

// Returns YYYY-MM-DD in America/Sao_Paulo timezone (browser TZ for BR clients)
function toLocalDateString(d: Date): string {
  return d.toLocaleDateString('sv-SE')
}

function clampTo30Days(range: { since: string; until: string }) {
  // Parse as local midnight to avoid UTC offset shifting the date
  const since = new Date(range.since + 'T00:00:00')
  const until = new Date(range.until + 'T00:00:00')
  const diffDays = Math.round((until.getTime() - since.getTime()) / 86400000)
  if (diffDays > 29) {
    const newSince = new Date(until)
    newSince.setDate(newSince.getDate() - 29)
    return { since: toLocalDateString(newSince), until: range.until }
  }
  return range
}

interface IgParams {
  instagramId: string
  datePreset?: string | null
  since?: string | null
  until?: string | null
}

export async function fetchInstagramInsights({ instagramId, datePreset, since, until }: IgParams, signal?: AbortSignal) {
  const raw = resolveDateRange(datePreset, since, until)
  if (raw.since === raw.until) {
    const d = new Date(raw.until + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    raw.until = toLocalDateString(d)
  }
  const range = clampTo30Days(raw)

  const [timeSeriesData, totalsData] = await Promise.all([
    (async () => {
      try {
        const data = await apiGet('/api/meta/ig', {
          ig_user_id: instagramId,
          endpoint: 'insights',
          metric: IG_TIMESERIES_METRICS.join(','),
          period: 'day',
          since: range.since,
          until: range.until,
        }, signal)
        return data.data || []
      } catch (e: any) {
        if (e.name === 'AbortError') return []
        console.error('IG timeseries error:', e.message)
        return []
      }
    })(),
    (async () => {
      try {
        const data = await apiGet('/api/meta/ig', {
          ig_user_id: instagramId,
          endpoint: 'insights',
          metric: IG_TOTAL_METRICS.join(','),
          metric_type: 'total_value',
          period: 'day',
          since: range.since,
          until: range.until,
        }, signal)
        return (data.data || []).map((m: any) => ({ ...m, total: m.total_value?.value ?? 0, values: [] }))
      } catch (e: any) {
        if (e.name === 'AbortError') return []
        console.error('IG totals error:', e.message)
        return []
      }
    })(),
  ])

  return [...timeSeriesData, ...totalsData]
}

export async function fetchInstagramDemographics({ instagramId }: { instagramId: string }, signal?: AbortSignal) {
  try {
    const data = await apiGet('/api/meta/ig', {
      ig_user_id: instagramId,
      endpoint: 'insights',
      metric: 'follower_demographics',
      metric_type: 'total_value',
      period: 'lifetime',
      timeframe: 'last_30_days',
      breakdown: 'age,gender',
    }, signal)
    return data.data || []
  } catch (e: any) {
    if (e.name === 'AbortError') return []
    console.error('Instagram demographics error:', e.message)
    return []
  }
}

export async function fetchFollowerDemographicsByCountry({ instagramId }: { instagramId: string }, signal?: AbortSignal) {
  try {
    const data = await apiGet('/api/meta/ig', {
      ig_user_id: instagramId,
      endpoint: 'insights',
      metric: 'follower_demographics',
      metric_type: 'total_value',
      period: 'lifetime',
      timeframe: 'last_30_days',
      breakdown: 'country',
    }, signal)
    return data.data || []
  } catch (e: any) {
    if (e.name === 'AbortError') return []
    console.error('Instagram demographics by country error:', e.message)
    return []
  }
}

export interface IGMediaInsightItem {
  id: string
  media_type?: string
  media_product_type?: string
  thumbnail_url?: string | null
  media_url?: string | null
  permalink?: string | null
  timestamp?: string | null
  like_count: number
  comments_count: number
  saved: number
  shares: number
  reach: number
  views: number
  plays: number
}

// Fetches up to `limit` recent posts and pulls per-media insights for each.
// Note: per-post insights are not free — keep `limit` modest (≤24) to avoid
// blowing the IG API quota.
export async function fetchInstagramMediaBatch({
  instagramId,
  limit = 24,
}: {
  instagramId: string
  limit?: number
}): Promise<IGMediaInsightItem[]> {
  const fields = 'id,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count'
  let media: any[] = []
  try {
    const data = await apiGet('/api/meta/ig', {
      ig_user_id: instagramId,
      endpoint: 'media',
      fields,
      limit,
    })
    media = data.data || []
  } catch (e: any) {
    console.error('Instagram media batch (list) error:', e.message)
    return []
  }

  const PER_MEDIA_METRICS = 'saved,shares,reach,views'

  const enriched = await Promise.all(media.map(async (m: any): Promise<IGMediaInsightItem> => {
    let saved = 0
    let shares = 0
    let reach = 0
    let views = 0
    let plays = 0
    try {
      const ins = await apiGet('/api/meta/ig', {
        ig_user_id: m.id,
        endpoint: 'insights',
        metric: PER_MEDIA_METRICS,
      })
      const arr: any[] = ins?.data ?? []
      for (const metric of arr) {
        const val = metric?.values?.[0]?.value ?? metric?.total_value?.value ?? 0
        switch (metric.name) {
          case 'saved': saved = Number(val ?? 0); break
          case 'shares': shares = Number(val ?? 0); break
          case 'reach': reach = Number(val ?? 0); break
          case 'views': views = Number(val ?? 0); break
          case 'plays': plays = Number(val ?? 0); break
        }
      }
    } catch (e: any) {
      // Some posts (e.g., very old, archived) reject insights — leave zeros.
      console.warn(`media insights skipped for ${m.id}:`, e.message)
    }
    return {
      id: String(m.id),
      media_type: m.media_type,
      media_product_type: m.media_product_type,
      thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
      media_url: m.media_url ?? null,
      permalink: m.permalink ?? null,
      timestamp: m.timestamp ?? null,
      like_count: Number(m.like_count ?? 0),
      comments_count: Number(m.comments_count ?? 0),
      saved,
      shares,
      reach,
      views,
      plays,
    }
  }))

  return enriched
}

export async function fetchInstagramMedia({ instagramId, limit = 20 }: { instagramId: string; limit?: number }, signal?: AbortSignal) {
  const fields = 'id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,media_product_type'
  try {
    const data = await apiGet('/api/meta/ig', {
      ig_user_id: instagramId,
      endpoint: 'media',
      fields,
      limit,
    }, signal)
    return data.data || []
  } catch (e: any) {
    if (e.name === 'AbortError') return []
    console.error('Instagram media error:', e.message)
    return []
  }
}

export async function fetchInstagramAccount({ instagramId }: { instagramId: string }, signal?: AbortSignal) {
  const fields = 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website'
  try {
    return await apiGet('/api/meta/ig', {
      ig_user_id: instagramId,
      fields,
    }, signal)
  } catch (e: any) {
    if (e.name === 'AbortError') return null
    console.error('Instagram account error:', e.message)
    return null
  }
}

export function resolveDateRange(
  datePreset?: string | null,
  since?: string | null,
  until?: string | null
): { since: string; until: string } {
  if (since && until) return { since, until }
  const now = new Date()
  const fmt = toLocalDateString
  const presetMap: Record<string, { since: string; until: string }> = {
    today:      { since: fmt(now), until: fmt(now) },
    yesterday:  (() => { const d = new Date(now); d.setDate(d.getDate() - 1); return { since: fmt(d), until: fmt(d) } })(),
    last_3d:    { since: fmt(new Date(now.getTime() - 3  * 86400000)), until: fmt(now) },
    last_7d:    { since: fmt(new Date(now.getTime() - 7  * 86400000)), until: fmt(now) },
    last_14d:   { since: fmt(new Date(now.getTime() - 14 * 86400000)), until: fmt(now) },
    last_28d:   { since: fmt(new Date(now.getTime() - 28 * 86400000)), until: fmt(now) },
    last_30d:   { since: fmt(new Date(now.getTime() - 30 * 86400000)), until: fmt(now) },
    last_90d:   { since: fmt(new Date(now.getTime() - 90 * 86400000)), until: fmt(now) },
    this_month: { since: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), until: fmt(now) },
    last_month: (() => {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const l = new Date(now.getFullYear(), now.getMonth(), 0)
      return { since: fmt(f), until: fmt(l) }
    })(),
    lifetime: { since: '2020-01-01', until: fmt(now) },
  }
  return presetMap[datePreset ?? 'last_30d'] || presetMap['last_30d']
}
