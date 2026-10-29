import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../contexts/ToastContext'
import { Shield, Mail, Loader2 } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export function ForgotPassword() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })
  
  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    try {
      await forgotPassword(data.email)
      showToast({ type: 'success', title: 'Email sent', message: 'If the email exists, a reset link has been sent' })
      navigate('/login')
    } catch {
      // Error handled in store
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CryptoShield AI</h1>
          <p className="text-gray-500 mt-1">Analyze. Detect. Protect.</p>
        </div>
        
        {/* Forgot password form */}
        <div className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h2>
          <p className="text-gray-500 mb-6">Enter your email address and we'll send you a link to reset your password</p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="mt-6 text-center text-xs text-gray-500 max-w-md mx-auto">
          <p>
            CryptoShield AI provides risk estimates, not guarantees. This is not financial, investment, or legal advice.
            Always verify transaction details in your wallet before signing.
          </p>
        </div>
      </div>
    </div>
  )
}
