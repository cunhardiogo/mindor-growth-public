import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface FollowersHistoryPoint {
  date: string
  followers: number
}

interface UseIGFollowersHistoryResult {
  history: FollowersHistoryPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useIGFollowersHistory(igUserId: string | null, daysBack = 90): UseIGFollowersHistoryResult {
  const [history, setHistory] = useState<FollowersHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!igUserId) {
      setHistory([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const since = new Date()
    since.setDate(since.getDate() - daysBack)
    try {
      const { data, error: dbErr } = await supabase
        .from('instagram_followers_history')
        .select('snapshot_date, followers_count')
        .eq('ig_user_id', igUserId)
        .gte('snapshot_date', since.toISOString().slice(0, 10))
        .order('snapshot_date', { ascending: true })
      if (dbErr) throw dbErr
      setHistory(((data ?? []) as { snapshot_date: string; followers_count: number }[]).map(d => ({
        date: d.snapshot_date,
        followers: Number(d.followers_count ?? 0),
      })))
    } catch (e: any) {
      console.error('[useIGFollowersHistory]', e)
      setError(e?.message ?? 'Erro ao carregar histórico de seguidores')
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [igUserId, daysBack])

  useEffect(() => {
    load()
  }, [load])

  return { history, isLoading, error, refetch: load }
}
