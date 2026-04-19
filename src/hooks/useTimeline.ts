import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type TimelineEventType = 'milestone' | 'campaign' | 'achievement' | 'update'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  title: string
  description: string
  date: string
}

interface TimelineData {
  events: TimelineEvent[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const VALID_TYPES = new Set<string>(['milestone', 'campaign', 'achievement', 'update'])

export function useTimeline(): TimelineData {
  const { profile } = useAuth()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    const clientId = profile.role === 'client' ? profile.client_id : null
    if (profile.role === 'client' && !clientId) {
      setEvents([])
      setError(null)
      setLoading(false)
      return
    }
    const query = supabase.from('timeline_events').select('*').order('event_date', { ascending: false })
    const { data: rows, error: err } = clientId
      ? await query.eq('client_id', clientId)
      : await query

    if (err) {
      console.error('[useTimeline] Supabase error:', err)
      setError('Não foi possível carregar a linha do tempo. Tente novamente.')
      setLoading(false)
      return
    }

    const mapped: TimelineEvent[] = (rows ?? []).map(r => ({
      id: r.id,
      type: VALID_TYPES.has(r.event_type) ? (r.event_type as TimelineEventType) : 'update',
      title: r.title,
      description: r.description ?? '',
      date: r.event_date,
    }))

    setEvents(mapped)
    setError(null)
    setLoading(false)
  }, [profile?.id, profile?.role])

  useEffect(() => {
    if (!profile) return
    load()
  }, [profile?.id, load])

  return { events, loading, error, refresh: load }
}
