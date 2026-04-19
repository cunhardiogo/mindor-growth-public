import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  Eye,
  BarChart3,
  Plus,
  Plug,
  ShoppingCart,
  DollarSign,
  Receipt,
  MapPin,
  Clock,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import { useMetaInsightsLive } from '../../hooks/useMetaInsightsLive';
import { useAsaasData } from '../../hooks/useAsaasData';
import { useSalesData, type SalesDatePreset } from '../../hooks/useSalesData';
import { toBillingHistory } from '../../adapters/asaasAdapter';
import { toAcquisitionFunnel, toSecondaryKPIs, formatBRL, formatK } from '../../adapters/metaAdapter';

type Period = '7d' | '30d' | '90d'

const PERIOD_TO_SALES: Record<Period, SalesDatePreset> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
}

const PERIOD_TO_META: Record<Period, string> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
}

function filterByPeriod<T extends { dueDate?: string; paymentDate?: string; dateCreated?: string }>(
  items: T[],
  period: Period,
): T[] {
  const now = new Date()
  const cutoff = new Date()
  if (period === '7d') cutoff.setDate(now.getDate() - 7)
  else if (period === '30d') cutoff.setDate(now.getDate() - 30)
  else cutoff.setDate(now.getDate() - 90)
  return items.filter(p => {
    const d = new Date(p.paymentDate || p.dueDate || p.dateCreated || '')
    return !isNaN(d.getTime()) && d >= cutoff
  })
}

function EmptyIntegrationCard({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plug className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-base font-bold text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-2 max-w-md">
        Configure a integração do cliente nas Configurações.
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">Em breve</span>
    </div>
  )
}

