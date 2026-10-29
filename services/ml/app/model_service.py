import os
import hashlib
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any
from app.schemas import TransactionFeatures, RiskLevel, ConfidenceLevel, RecommendedAction, EvidenceSeverity

class ModelService:
    def __init__(self):
        self.model = None
        self.model_version: Optional[str] = None
        self.feature_version: Optional[str] = None
        self.artifact_hash: Optional[str] = None
        self.is_loaded = False
        self.feature_names = [
            'length_to', 'gas_used', 'gas_efficiency', 'value', 'total_gas_cost',
            'effective_gas_price', 'cumulative_gas_used', 'is_same_address',
            'gas_price_ratio', 'token_transfer_amount', 'length_log'
        ]
        self.pre_broadcast_features = [
            'length_to', 'value', 'effective_gas_price', 'is_same_address',
            'gas_price_ratio', 'token_transfer_amount'
        ]
        
    def load_model(self, model_path: str, version: str) -> bool:
        """Load the model artifact and verify integrity"""
        try:
            path = Path(model_path)
            if not path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            # Calculate artifact hash
            with open(path, 'rb') as f:
                self.artifact_hash = hashlib.sha256(f.read()).hexdigest()
            
            # Load model (may be wrapped in a dict)
            loaded = joblib.load(path)
            
            # Extract actual model if wrapped in dict
            if isinstance(loaded, dict) and 'model' in loaded:
                self.model = loaded['model']
                # Store feature columns for validation
                self.feature_columns = loaded.get('feature_columns', [])
            else:
                self.model = loaded
                self.feature_columns = []
            
            # Verify it's a scikit-learn model with predict_proba
            if not hasattr(self.model, 'predict_proba'):
                raise ValueError("Loaded model does not have predict_proba method")
            
            self.model_version = version
            self.feature_version = "bccc-11-v1"
            self.is_loaded = True
            
            print(f"Model loaded successfully: {version} (hash: {self.artifact_hash[:16]}...)")
            return True
            
        except Exception as e:
            print(f"Failed to load model: {e}")
            self.is_loaded = False
            return False
    
    def preprocess_features(self, features: TransactionFeatures) -> np.ndarray:
        """Preprocess features to match training pipeline"""
        # Create feature array in correct order (all 11 features)
        feature_dict = features.model_dump()
        feature_array = np.array([[feature_dict[name] for name in self.feature_names]])
        
        # Apply the same transformations as training
        # Signed log1p: sign(x) * log1p(abs(x))
        feature_array = np.sign(feature_array) * np.log1p(np.abs(feature_array))
        
        # Handle any NaN/inf values
        feature_array = np.nan_to_num(feature_array, nan=0.0, posinf=0.0, neginf=0.0)
        
        return feature_array
    
    def predict(self, features: TransactionFeatures) -> Dict[str, Any]:
        """Run prediction and return structured result"""
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model not loaded")
        
        # Preprocess
        X = self.preprocess_features(features)
        
        # Get prediction probability
        proba = self.model.predict_proba(X)[0]
        score = float(proba[1]) if len(proba) > 1 else 0.5
        
        # Determine risk level and confidence
        risk_level, confidence, recommended_action = self._score_to_risk(score)
        
        # Generate evidence
        evidence = self._generate_evidence(features, score)
        
        # Limitations
        limitations = [
            "Several input features are only available after execution in the training data.",
            "This score is not a guarantee of safety.",
            "The model was trained on failed transactions only.",
            "No calibration has been performed.",
        ]
        
        return {
            "score": score,
            "risk_level": risk_level,
            "confidence": confidence,
            "recommended_action": recommended_action,
            "evidence": evidence,
            "limitations": limitations,
        }
    
    def _score_to_risk(self, score: float) -> tuple:
        """Convert score to risk level, confidence, and recommended action"""
        if score < 0.35:
            return RiskLevel.SAFE, ConfidenceLevel.LOW, RecommendedAction.PROCEED_WITH_CAUTION
        elif score < 0.65:
            return RiskLevel.MEDIUM, ConfidenceLevel.MEDIUM, RecommendedAction.REVIEW_EVIDENCE
        else:
            return RiskLevel.HIGH, ConfidenceLevel.HIGH, RecommendedAction.DO_NOT_SIGN
    
    def _generate_evidence(self, features: TransactionFeatures, score: float) -> list:
        """Generate evidence based on features and score"""
        evidence = []
        
        # Model score evidence
        if score > 0.65:
            evidence.append({
                "code": "MODEL_SCORE_HIGH",
                "severity": EvidenceSeverity.HIGH,
                "detail": f"The model score ({score:.2f}) exceeds the high-risk threshold."
            })
        elif score > 0.35:
            evidence.append({
                "code": "MODEL_SCORE_MEDIUM",
                "severity": EvidenceSeverity.MEDIUM,
                "detail": f"The model score ({score:.2f}) indicates medium risk."
            })
        else:
            evidence.append({
                "code": "MODEL_SCORE_LOW",
                "severity": EvidenceSeverity.INFO,
                "detail": f"The model score ({score:.2f}) indicates low risk."
            })
        
        # Feature-based evidence
        if features.is_same_address:
            evidence.append({
                "code": "SELF_TRANSFER",
                "severity": EvidenceSeverity.LOW,
                "detail": "Sender and receiver addresses are the same."
            })
        
        if features.token_transfer_amount > 0:
            evidence.append({
                "code": "TOKEN_TRANSFER",
                "severity": EvidenceSeverity.INFO,
                "detail": f"Token transfer amount: {features.token_transfer_amount}"
            })
        
        if features.effective_gas_price > 1e11:  # > 100 gwei
            evidence.append({
                "code": "HIGH_GAS_PRICE",
                "severity": EvidenceSeverity.LOW,
                "detail": f"High gas price: {features.effective_gas_price / 1e9:.1f} gwei"
            })
        
        return evidence
    
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "name": "transaction_risk",
            "version": self.model_version,
            "artifact_hash": self.artifact_hash,
            "feature_schema": self.feature_version,
            "metrics": {
                "test_pr_auc": 0.4204,
                "test_roc_auc": 0.8960,
            },
            "created_at": "2026-10-27T00:00:00Z",
        }

# Global instance
model_service = ModelService()