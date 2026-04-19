import { Target, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { useGoals } from '../../hooks/useGoals';

function GoalProgress({ target, current, color = '#FE5000' }: { target: number; current: number; color?: string }) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-muted-foreground uppercase">Progresso</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function MetasPage() {
  const { active, completed, loading, error, refresh } = useGoals();

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-xl h-36" />
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

  if (!active.length && !completed.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Card className="border-border bg-card p-12">
          <CardContent className="flex flex-col items-center gap-4 pt-0">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Nenhuma meta cadastrada</h3>
            <p className="text-muted-foreground max-w-md text-sm">
              As metas do cliente serão exibidas aqui quando cadastradas pelo administrador.
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal font-space">Metas</h2>
          <p className="text-sm text-muted-foreground">Acompanhe o progresso das suas metas</p>
        </div>
        <Button onClick={refresh} variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Metas Ativas */}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Em Andamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((goal, idx) => (
              <motion.div
                key={goal.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card border-border shadow-sm hover:border-primary/30 transition-all h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{goal.category}</p>
                          <p className="text-sm font-bold text-foreground">{goal.title}</p>
                        </div>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                        {goal.deadline}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Atual</p>
                        <p className="text-2xl font-normal font-space text-foreground">
                          {goal.unitPrefix ? `${goal.unit} ` : ''}{goal.current.toLocaleString('pt-BR')}{!goal.unitPrefix ? ` ${goal.unit}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Meta</p>
                        <p className="text-xl font-normal font-space text-muted-foreground">
                          {goal.unitPrefix ? `${goal.unit} ` : ''}{goal.target.toLocaleString('pt-BR')}{!goal.unitPrefix ? ` ${goal.unit}` : ''}
                        </p>
                      </div>
                    </div>

                    <GoalProgress target={goal.target} current={goal.current} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Metas Concluídas */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Concluídas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map((goal, idx) => (
              <motion.div
                key={goal.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card border-border shadow-sm opacity-70">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-lg">{goal.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{goal.title}</p>
                      <p className="text-[10px] text-muted-foreground">{goal.completedAt}</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-none text-[10px]">Concluída</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