export default function FaturamentoPage() {
  const { profile } = useAuth();
  const { success, error: notifyError } = useNotifications();
  const isAdmin = profile?.role === 'admin';
  const [period, setPeriod] = useState<Period>('30d');
  const [syncing, setSyncing] = useState(false);

  const syncErp = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');
      const res = await fetch('/api/erp/olist-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ days: 90 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao sincronizar.');
      success(`Sincronizado: ${data.synced} pedidos importados.`);
      sales.refetch();
    } catch (e: any) {
      notifyError(e?.message ?? 'Falha na sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  const { data: metaData, loading: metaLoading } = useMetaInsightsLive({
    accountId: profile?.client?.act_id ?? null,
    level: 'account',
    datePreset: PERIOD_TO_META[period],
  });

  const { payments: rawPayments, loading: asaasLoading } = useAsaasData();
  const sales = useSalesData(PERIOD_TO_SALES[period]);

  const loading = isAdmin ? asaasLoading : metaLoading;

  // Filter out cancelled/refunded and apply period
  const payments = useMemo(() => {
    const active = (rawPayments ?? []).filter(
      (p: any) => !['CANCELLED', 'REFUNDED', 'CHARGEBACK'].includes((p.status ?? '').toUpperCase())
    )
    return filterByPeriod(active, period)
  }, [rawPayments, period])

  // Build billing history
  const billingHistoryData = useMemo(() => isAdmin
    ? toBillingHistory(payments)
    : (() => {
        // For client: use meta timeseries spend by month
        const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const months = new Map<string, number>()
        for (const row of metaData) {
          const d = new Date(row.date_start)
          const key = MONTH_NAMES[d.getMonth()]
          months.set(key, (months.get(key) ?? 0) + parseFloat(row.spend || '0'))
        }
        return Array.from(months.entries()).map(([month, investimento]) => ({
          month,
          receita: 0,
          investimento: Math.round(investimento),
        }))
      })(), [isAdmin, payments, metaData])

  // ── Top KPIs ────────────────────────────────────────────────────────────────
  const totalSpend = metaData.reduce((s, r) => s + parseFloat(r.spend || '0'), 0)
  const metaRevenue = metaData.reduce((s, r) => {
    const vals: any[] = r?.action_values ?? []
    return s + vals
      .filter((a: any) => ['purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type))
      .reduce((ss: number, a: any) => ss + parseFloat(a.value || '0'), 0)
  }, 0)

  const totalRevenue = sales.hasIntegration ? sales.totalRevenue : metaRevenue
  const totalOrders = sales.totalOrders
  const avgOrderValue = sales.avgOrderValue

  const topKpis = [
    { label: 'Investimento em Anúncios', value: formatBRL(totalSpend), Icon: DollarSign },
    { label: 'Receita Total', value: formatBRL(totalRevenue), Icon: TrendingUp },
    { label: 'Quantidade de Vendas', value: formatK(totalOrders), Icon: ShoppingCart },
    { label: 'Ticket Médio', value: avgOrderValue > 0 ? formatBRL(avgOrderValue) : '–', Icon: Receipt },
  ]

  const funnel = toAcquisitionFunnel(metaData)
  const secondary = toSecondaryKPIs(metaData)
  const secondaryIcons = [TrendingUp, Target, Users, Eye]

  return (
    <div className="space-y-6">
      {/* Header Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-normal font-space">Faturamento</h2>
          <p className="text-base text-muted-foreground">Acompanhe a saúde financeira e o ROI do seu negócio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          {!isAdmin && (
            <Button variant="outline" className="border-border bg-card" onClick={syncErp} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </Button>
          )}
          <Button variant="outline" className="border-border bg-card" disabled>
            <Plus className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs (TOPO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-xl h-28" />
          ))
        ) : (
          topKpis.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="bg-card border-[#FE5000]/20 border shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <kpi.Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{kpi.label}</p>
                    <p className="text-3xl font-normal font-space text-foreground mb-1">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Gráfico Central e Breakdown Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div
          className="lg:col-span-8"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-normal font-space">
                {isAdmin ? 'Receita vs Investimento — 6 meses' : 'Investimento em Anúncios — Mensal'}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-4">
              {loading ? (
                <div className="animate-pulse bg-muted rounded-xl h-full" />
              ) : (
                <div className="w-full overflow-x-auto overflow-y-hidden pb-4 touch-pan-x min-w-0 h-full">
                  <div className="min-w-[600px] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={billingHistoryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                          tickFormatter={(value) => `R$ ${value/1000}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                        {isAdmin && (
                          <Line
                            type="monotone"
                            dataKey="receita"
                            name="Receita"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: 'var(--card)' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="investimento"
                          name="Investimento"
                          stroke="#FE5000"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#FE5000', strokeWidth: 2, stroke: 'var(--card)' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="lg:col-span-4"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-normal font-space">Investimento por Campanha</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[350px] text-center p-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 opacity-50">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-muted-foreground">Detalhamento por campanha</p>
              <p className="text-xs text-muted-foreground mt-2">Acesse a aba Marketing para ver o breakdown completo por campanha.</p>
              <Button variant="outline" size="sm" className="mt-6 border-primary/20 text-primary hover:bg-primary/10">
                Ver Marketing
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Inferior */}
      <div className="space-y-4">
        <h3 className="text-lg font-normal font-space">Retorno sobre investimento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-20" />
            ))
          ) : (
            secondary.slice(0, 4).map((perf, idx) => {
              const Icon = secondaryIcons[idx];
              const colors = ['text-green-500', 'text-orange-500', 'text-primary', 'text-blue-500'];
              return (
                <motion.div
                  key={perf.label}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ y: -2 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                >
                  <Card className="bg-card border-border shadow-sm hover:border-primary/30 transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className={`w-4 h-4 ${colors[idx]}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">{perf.label}</p>
                        <p className="text-xl font-normal font-space">{perf.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Funil de Aquisição do Site */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-normal font-space">Funil de Aquisição do Site</CardTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Eventos do Pixel Meta</p>
        </CardHeader>
        <CardContent>
          {!funnel ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-muted-foreground">Pixel Meta não configurado para esta conta</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                Instale o Pixel Meta no site para ver o funil completo (visitas → carrinho → checkout → compra).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {funnel.map((stage, idx) => {
                const isFinalRate = stage.value === null
                const max = funnel[0]?.value ?? 0
                const widthPct = isFinalRate || !max ? 100 : Math.max(8, (Number(stage.value) / max) * 100)
                return (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-48 text-sm font-bold">{stage.stage}</div>
                    <div className="flex-1 h-9 rounded-lg bg-muted overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className="h-full bg-primary/80 flex items-center justify-end px-3"
                      >
                        {!isFinalRate && (
                          <span className="text-xs font-bold text-white">{formatK(Number(stage.value))}</span>
                        )}
                      </motion.div>
                    </div>
                    <div className="w-20 text-right text-sm font-normal font-space text-primary">{stage.rate}</div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pedidos por Estado + Produtos Mais Vendidos (lado a lado) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg font-normal font-space">Pedidos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.isLoading ? (
              <div className="animate-pulse bg-muted rounded-xl h-64" />
            ) : !sales.hasIntegration ? (
              <EmptyIntegrationCard message="Integração com sistema de vendas necessária" />
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {sales.byState.slice(0, 15).map((s, i) => (
                  <div key={s.state} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm font-bold uppercase">{s.state}</span>
                      <span className="text-xs text-muted-foreground">({s.count} pedidos)</span>
                    </div>
                    <span className="text-sm font-normal font-space">{formatBRL(s.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg font-normal font-space">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.isLoading ? (
              <div className="animate-pulse bg-muted rounded-xl h-64" />
            ) : !sales.hasIntegration || sales.topProducts.length === 0 ? (
              <EmptyIntegrationCard message="Integração com sistema de vendas necessária" />
            ) : (
              <div className="w-full overflow-x-auto overflow-y-hidden pb-4 touch-pan-x min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase">#</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase">Produto</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase text-right">Qtd</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground uppercase text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.topProducts.map((p, i) => (
                      <TableRow key={p.product_name} className="border-border">
                        <TableCell className="text-sm font-bold">{i + 1}</TableCell>
                        <TableCell className="text-sm max-w-[240px] truncate">{p.product_name}</TableCell>
                        <TableCell className="text-sm font-space text-right">{p.qty}</TableCell>
                        <TableCell className="text-sm font-space text-right">{formatBRL(p.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Horário com Mais Vendas */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <CardTitle className="text-lg font-normal font-space">Horário com Mais Vendas</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {sales.isLoading ? (
            <div className="animate-pulse bg-muted rounded-xl h-full" />
          ) : !sales.hasIntegration ? (
            <EmptyIntegrationCard message="Integração com sistema de vendas necessária" />
          ) : (
            <div className="w-full overflow-x-auto overflow-y-hidden pb-4 touch-pan-x min-w-0 h-full">
              <div className="min-w-[500px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={sales.byHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(h) => `${String(h).padStart(2, '0')}h`}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                      formatter={(v: number, name: string) => name === 'value' ? formatBRL(v) : v}
                      labelFormatter={(h) => `Horário ${String(h).padStart(2, '0')}h`}
                    />
                    <Bar dataKey="count" name="Vendas" fill="#FE5000" radius={[6, 6, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking por Vendedor */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <CardTitle className="text-lg font-normal font-space">Ranking por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.isLoading ? (
            <div className="animate-pulse bg-muted rounded-xl h-40" />
          ) : !sales.hasIntegration || sales.bySeller.length === 0 ? (
            <EmptyIntegrationCard message="Integração com sistema de vendas necessária" />
          ) : (
            <div className="w-full overflow-x-auto overflow-y-hidden pb-4 touch-pan-x min-w-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Posição</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Vendedor</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase text-right">Vendas</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.bySeller.map((s, i) => (
                    <TableRow key={s.seller_id} className="border-border">
                      <TableCell className="text-sm font-bold">{i + 1}º</TableCell>
                      <TableCell className="text-sm">{s.seller_name}</TableCell>
                      <TableCell className="text-sm font-space text-right">{s.count}</TableCell>
                      <TableCell className="text-sm font-space text-right">{formatBRL(s.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
