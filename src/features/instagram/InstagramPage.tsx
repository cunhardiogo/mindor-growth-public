import {
  Instagram,
  Plus,
  TrendingUp,
  MousePointer2,
  AlertCircle,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Globe,
  PlayCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useInstagramInsightsLive } from '../../hooks/useInstagramInsightsLive';
import { useIGFollowersHistory } from '../../hooks/useIGFollowersHistory';
import { useIGMediaCache } from '../../hooks/useIGMediaCache';
import {
  toInstagramKPIs,
  toEngagementCards,
  toReachAndProfileViewsHistory,
  toEngagementByMediaType,
  toTopVideos,
  toFollowersByRegion,
  toTopContent,
} from '../../adapters/instagramAdapter';
import { formatK } from '../../adapters/metaAdapter';

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

const ENGAGE_ICONS = [Heart, MessageCircle, Share2, Bookmark];

export default function InstagramPage() {
  const { profile } = useAuth();
  const instagramId = profile?.client?.ig_user_id ?? null;

  const { insights, account, media, demographicsCountry, loading, error } = useInstagramInsightsLive({
    instagramId,
    datePreset: 'last_30d',
  });

  const { history: followersHistory, isLoading: historyLoading } = useIGFollowersHistory(instagramId);
  const { media: cachedMedia, isLoading: cacheLoading } = useIGMediaCache(instagramId);

  // Compute "new followers" from history when we have at least 2 points
  const newFollowersDelta = followersHistory.length >= 2
    ? followersHistory[followersHistory.length - 1].followers - followersHistory[0].followers
    : null;

  const kpis = toInstagramKPIs(account, insights, undefined, newFollowersDelta);
  const engagementCards = toEngagementCards(insights);
  const reachProfileHistory = toReachAndProfileViewsHistory(insights);
  const engagementByType = toEngagementByMediaType(cachedMedia);
  const topVideos = toTopVideos(cachedMedia);
  const followersByRegion = toFollowersByRegion(demographicsCountry);
  const topContent = toTopContent(media);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Instagram className="text-white w-6 h-6" />
            </div>
            <h2 className="text-2xl font-normal font-space">Instagram Insights</h2>
          </div>
          <p className="text-sm text-muted-foreground">Performance orgânica e engajamento da comunidade</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-card border-border px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Live Sync</span>
          </Badge>
        </div>
      </div>

      {!instagramId && (
        <ErrorCard message="Instagram não configurado neste perfil. Contate o administrador." />
      )}

      {error && <ErrorCard message={error} />}

      {/* Linha 1: 6 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-xl h-32" />
          ))
        ) : (
          kpis.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full bg-card border-border shadow-sm hover:border-primary/30 transition-all">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-1">{kpi.label}</p>
                  <p className="text-3xl font-normal font-space">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{kpi.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Linha 2: 4 cards de Engajamento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-xl h-24" />
          ))
        ) : (
          engagementCards.map((card, idx) => {
            const Icon = ENGAGE_ICONS[idx];
            return (
              <Card key={card.label} className="bg-card border-border shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">{card.label}</p>
                    <p className="text-2xl font-normal font-space">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Linha 3: Novos Seguidores Por Dia + Alcance e Visitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-normal font-space">Novos Seguidores Por Dia</CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Histórico do snapshot diário</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            {historyLoading ? (
              <div className="animate-pulse bg-muted rounded-xl h-full" />
            ) : followersHistory.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Histórico sendo coletado</p>
                <p className="text-xs text-muted-foreground mt-1">Disponível em 24h</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={followersHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    domain={['dataMin', 'dataMax']}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                  />
                  <Line type="monotone" dataKey="followers" name="Seguidores" stroke="#FE5000" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-normal font-space">Alcance e Visitas ao Perfil</CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Diário no período</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="animate-pulse bg-muted rounded-xl h-full" />
            ) : reachProfileHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem dados suficientes para o período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reachProfileHistory}>
                  <defs>
                    <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FE5000" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#FE5000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profileGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF8A4D" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#FF8A4D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="reach" name="Alcance" stroke="#FE5000" fill="url(#reachGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profileViews" name="Visitas ao Perfil" stroke="#FF8A4D" fill="url(#profileGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 4: Interações Por Conteúdo (grouped bar) */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-normal font-space">Interações por Conteúdo</CardTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Média por tipo de mídia</p>
        </CardHeader>
        <CardContent className="h-[320px]">
          {cacheLoading ? (
            <div className="animate-pulse bg-muted rounded-xl h-full" />
          ) : engagementByType.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Carregando insights de posts... Use o botão "Atualizar Cache de Posts" em Configurações.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={engagementByType}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }} />
                <Legend />
                <Bar dataKey="Likes" fill="#FE5000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comentários" fill="#FF8A4D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saves" fill="#FFC1A1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Shares" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Linha 5: Vídeos Mais Relevantes */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2">
          <PlayCircle className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-normal font-space">Vídeos Mais Relevantes</CardTitle>
        </CardHeader>
        <CardContent>
          {cacheLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-muted rounded-xl aspect-video" />
              ))}
            </div>
          ) : topVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum vídeo no cache. Atualize em Configurações.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {topVideos.map((v) => (
                <a
                  key={v.id}
                  href={v.permalink ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl overflow-hidden bg-muted relative"
                >
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt="Vídeo"
                      className="w-full aspect-video object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-muted flex items-center justify-center">
                      <PlayCircle className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="text-white text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="w-3.5 h-3.5" /> {formatK(v.views)} views
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5" /> {formatK(v.likes)} likes
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linha 6: Seguidores por Região + Publicações Mais Relevantes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="border-border bg-card shadow-sm lg:col-span-5">
          <CardHeader className="flex flex-row items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg font-normal font-space">Seguidores por Região</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse bg-muted rounded-xl h-64" />
            ) : followersByRegion.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Demografia indisponível para esta conta.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {followersByRegion.map((r, i) => (
                  <div key={r.country} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm font-bold uppercase">{r.country}</span>
                    </div>
                    <span className="text-sm font-normal font-space">{formatK(r.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-lg font-normal font-space">Publicações Mais Relevantes</CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Posts com melhor performance</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-muted rounded-xl aspect-square" />
                ))}
              </div>
            ) : topContent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum post encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topContent.map((post, idx) => (
                  <motion.a
                    key={post.id}
                    href={post.permalink || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ y: -3 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-lg block"
                  >
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={`Post ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <TrendingUp className="w-4 h-4 text-primary mb-1" />
                          <span className="text-xs font-normal font-space text-white">{post.reach}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <MousePointer2 className="w-4 h-4 text-primary mb-1" />
                          <span className="text-xs font-normal font-space text-white">{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
