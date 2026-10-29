from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Literal
from enum import Enum

class Chain(str, Enum):
    ETHEREUM = "ethereum"
    SEPOLIA = "sepolia"
    POLYGON = "polygon"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"

class RiskLevel(str, Enum):
    SAFE = "safe"
    MEDIUM = "medium"
    HIGH = "high"
    UNKNOWN = "unknown"

class ConfidenceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class RecommendedAction(str, Enum):
    PROCEED_WITH_CAUTION = "proceed_with_caution"
    DO_NOT_PROCEED = "do_not_proceed"
    DO_NOT_SIGN = "do_not_sign"
    REVIEW_EVIDENCE = "review_evidence"
    UNKNOWN = "unknown"

class EvidenceSource(str, Enum):
    MODEL = "model"
    RULE = "rule"
    THREAT_INTEL = "threat_intel"
    PROVIDER = "provider"
    USER_REPORT = "user_report"

class EvidenceSeverity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Evidence(BaseModel):
    id: str
    source: EvidenceSource
    code: str
    severity: EvidenceSeverity
    title: str
    detail: str
    confidence: float = Field(ge=0.0, le=1.0)
    references: Optional[List[Dict[str, str]]] = None

class RiskAssessment(BaseModel):
    level: RiskLevel
    score: float = Field(ge=0.0, le=1.0)
    confidence: ConfidenceLevel
    summary: str
    recommendedAction: RecommendedAction

class DataCoverage(BaseModel):
    transactionHistory: bool
    threatIntelligence: bool
    model: bool
    tokenMetadata: bool
    contractMetadata: bool
    calldataDecoded: bool

class Versions(BaseModel):
    api: str
    model: str
    featureSchema: Optional[str] = None
    rules: str
    threatIntel: str

class TransactionFeatures(BaseModel):
    """Transaction features for the exploratory model.
    
    WARNING: This model was trained on post-execution features that are NOT available
    before signing a transaction. The following fields are POST-EXECUTION and should
    be set to 0 or estimated for pre-signing analysis:
    - gas_used: Gas consumed by transaction (only known after execution)
    - gas_efficiency: Derived gas efficiency (post-execution)
    - total_gas_cost: Total gas cost (post-execution)
    - cumulative_gas_used: Cumulative gas in block (post-execution)
    - length_log: Log-length derivative (requires execution logs)
    
    For honest pre-signing analysis, use only:
    - length_to, value, effective_gas_price, is_same_address, gas_price_ratio, token_transfer_amount
    """
    # Pre-broadcast available features
    length_to: int = Field(description="Length of recipient address")
    value: float = Field(description="Native value transferred")
    effective_gas_price: float = Field(description="Effective gas price (user-set component)")
    is_same_address: bool = Field(description="Sender equals receiver")
    gas_price_ratio: float = Field(description="Gas price ratio")
    token_transfer_amount: float = Field(default=0.0, description="Token amount from calldata")
    
    # Post-execution features (NOT available pre-signing - set to 0 for pre-signing analysis)
    gas_used: float = Field(default=0.0, description="POST-EXECUTION: Gas consumed")
    gas_efficiency: float = Field(default=0.0, description="POST-EXECUTION: Gas efficiency derivative")
    total_gas_cost: float = Field(default=0.0, description="POST-EXECUTION: Total gas cost")
    cumulative_gas_used: float = Field(default=0.0, description="POST-EXECUTION: Cumulative gas in block")
    length_log: float = Field(default=0.0, description="POST-EXECUTION: Log-length derivative")

    @field_validator('length_to', 'value', 'effective_gas_price', 'gas_price_ratio', 'token_transfer_amount', 
                     'gas_used', 'gas_efficiency', 'total_gas_cost', 'cumulative_gas_used', 'length_log', mode='before')
    @classmethod
    def coerce_numeric(cls, v):
        if isinstance(v, str):
            return float(v)
        return v

class PredictRequest(BaseModel):
    model: Literal["transaction_risk"] = "transaction_risk"
    model_version: str
    chain: Chain
    features: TransactionFeatures

class EvidenceResponse(BaseModel):
    code: str
    severity: EvidenceSeverity
    detail: str

class PredictResponse(BaseModel):
    model: str
    model_version: str
    feature_version: str
    score: float = Field(ge=0.0, le=1.0)
    risk_level: RiskLevel
    threshold: float
    calibrated: bool
    evidence: List[EvidenceResponse]
    limitations: List[str]
    request_id: str

class HealthResponse(BaseModel):
    status: Literal["ok", "not_ready"]
    service: str
    version: str
    model_loaded: bool
    model_version: Optional[str] = None
    feature_version: Optional[str] = None

class ModelInfo(BaseModel):
    name: str
    version: str
    artifact_hash: str
    feature_schema: str
    metrics: Dict[str, float]
    created_at: str