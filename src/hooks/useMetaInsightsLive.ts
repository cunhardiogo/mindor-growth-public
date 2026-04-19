import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchMetaInsights, fetchMetaInsightsTimeSeries } from '../lib/metaApi'

interface Params {
  accountId: string | null
  level: string
  datePreset?: string | null
  since?: string | null
  until?: string | null
  breakdown?: string | null
}

export function useMetaInsightsLive({ accountId, level, datePreset, since, until, breakdown }: Params) {
  const [data, setData] = useState<any[]>([])
  const [timeSeries, setTimeSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!accountId) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const [rows, series] = await Promise.all([
        fetchMetaInsights({ accountId, level, datePreset, since, until, breakdown }, controller.signal),
        fetchMetaInsightsTimeSeries({ accountId, level, datePreset, since, until }, controller.signal),
      ])
      setData(rows)
      setTimeSeries(series)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message)
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }, [accountId, level, datePreset, since, until, breakdown])

  useEffect(() => {
    load()
    return () => { controllerRef.current?.abort() }
  }, [load])

  return { data, timeSeries, loading, error, refetch: load }
}
