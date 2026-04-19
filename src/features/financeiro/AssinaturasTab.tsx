import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { useAsaasData } from '../../hooks/useAsaasData';
import { toSubscriptionsTable, toSubscriptionsSummary } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function AssinaturasTab({ asaasData }: { asaasData: AsaasData }) {
  const { subscriptions, customerMap, loading } = asaasData;

  const rows = toSubscriptionsTable(subscriptions, customerMap);
  const summary = toSubscriptionsSummary(subscriptions);

  const kpis = [
    { label: 'MRR', value: summary.mrr, sub: 'Receita Recorrente Mensal' },
    { label: 'ARR', value: summary.arr, sub: 'Receita Recorrente Anual' },
    { label: 'Clientes Ativos', value: String(summary.activeCount), sub: 'Assinaturas em vigor' },
    { label: 'Churn Rate', value: summary.churnRate, sub: 'Taxa de cancelamento' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="bg-card border-border shadow-sm">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{kpi.label}</p>
              {loading ? (
                <div className="animate-pulse bg-muted rounded h-6 w-24 mb-1" />
              ) : (
                <p className="text-2xl font-normal font-space text-foreground mb-1">{kpi.value}</p>
              )}
              <p className="text-[9px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Gestão de Assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse bg-muted rounded-xl h-40" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Plano / Serviço</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Valor</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Ciclo</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Próx. Venc.</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma assinatura encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((sub) => (
                    <TableRow key={sub.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold text-xs py-4 font-space">{sub.client}</TableCell>
                      <TableCell className="text-xs font-bold text-primary">{sub.plan}</TableCell>
                      <TableCell className="text-xs font-normal font-space">{sub.value}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{sub.cycle}</TableCell>
                      <TableCell className="text-xs font-space">{sub.nextDue}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] font-bold border-none ${
                          sub.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
