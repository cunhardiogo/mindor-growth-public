import { RefreshCw, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toInvoicesTable } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function CobrancasTab({ asaasData }: { asaasData: AsaasData }) {
  const { payments, customerMap, loading } = asaasData;

  const invoices = toInvoicesTable(payments, customerMap);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Gestão de Cobranças</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-widest border-border">Automação</Button>
          <Button size="sm" className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest">Nova Cobrança</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse bg-muted rounded-xl h-40" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Valor</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Vencimento</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Método</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                    Nenhuma cobrança encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="font-bold text-xs py-4 font-space">{inv.client}</TableCell>
                    <TableCell className="text-xs font-normal font-space">{inv.value}</TableCell>
                    <TableCell className="text-xs font-space">{inv.due}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-bold border-none ${
                        inv.status === 'Pago' ? 'bg-green-500/10 text-green-500' :
                        inv.status === 'Pendente' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.method}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-500">
                          <DollarSign className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
