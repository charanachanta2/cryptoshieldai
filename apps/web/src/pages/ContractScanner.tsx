import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '../stores/scanStore'
import { useToast } from '../contexts/ToastContext'
import { Search, Shield, Loader2, AlertCircle, FileCode } from 'lucide-react'
import { SUPPORTED_CHAINS } from '@cryptoshield/shared'

const contractSchema = z.object({
  address: z.string().min(42, 'Invalid Ethereum address').max(42, 'Invalid Ethereum address'),
  chain: z.enum(SUPPORTED_CHAINS),
  includeSource: z.boolean().optional(),
})

type ContractForm = z.infer<typeof contractSchema>

export function ContractScanner() {
  const navigate = useNavigate()
  const { createContractScan } = useScanStore()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      chain: 'ethereum',
      includeSource: true,
    },
  })
  
  const onSubmit = async (data: ContractForm) => {
    setIsLoading(true)
    try {
      const result = await createContractScan({
        address: data.address.toLowerCase(),
        chain: data.chain,
        includeSource: data.includeSource,
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
        <h1 className="text-2xl font-bold text-gray-900">Smart Contract Security Scanner</h1>
        <p className="text-gray-500 mt-1">
          Verify source code, check ownership, permissions, mint/burn functions, proxy patterns, and upgradeability.
        </p>
      </div>
      
      {/* Disclaimer */}
      <div className="card border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-gray-900">Module Status: Beta</h3>
            <ul className="text-sm text-gray-700 mt-1 space-y-1 list-disc list-inside">
              <li>Static analysis only - no symbolic execution or formal verification</li>
              <li>Proxy detection may not catch all upgrade patterns</li>
              <li>Source code verification depends on Etherscan and similar services</li>
              <li>Results indicate risk signals, not exhaustive security audit</li>
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
                Contract Address <span className="text-red-500">*</span>
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
                Enter a smart contract address (0x + 40 hex characters)
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
                {...register('includeSource')}
                id="includeSource"
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                defaultChecked
              />
              <label htmlFor="includeSource" className="text-sm text-gray-600 cursor-pointer">
                Include source code analysis (if verified)
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
                  Scan Contract
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* What we check */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Security checks performed</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CheckItem icon={FileCode} title="Source Verification" description="Checks Etherscan and similar for verified source code" />
            <CheckItem icon={Shield} title="Proxy Detection" description="Identifies proxy patterns (EIP-1967, EIP-1822, OpenZeppelin)" />
            <CheckItem icon={Shield} title="Ownership & Admin" description="Owner, admin roles, multi-sig, timelock detection" />
            <CheckItem icon={AlertCircle} title="Dangerous Functions" description="Mint, burn, pause, blacklist, upgrade, arbitrary transfer" />
            <CheckItem icon={Shield} title="Upgradeability" description="Proxy admin, implementation upgrade paths, UUPS/Transparent" />
            <CheckItem icon={AlertCircle} title="Permission Analysis" description="Role-based access, function selectors, access control" />
            <CheckItem icon={FileCode} title="Code Patterns" description="Reentrancy guards, unchecked calls, delegatecall usage" />
            <CheckItem icon={AlertCircle} title="Threat Intelligence" description="Known malicious contract labels from Forta and reports" />
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
