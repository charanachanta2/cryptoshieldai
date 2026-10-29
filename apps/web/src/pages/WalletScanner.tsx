import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '../stores/scanStore'
import { useToast } from '../contexts/ToastContext'
import { Search, Shield, Loader2, AlertCircle } from 'lucide-react'
import { SUPPORTED_CHAINS } from '@cryptoshield/shared'

const walletSchema = z.object({
  address: z.string().min(42, 'Invalid Ethereum address').max(42, 'Invalid Ethereum address'),
  chain: z.enum(SUPPORTED_CHAINS),
  refresh: z.boolean().optional(),
})

type WalletForm = z.infer<typeof walletSchema>

export function WalletScanner() {
  const navigate = useNavigate()
  const { createWalletScan } = useScanStore()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<WalletForm>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      chain: 'ethereum',
      refresh: false,
    },
  })
  
  const onSubmit = async (data: WalletForm) => {
    setIsLoading(true)
    try {
      const result = await createWalletScan({
        address: data.address.toLowerCase(),
        chain: data.chain,
        refresh: data.refresh,
      })
      showToast({ type: 'success', title: 'Scan started', message: 'Redirecting to results...' })
      navigate(`/scans/${result.id}`)
    } catch {
      // Error handled in store
    } finally {
      setIsLoading(false)
    }
  }
  
  const validateAddress = (address: string) => {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  const address = watch('address')
  const isValidAddress = address && validateAddress(address)
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet Security Scanner</h1>
        <p className="text-gray-500 mt-1">
          Analyze wallet reputation, transaction history, counterparty behavior, and threat intelligence matches.
        </p>
      </div>
      
      {/* Disclaimer */}
      <div className="card border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-gray-900">Limitations</h3>
            <ul className="text-sm text-gray-700 mt-1 space-y-1 list-disc list-inside">
              <li>Current models are exploratory and trained on failed transactions only</li>
              <li>Results are risk estimates, not guarantees of safety</li>
              <li>Threat intelligence data may be incomplete or stale</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Scan form */}
      <div className="card">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="address" className="label">
                Wallet Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('address')}
                  id="address"
                  type="text"
                  placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                  className="input pl-10 text-lowercase font-mono"
                  disabled={isLoading}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Enter an Ethereum address (0x + 40 hex characters)
              </p>
            </div>
            
            <div>
              <label htmlFor="chain" className="label">
                Blockchain <span className="text-red-500">*</span>
              </label>
              <select
                {...register('chain')}
                id="chain"
                className="input"
                disabled={isLoading}
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain} value={chain}>
                    {chain.charAt(0).toUpperCase() + chain.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                {...register('refresh')}
                id="refresh"
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="refresh" className="text-sm text-gray-600 cursor-pointer">
                Force refresh (bypass cache)
              </label>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !isValidAddress}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scanning...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5" />
                  Scan Wallet
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Example addresses */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Example addresses to try</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', label: 'Binance Hot Wallet' },
              { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'Vitalik Buterin' },
              { address: '0x00000000219ab540356cBB839Cbe05303d7705Fa', label: 'ENS Registry' },
            ].map((example) => (
              <button
                key={example.address}
                type="button"
                onClick={() => {
                  setValue('address', example.address)
                  setValue('chain', 'ethereum')
                }}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-mono"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* How it works */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">How the wallet scan works</h3>
          <div className="space-y-3">
            <Step number={1} title="Address Validation" description="Validates the Ethereum address format and checksum" />
            <Step number={2} title="Transaction History" description="Retrieves transaction history from blockchain data providers" />
            <Step number={3} title="Threat Intelligence" description="Checks against curated phishing, scam, and malicious address databases" />
            <Step number={4} title="Behavioral Analysis" description="Computes wallet age, activity patterns, counterparty diversity, and value flows" />
            <Step number={5} title="Risk Scoring" description="Combines deterministic rules, threat intelligence, and ML model scores" />
            <Step number={6} title="Evidence Report" description="Returns risk level with detailed evidence, confidence, and limitations" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}
