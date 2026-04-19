import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toCashFlowChart, toCashflowSummary } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function FluxoDeCaixaTab({ asaasData }: { asaasData: AsaasData }) {
  const { transactions, loading } = asaasData;

  const chart = toCashFlowChart(transactions);
  const summary = toCashflowSummary(transactions);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Entradas (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded h-8 w-32" />
            ) : (
              <>
                <div className="text-3xl font-normal font-space text-green-500">{summary.entradas}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Mês atual</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Saídas (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded h-8 w-32" />
            ) : (
              <>
                <div className="text-3xl font-normal font-space text-red-500">{summary.saidas}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Mês atual</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Resultado Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded h-8 w-32" />
            ) : (
              <>
                <div className="text-3xl font-normal font-space text-primary">{summary.result}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Margem de {summary.resultPct}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Saldo Acumulado</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">Realizado</Badge>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] pt-4">
          {loading ? (
            <div className="animate-pulse bg-muted rounded-xl h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }} />
                <Line type="monotone" dataKey="saldo" stroke="#FE5000" strokeWidth={4} dot={{ r: 6, fill: '#FE5000' }} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-normal font-space uppercase tracking-widest text-muted-foreground">Simulação de Cenários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs font-bold mb-2">Cenário Otimista (+20% Receita)</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase">Saldo em 90 dias</span>
                <span className="text-sm font-normal font-space text-green-500">Baseado em tendências</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs font-bold mb-2">Cenário Conservador (Estável)</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase">Saldo em 90 dias</span>
                <span className="text-sm font-normal font-space text-primary">Mantendo ritmo atual</span>
              </div>
            </div>
            <Button className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest">Nova Simulação</Button>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-normal font-space uppercase tracking-widest text-muted-foreground">Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] pt-4">
            {loading ? (
              <div className="animate-pulse bg-muted rounded-xl h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="entradas" stroke="#22c55e" strokeWidth={2} dot={false} name="Entradas" />
                  <Line type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={2} dot={false} name="Saídas" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
