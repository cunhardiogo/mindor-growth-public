import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type SalesDatePreset = '7d' | '30d' | '90d'

export interface SaleRecord {
  id: string
  client_id: string
  integration_type: string
  order_id: string
  order_date: string
  state_code: string | null
  city: string | null
  total_value: number
  payment_method: string | null
  seller_id: string | null
  seller_name: string | null
  status: string | null
  items: SaleItem[]
  synced_at: string
}

export interface SaleItem {
  product_id?: string
  product_name?: string
  qty?: number
  unit_price?: number
}

export interface PaymentBreakdown {
  method: string
  count: number
  value: number
}

export interface StateBreakdown {
  state: string
  count: number
  value: number
}

export interface HourBreakdown {
  hour: number
  count: number
  value: number
}

export interface SellerBreakdown {
  seller_id: string
  seller_name: string
  count: number
  value: number
}

export interface ProductBreakdown {
  product_name: string
  qty: number
  value: number
}

export interface UseSalesDataResult {
  sales: SaleRecord[]
  isLoading: boolean
  error: string | null
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  byPaymentMethod: PaymentBreakdown[]
  byState: StateBreakdown[]
  byHour: HourBreakdown[]
  bySeller: SellerBreakdown[]
  topProducts: ProductBreakdown[]
  hasIntegration: boolean
  refetch: () => Promise<void>
}

const PRESET_DAYS: Record<SalesDatePreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export function useSalesData(datePreset: SalesDatePreset = '30d'): UseSalesDataResult {
  const { profile } = useAuth()
  const clientId = profile?.client_id ?? null

  const [sales, setSales] = useState<SaleRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clientId) {
      setSales([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const since = new Date()
    since.setDate(since.getDate() - PRESET_DAYS[datePreset])
    try {
      const { data, error: dbErr } = await supabase
        .from('sales_data')
        .select('id,client_id,integration_type,order_id,order_date,state_code,city,total_value,payment_method,seller_id,seller_name,status,items,synced_at')
        .eq('client_id', clientId)
        .gte('order_date', since.toISOString())
        .order('order_date', { ascending: false })
        .limit(2000)
      if (dbErr) throw dbErr
      setSales((data as SaleRecord[]) ?? [])
    } catch (e: any) {
      console.error('[useSalesData]', e)
      setError(e?.message ?? 'Erro ao carregar dados de vendas')
      setSales([])
    } finally {
      setIsLoading(false)
    }
  }, [clientId, datePreset])

  useEffect(() => {
    load()
  }, [load])

  // ── Derived metrics ────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const totalRevenue = sales.reduce((s, r) => s + Number(r.total_value || 0), 0)
    const totalOrders = sales.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const byPaymentMethod: PaymentBreakdown[] = aggregate(sales, s => s.payment_method ?? 'Outro')
      .map(([method, agg]) => ({ method, count: agg.count, value: agg.value }))
      .sort((a, b) => b.value - a.value)

    const byState: StateBreakdown[] = aggregate(sales, s => s.state_code ?? '—')
      .map(([state, agg]) => ({ state, count: agg.count, value: agg.value }))
      .sort((a, b) => b.value - a.value)

    const hourMap = new Map<number, { count: number; value: number }>()
    for (let h = 0; h < 24; h++) hourMap.set(h, { count: 0, value: 0 })
    for (const s of sales) {
      const h = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false,
      }).format(new Date(s.order_date))) % 24 | 0
      if (h >= 0 && h < 24) {
        const ex = hourMap.get(h)!
        ex.count += 1
        ex.value += Number(s.total_value || 0)
      }
    }
    const byHour: HourBreakdown[] = Array.from(hourMap.entries()).map(([hour, v]) => ({ hour, count: v.count, value: v.value }))

    const sellerMap = new Map<string, { seller_name: string; count: number; value: number }>()
    for (const s of sales) {
      const key = s.seller_id ?? s.seller_name ?? '—'
      const ex = sellerMap.get(key) ?? { seller_name: s.seller_name ?? key, count: 0, value: 0 }
      ex.count += 1
      ex.value += Number(s.total_value || 0)
      sellerMap.set(key, ex)
    }
    const bySeller: SellerBreakdown[] = Array.from(sellerMap.entries())
      .map(([seller_id, v]) => ({ seller_id, seller_name: v.seller_name, count: v.count, value: v.value }))
      .sort((a, b) => b.value - a.value)

    const productMap = new Map<string, { qty: number; value: number }>()
    for (const s of sales) {
      const items = Array.isArray(s.items) ? s.items : []
      for (const item of items) {
        const name = item?.product_name ?? item?.product_id ?? 'Produto'
        const qty = Number(item?.qty ?? 0)
        const value = qty * Number(item?.unit_price ?? 0)
        const ex = productMap.get(name) ?? { qty: 0, value: 0 }
        ex.qty += qty
        ex.value += value
        productMap.set(name, ex)
      }
    }
    const topProducts: ProductBreakdown[] = Array.from(productMap.entries())
      .map(([product_name, v]) => ({ product_name, qty: v.qty, value: v.value }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    return { totalRevenue, totalOrders, avgOrderValue, byPaymentMethod, byState, byHour, bySeller, topProducts }
  }, [sales])

  const { totalRevenue, totalOrders, avgOrderValue, byPaymentMethod, byState, byHour, bySeller, topProducts } = derived
  const hasIntegration = sales.length > 0

  return {
    sales,
    isLoading,
    error,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    byPaymentMethod,
    byState,
    byHour,
    bySeller,
    topProducts,
    hasIntegration,
    refetch: load,
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
function aggregate(
  sales: SaleRecord[],
  keyFn: (s: SaleRecord) => string,
): [string, { count: number; value: number }][] {
  const map = new Map<string, { count: number; value: number }>()
  for (const s of sales) {
    const key = keyFn(s)
    const ex = map.get(key) ?? { count: 0, value: 0 }
    ex.count += 1
    ex.value += Number(s.total_value || 0)
    map.set(key, ex)
  }
  return Array.from(map.entries())
}
