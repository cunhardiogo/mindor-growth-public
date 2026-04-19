import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchInstagramInsights,
  fetchInstagramAccount,
  fetchInstagramMedia,
  fetchInstagramDemographics,
  fetchFollowerDemographicsByCountry,
} from '../lib/metaApi'

interface Params {
  instagramId: string | null
  datePreset?: string | null
  since?: string | null
  until?: string | null
}

export function useInstagramInsightsLive({ instagramId, datePreset, since, until }: Params) {
  const [insights, setInsights] = useState<any[]>([])
  const [account, setAccount] = useState<any>(null)
  const [media, setMedia] = useState<any[]>([])
  const [demographics, setDemographics] = useState<any>(null)
  const [demographicsCountry, setDemographicsCountry] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!instagramId) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const { signal } = controller
    setLoading(true)
    setError(null)
    try {
      const [insightsData, accountData, mediaData, demographicsData, demographicsCountryData] = await Promise.all([
        fetchInstagramInsights({ instagramId, datePreset, since, until }, signal),
        fetchInstagramAccount({ instagramId }, signal),
        fetchInstagramMedia({ instagramId, limit: 12 }, signal),
        fetchInstagramDemographics({ instagramId }, signal),
        fetchFollowerDemographicsByCountry({ instagramId }, signal),
      ])
      if (signal.aborted) return
      setInsights(insightsData)
      setAccount(accountData)
      setMedia(mediaData)
      setDemographics(demographicsData)
      setDemographicsCountry(demographicsCountryData)
    } catch (err: any) {
      if (signal.aborted) return
      console.error('[useInstagramInsightsLive]', err)
      setError('Não foi possível carregar os dados do Instagram.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [instagramId, datePreset, since, until])

  useEffect(() => {
    load()
    return () => { controllerRef.current?.abort() }
  }, [load])

  return { insights, account, media, demographics, demographicsCountry, loading, error, refetch: load }
}
