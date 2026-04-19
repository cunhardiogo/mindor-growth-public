import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { Login as LoginPage } from './pages/auth/LoginPage'
import { Register as RegisterPage } from './pages/auth/RegisterPage'
import { ResetPassword as ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import AppShell from './components/layout/AppShell'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen">
            <AppRoutes />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
