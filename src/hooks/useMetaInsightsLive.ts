import { useQuery } from '@tanstack/react-query'
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
  const query = useQuery({
    queryKey: ['metaInsights', accountId, level, datePreset, since, until, breakdown],
    queryFn: async ({ signal }) => {
      if (!accountId) throw new Error('No account ID')
      const [rows, series] = await Promise.all([
        fetchMetaInsights({ accountId, level, datePreset, since, until, breakdown }, signal),
        fetchMetaInsightsTimeSeries({ accountId, level, datePreset, since, until }, signal),
      ])
      return { rows, series }
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  })

  return {
    data: query.data?.rows ?? [],
    timeSeries: query.data?.series ?? [],
    loading: query.isFetching,
    error: query.error ? query.error.message : null,
    refetch: async () => { await query.refetch() }
  }
}
