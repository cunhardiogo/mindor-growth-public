import { useState, useEffect, useCallback } from 'react'
import { asaas } from '../lib/asaas'
import { useAuth } from '../contexts/AuthContext'
import type { AsaasBalance, AsaasPayment, AsaasSubscription, AsaasTransaction, AsaasCustomer } from '../lib/asaas'

interface AsaasData {
  balance: AsaasBalance | null
  payments: AsaasPayment[]
  subscriptions: AsaasSubscription[]
  transactions: AsaasTransaction[]
  customers: AsaasCustomer[]
  customerMap: Map<string, string>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

interface CacheEntry {
  balance: AsaasBalance | null
  payments: AsaasPayment[]
  subscriptions: AsaasSubscription[]
  transactions: AsaasTransaction[]
  customers: AsaasCustomer[]
  customerMap: Map<string, string>
  error: string | null
  ts: number
}

const CACHE_TTL = 5 * 60 * 1000
const _cache = new Map<string, CacheEntry>()

export function useAsaasData(): AsaasData {
  const { profile } = useAuth()
  const [balance, setBalance] = useState<AsaasBalance | null>(null)
  const [payments, setPayments] = useState<AsaasPayment[]>([])
  const [subscriptions, setSubscriptions] = useState<AsaasSubscription[]>([])
  const [transactions, setTransactions] = useState<AsaasTransaction[]>([])
  const [customers, setCustomers] = useState<AsaasCustomer[]>([])
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (forceRefresh = false) => {
    if (!profile || profile.role !== 'admin') {
      setLoading(false)
      return
    }

    const cacheKey = profile.id ?? 'admin'
    const cached = _cache.get(cacheKey)
    if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL) {
      setBalance(cached.balance)
      setPayments(cached.payments)
      setSubscriptions(cached.subscriptions)
      setTransactions(cached.transactions)
      setCustomers(cached.customers)
      setCustomerMap(cached.customerMap)
      setError(cached.error)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const failures: string[] = []

    async function safeFetch<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
      try { return await fn() }
      catch (e: any) { failures.push(`${label}: ${e?.message ?? 'erro'}`); return fallback }
    }

    const empty = { data: [] } as any
    const [balRes, payRes, subRes, txRes, custRes] = await Promise.all([
      safeFetch(() => asaas.finance.balance(), null, 'Saldo'),
      safeFetch(() => asaas.payments.list({ limit: '100' }), empty, 'Cobranças'),
      safeFetch(() => asaas.subscriptions.list({ limit: '100' }), empty, 'Assinaturas'),
      safeFetch(() => asaas.finance.transactions({ limit: '100' }), empty, 'Extrato'),
      safeFetch(() => asaas.customers.list({ limit: '100' }), empty, 'Clientes'),
    ])

    const custList: AsaasCustomer[] = (custRes as any)?.data ?? []
    const map = new Map<string, string>()
    for (const c of custList) map.set(c.id, c.name)

    const errMsg = failures.length ? 'Falha em: ' + failures.join(' | ') : null

    _cache.set(cacheKey, {
      balance: balRes,
      payments: (payRes as any)?.data ?? [],
      subscriptions: (subRes as any)?.data ?? [],
      transactions: (txRes as any)?.data ?? [],
      customers: custList,
      customerMap: map,
      error: errMsg,
      ts: Date.now(),
    })

    setBalance(balRes)
    setPayments((payRes as any)?.data ?? [])
    setSubscriptions((subRes as any)?.data ?? [])
    setTransactions((txRes as any)?.data ?? [])
    setCustomers(custList)
    setCustomerMap(map)
    if (errMsg) setError(errMsg)
    setLoading(false)
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => load(true), [load])

  return { balance, payments, subscriptions, transactions, customers, customerMap, loading, error, refresh }
}
