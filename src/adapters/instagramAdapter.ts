import { formatK } from './metaAdapter'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMetric(insights: any[], name: string): number {
  const found = insights.find((m: any) => m.name === name)
  if (!found) return 0
  // timeseries format: { values: [{ value, end_time }] }
  if (found.values) {
    return found.values.reduce((s: number, v: any) => s + (v.value ?? 0), 0)
  }
  // total_value format: { total: number }
  return found.total ?? 0
}

function deltaStr(curr: number, prev: number): { change: string; status: 'up' | 'down' } {
  if (!prev) return { change: '–', status: 'up' }
  const pct = ((curr - prev) / prev) * 100
  const sign = pct >= 0 ? '+' : ''
  return {
    change: `${sign}${pct.toFixed(1)}%`,
    status: pct >= 0 ? 'up' : 'down',
  }
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function getDailyValues(insights: any[], name: string): number[] {
  const found = insights.find((m: any) => m.name === name)
  if (!found?.values?.length) return []
  return found.values.map((v: any) => Number(v.value ?? 0))
}

// Synthesize a tiny "trend" series from a single total: just so the sparkline
// has something to draw when the API only returned an aggregated value.
function flatSpark(total: number): number[] {
  if (!total) return [0, 0, 0, 0, 0, 0, 0]
  return [total * 0.85, total * 0.9, total * 0.88, total * 0.95, total * 0.97, total, total]
}

export interface InstagramKPI {
  label: string
  value: string
  change: string
  status: 'up' | 'down'
  sub: string
  sparkData: number[]
}

export function toInstagramKPIs(
  account: any | null,
  insights: any[],
  prevInsights?: any[],
  followersHistoryDelta?: number | null,
): InstagramKPI[] {
  const followers = account?.followers_count ?? 0
  const follows = account?.follows_count ?? 0
  const profileViews = getMetric(insights, 'profile_views')
  const interactions = getMetric(insights, 'total_interactions')
  const views = getMetric(insights, 'views')
  // Prefer the historical delta computed from instagram_followers_history when available;
  // otherwise fall back to the API "follows_and_unfollows" metric.
  const newFollowersFromMetric = getMetric(insights, 'follows_and_unfollows')
  const newFollowers = followersHistoryDelta ?? newFollowersFromMetric

  // Derive previous follower count from the historical delta when available
  const prevFollowers = followersHistoryDelta != null ? followers - followersHistoryDelta : 0
  const prevProfileViews = prevInsights ? getMetric(prevInsights, 'profile_views') : 0
  const prevInteractions = prevInsights ? getMetric(prevInsights, 'total_interactions') : 0
  const prevViews = prevInsights ? getMetric(prevInsights, 'views') : 0

  const followersDelta = deltaStr(followers, prevFollowers)
  const profileViewsDelta = deltaStr(profileViews, prevProfileViews)
  const interactionsDelta = deltaStr(interactions, prevInteractions)
  const viewsDelta = deltaStr(views, prevViews)

  return [
    {
      label: 'Seguidores Totais',
      value: formatK(followers),
      ...followersDelta,
      sub: 'Total da conta',
      sparkData: flatSpark(followers),
    },
    {
      label: 'Seguindo',
      value: formatK(follows),
      change: '–',
      status: 'up' as const,
      sub: 'Contas seguidas',
      sparkData: flatSpark(follows),
    },
    {
      label: 'Novos Seguidores',
      value: formatK(Math.max(0, newFollowers)),
      change: '–',
      status: (newFollowers >= 0 ? 'up' : 'down') as 'up' | 'down',
      sub: 'No período',
      sparkData: flatSpark(Math.max(0, newFollowers)),
    },
    {
      label: 'Visitas ao Perfil',
      value: formatK(profileViews),
      ...profileViewsDelta,
      sub: 'Total no período',
      sparkData: flatSpark(profileViews),
    },
    {
      label: 'Interações Totais',
      value: formatK(interactions),
      ...interactionsDelta,
      sub: 'Likes, comentários, etc.',
      sparkData: flatSpark(interactions),
    },
    {
      label: 'Visualizações Totais',
      value: formatK(views),
      ...viewsDelta,
      sub: 'Conteúdo + perfil',
      sparkData: flatSpark(views),
    },
  ]
}

// ─── Engagement Cards (Linha 2) ───────────────────────────────────────────────

export interface EngagementCard {
  label: string
  value: string
  raw: number
}

export function toEngagementCards(insights: any[]): EngagementCard[] {
  const likes = getMetric(insights, 'likes')
  const comments = getMetric(insights, 'comments')
  const shares = getMetric(insights, 'shares')
  const saves = getMetric(insights, 'saves')
  return [
    { label: 'Curtidas', value: formatK(likes), raw: likes },
    { label: 'Comentários', value: formatK(comments), raw: comments },
    { label: 'Compartilhamentos', value: formatK(shares), raw: shares },
    { label: 'Salvos', value: formatK(saves), raw: saves },
  ]
}

// ─── Reach + Profile Views (timeseries) ───────────────────────────────────────

export interface ReachProfilePoint {
  date: string
  reach: number
  profileViews: number
}

export function toReachAndProfileViewsHistory(insights: any[]): ReachProfilePoint[] {
  const reachMetric = insights.find((m: any) => m.name === 'reach')
  const profileViewsMetric = insights.find((m: any) => m.name === 'profile_views')

  const points = new Map<string, ReachProfilePoint>()

  if (reachMetric?.values?.length) {
    for (const v of reachMetric.values) {
      const date = (v.end_time ?? '').slice(0, 10)
      if (!date) continue
      const ex = points.get(date) ?? { date, reach: 0, profileViews: 0 }
      ex.reach += Number(v.value ?? 0)
      points.set(date, ex)
    }
  }
  if (profileViewsMetric?.values?.length) {
    for (const v of profileViewsMetric.values) {
      const date = (v.end_time ?? '').slice(0, 10)
      if (!date) continue
      const ex = points.get(date) ?? { date, reach: 0, profileViews: 0 }
      ex.profileViews += Number(v.value ?? 0)
      points.set(date, ex)
    }
  }

  return Array.from(points.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Engagement by Media Type (cached posts) ──────────────────────────────────

export interface EngagementByMediaTypeRow {
  type: string
  Likes: number
  Comentários: number
  Saves: number
  Shares: number
  posts: number
}

const TYPE_LABELS_AD: Record<string, string> = {
  VIDEO: 'Vídeo',
  IMAGE: 'Imagem',
  CAROUSEL_ALBUM: 'Carrossel',
}

export function toEngagementByMediaType(media: { media_type?: string | null; like_count?: number; comments_count?: number; saved?: number; shares?: number }[]): EngagementByMediaTypeRow[] {
  if (!media?.length) return []
  const map = new Map<string, EngagementByMediaTypeRow>()
  for (const m of media) {
    const raw = (m.media_type ?? 'OTHER').toUpperCase()
    const label = TYPE_LABELS_AD[raw] ?? raw
    const ex = map.get(label) ?? { type: label, Likes: 0, Comentários: 0, Saves: 0, Shares: 0, posts: 0 }
    ex.Likes += Number(m.like_count ?? 0)
    ex.Comentários += Number(m.comments_count ?? 0)
    ex.Saves += Number(m.saved ?? 0)
    ex.Shares += Number(m.shares ?? 0)
    ex.posts += 1
    map.set(label, ex)
  }
  return Array.from(map.values()).map(r => ({
    type: r.type,
    posts: r.posts,
    Likes: r.posts > 0 ? Math.round(r.Likes / r.posts) : 0,
    Comentários: r.posts > 0 ? Math.round(r.Comentários / r.posts) : 0,
    Saves: r.posts > 0 ? Math.round(r.Saves / r.posts) : 0,
    Shares: r.posts > 0 ? Math.round(r.Shares / r.posts) : 0,
  }))
}

// ─── Top Videos ───────────────────────────────────────────────────────────────

export interface TopVideo {
  id: string
  thumbnail: string | null
  permalink: string | null
  views: number
  likes: number
  comments: number
  timestamp: string | null
}

export function toTopVideos(media: {
  id: string
  media_type?: string | null
  thumbnail_url?: string | null
  permalink?: string | null
  views?: number
  like_count?: number
  comments_count?: number
  timestamp?: string | null
}[]): TopVideo[] {
  return media
    .filter(m => (m.media_type ?? '').toUpperCase() === 'VIDEO')
    .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
    .slice(0, 6)
    .map(m => ({
      id: m.id,
      thumbnail: m.thumbnail_url ?? null,
      permalink: m.permalink ?? null,
      views: Number(m.views ?? 0),
      likes: Number(m.like_count ?? 0),
      comments: Number(m.comments_count ?? 0),
      timestamp: m.timestamp ?? null,
    }))
}

// ─── Followers by Region (Country) ────────────────────────────────────────────

export interface CountryShare {
  country: string
  value: number
}

export function toFollowersByRegion(demographicsCountry: any[]): CountryShare[] {
  if (!demographicsCountry?.length) return []
  // The Graph API returns either `total_value.breakdowns[].results[].dimension_values`
  // or a flatter `values` array, depending on the endpoint shape.
  const metric = demographicsCountry.find((m: any) =>
    m?.name === 'follower_demographics' || m?.total_value?.breakdowns,
  ) ?? demographicsCountry[0]

  const breakdowns: any[] = metric?.total_value?.breakdowns ?? []
  if (!breakdowns.length) return []
  const results: any[] = breakdowns[0]?.results ?? []
  const out: CountryShare[] = results.map((r: any) => ({
    country: String(r?.dimension_values?.[0] ?? '—'),
    value: Number(r?.value ?? 0),
  }))
  return out.sort((a, b) => b.value - a.value).slice(0, 10)
}

// ─── Engagement by Type ───────────────────────────────────────────────────────

export function toEngagementByType(media: any[]): { type: string; value: number; color: string }[] {
  if (!media.length) return []

  const byType = new Map<string, number>()
  for (const post of media) {
    const type = post.media_product_type === 'REELS' ? 'Reels'
      : post.media_type === 'VIDEO' ? 'Vídeo'
      : post.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel'
      : 'Feed'
    const eng = (post.like_count ?? 0) + (post.comments_count ?? 0)
    byType.set(type, (byType.get(type) ?? 0) + eng)
  }

  const total = Array.from(byType.values()).reduce((s, v) => s + v, 0)
  if (!total) return []

  const colors = ['#FE5000', '#FF8A4D', '#FFC1A1', '#1A1A1A']
  let i = 0
  return Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, eng]) => ({
      type,
      value: Math.round((eng / total) * 100),
      color: colors[i++] ?? '#999',
    }))
}

