import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function GlobalErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="max-w-md w-full bg-card border border-red-500/20 p-6 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-xl font-bold text-red-500">Erro Inesperado na Interface</h2>
        <p className="text-sm text-muted-foreground break-words">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="w-full bg-primary text-primary-foreground font-bold py-2 px-4 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Recarregar Sistema
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
