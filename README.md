# CryptoShield AI - Project Overview

## Quick Start

### Prerequisites
- Node.js 20+ and npm/pnpm
- Python 3.11+
- MongoDB 7.x running on localhost:27017

### Installation
```bash
# Install all dependencies
./install-deps.sh

# Or manually:
# Frontend
cd apps/web && npm install

# Backend
cd apps/api && npm install

# ML Service
cd services/ml && pip install -r requirements.txt
```

### Running Locally
```bash
# Windows
start-services.bat

# Linux/macOS
./start-services.sh

# Or manually in separate terminals:
# Terminal 1: ML Service
cd services/ml && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: API Server
cd apps/api && npm run dev

# Terminal 3: Web Frontend
cd apps/web && npm run dev
```

### Access Points
- **Web App**: http://localhost:3000
- **API**: http://localhost:4000/api/v1
- **ML Service**: http://localhost:8000
- **API Health**: http://localhost:4000/api/v1/health
- **API Readiness**: http://localhost:4000/api/v1/ready
- **ML Health**: http://localhost:8000/health

## Project Structure
```
CryptoShield_AI_FINAL/
├── apps/
│   ├── web/          # React + TypeScript + Tailwind frontend
│   └── api/          # Express.js + TypeScript backend
├── services/
│   └── ml/           # FastAPI + scikit-learn ML inference
├── packages/
│   └── shared/       # Shared TypeScript types
├── datasets/         # Research datasets (BCCC, Forta, Poison-Hunter)
├── docs/             # Project documentation (9 files)
└── start-services.*  # Startup scripts
```

## Implemented Modules (10/10)
1. **Dashboard** - Command center with stats, quick actions, recent scans
2. **Wallet Security Scanner** - Address validation, risk scoring, evidence
3. **Token Security Scanner** - Metadata, holder concentration, rug-pull signals
4. **Smart Contract Scanner** - Verification, ownership, permissions, upgradeability
5. **Transaction Safety Analyzer (USP)** - Pre-signing analysis with pre-broadcast inputs only
6. **AI Security Assistant** - Grounded Q&A with citations (stub implementation)
7. **Scam Intelligence Center** - Threat database search, community reports
8. **Watchlist & Alerts** - Asset monitoring with risk change notifications
9. **Investigation & Reports** - PDF report generation with evidence
10. **Admin Security Center** - User management, rules, audit logs

## Key Features
- **Localhost-only** - No cloud dependencies, no Docker, no Git
- **MongoDB** - Local database for users, scans, threat intel, watchlists
- **JWT Auth** - Access/refresh tokens with Argon2id password hashing
- **Rate Limiting** - Per-user, per-route limits with MongoDB backing
- **Idempotency** - Duplicate request protection
- **Evidence-first** - Every scan result includes model, rule, and threat intel evidence
- **Risk Bands** - Safe, Medium, High, Unknown with confidence levels
- **Pre-signing USP** - Transaction analyzer rejects post-execution fields

## Known Limitations
- ML models are **exploratory** (trained on failed transactions only)
- Threat intelligence uses **mock data** (Forta/Poison-Hunter ingestion not implemented)
- AI Assistant returns **template responses** (no LLM integration)
- PDF reports are **basic** (minimal formatting)
- No email/push notifications (watchlist alerts are in-app only)

## Documentation
All 9 documentation files in `docs/`:
- `prd.md` - Product Requirements
- `architecture.md` - System Architecture
- `api.md` - API Specification
- `datasets.md` - Dataset Documentation
- `model.md` - Model Cards
- `deployement.md` - Local Deployment
- `phases.md` - Roadmap
- `rules.md` - Engineering Rules
- `security.md` - Security & Privacy

## Environment Variables
Copy `apps/api/.env.local` and `services/ml/.env` and fill in real API keys:
- `ETHERSCAN_API_KEY`
- `COINGECKO_API_KEY`
- `RPC_URL`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (generate secure random strings)

## Testing
```bash
# Test API health
curl http://localhost:4000/api/v1/health

# Test ML health
curl http://localhost:8000/health

# Register a user
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"correct-horse-battery-staple","displayName":"Test User"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"correct-horse-battery-staple"}'
```