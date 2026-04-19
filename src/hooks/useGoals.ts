import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Goal {
  id: string
  title: string
  category: 'revenue' | 'followers' | 'leads' | 'roas' | 'custom'
  target: number
  current: number
  unit: string
  unitPrefix: boolean
  deadline: string
  icon: string
}

export interface CompletedGoal {
  id: string
  title: string
  completedAt: string
  icon: string
}

interface GoalsData {
  active: Goal[]
  completed: CompletedGoal[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const METRIC_META: Record<string, { icon: string; unit: string; unitPrefix: boolean; category: Goal['category'] }> = {
  revenue:    { icon: '💰', unit: 'R$',         unitPrefix: true,  category: 'revenue'   },
  followers:  { icon: '📈', unit: 'seguidores',  unitPrefix: false, category: 'followers' },
  leads:      { icon: '🎯', unit: 'leads',       unitPrefix: false, category: 'leads'     },
  roas:       { icon: '📊', unit: 'x',           unitPrefix: false, category: 'roas'      },
  engagement: { icon: '❤️', unit: '%',           unitPrefix: false, category: 'custom'    },
  students:   { icon: '🏃', unit: 'alunos',      unitPrefix: false, category: 'leads'     },
  ticket:     { icon: '🏷️', unit: 'R$',         unitPrefix: true,  category: 'revenue'   },
}
const DEFAULT_META = { icon: '⭐', unit: '', unitPrefix: false, category: 'custom' as Goal['category'] }

function isoToPeriod(date: string): string {
  const [yr, mo] = date.split('-')
  return `${MONTH_NAMES[parseInt(mo) - 1]}/${yr.slice(2)}`
}

export function useGoals(): GoalsData {
  const { profile } = useAuth()
  const [active, setActive] = useState<Goal[]>([])
  const [completed, setCompleted] = useState<CompletedGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    // Clients: filter by their linked client_id (from profile).
    // Admins: sees all rows (server RLS should still enforce this — do not rely on client filter alone).
    const clientId = profile.role === 'client' ? profile.client_id : null
    if (profile.role === 'client' && !clientId) {
      // No client linked — nothing to show, avoid leaking all rows.
      setActive([])
      setCompleted([])
      setError(null)
      setLoading(false)
      return
    }
    const query = supabase.from('goals').select('*').order('period_end', { ascending: true })
    const { data: fetched, error: err } = clientId
      ? await query.eq('client_id', clientId)
      : await query

    if (err) {
      console.error('[useGoals] Supabase error:', err)
      setError('Não foi possível carregar as metas. Tente novamente.')
      setLoading(false)
      return
    }

    const rowList = fetched ?? []
    const a: Goal[] = []
    const c: CompletedGoal[] = []
    for (const row of rowList) {
      const meta = METRIC_META[row.metric] ?? DEFAULT_META
      if (row.status === 'completed') {
        c.push({ id: row.id, title: row.title, completedAt: isoToPeriod(row.period_end), icon: meta.icon })
      } else {
        a.push({
          id: row.id,
          title: row.title,
          category: meta.category,
          target: row.target,
          current: row.current_value,
          unit: meta.unit,
          unitPrefix: meta.unitPrefix,
          deadline: isoToPeriod(row.period_end),
          icon: meta.icon,
        })
      }
    }

    setActive(a)
    setCompleted(c)
    setError(null)
    setLoading(false)
  }, [profile?.id, profile?.role])

  useEffect(() => {
    if (!profile) return
    load()
  }, [profile?.id, load])

  return { active, completed, loading, error, refresh: load }
}
