import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface IGMediaCacheItem {
  id: string
  media_id: string
  ig_user_id: string
  client_id: string
  media_type: string | null
  media_product_type: string | null
  thumbnail_url: string | null
  permalink: string | null
  timestamp: string | null
  like_count: number
  comments_count: number
  saved: number
  shares: number
  reach: number
  views: number
  plays: number
  fetched_at: string
}

export interface EngagementByTypeRow {
  type: string
  likes: number
  comments: number
  saved: number
  shares: number
  posts: number
}

interface UseIGMediaCacheResult {
  media: IGMediaCacheItem[]
  isLoading: boolean
  error: string | null
  engagementByType: EngagementByTypeRow[]
  refetch: () => Promise<void>
}

const TYPE_LABELS: Record<string, string> = {
  VIDEO: 'Vídeo',
  IMAGE: 'Imagem',
  CAROUSEL_ALBUM: 'Carrossel',
}

export function useIGMediaCache(igUserId: string | null): UseIGMediaCacheResult {
  const [media, setMedia] = useState<IGMediaCacheItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!igUserId) {
      setMedia([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: dbErr } = await supabase
        .from('instagram_media_insights_cache')
        .select('*')
        .eq('ig_user_id', igUserId)
        .order('timestamp', { ascending: false })
        .limit(200)
      if (dbErr) throw dbErr
      setMedia((data as IGMediaCacheItem[]) ?? [])
    } catch (e: any) {
      console.error('[useIGMediaCache]', e)
      setError(e?.message ?? 'Erro ao carregar cache de mídias')
      setMedia([])
    } finally {
      setIsLoading(false)
    }
  }, [igUserId])

  useEffect(() => {
    load()
  }, [load])

  // Aggregate per media_type → mean engagement metrics across posts
  const map = new Map<string, EngagementByTypeRow>()
  for (const m of media) {
    const rawType = (m.media_type ?? 'OTHER').toUpperCase()
    const label = TYPE_LABELS[rawType] ?? rawType
    const ex = map.get(label) ?? { type: label, likes: 0, comments: 0, saved: 0, shares: 0, posts: 0 }
    ex.likes += m.like_count ?? 0
    ex.comments += m.comments_count ?? 0
    ex.saved += m.saved ?? 0
    ex.shares += m.shares ?? 0
    ex.posts += 1
    map.set(label, ex)
  }
  const engagementByType: EngagementByTypeRow[] = Array.from(map.values()).map(r => ({
    type: r.type,
    posts: r.posts,
    likes: r.posts > 0 ? Math.round(r.likes / r.posts) : 0,
    comments: r.posts > 0 ? Math.round(r.comments / r.posts) : 0,
    saved: r.posts > 0 ? Math.round(r.saved / r.posts) : 0,
    shares: r.posts > 0 ? Math.round(r.shares / r.posts) : 0,
  }))

  return { media, isLoading, error, engagementByType, refetch: load }
}
