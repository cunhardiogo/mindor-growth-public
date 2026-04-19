import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Eye,
  MousePointer2,
  RefreshCw,
  Wallet,
  Plus,
  Zap,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
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
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
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
import { useMetaInsightsLive } from '../../hooks/useMetaInsightsLive';
import { usePeriodComparisonLive } from '../../hooks/usePeriodComparisonLive';
import {
  toMarketingKPIs,
  toPerformanceChart,
  toEfficiencyData,
  toCampaignTable,
  toSecondaryKPIs,
} from '../../adapters/metaAdapter';

const PERIOD_MAP: Record<string, string> = {
  '7days': 'last_7d',
  '30days': 'last_30d',
  '90days': 'last_90d',
};

function LoadingKPIs() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-muted rounded-xl h-28" />
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardContent className="p-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-sm text-red-500">{message}</p>
      </CardContent>
    </Card>
  );
}

export default function MarketingPage() {
  const { profile } = useAuth();
  const [marketingPeriod, setMarketingPeriod] = useState('30days');
  const [marketingChannel, setMarketingChannel] = useState('all');

  // Ownership: client always uses their own act_id from profile.client
  const accountId = profile?.client?.act_id ?? null;
  const datePreset = PERIOD_MAP[marketingPeriod] ?? 'last_30d';
  const isAdmin = profile?.role === 'admin';

  const { data, timeSeries, loading, error } = useMetaInsightsLive({
    accountId,
    level: 'campaign',
    datePreset,
  });

  const prevData = usePeriodComparisonLive({ accountId, datePreset });

  // Channel filter (client-side):
  //   - 'all'    → no filter
  //   - 'meta'   → all rows (this account is Meta)
  //   - 'google' → match "google" in campaign name (typically empty here)
  //   - 'organic'→ match "organ" in campaign name
  const filterByChannel = <T extends { campaign_name?: string; name?: string }>(rows: T[]): T[] => {
    if (marketingChannel === 'all' || marketingChannel === 'meta') return rows;
    const needle = marketingChannel === 'google' ? 'google' : 'organ';
    return rows.filter(r => (r.campaign_name ?? r.name ?? '').toLowerCase().includes(needle));
  };

  const filteredData = filterByChannel(data);

  const kpis = toMarketingKPIs(filteredData, timeSeries, prevData);
  const performanceChart = toPerformanceChart(timeSeries);
  const efficiencyData = toEfficiencyData(filteredData);
  const campaignTable = toCampaignTable(filteredData);
  const secondaryKPIs = toSecondaryKPIs(filteredData);

  // Secondary KPI icons
  const secondaryIcons = [Eye, Users, MousePointer2, TrendingUp, Wallet, RefreshCw];

  return (
    <div className="space-y-6">
      {/* Header Superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Aquisição, eficiência e performance de campanhas</p>
          <p className="text-[10px] font-bold text-primary uppercase mt-2 italic">"Marketing sem controle é só gasto. Aqui é investimento."</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={marketingPeriod} onValueChange={setMarketingPeriod}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="30days">30 dias</SelectItem>
              <SelectItem value="90days">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketingChannel} onValueChange={setMarketingChannel}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Canais</SelectItem>
              <SelectItem value="meta">Meta Ads</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
              <SelectItem value="organic">Orgânico</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="outline" className="border-border bg-card">
              <Plus className="w-4 h-4 mr-2" />
              Campanha
            </Button>
          )}
        </div>
      </div>

      {!accountId && (
        <ErrorCard message="Conta de anúncios não configurada. Contate o administrador." />
      )}

      {error && <ErrorCard message={error} />}

      {/* KPIs PRINCIPAIS (7) */}
      {loading ? (
        <LoadingKPIs />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {kpis.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="bg-card border-border shadow-sm hover:border-primary/30 transition-all h-full py-2">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">{kpi.label}</p>
                    <Badge className={`text-xs border-none px-2 py-0 ${kpi.status === 'up' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {kpi.change}
                    </Badge>
                  </div>
                  <p className="text-4xl font-normal font-space text-foreground mb-2">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{kpi.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Gráficos Evoluídos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gasto vs Resultado */}
        <motion.div
          className="lg:col-span-8"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          key={`chart-${marketingPeriod}-${marketingChannel}`}
        >
          <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-normal font-space">Gasto vs Resultado</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs border-primary/20 text-primary">Investimento</Badge>
                <Badge variant="outline" className="text-xs border-green-500/20 text-green-500">Receita</Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[350px] pt-4">
              {loading ? (
                <div className="animate-pulse bg-muted rounded-xl h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="investimento"
                      stroke="#FE5000"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={1500}
                      name="Investimento"
                    />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={1500}
                      name="Receita"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Eficiência das Campanhas */}
        <motion.div
          className="lg:col-span-4"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Card className="h-full border-border bg-card shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-normal font-space">Eficiência das Campanhas</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-4 relative">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <Zap className="w-64 h-64 text-primary" />
              </div>
              {loading ? (
                <div className="animate-pulse bg-muted rounded-xl h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={efficiencyData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 'bold' }}
                      width={90}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                    />
                    <Bar
                      dataKey="roas"
                      fill="#FE5000"
                      radius={[0, 10, 10, 0]}
                      name="ROAS"
                      barSize={12}
                      animationDuration={1500}
                    >
                      {efficiencyData.map((_, index) => (
                        <Cell key={`cell-roas-${index}`} fill={index === 0 ? '#FE5000' : '#FE500080'} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="conversao"
                      fill="#22c55e"
                      radius={[0, 10, 10, 0]}
                      name="Conv %"
                      barSize={12}
                      animationDuration={1500}
                    >
                      {efficiencyData.map((_, index) => (
                        <Cell key={`cell-conv-${index}`} fill={index === 0 ? '#22c55e' : '#22c55e80'} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Diagnóstico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Diagnóstico de Marketing */}
        <motion.div
          className="lg:col-span-12"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="h-full border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-primary/5 border-b border-border">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-normal font-space">Diagnóstico Mindor AI</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              <div className="mt-auto">
                <div className="relative">
                  <Input placeholder="Pergunte à IA sobre seu marketing..." className="bg-muted border-none rounded-xl pr-10 text-sm" />
                  <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-primary rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance por Campanha */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-normal font-space">Performance por Campanha</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-sm font-bold">Relatório Completo</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded-xl h-40" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Campanha</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Investimento</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Leads</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">CPL</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Conv.</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">ROAS</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignTable.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma campanha encontrada no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaignTable.map((camp) => (
                      <TableRow key={camp.id} className="border-border hover:bg-muted/50 transition-colors">
                        <TableCell className="font-normal text-sm py-4 font-space max-w-[200px] truncate">{camp.name}</TableCell>
                        <TableCell className="text-sm font-space">{camp.invest}</TableCell>
                        <TableCell className="text-sm font-space">{camp.leads}</TableCell>
                        <TableCell className="text-sm font-normal font-space">{camp.cpl}</TableCell>
                        <TableCell className="text-sm font-space">{camp.conv}</TableCell>
                        <TableCell className="text-sm font-normal font-space text-primary">{camp.roas}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs font-bold border-none ${
                            camp.status === 'Bom' ? 'bg-green-500/10 text-green-500' :
                            camp.status === 'Médio' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {camp.status}
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
      </motion.div>

      {/* Métricas do Período */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-xl h-20" />
          ))
        ) : (
          secondaryKPIs.map((metric, idx) => {
            const Icon = secondaryIcons[idx];
            return (
              <Card key={idx} className="bg-card border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs font-bold text-muted-foreground uppercase">{metric.label}</p>
                  </div>
                  <p className="text-xl font-normal font-space">{metric.value}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
