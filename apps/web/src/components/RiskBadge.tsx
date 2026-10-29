import { RiskLevel, ConfidenceLevel, RecommendedAction, RISK_LEVELS } from '@cryptoshield/shared'
import { ShieldCheck, AlertTriangle, XCircle, HelpCircle, Flag, Eye, Ban, RotateCcw } from 'lucide-react'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
  confidence?: ConfidenceLevel
  recommendedAction?: RecommendedAction
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  showConfidence?: boolean
  showAction?: boolean
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function RiskBadge({
  level,
  score,
  confidence,
  recommendedAction,
  size = 'md',
  showScore = true,
  showConfidence = true,
  showAction = true,
}: RiskBadgeProps) {
  const config = RISK_LEVELS[level]
  const baseClass = `inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses[size]} ${config.color}`
  
  const icons = {
    safe: ShieldCheck,
    medium: AlertTriangle,
    high: XCircle,
    unknown: HelpCircle,
  }
  
  const actionIcons = {
    proceed_with_caution: Eye,
    do_not_proceed: Flag,
    do_not_sign: Ban,
    review_evidence: RotateCcw,
    unknown: HelpCircle,
  }
  
  const actionLabels = {
    proceed_with_caution: 'Proceed with caution',
    do_not_proceed: 'Do not proceed',
    do_not_sign: 'Do not sign',
    review_evidence: 'Review evidence',
    unknown: 'Unknown',
  }
  
  const confidenceLabels = {
    low: 'Low confidence',
    medium: 'Medium confidence',
    high: 'High confidence',
  }
  
  const Icon = icons[level]
  const ActionIcon = recommendedAction ? actionIcons[recommendedAction] : HelpCircle
  
  return (
    <div className="flex flex-col gap-1">
      <span className={baseClass}>
        <Icon className={iconSizes[size]} />
        {config.label}
        {showScore && score !== undefined && (
          <span className="opacity-80">({(score * 100).toFixed(0)}%)</span>
        )}
      </span>
      
      {showConfidence && confidence && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
          <HelpCircle className={iconSizes[size]} />
          {confidenceLabels[confidence]}
        </span>
      )}
      
      {showAction && recommendedAction && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
          <ActionIcon className={iconSizes[size]} />
          {actionLabels[recommendedAction]}
        </span>
      )}
    </div>
  )
}

export function RiskScoreCircle({
  score,
  size = 80,
  strokeWidth = 6,
  showLabel = true,
}: {
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score)
  
  let color: string
  let level: RiskLevel
  
  if (score < 0.35) {
    color = '#22c55e'
    level = 'safe'
  } else if (score < 0.65) {
    color = '#f59e0b'
    level = 'medium'
  } else {
    color = '#ef4444'
    level = 'high'
  }
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg style={{ width: size, height: size }} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-lg" style={{ color }}>
              {(score * 100).toFixed(0)}%
            </span>
            <span className="text-xs font-medium" style={{ color }}>
              {RISK_LEVELS[level].label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
