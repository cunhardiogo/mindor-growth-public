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
import { toDelinquencyList } from '../../adapters/asaasAdapter';

type AsaasData = ReturnType<typeof useAsaasData>;

export default function InadimplenciaTab({ asaasData }: { asaasData: AsaasData }) {
  const { payments, customerMap, loading } = asaasData;

  const delinquencyList = toDelinquencyList(payments, customerMap);
  const totalOverdue = delinquencyList.reduce((s, item) => {
    const val = parseFloat(item.value.replace(/[^\d,]/g, '').replace(',', '.'))
    return s + (isNaN(val) ? 0 : val)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Clientes em Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded h-8 w-16" />
            ) : (
              <>
                <div className="text-4xl font-normal font-space text-foreground">{delinquencyList.length}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Cobranças vencidas</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Valor Total em Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded h-8 w-32" />
            ) : (
              <>
                <div className="text-4xl font-normal font-space text-red-500">
                  {totalOverdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Soma de cobranças vencidas</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-normal font-space uppercase tracking-widest text-muted-foreground">Lista de Inadimplentes</CardTitle>
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
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Dias em Atraso</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase">Score de Risco</TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delinquencyList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma inadimplência encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  delinquencyList.map((item, idx) => (
                    <TableRow key={idx} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold text-xs py-4 font-space">{item.client}</TableCell>
                      <TableCell className="text-xs font-normal font-space text-red-500">{item.value}</TableCell>
                      <TableCell className="text-xs font-normal font-space">{item.days} dias</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] font-bold ${
                          item.risk === 'Baixo' ? 'border-green-500/20 text-green-500' :
                          item.risk === 'Médio' ? 'border-orange-500/20 text-orange-500' :
                          'border-red-500/20 text-red-500'
                        }`}>
                          {item.risk}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/10">
                          Cobrar
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
    </div>
  );
}
