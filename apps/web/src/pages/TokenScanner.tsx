import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '../stores/scanStore'
import { useToast } from '../contexts/ToastContext'
import { Search, Shield, Loader2, AlertCircle, Coins } from 'lucide-react'
import { SUPPORTED_CHAINS } from '@cryptoshield/shared'

const tokenSchema = z.object({
  address: z.string().min(42, 'Invalid Ethereum address').max(42, 'Invalid Ethereum address'),
  chain: z.enum(SUPPORTED_CHAINS),
  refresh: z.boolean().optional(),
})

type TokenForm = z.infer<typeof tokenSchema>

export function TokenScanner() {
  const navigate = useNavigate()
  const { createTokenScan } = useScanStore()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TokenForm>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      chain: 'ethereum',
      refresh: false,
    },
  })
  
  const onSubmit = async (data: TokenForm) => {
    setIsLoading(true)
    try {
      const result = await createTokenScan({
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
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  
  const address = watch('address')
  const isValidAddress = address && validateAddress(address)
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Token Security Scanner</h1>
        <p className="text-gray-500 mt-1">
          Detect fake tokens, analyze holder concentration, liquidity, rug-pull signals, and contract permissions.
        </p>
      </div>
      
      {/* Disclaimer */}
      <div className="card border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-gray-900">Module Status: Beta</h3>
            <ul className="text-sm text-gray-700 mt-1 space-y-1 list-disc list-inside">
              <li>Token analysis is currently in beta - results may be incomplete</li>
              <li>Liquidity and holder data depends on external providers</li>
              <li>Rug-pull detection uses heuristic rules, not exhaustive analysis</li>
              <li>Always verify token contract addresses on official sources</li>
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
                Token Contract Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('address')}
                  id="address"
                  type="text"
                  placeholder="0xA0b86a33E6441b8C4C8C0C8C0C8C0C8C0C8C0C8C"
                  className="input pl-10 text-lowercase font-mono"
                  disabled={isLoading}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Enter an ERC-20 token contract address (0x + 40 hex characters)
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
                  Scan Token
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Example tokens */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Popular tokens to try</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { address: '0xA0b86a33E6441b8C4C8C0C8C0C8C0C8C0C8C0C8C', label: 'USDC', chain: 'ethereum' as const },
              { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', label: 'DAI', chain: 'ethereum' as const },
              { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', label: 'WETH', chain: 'ethereum' as const },
            ].map((example) => (
              <button
                key={example.address}
                type="button"
                onClick={() => {
                  setValue('address', example.address)
                  setValue('chain', example.chain)
                }}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-mono"
              >
                {example.label} ({example.address.slice(0, 10)}...)
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* What we check */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Security checks performed</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CheckItem icon={Coins} title="Metadata Verification" description="Symbol, name, decimals, total supply verification" />
            <CheckItem icon={Shield} title="Impersonation Detection" description="Checks for duplicate symbols/names mimicking legitimate tokens" />
            <CheckItem icon={Shield} title="Holder Concentration" description="Top holder analysis, whale concentration metrics" />
            <CheckItem icon={Coins} title="Liquidity Analysis" description="DEX liquidity, pool depth, lock status" />
            <CheckItem icon={AlertCircle} title="Rug-Pull Signals" description="Mint/burn permissions, ownership, pause/blacklist functions" />
            <CheckItem icon={AlertCircle} title="Honeypot Detection" description="Transfer restrictions, sell limits, hidden fees" />
            <CheckItem icon={Shield} title="Contract Verification" description="Source code verification, proxy detection, upgradeability" />
            <CheckItem icon={AlertCircle} title="Threat Intelligence" description="Known malicious token labels from Forta and community reports" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckItem({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
      <Icon className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}
