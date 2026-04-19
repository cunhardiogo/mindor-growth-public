import type {
  AsaasBalance,
  AsaasPayment,
  AsaasSubscription,
  AsaasTransaction,
  AsaasCustomer,
  PaymentStatus,
  SubscriptionCycle,
} from '../lib/asaas'

// ─── Formatters ──────────────────────────────────────────────────────────────

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string): string {
  if (!iso) return '–'
  const [yr, mo, dy] = iso.split('-')
  return `${dy}/${mo}/${yr}`
}

function statusPT(s: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PENDING: 'Pendente',
    RECEIVED: 'Pago',
    CONFIRMED: 'Pago',
    OVERDUE: 'Atrasado',
    REFUNDED: 'Estornado',
    RECEIVED_IN_CASH: 'Pago',
    REFUND_REQUESTED: 'Estorno Req.',
    CHARGEBACK_REQUESTED: 'Chargeback',
    DUNNING_REQUESTED: 'Cobrança',
    DUNNING_RECEIVED: 'Recebido',
    AWAITING_RISK_ANALYSIS: 'Em Análise',
    CANCELLED: 'Cancelado',
  }
  return map[s] ?? s
}

function cyclePT(c: SubscriptionCycle): string {
  const map: Record<SubscriptionCycle, string> = {
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quinzenal',
    MONTHLY: 'Mensal',
    QUARTERLY: 'Trimestral',
    SEMIANNUALLY: 'Semestral',
    YEARLY: 'Anual',
  }
  return map[c] ?? c
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export function toFinancialOverview(
  balance: AsaasBalance | null,
  payments: AsaasPayment[]
) {
  const now = new Date().toISOString().slice(0, 10)

  const received = payments
    .filter(p => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status))
    .reduce((s, p) => s + p.value, 0)

  const toReceive = payments
    .filter(p => p.status === 'PENDING' && p.dueDate >= now)
    .reduce((s, p) => s + p.value, 0)

  const overdue = payments
    .filter(p => p.status === 'OVERDUE' || (p.status === 'PENDING' && p.dueDate < now))
    .reduce((s, p) => s + p.value, 0)

  const overdueCount = payments.filter(
    p => p.status === 'OVERDUE' || (p.status === 'PENDING' && p.dueDate < now)
  ).length

  const dueTodayPayments = payments.filter(p => p.dueDate === now && p.status === 'PENDING')
  const dueToday = dueTodayPayments.reduce((s, p) => s + p.value, 0)

  const paidTotal = received
  const totalTracked = paidTotal + toReceive + overdue
  const paidPct = totalTracked > 0 ? Math.round((paidTotal / totalTracked) * 100) : 0

  return {
    balance: balance ? brl(balance.balance) : '–',
    availableBalance: balance ? brl(balance.availableBalance) : '–',
    received: brl(received),
    toReceive: brl(toReceive),
    delinquency: brl(overdue),
    overdueCount,
    dueTodayCount: dueTodayPayments.length,
    dueToday: brl(dueToday),
    paidPct,
    estimatedProfit: brl(received * 0.65), // rough margin estimate
    forecast30d: brl(toReceive),
    paidAmount: brl(paidTotal),
    pendingAmount: brl(toReceive),
    overdueAmount: brl(overdue),
  }
}

// ─── CashFlow Chart ───────────────────────────────────────────────────────────

export function toCashFlowChart(transactions: AsaasTransaction[]): {
  month: string; entradas: number; saidas: number; saldo: number
}[] {
  const months = new Map<string, { entradas: number; saidas: number }>()
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  for (const tx of transactions) {
    const d = new Date(tx.date)
    const key = MONTH_NAMES[d.getMonth()]
    const ex = months.get(key) ?? { entradas: 0, saidas: 0 }
    if (tx.type === 'CREDIT') ex.entradas += tx.value
    else ex.saidas += Math.abs(tx.value)
    months.set(key, ex)
  }

  let running = 0
  return Array.from(months.entries()).map(([month, v]) => {
    running += v.entradas - v.saidas
    return { month, entradas: Math.round(v.entradas), saidas: Math.round(v.saidas), saldo: Math.round(running) }
  })
}

// ─── Invoices Table ───────────────────────────────────────────────────────────

export function toInvoicesTable(
  payments: AsaasPayment[],
  customerMap: Map<string, string>
): {
  id: string; client: string; value: string; due: string; status: string; method: string
}[] {
  return payments.slice(0, 50).map(p => ({
    id: p.id,
    client: customerMap.get(p.customer) ?? p.customer,
    value: brl(p.value),
    due: formatDate(p.dueDate),
    status: statusPT(p.status),
    method: p.billingType === 'BOLETO' ? 'Boleto'
      : p.billingType === 'PIX' ? 'Pix'
      : p.billingType === 'CREDIT_CARD' ? 'Cartão'
      : 'Outro',
  }))
}

// ─── Subscriptions Table ─────────────────────────────────────────────────────

