import { supabase } from './supabase'

const BASE = '/asaas-api'

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ''

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any)?.errors?.[0]?.description ?? `Erro ${res.status}`)
  }
  return res.json()
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE'
  | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED'
  | 'CHARGEBACK_REQUESTED' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS' | 'CANCELLED'

export type BillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
export type SubscriptionCycle = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED'

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
  phone: string
  mobilePhone: string
  personType: 'FISICA' | 'JURIDICA'
  deleted: boolean
}

export interface AsaasPayment {
  id: string
  customer: string
  billingType: BillingType
  status: PaymentStatus
  value: number
  netValue: number
  dueDate: string
  paymentDate: string | null
  description: string
  invoiceUrl: string | null
  bankSlipUrl: string | null
  transactionReceiptUrl: string | null
}

export interface AsaasSubscription {
  id: string
  customer: string
  billingType: BillingType
  status: SubscriptionStatus
  value: number
  cycle: SubscriptionCycle
  nextDueDate: string
  description: string
}

export interface AsaasTransaction {
  id: string
  value: number
  balance: number
  type: 'CREDIT' | 'DEBIT'
  date: string
  description: string
}

export interface AsaasBalance {
  balance: number
  availableBalance: number
}

export interface AsaasList<T> {
  object: string
  hasMore: boolean
  totalCount: number
  limit: number
  offset: number
  data: T[]
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const asaas = {
  customers: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return req<AsaasList<AsaasCustomer>>(`/customers${qs}`)
    },
    create: (data: Partial<AsaasCustomer>) =>
      req<AsaasCustomer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<AsaasCustomer>) =>
      req<AsaasCustomer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) =>
      req<{ deleted: boolean; id: string }>(`/customers/${id}`, { method: 'DELETE' }),
  },
  payments: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return req<AsaasList<AsaasPayment>>(`/payments${qs}`)
    },
    create: (data: Record<string, unknown>) =>
      req<AsaasPayment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      req<AsaasPayment>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      req<{ deleted: boolean }>(`/payments/${id}`, { method: 'DELETE' }),
    resend: (id: string) =>
      req<{ success: boolean }>(`/payments/${id}/sendWhatsappMessage`, { method: 'POST' }),
  },
  subscriptions: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return req<AsaasList<AsaasSubscription>>(`/subscriptions${qs}`)
    },
    create: (data: Record<string, unknown>) =>
      req<AsaasSubscription>('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      req<AsaasSubscription>(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      req<{ deleted: boolean }>(`/subscriptions/${id}`, { method: 'DELETE' }),
  },
  finance: {
    balance: () => req<AsaasBalance>('/finance/balance'),
    transactions: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return req<AsaasList<AsaasTransaction>>(`/financialTransactions${qs}`)
    },
  },
}
