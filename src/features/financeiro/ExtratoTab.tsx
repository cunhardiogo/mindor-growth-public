import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toStatementData } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function ExtratoTab({ asaasData }: { asaasData: AsaasData }) {
  const { transactions, loading } = asaasData;

  const statement = toStatementData(transactions);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Extrato Completo</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-8 h-9 text-xs w-[200px] bg-muted border-none" />
            </div>
            <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase tracking-widest border-border">Exportar CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse bg-muted rounded-xl h-40" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Data</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Descrição</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Valor</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  statement.map((item, idx) => (
                    <TableRow key={idx} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="text-xs font-space py-4">{item.date}</TableCell>
                      <TableCell className="text-xs font-bold">{item.desc}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] font-bold border-none ${
                          item.type === 'Entrada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-xs font-normal font-space ${item.type === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>
                        {item.type === 'Entrada' ? '+' : '-'}{item.value}
                      </TableCell>
                      <TableCell className="text-xs font-normal font-space text-right">{item.balance}</TableCell>
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
