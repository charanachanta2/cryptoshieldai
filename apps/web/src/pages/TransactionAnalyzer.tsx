import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '../stores/scanStore'
import { useToast } from '../contexts/ToastContext'
import { Loader2, AlertCircle, Shield, Info, HelpCircle } from 'lucide-react'
import { SUPPORTED_CHAINS } from '@cryptoshield/shared'

const txSchema = z.object({
  chain: z.enum(SUPPORTED_CHAINS),
  from: z.string().min(42, 'Invalid sender address').max(42, 'Invalid sender address'),
  to: z.string().min(42, 'Invalid recipient address').max(42, 'Invalid recipient address'),
  value: z.string().min(1, 'Value is required').regex(/^\d+(\.\d+)?$/, 'Invalid number format'),
  token: z.object({
    address: z.string().optional(),
    amount: z.string().optional(),
    decimals: z.number().optional(),
  }).optional(),
  data: z.string().optional(),
  gasPrice: z.string().optional(),
  nonce: z.number().optional(),
}).refine((data) => {
  // At least one of value or token must be meaningful
  return parseFloat(data.value) > 0 || (data.token?.amount && parseFloat(data.token.amount) > 0)
}, {
  message: 'Either native value or token amount must be greater than 0',
  path: ['value'],
})

type TxForm = z.infer<typeof txSchema>

export function TransactionAnalyzer() {
  const navigate = useNavigate()
  const { createTransactionScan } = useScanStore()
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      chain: 'ethereum',
      value: '0',
      data: '0x',
    },
  })
  
  const onSubmit = async (data: TxForm) => {
    setIsLoading(true)
    try {
      const result = await createTransactionScan(data)
      showToast({ type: 'success', title: 'Analysis complete', message: 'View results' })
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
  
  const from = watch('from')
  const to = watch('to')
  const isValidFrom = from && validateAddress(from)
  const isValidTo = to && validateAddress(to)
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction Safety Analyzer</h1>
        <p className="text-gray-500 mt-1">
          Pre-signing risk assessment using only information available before you sign. Checks address reputation,
          approval scope, calldata selectors, and address poisoning patterns.
        </p>
      </div>
      
      {/* USP Disclaimer */}
      <div className="card border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-gray-900">Pre-Signing Analysis Only</h3>
            <p className="text-sm text-gray-700 mt-1">
              This analyzer uses <strong>only pre-broadcast inputs</strong> (sender, receiver, value, calldata, gas price, nonce).
              It does <strong>NOT</strong> use post-execution data like gas used, transaction status, logs, or receipts.
              The ML model is exploratory and trained on failed transactions.
            </p>
          </div>
        </div>
      </div>
      
      {/* Scan form */}
      <div className="card">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="from" className="label">
                  Sender (From) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('from')}
                    id="from"
                    type="text"
                    placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                    className="input text-lowercase font-mono"
                    disabled={isLoading}
                  />
                </div>
                {errors.from && <p className="mt-1 text-sm text-red-600">{errors.from.message}</p>}
              </div>
              
              <div>
                <label htmlFor="to" className="label">
                  Recipient (To) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('to')}
                    id="to"
                    type="text"
                    placeholder="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
                    className="input text-lowercase font-mono"
                    disabled={isLoading}
                  />
                </div>
                {errors.to && <p className="mt-1 text-sm text-red-600">{errors.to.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="value" className="label">
                  Native Value (ETH) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('value')}
                  id="value"
                  type="text"
                  placeholder="0.5"
                  className="input"
                  disabled={isLoading}
                />
                <p className="mt-1 text-sm text-gray-500">Amount in native currency (e.g., ETH)</p>
              </div>
              
              <div>
                <label htmlFor="gasPrice" className="label">
                  Gas Price (wei)
                </label>
                <input
                  {...register('gasPrice')}
                  id="gasPrice"
                  type="text"
                  placeholder="25000000000"
                  className="input font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* Token transfer */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Token Transfer (Optional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="tokenAddress" className="label">Token Contract</label>
                  <input
                    {...register('token.address')}
                    id="tokenAddress"
                    type="text"
                    placeholder="0xA0b86a33E6441b8C4C8C0C8C0C8C0C8C0C8C0C8C"
                    className="input text-lowercase font-mono"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="tokenAmount" className="label">Amount</label>
                  <input
                    {...register('token.amount')}
                    id="tokenAmount"
                    type="text"
                    placeholder="1000"
                    className="input"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="tokenDecimals" className="label">Decimals</label>
                  <input
                    {...register('token.decimals', { valueAsNumber: true })}
                    id="tokenDecimals"
                    type="number"
                    placeholder="18"
                    className="input"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            
            {/* Advanced */}
            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
              >
                <Info className={`w-4 h-4 ${showAdvanced ? 'rotate-180' : ''}`} />
                {showAdvanced ? 'Hide' : 'Show'} advanced options
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="data" className="label">
                      Calldata (hex)
                    </label>
                    <textarea
                      {...register('data')}
                      id="data"
                      rows={3}
                      placeholder="0x095ea7b3000000000000000000000000..."
                      className="input font-mono text-sm"
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Raw transaction calldata. Used for approval detection and selector analysis.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="nonce" className="label">Nonce</label>
                    <input
                      {...register('nonce', { valueAsNumber: true })}
                      id="nonce"
                      type="number"
                      placeholder="42"
                      className="input"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !isValidFrom || !isValidTo}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5" />
                  Analyze Transaction
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* What we check */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Pre-signing checks performed</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CheckItem icon={Shield} title="Address Reputation" description="Sender/receiver against threat intelligence blacklists" />
            <CheckItem icon={HelpCircle} title="Address Poisoning" description="Lookalike address detection (prefix/suffix similarity)" />
            <CheckItem icon={Shield} title="Approval Analysis" description="Decodes calldata for ERC-20 approve, permit, setApprovalForAll" />
            <CheckItem icon={AlertCircle} title="Unlimited Approvals" description="Flags approvals set to max uint256" />
            <CheckItem icon={AlertCircle} title="Malicious Selectors" description="Known dangerous function selectors (drain, sweep, etc.)" />
            <CheckItem icon={Info} title="Gas & Nonce" description="Gas price reasonableness, nonce validity" />
            <CheckItem icon={HelpCircle} title="Value Verification" description="Native value and token amount consistency" />
            <CheckItem icon={Shield} title="Rule Engine" description="Deterministic security rules with versioned rule packs" />
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