// ─── Top Content ──────────────────────────────────────────────────────────────

export function toTopContent(media: any[]): {
  id: string; image: string; likes: string; comments: string; reach: string; permalink: string
}[] {
  return media
    .sort((a, b) => ((b.like_count ?? 0) + (b.comments_count ?? 0)) - ((a.like_count ?? 0) + (a.comments_count ?? 0)))
    .slice(0, 4)
    .map(post => ({
      id: post.id,
      image: post.media_url ?? post.thumbnail_url ?? '',
      likes: formatK(post.like_count ?? 0),
      comments: formatK(post.comments_count ?? 0),
      reach: '–', // per-post reach requires additional API call
      permalink: post.permalink ?? '',
    }))
}

// ─── Social Awareness (for Overview) ─────────────────────────────────────────

export function toSocialAwareness(account: any | null, insights: any[]) {
  const followers = account?.followers_count ?? 0
  const profileViews = getMetric(insights, 'profile_views')
  const reach = getMetric(insights, 'reach')
  const interactions = getMetric(insights, 'total_interactions')
  const engRate = followers > 0 ? (interactions / followers) * 100 : 0

  return [
    { label: 'Seguidores', value: formatK(followers) },
    { label: 'Engajamento', value: engRate > 0 ? `${engRate.toFixed(2)}%` : '–' },
    { label: 'Alcance', value: formatK(reach) },
    { label: 'Visitas Perfil', value: formatK(profileViews) },
  ]
}
