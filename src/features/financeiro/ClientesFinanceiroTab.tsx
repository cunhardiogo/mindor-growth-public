import { ArrowUpRight } from 'lucide-react';
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
import { toCustomersFinancial } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function ClientesFinanceiroTab({ asaasData }: { asaasData: AsaasData }) {
  const { customers, payments, loading } = asaasData;

  const rows = toCustomersFinancial(customers, payments);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Saúde Financeira por Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse bg-muted rounded-xl h-40" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Nome</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Receita Gerada</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">LTV Est.</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Risco</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-right">Histórico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((client) => (
                  <TableRow key={client.name} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="font-bold text-xs py-4 font-space">{client.name}</TableCell>
                    <TableCell className="text-xs font-normal font-space">{client.revenue}</TableCell>
                    <TableCell className="text-xs font-normal font-space text-primary">{client.ltv}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-bold border-none ${
                        client.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] font-bold ${
                        client.risk === 'Baixo' ? 'border-green-500/20 text-green-500' :
                        client.risk === 'Médio' ? 'border-orange-500/20 text-orange-500' :
                        'border-red-500/20 text-red-500'
                      }`}>
                        {client.risk}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
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
