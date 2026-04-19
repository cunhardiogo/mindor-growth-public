import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText,
  ArrowUpRight,
  User,
  Eye,
  MousePointer2,
  Instagram,
  BrainCircuit,
  Users,
  CreditCard,
  Plug
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useMetaInsightsLive } from '../../hooks/useMetaInsightsLive';
import { usePeriodComparisonLive } from '../../hooks/usePeriodComparisonLive';
import { useInstagramInsightsLive } from '../../hooks/useInstagramInsightsLive';
import { useSalesData, type SalesDatePreset } from '../../hooks/useSalesData';
import {
  toOverviewKPIs,
  toGrowthChart,
  toCapitalDistribution,
  toAcquisitionChannels,
  toGrowthScore,
  formatBRL,
} from '../../adapters/metaAdapter';
import { toSocialAwareness } from '../../adapters/instagramAdapter';
import { useAsaasData } from '../../hooks/useAsaasData';

const kpiIcons = [TrendingUp, TrendingDown, Users, TrendingUp, CreditCard, ArrowUpRight];

const PERIOD_TO_META: Record<SalesDatePreset, string> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  boleto: 'Boleto',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
};

const PAYMENT_COLORS = ['#FE5000', '#FF8A4D', '#FFC1A1', '#1A1A1A', '#888'];

