import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Users,
  Target,
  Instagram,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

const OverviewPage      = lazy(() => import('../../features/overview/OverviewPage'));
const MarketingPage     = lazy(() => import('../../features/marketing/MarketingPage'));
const InstagramPage     = lazy(() => import('../../features/instagram/InstagramPage'));
const FinanceiroPage    = lazy(() => import('../../features/financeiro/FinanceiroPage'));
const FaturamentoPage   = lazy(() => import('../../features/faturamento/FaturamentoPage'));
const MetasPage         = lazy(() => import('../../features/metas/MetasPage'));
const TimelinePage      = lazy(() => import('../../features/timeline/TimelinePage'));
const ClientesPage      = lazy(() => import('../../features/clientes/ClientesPage'));
const ConfiguracoesPage = lazy(() => import('../../features/configuracoes/ConfiguracoesPage'));

const navItemsAll = [
  { name: 'Visão Geral',    slug: '/',             icon: LayoutDashboard, adminOnly: false },
  { name: 'Faturamento',    slug: '/faturamento',  icon: Wallet,          adminOnly: true  },
  { name: 'Marketing',      slug: '/marketing',    icon: Users,           adminOnly: false },
  { name: 'Instagram',      slug: '/instagram',    icon: Instagram,       adminOnly: false },
  { name: 'Metas',          slug: '/metas',        icon: Target,          adminOnly: true  },
  { name: 'Linha do Tempo', slug: '/timeline',     icon: BarChart3,       adminOnly: true  },
  { name: 'Financeiro',     slug: '/financeiro',   icon: FileText,        adminOnly: true  },
  { name: 'Clientes',       slug: '/clientes',     icon: User,            adminOnly: true  },
];

const bottomItems = [
  { name: 'Configurações', slug: '/configuracoes', icon: Settings },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const PageSkeleton = () => (
  <div className="animate-pulse space-y-4 w-full p-2">
    <div className="h-8 bg-muted rounded-xl w-1/3" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
    </div>
    <div className="h-64 bg-muted rounded-xl" />
  </div>
);

function renderPage(slug: string) {
  switch (slug) {
    case '/':              return <OverviewPage />;
    case '/marketing':     return <MarketingPage />;
    case '/faturamento':   return <FaturamentoPage />;
    case '/instagram':     return <InstagramPage />;
    case '/clientes':      return <ClientesPage />;
    case '/financeiro':    return <FinanceiroPage />;
    case '/metas':         return <MetasPage />;
    case '/timeline':      return <TimelinePage />;
    case '/configuracoes': return <ConfiguracoesPage />;
    default:               return <OverviewPage />;
  }
}

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';
  const navItems = navItemsAll.filter(item => !item.adminOnly || isAdmin);

  // Enforce role-based URL guard: client accessing admin route → redirect to /
  useEffect(() => {
    const adminSlugs = navItemsAll.filter(i => i.adminOnly).map(i => i.slug);
    if (!isAdmin && adminSlugs.includes(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isAdmin, navigate]);

  const currentSlug = location.pathname === '' ? '/' : location.pathname;
  const activeItem = [...navItemsAll, ...bottomItems].find(i => i.slug === currentSlug);
  const activeTab = activeItem?.name ?? 'Visão Geral';
  const isSettingsRoute = currentSlug === '/configuracoes';

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('mindor_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userName = profile?.full_name ?? profile?.email ?? 'Usuário';
  const userInitials = getInitials(userName);
  const avatarUrl = profile?.avatar_url ?? null;

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close mobile menu and user dropdown on navigation
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Close user menu on outside click / escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-user-menu-root]')) setUserMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [userMenuOpen]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try { localStorage.setItem('mindor_theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  };

  const handleSignOut = () => signOut();

  const SidebarContent = () => (
    <>
      <div className={`flex items-center gap-2 mb-10 ${isSettingsRoute ? 'justify-center' : ''}`}>
        <img src="/logo.jpg" alt="Mindor" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        {!isSettingsRoute && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold tracking-tight whitespace-nowrap"
          >
            Mindor
          </motion.span>
        )}
      </div>

      <div className="relative mb-8" data-user-menu-root>
        <button
          onClick={() => !isSettingsRoute && setUserMenuOpen(v => !v)}
          className={`w-full flex items-center gap-3 p-3 bg-muted rounded-xl transition-all hover:bg-muted/80 ${
            isSettingsRoute ? 'justify-center cursor-default' : ''
          }`}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
        >
          <Avatar className="w-10 h-10 border-2 border-background shadow-sm shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{userInitials}</AvatarFallback>
          </Avatar>
          {!isSettingsRoute && (
            <>
              <div className="flex flex-col text-left overflow-hidden flex-1 min-w-0">
                <span className="text-sm font-semibold truncate">{userName}</span>
                <span className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'Cliente'}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 ml-auto text-muted-foreground transition-transform duration-200 shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        <AnimatePresence>
          {userMenuOpen && !isSettingsRoute && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
              role="menu"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { navigate('/configuracoes'); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4" />
                  Configurações
                </button>
                <div className="h-[1px] bg-border mx-2 my-1" />
                <button
                  onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1">
        {!isSettingsRoute && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 ml-3">Growth Menu</p>
        )}
        {navItems.map((item, idx) => (
          <motion.button
            key={item.name}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            onClick={() => navigate(item.slug)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              currentSlug === item.slug
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-primary'
            } ${isSettingsRoute ? 'justify-center px-0' : ''}`}
            title={isSettingsRoute ? item.name : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isSettingsRoute && <span>{item.name}</span>}
          </motion.button>
        ))}
      </nav>

    </>
  );

  return (
    <div className="flex h-screen bg-background text-foreground font-sans transition-colors duration-300">
      {/* Desktop Sidebar — collapses to icon-only on Configurações */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: isSettingsRoute ? 88 : 256 }}
        transition={{ duration: 0.5 }}
        className="bg-card border-r border-border flex-col p-6 hidden md:flex overflow-hidden whitespace-nowrap"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile overlay + sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col p-6 z-50 md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12 pt-20 md:pt-24 min-w-0">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4"
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              {!isSettingsRoute && (
                <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">
                  Empresas que crescem não improvisam. Operam com sistema.
                </p>
              )}
              <h1 className="text-4xl font-space font-normal">
                {activeTab === 'Visão Geral' ? `${getGreeting()}, ${userName}` : activeTab}
              </h1>
            </div>
          </div>
          {!isSettingsRoute && (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-xl h-11 w-11 border-border bg-card"
                aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-11 w-11 border-border bg-card relative"
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Avatar className="w-11 h-11 border-2 border-background shadow-sm">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{userInitials}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </motion.header>

        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeleton />}>
              {renderPage(currentSlug)}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
