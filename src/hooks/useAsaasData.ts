import { useQuery } from '@tanstack/react-query'
import { asaas } from '../lib/asaas'
import { useAuth } from '../contexts/AuthContext'
import type { AsaasBalance, AsaasPayment, AsaasSubscription, AsaasTransaction, AsaasCustomer } from '../lib/asaas'

export function useAsaasData() {
  const { profile } = useAuth()
  
  const query = useQuery({
    queryKey: ['asaasData', profile?.id],
    queryFn: async () => {
      if (!profile || profile.role !== 'admin') {
        throw new Error('Not authorized')
      }

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

      return {
        balance: balRes as AsaasBalance | null,
        payments: ((payRes as any)?.data ?? []) as AsaasPayment[],
        subscriptions: ((subRes as any)?.data ?? []) as AsaasSubscription[],
        transactions: ((txRes as any)?.data ?? []) as AsaasTransaction[],
        customers: custList,
        customerMap: map,
        error: errMsg,
      }
    },
    enabled: profile?.role === 'admin'
  })

  // Polyfill the exact signature so dependent components don't break
  return {
    balance: query.data?.balance ?? null,
    payments: query.data?.payments ?? [],
    subscriptions: query.data?.subscriptions ?? [],
    transactions: query.data?.transactions ?? [],
    customers: query.data?.customers ?? [],
    customerMap: query.data?.customerMap ?? new Map<string, string>(),
    loading: query.isLoading,
    error: query.data?.error ?? (query.error ? query.error.message : null),
    refresh: async () => { await query.refetch() }
  }
}