export default function OverviewPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [period, setPeriod] = useState<SalesDatePreset>('30d');

  const accountId = profile?.client?.act_id ?? null;
  const instagramId = profile?.client?.ig_user_id ?? null;
  const datePreset = PERIOD_TO_META[period];

  const { data: metaData, timeSeries, loading: metaLoading, refetch: refetchMeta } = useMetaInsightsLive({
    accountId,
    level: 'account',
    datePreset,
  });

  const prevData = usePeriodComparisonLive({ accountId, datePreset });

  const { insights: igInsights, account: igAccount, loading: igLoading, refetch: refetchIg } = useInstagramInsightsLive({
    instagramId,
    datePreset,
  });

  const { balance } = useAsaasData();
  const { byPaymentMethod, hasIntegration: hasSalesIntegration, isLoading: salesLoading } = useSalesData(period);

  const loading = metaLoading || igLoading;

  const kpis = toOverviewKPIs(metaData, prevData);
  const growthChart = toGrowthChart(timeSeries);
  const capitalDist = toCapitalDistribution(metaData, isAdmin ? (balance?.balance ?? null) : null);
  const acquisitionChannels = toAcquisitionChannels(metaData);
  const growthScore = toGrowthScore(metaData);
  const socialAwareness = toSocialAwareness(igAccount, igInsights);

  const totalRevenue = metaData.reduce((s, r) => {
    const vals: any[] = r?.action_values ?? [];
    return s + vals
      .filter((a: any) => ['purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type))
      .reduce((ss: number, a: any) => ss + parseFloat(a.value || '0'), 0);
  }, 0);

  const totalSpend = metaData.reduce((s, r) => s + parseFloat(r.spend || '0'), 0);
  // Only show real conversion revenue; never substitute spend as "receita"
  const displayRevenue = totalRevenue > 0 ? totalRevenue : null;

  const socialIcons = [Instagram, MousePointer2, Eye, User];
  const socialColors = ['text-pink-500', 'text-blue-500', 'text-purple-500', 'text-orange-500'];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Header com Period Selector */}
      <div className="col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-normal font-space">Visão Geral</h2>
          <p className="text-base text-muted-foreground">Performance consolidada do seu negócio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as SalesDatePreset)}>
            <SelectTrigger className="w-[160px] bg-card/60 backdrop-blur-2xl border-border">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Total Balance Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="col-span-12 lg:col-span-4"
      >
        <Card className="h-full bg-primary text-white border-none shadow-2xl shadow-primary/20 overflow-hidden relative group transition-all duration-300">
          <motion.div
            className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ scale: 1.1 }}
          />
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-normal opacity-80 font-space">Receita Gerada</CardTitle>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {metaLoading ? (
              <div className="animate-pulse bg-white/20 rounded-xl h-12 mb-6" />
            ) : (
              <div className="text-5xl font-normal mb-6 font-space tracking-tight">
                {displayRevenue !== null
                  ? <>{formatBRL(displayRevenue)} <span className="text-xl font-normal opacity-70">BRL</span></>
                  : <span className="text-2xl opacity-70" title="Dados de conversão não configurados">— sem conversões</span>
                }
              </div>
            )}
            <div className="flex gap-3">
              <Button className="flex-1 bg-white text-primary hover:bg-gray-100 rounded-xl gap-2 font-semibold" disabled>
                <FileText className="w-4 h-4" />
                Ver Relatório
              </Button>
              <Button
                className="flex-1 bg-black text-white hover:bg-gray-900 rounded-xl gap-2 font-semibold"
                onClick={() => { refetchMeta(); refetchIg(); }}
                disabled={metaLoading || igLoading}
              >
                <RefreshCw className={`w-4 h-4 ${(metaLoading || igLoading) ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Cards (6) */}
      <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-xl h-32" />
          ))
        ) : (
          kpis.map((item, idx) => {
            const Icon = kpiIcons[idx] ?? TrendingUp;
            const isPositive = item.status === 'up';
            return (
              <motion.div
                key={item.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
              >
                <Card className="h-full border-border bg-card/60 backdrop-blur-2xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-lg ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <Icon className={`w-5 h-5 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                      </div>
                      <span className={`text-sm font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{item.change}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-muted-foreground uppercase mb-2">{item.label}</p>
                      <p className="text-4xl font-normal font-space tracking-tight">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Social Awareness Block */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="col-span-12 lg:col-span-3"
      >
        <Card className="h-full border-border bg-card/60 backdrop-blur-2xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-normal font-space">Social Awareness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {igLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-muted rounded-lg h-10" />
              ))
            ) : (
              socialAwareness.map((item, idx) => {
                const Icon = socialIcons[idx];
                const color = socialColors[idx];
                return (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm font-normal font-space">{item.value}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Evolução de Crescimento Chart */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="col-span-12 lg:col-span-6"
      >
        <Card className="border-border bg-card/60 backdrop-blur-2xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-6 right-6">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors cursor-pointer">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-normal font-space">Evolução de Crescimento</CardTitle>
              <p className="text-xs text-muted-foreground uppercase mt-1">Performance últimos 7 dias</p>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {metaLoading ? (
              <div className="animate-pulse bg-muted rounded-xl h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChart} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FE5000" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FE5000" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 400, fill: 'var(--muted-foreground)' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 400, fill: 'var(--muted-foreground)' }}
                    tickFormatter={(value) => `R$ ${value / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ stroke: '#FE5000', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Faturamento']}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke="#FE5000"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorFaturamento)"
                    activeDot={{ r: 6, fill: '#FE5000', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={2000}
                    name="Faturamento"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Score de Crescimento */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="col-span-12 lg:col-span-3"
      >
        <Card className="h-full border-border bg-card/60 backdrop-blur-2xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-normal font-space">Score de Crescimento</CardTitle>
            <span className="inline-flex items-center rounded-full border-none px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-500">Saudável</span>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            {metaLoading ? (
              <div className="animate-pulse bg-muted rounded-full w-32 h-32 mb-6" />
            ) : (
              <>
                <div className="relative w-32 h-32 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle className="text-muted stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                    <circle
                      className="text-primary stroke-current"
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="transparent"
                      r="40" cx="50" cy="50"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - growthScore.score / 100)}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-normal font-space">{growthScore.score}%</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Geral</span>
                  </div>
                </div>
                <div className="w-full space-y-3">
                  {growthScore.items.map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs font-bold uppercase mb-1">
                        <span>{item.label}</span>
                        <span className="font-normal font-space">{item.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Grid: AI Assistant, Capital Distribution & Acquisition Channels */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="h-full border-border bg-card/60 backdrop-blur-2xl shadow-sm flex flex-col hover:shadow-xl hover:border-primary/40 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-normal font-space">Mindor AI Assistant</CardTitle>
              <BrainCircuit className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-300 mb-4 flex items-center justify-center overflow-hidden"
              >
                <div className="w-full h-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BrainCircuit className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <h3 className="text-lg font-bold mb-4">Como posso escalar hoje?</h3>
              <div className="grid grid-cols-1 gap-2 w-full mb-6">
                {[
                  'Ver gargalos do funil',
                  'Melhorar CPL',
                  'Aumentar conversão',
                  'Analisar campanhas'
                ].map((text) => (
                  <Button key={text} variant="outline" className="text-xs h-auto py-2 px-3 justify-start border-border bg-muted/50 text-muted-foreground hover:text-primary hover:border-primary transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                    {text}
                  </Button>
                ))}
              </div>
              <div className="w-full relative">
                <Input
                  placeholder="Pergunte sobre seu crescimento..."
                  className="pr-12 bg-muted border-none rounded-2xl h-12 focus-visible:ring-primary"
                />
                <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 bg-primary hover:bg-primary/90 rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="h-full border-border bg-card/60 backdrop-blur-2xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-normal font-space">Distribuição de Capital</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 py-6">
              {metaLoading ? (
                <div className="animate-pulse bg-muted rounded-full w-40 h-40" />
              ) : (
                <>
                  <div className="h-40 w-40 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={capitalDist}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {capitalDist.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                      <p className="text-xl font-normal font-space">
                        {formatBRL(capitalDist.reduce((s, d) => s + d.value, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    {capitalDist.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-bold">{item.name}</span>
                        </div>
                        <span className="text-xs font-normal font-space">{formatBRL(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="h-full border-border bg-card/60 backdrop-blur-2xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-normal font-space">Canais de Aquisição</CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              {metaLoading ? (
                <div className="animate-pulse bg-muted rounded-xl h-40" />
              ) : (
                <div className="space-y-5">
                  {acquisitionChannels.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-bold">{item.name}</span>
                        </div>
                        <span className="text-sm font-normal font-space">{item.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1, delay: 1.2 }}
                          className="h-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Vendas por Forma de Pagamento */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="col-span-12"
      >
        <Card className="border-border bg-card/60 backdrop-blur-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-normal font-space">Vendas por Forma de Pagamento</CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Distribuição no período</p>
          </CardHeader>
          <CardContent className="py-6">
            {salesLoading ? (
              <div className="animate-pulse bg-muted rounded-xl h-64" />
            ) : !hasSalesIntegration ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plug className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-base font-bold text-muted-foreground">Nenhuma integração de vendas configurada</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-md">Conecte seu ERP ou loja online em Configurações para visualizar a distribuição de pagamentos.</p>
                <span className="mt-4 inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">Em breve</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byPaymentMethod.map(p => ({
                          name: PAYMENT_LABELS[p.method] ?? p.method,
                          value: p.value,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {byPaymentMethod.map((_, i) => (
                          <Cell key={`pm-${i}`} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {byPaymentMethod.map((p, i) => (
                    <div key={p.method} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                        <span className="text-sm font-bold">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                        <span className="text-xs text-muted-foreground">({p.count})</span>
                      </div>
                      <span className="text-sm font-normal font-space">{formatBRL(p.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
