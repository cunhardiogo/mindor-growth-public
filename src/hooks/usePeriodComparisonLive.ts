import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchMetaInsights } from '../lib/metaApi'

function getPreviousPeriod(datePreset?: string | null, since?: string | null, until?: string | null) {
  const now = new Date()
  const fmt = (d: Date) => d.toLocaleDateString('sv-SE')
  const days: Record<string, number> = {
    today: 1, yesterday: 1, last_3d: 3, last_7d: 7,
    last_14d: 14, last_28d: 28, last_30d: 30, last_90d: 90,
  }
  if (datePreset && days[datePreset]) {
    const n = days[datePreset]
    const curEnd = datePreset === 'yesterday' ? new Date(now.getTime() - 86400000) : now
    const curStart = new Date(curEnd.getTime() - (n - 1) * 86400000)
    const prevEnd = new Date(curStart.getTime() - 86400000)
    const prevStart = new Date(prevEnd.getTime() - (n - 1) * 86400000)
    return { since: fmt(prevStart), until: fmt(prevEnd) }
  }
  if (since && until) {
    const s = new Date(since)
    const u = new Date(until)
    const diff = u.getTime() - s.getTime()
    const prevEnd = new Date(s.getTime() - 86400000)
    const prevStart = new Date(prevEnd.getTime() - diff)
    return { since: fmt(prevStart), until: fmt(prevEnd) }
  }
  return null
}

export function usePeriodComparisonLive({ accountId, datePreset, since, until }: {
  accountId: string | null
  datePreset?: string | null
  since?: string | null
  until?: string | null
}) {
  const [prevData, setPrevData] = useState<any>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!accountId) return
    const prev = getPreviousPeriod(datePreset, since, until)
    if (!prev) { setPrevData(null); return }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const rows = await fetchMetaInsights(
        { accountId, level: 'account', since: prev.since, until: prev.until, breakdown: null },
        controller.signal,
      )
      setPrevData(rows?.[0] || null)
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setPrevData(null)
    }
  }, [accountId, datePreset, since, until])

  useEffect(() => {
    load()
    return () => { controllerRef.current?.abort() }
  }, [load])

  return prevData
}
