import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, Users, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useMetaInsightsLive } from '../../hooks/useMetaInsightsLive';
import { useInstagramInsightsLive } from '../../hooks/useInstagramInsightsLive';
import { toMarketingKPIs, toSecondaryKPIs } from '../../adapters/metaAdapter';
import { toInstagramKPIs } from '../../adapters/instagramAdapter';

interface ClientRow {
  id: string
  name: string | null
  act_id: string | null
  ig_user_id: string | null
  status: number | null
}

// ─── Client Detail View ───────────────────────────────────────────────────────

function KpiCard({ label, value, change, status, sub }: {
  label: string; value: string; change?: string; status?: 'up' | 'down'; sub?: string; key?: string | number
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-space font-normal mt-1">{value}</p>
        {change && (
          <p className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${status === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {status === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </p>
        )}
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function ClientDetailView({ client, onBack }: { client: ClientRow; onBack: () => void }) {
  const metaData = useMetaInsightsLive({
    accountId: client.act_id,
    level: 'account',
    datePreset: 'last_30d',
  });
  const igData = useInstagramInsightsLive({
    instagramId: client.ig_user_id,
    datePreset: 'last_30d',
  });

  const metaKPIs = toMarketingKPIs(metaData.data, metaData.timeSeries);
  const secondaryKPIs = toSecondaryKPIs(metaData.data);
  const igKPIs = toInstagramKPIs(igData.account, igData.insights);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-space font-normal">{client.name ?? '–'}</h2>
          <div className="flex flex-wrap gap-3 mt-1">
            {client.act_id
              ? <span className="text-[10px] text-muted-foreground font-mono">Meta: {client.act_id}</span>
              : <span className="text-[10px] text-orange-500">Meta Ads não configurado</span>
            }
            {client.ig_user_id
              ? <span className="text-[10px] text-muted-foreground font-mono">IG: {client.ig_user_id}</span>
              : <span className="text-[10px] text-orange-500">Instagram não configurado</span>
            }
          </div>
        </div>
        <Badge className={`text-[9px] font-bold border-none ${client.status === 1 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
          {client.status === 1 ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Meta Ads */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Meta Ads — Últimos 30 dias</p>
        {!client.act_id ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Meta Ads não configurado para este cliente.</CardContent></Card>
        ) : metaData.loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse bg-muted rounded-xl h-24" />)}
          </div>
        ) : metaData.error ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />{metaData.error}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {metaKPIs.map(k => <KpiCard key={k.label} label={k.label} value={k.value} change={k.change} status={k.status as 'up' | 'down'} sub={k.sub} />)}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {secondaryKPIs.map(k => (
                <Card key={k.label} className="bg-muted/40 border-border">
                  <CardContent className="p-3">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k.label}</p>
                    <p className="text-base font-space font-normal mt-0.5">{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Instagram */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Instagram — Últimos 30 dias</p>
        {!client.ig_user_id ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Instagram não configurado para este cliente.</CardContent></Card>
        ) : igData.loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-muted rounded-xl h-24" />)}
          </div>
        ) : igData.error ? (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />{igData.error}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {igKPIs.map(k => <KpiCard key={k.label} label={k.label} value={k.value} change={k.change} status={k.status as 'up' | 'down'} />)}
          </div>
        )}
      </section>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);

  const isAdmin = profile?.role === 'admin';

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (err) {
      setError(err.message);
    } else {
      setClients(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadClients();
    else setLoading(false);
  }, [isAdmin]);

  if (profile && !isAdmin) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-xl h-16" />
        ))}
      </div>
    );
  }

  if (selectedClient) {
    return <ClientDetailView client={selectedClient} onBack={() => setSelectedClient(null)} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-normal font-space">Total de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-normal font-space">{clients.length}</div>
              <p className="text-sm text-muted-foreground font-bold">Cadastros ativos</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-normal font-space">Com Meta Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-normal font-space">{clients.filter(c => c.act_id).length}</div>
              <p className="text-sm text-muted-foreground font-bold">Contas conectadas</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-normal font-space">Com Instagram</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-normal font-space">{clients.filter(c => c.ig_user_id).length}</div>
              <p className="text-sm text-muted-foreground font-bold">Contas conectadas</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-normal font-space flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Lista de Clientes
          </CardTitle>
          <Button onClick={loadClients} variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase">Nome</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase">Meta Ads ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase">Instagram ID</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                    Nenhum cliente cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <TableCell className="font-normal font-space">{client.name ?? '–'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {client.act_id ? (
                        <span className="truncate max-w-[120px] block">{client.act_id}</span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-orange-500/20 text-orange-500">Não configurado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {client.ig_user_id ? (
                        <span className="truncate max-w-[120px] block">{client.ig_user_id}</span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-orange-500/20 text-orange-500">Não configurado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] font-bold border-none ${
                        client.status === 1
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {client.status === 1 ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
