import { RefreshCw, AlertCircle, Flag, Megaphone, Trophy, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { useTimeline, type TimelineEventType } from '../../hooks/useTimeline';

const typeConfig: Record<TimelineEventType, { label: string; icon: typeof Flag; color: string; bg: string }> = {
  milestone: { label: 'Marco', icon: Flag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  campaign: { label: 'Campanha', icon: Megaphone, color: 'text-primary', bg: 'bg-primary/10' },
  achievement: { label: 'Conquista', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  update: { label: 'Atualização', icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
};

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function TimelinePage() {
  const { events, loading, error, refresh } = useTimeline();

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-xl h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Card className="border-border bg-card p-12">
          <CardContent className="flex flex-col items-center gap-4 pt-0">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Linha do Tempo</h3>
            <p className="text-muted-foreground max-w-md text-sm">
              Nenhum evento registrado ainda. Os marcos, campanhas e conquistas aparecerão aqui.
            </p>
            <Button onClick={refresh} variant="outline" size="sm" className="border-primary/20 text-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal font-space">Linha do Tempo</h2>
          <p className="text-sm text-muted-foreground">Histórico de marcos, campanhas e conquistas</p>
        </div>
        <Button onClick={refresh} variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary/50 via-border to-transparent" />

        <div className="space-y-6 pl-16">
          {events.map((event, idx) => {
            const config = typeConfig[event.type];
            const Icon = config.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="relative"
              >
                {/* Dot */}
                <div className={`absolute -left-10 top-3 w-8 h-8 rounded-full flex items-center justify-center ${config.bg} border border-border`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>

                <Card className="bg-card border-border shadow-sm hover:border-primary/30 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-[9px] font-bold border-none ${config.bg} ${config.color}`}>
                            {config.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(event.date)}</span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
