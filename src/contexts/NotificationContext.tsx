import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export type NotificationType = 'success' | 'error'

interface Notification {
  id: number
  message: string
  type: NotificationType
}

interface NotificationContextValue {
  notify: (message: string, type?: NotificationType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const AUTO_DISMISS_MS = 4000

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([])

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(n => n.id !== id))
  }, [])

  const notify = useCallback((message: string, type: NotificationType = 'success') => {
    const id = Date.now() + Math.random()
    setItems(prev => [...prev, { id, message, type }])
    setTimeout(() => remove(id), AUTO_DISMISS_MS)
  }, [remove])

  const success = useCallback((message: string) => notify(message, 'success'), [notify])
  const error = useCallback((message: string) => notify(message, 'error'), [notify])

  return (
    <NotificationContext.Provider value={{ notify, success, error }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {items.map(n => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md min-w-[320px] bg-card/95 border-border"
              role="status"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                }`}
              >
                {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{n.message}</span>
              <button
                onClick={() => remove(n.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar notificação"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