export function toSubscriptionsTable(
  subscriptions: AsaasSubscription[],
  customerMap: Map<string, string>
): {
  id: string; client: string; plan: string; value: string; cycle: string; status: string; nextDue: string
}[] {
  const active = subscriptions.filter(s => s.status === 'ACTIVE')
  const inactive = subscriptions.filter(s => s.status !== 'ACTIVE')
  const mrr = active.reduce((s, sub) => {
    if (sub.cycle === 'MONTHLY') return s + sub.value
    if (sub.cycle === 'YEARLY') return s + sub.value / 12
    return s + sub.value
  }, 0)

  const arr = mrr * 12
  const churnCount = inactive.length
  const total = subscriptions.length
  const churnRate = total > 0 ? (churnCount / total) * 100 : 0

  const rows = subscriptions.slice(0, 50).map(sub => ({
    id: sub.id,
    client: customerMap.get(sub.customer) ?? sub.customer,
    plan: sub.description || 'Serviço',
    value: brl(sub.value),
    cycle: cyclePT(sub.cycle),
    status: sub.status === 'ACTIVE' ? 'Ativo' : sub.status === 'EXPIRED' ? 'Expirado' : 'Inativo',
    nextDue: formatDate(sub.nextDueDate),
  }))

  return rows
}

export function toSubscriptionsSummary(subscriptions: AsaasSubscription[]) {
  const active = subscriptions.filter(s => s.status === 'ACTIVE')
  const mrr = active.reduce((s, sub) => {
    if (sub.cycle === 'MONTHLY') return s + sub.value
    if (sub.cycle === 'YEARLY') return s + sub.value / 12
    return s + sub.value
  }, 0)
  const total = subscriptions.length
  const churnCount = subscriptions.filter(s => s.status !== 'ACTIVE').length
  return {
    mrr: brl(mrr),
    arr: brl(mrr * 12),
    activeCount: active.length,
    churnRate: total > 0 ? `${((churnCount / total) * 100).toFixed(1)}%` : '–',
  }
}

// ─── Customers Financial ─────────────────────────────────────────────────────

export function toCustomersFinancial(
  customers: AsaasCustomer[],
  payments: AsaasPayment[]
): {
  name: string; revenue: string; ltv: string; status: string; risk: string
}[] {
  const now = new Date().toISOString().slice(0, 10)

  return customers.slice(0, 30).map(c => {
    const cPayments = payments.filter(p => p.customer === c.id)
    const revenue = cPayments
      .filter(p => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status))
      .reduce((s, p) => s + p.value, 0)

    const hasOverdue = cPayments.some(
      p => p.status === 'OVERDUE' || (p.status === 'PENDING' && p.dueDate < now)
    )
    const hasPending = cPayments.some(p => p.status === 'PENDING' && p.dueDate >= now)

    const risk = hasOverdue ? 'Alto' : hasPending ? 'Médio' : 'Baixo'
    const status = revenue > 0 ? 'Ativo' : 'Inativo'
    const ltv = revenue * 3 // simple LTV estimate

    return {
      name: c.name,
      revenue: brl(revenue),
      ltv: brl(ltv),
      status,
      risk,
    }
  })
}

// ─── Delinquency ─────────────────────────────────────────────────────────────

export function toDelinquencyList(
  payments: AsaasPayment[],
  customerMap: Map<string, string>
): {
  client: string; value: string; days: number; risk: string
}[] {
  const now = new Date()

  return payments
    .filter(p => p.status === 'OVERDUE' || (p.status === 'PENDING' && p.dueDate < now.toISOString().slice(0, 10)))
    .map(p => {
      const dueDate = new Date(p.dueDate)
      const days = Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
      const risk = days > 30 ? 'Alto' : days > 7 ? 'Médio' : 'Baixo'
      return {
        client: customerMap.get(p.customer) ?? p.customer,
        value: brl(p.value),
        days,
        risk,
      }
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 20)
}

// ─── Statement ────────────────────────────────────────────────────────────────

export function toStatementData(transactions: AsaasTransaction[]): {
  date: string; desc: string; type: string; value: string; balance: string
}[] {
  return transactions.slice(0, 50).map(tx => ({
    date: formatDate(tx.date),
    desc: tx.description || '–',
    type: tx.type === 'CREDIT' ? 'Entrada' : 'Saída',
    value: brl(Math.abs(tx.value)),
    balance: brl(tx.balance),
  }))
}

// ─── Cashflow summary ────────────────────────────────────────────────────────

export function toCashflowSummary(transactions: AsaasTransaction[]) {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const current = transactions.filter(tx => tx.date.startsWith(thisMonth))
  const entradas = current.filter(tx => tx.type === 'CREDIT').reduce((s, tx) => s + tx.value, 0)
  const saidas = current.filter(tx => tx.type === 'DEBIT').reduce((s, tx) => s + Math.abs(tx.value), 0)
  const result = entradas - saidas

  return {
    entradas: brl(entradas),
    saidas: brl(saidas),
    result: brl(result),
    resultPct: entradas > 0 ? `${((result / entradas) * 100).toFixed(1)}%` : '–',
  }
}

// ─── Billing history (for Faturamento page) ───────────────────────────────────

export function toBillingHistory(payments: AsaasPayment[]): { month: string; receita: number; investimento: number }[] {
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const months = new Map<string, number>()

  for (const p of payments) {
    if (!['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status)) continue
    const d = new Date(p.paymentDate ?? p.dueDate)
    const key = MONTH_NAMES[d.getMonth()]
    months.set(key, (months.get(key) ?? 0) + p.value)
  }

  return Array.from(months.entries()).map(([month, receita]) => ({
    month,
    receita: Math.round(receita),
    investimento: 0, // Asaas doesn't track ad spend
  }))
}
