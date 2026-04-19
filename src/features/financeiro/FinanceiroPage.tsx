import { useState, Component } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Receipt,
  RefreshCw,
  User,
  ShieldAlert,
  History,
  BrainCircuit,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; message: string }

class TabErrorBoundary extends Component<EBProps, EBState> {
  declare state: EBState
  declare props: EBProps
  constructor(props: EBProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">Erro ao carregar aba: {this.state.message}</p>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsaasData } from '../../hooks/useAsaasData';
import FinanceiroOverview from './FinanceiroOverview';
import FluxoDeCaixaTab from './FluxoDeCaixaTab';
import CobrancasTab from './CobrancasTab';
import AssinaturasTab from './AssinaturasTab';
import ClientesFinanceiroTab from './ClientesFinanceiroTab';
import InadimplenciaTab from './InadimplenciaTab';
import ExtratoTab from './ExtratoTab';

const subTabs = [
  { id: 'Visão Geral', icon: LayoutDashboard },
  { id: 'Fluxo de Caixa', icon: Activity },
  { id: 'Cobranças', icon: Receipt },
  { id: 'Assinaturas', icon: RefreshCw },
  { id: 'Clientes', icon: User },
  { id: 'Inadimplência', icon: ShieldAlert },
  { id: 'Extrato', icon: History },
];

export default function FinanceiroPage() {
  const { profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('Visão Geral');
  const asaasData = useAsaasData();

  // Guard: financeiro is admin-only (after hooks to respect rules-of-hooks)
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'Visão Geral': return <FinanceiroOverview asaasData={asaasData} />;
      case 'Fluxo de Caixa': return <FluxoDeCaixaTab asaasData={asaasData} />;
      case 'Cobranças': return <CobrancasTab asaasData={asaasData} />;
      case 'Assinaturas': return <AssinaturasTab asaasData={asaasData} />;
      case 'Clientes': return <ClientesFinanceiroTab asaasData={asaasData} />;
      case 'Inadimplência': return <InadimplenciaTab asaasData={asaasData} />;
      case 'Extrato': return <ExtratoTab asaasData={asaasData} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navegação Financeira */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {subTabs.map((sub) => (
          <Button
            key={sub.id}
            variant={activeSubTab === sub.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSubTab(sub.id)}
            className={`rounded-full px-4 h-9 text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeSubTab === sub.id
              ? 'bg-primary text-white shadow-md'
              : 'text-muted-foreground hover:bg-muted hover:text-primary'
            }`}
          >
            <sub.icon className="w-3.5 h-3.5 mr-2" />
            {sub.id}
          </Button>
        ))}
      </div>

      {/* Diagnóstico Financeiro AI */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Diagnóstico Mindor AI</h4>
            <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">Live Insight</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <p className="text-[11px] text-muted-foreground">
              <span className="text-red-500 font-bold">●</span> Monitore a inadimplência regularmente. Use a aba Inadimplência para agir preventivamente.
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="text-orange-500 font-bold">●</span> Acompanhe o fluxo de caixa e identifique períodos de baixa receita para planejar melhor.
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="text-green-500 font-bold">●</span> Assinaturas ativas geram receita recorrente previsível. Monitore o churn rate mensalmente.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TabErrorBoundary>
            {renderSubTab()}
          </TabErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
