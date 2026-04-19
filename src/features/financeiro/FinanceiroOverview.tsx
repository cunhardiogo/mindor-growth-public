import {
  Wallet,
  ArrowUp,
  Calendar,
  ShieldAlert,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { useAsaasData } from '../../hooks/useAsaasData';
import { toFinancialOverview, toCashFlowChart } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function FinanceiroOverview({ asaasData }: { asaasData: AsaasData }) {
  const { balance, payments, transactions, loading } = asaasData;

  const overview = toFinancialOverview(balance, payments);
  const cashFlowChart = toCashFlowChart(transactions);

  const kpiList = [
    { label: 'Saldo Disponível', value: overview.balance, icon: Wallet, color: 'text-primary' },
    { label: 'Recebido (Mês)', value: overview.received, icon: ArrowUp, color: 'text-green-500' },
    { label: 'A Receber', value: overview.toReceive, icon: Calendar, color: 'text-blue-500' },
    { label: 'Inadimplência', value: overview.delinquency, icon: ShieldAlert, color: 'text-red-500' },
    { label: 'Lucro Estimado', value: overview.estimatedProfit, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Prev. 30 Dias', value: overview.forecast30d, icon: Activity, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Cards Principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiList.map((kpi, idx) => (
          <Card key={idx} className="bg-card border-border shadow-sm hover:border-primary/30 transition-all group">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{kpi.label}</p>
              </div>
              {loading ? (
                <div className="animate-pulse bg-muted rounded h-6 w-24" />
              ) : (
                <p className="text-xl font-normal font-space text-foreground">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Receita últimos 6 meses */}
        <Card className="lg:col-span-8 border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Receita últimos 6 meses</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[9px] border-green-500/20 text-green-500">Entradas</Badge>
              <Badge variant="outline" className="text-[9px] border-red-500/20 text-red-500">Saídas</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {loading ? (
              <div className="animate-pulse bg-muted rounded-xl h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="entradas" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="Entradas" />
                  <Line type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Saídas" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Saúde da Carteira & Alertas */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-normal font-space uppercase tracking-widest text-muted-foreground">Saúde da Carteira</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span>Pagos</span>
                  <span className="text-green-500">{overview.paidPct}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-500" style={{ width: `${overview.paidPct}%` }} />
                  <div className="h-full bg-orange-500" style={{ width: `${Math.max(0, 100 - overview.paidPct - 5)}%` }} />
                  <div className="h-full bg-red-500" style={{ width: '5%' }} />
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground font-bold uppercase">
                  <span>{overview.paidAmount}</span>
                  <span>{overview.pendingAmount}</span>
                  <span>{overview.overdueAmount}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-[10px] font-bold text-red-500 uppercase">{overview.overdueCount} Cobranças Vencidas</p>
                    <p className="text-[9px] text-muted-foreground">Total de {overview.delinquency} em atraso.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-[10px] font-bold text-orange-500 uppercase">{overview.dueTodayCount} Vencendo Hoje</p>
                    <p className="text-[9px] text-muted-foreground">Total de {overview.dueToday} para receber.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
