import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Shield, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'

export function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const verifyEmail = useAuthStore((state) => state.verifyEmail)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  
  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing verification token')
      setIsLoading(false)
      return
    }
    
    const verify = async () => {
      setIsLoading(true)
      try {
        await verifyEmail(token)
        setStatus('success')
        setMessage('Email verified successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 3000)
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Email verification failed')
      } finally {
        setIsLoading(false)
      }
    }
    
    verify()
  }, [searchParams, verifyEmail, navigate])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary-600 mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your email</h2>
            <p className="text-gray-500">Please wait while we verify your email address...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 mx-auto">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CryptoShield AI</h1>
            <p className="text-gray-500 mt-1">Analyze. Detect. Protect.</p>
          </div>
          
          {status === 'success' ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Email verified successfully!</h2>
              <p className="text-gray-500 mb-6">{message}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to login...</span>
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-500 mb-6">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary w-full py-3"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try again
                </button>
                <Link to="/login" className="btn-secondary w-full py-3 block">
                  Back to login
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
