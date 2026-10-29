import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { WalletScanner } from './pages/WalletScanner'
import { TokenScanner } from './pages/TokenScanner'
import { ContractScanner } from './pages/ContractScanner'
import { TransactionAnalyzer } from './pages/TransactionAnalyzer'
import { ScamIntelligence } from './pages/ScamIntelligence'
import { Watchlist } from './pages/Watchlist'
import { Reports } from './pages/Reports'
import { Admin } from './pages/Admin'
import { Settings } from './pages/Settings'
import { ScanDetail } from './pages/ScanDetail'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { VerifyEmail } from './pages/VerifyEmail'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }
  
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />
}

export function App() {
  const { initializeAuth } = useAuthStore()
  
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])
  
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
        <Route path="/terms" element={<PublicRoute><Terms /></PublicRoute>} />
        <Route path="/privacy" element={<PublicRoute><Privacy /></PublicRoute>} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wallet-scanner" element={<WalletScanner />} />
          <Route path="/token-scanner" element={<TokenScanner />} />
          <Route path="/contract-scanner" element={<ContractScanner />} />
          <Route path="/transaction-analyzer" element={<TransactionAnalyzer />} />
          <Route path="/scam-intelligence" element={<ScamIntelligence />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/scans/:scanId" element={<ScanDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route element={<AdminRoute><Layout /></AdminRoute>}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
