import { Router, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getCollection, COLLECTIONS } from '../config/database.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

const router = Router()

const querySchema = z.object({
  scanId: z.string().min(1),
  question: z.string().min(1).max(1000),
  language: z.string().min(2).max(5).default('en'),
})

const explainSchema = z.object({
  scanId: z.string().min(1),
  evidenceId: z.string().min(1),
  readingLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
})

// POST /assistant/query
router.post('/query', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = querySchema.parse(req.body)
    
    // Verify scan ownership
    const scan = await getCollection(COLLECTIONS.scans).findOne({
      _id: data.scanId,
      userId: req.user!.id,
    })
    
    if (!scan) {
      throw ApiError.notFound('Scan not found')
    }
    
    // Get scan evidence
    const evidence = await getCollection(COLLECTIONS.scanEvidence)
      .find({ scanId: data.scanId })
      .toArray()
    
    // Build context for the assistant
    const context = buildAssistantContext(scan, evidence)
    
    // In a real implementation, this would call an LLM
    // For now, return a template response based on the scan data
    const answer = generateAssistantResponse(data.question, scan, evidence)
    
    res.json({
      answer,
      citations: evidence.map(e => ({
        evidenceId: e._id,
        source: e.source,
      })),
      refused: false,
      limitations: [
        'The assistant can only use the evidence available for this scan.',
        'This is not financial, investment, or legal advice.',
        'Risk scores are estimates under uncertainty.',
      ],
    })
  } catch (error) {
    next(error)
  }
})

// POST /assistant/explain
router.post('/explain', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = explainSchema.parse(req.body)
    
    const scan = await getCollection(COLLECTIONS.scans).findOne({
      _id: data.scanId,
      userId: req.user!.id,
    })
    
    if (!scan) {
      throw ApiError.notFound('Scan not found')
    }
    
    const evidence = await getCollection(COLLECTIONS.scanEvidence).findOne({
      _id: data.evidenceId,
      scanId: data.scanId,
    })
    
    if (!evidence) {
      throw ApiError.notFound('Evidence not found')
    }
    
    const explanation = generateExplanation(evidence, data.readingLevel)
    
    res.json({
      explanation,
      citations: [evidence._id],
      refused: false,
    })
  } catch (error) {
    next(error)
  }
})

function buildAssistantContext(scan: any, evidence: any[]) {
  return {
    scanType: scan.type,
    chain: scan.chain,
    riskLevel: scan.risk?.level,
    riskScore: scan.risk?.score,
    summary: scan.risk?.summary,
    evidence: evidence.map(e => ({
      source: e.source,
      code: e.code,
      severity: e.severity,
      title: e.title,
      detail: e.detail,
      confidence: e.confidence,
    })),
    dataCoverage: scan.dataCoverage,
    versions: scan.versions,
  }
}

function generateAssistantResponse(question: string, scan: any, evidence: any[]): string {
  const lowerQuestion = question.toLowerCase()
  
  // Simple keyword-based responses for demo
  if (lowerQuestion.includes('why') && lowerQuestion.includes('risk')) {
    if (evidence.length > 0) {
      const topEvidence = evidence[0]
      return `This ${scan.type} is rated "${scan.risk?.level || 'unknown'}" because ${topEvidence.detail.toLowerCase()}. This is a risk estimate, not a guarantee.`
    }
    return 'The risk assessment is based on multiple factors including threat intelligence matches, behavioral analysis, and rule-based checks. No specific threats were detected in this scan.'
  }
  
  if (lowerQuestion.includes('safe') || lowerQuestion.includes('safety')) {
    return `The risk level is "${scan.risk?.level || 'unknown'}". A low risk score does not mean an asset is safe. This is a risk estimate under uncertainty, not a guarantee of safety. Always verify transaction details independently.`
  }
  
  if (lowerQuestion.includes('evidence') || lowerQuestion.includes('proof')) {
    const evidenceSummary = evidence.map(e => `- ${e.title} (${e.severity})`).join('\n')
    return `The key evidence for this assessment:\n${evidenceSummary}\n\nEach piece of evidence has a confidence score and source. Would you like me to explain any specific finding?`
  }
  
  if (lowerQuestion.includes('model') || lowerQuestion.includes('ml') || lowerQuestion.includes('ai')) {
    return `The model used is "${scan.versions?.model || 'unknown'}". It is an exploratory model trained on the BCCC DeFi fraud dataset, which consists entirely of failed transactions. The model has not been validated for pre-signing safety analysis and should be treated as a research prototype.`
  }
  
  // Default response
  return `Based on the ${scan.type} scan, the risk level is "${scan.risk?.level || 'unknown'}" with a score of ${(scan.risk?.score * 100).toFixed(0)}%. ${scan.risk?.summary || 'No summary available.'} This is a risk estimate, not a guarantee. For detailed evidence, please review the evidence panel.`
}

function generateExplanation(evidence: any, readingLevel: string): string {
  const baseExplanation = evidence.detail
  
  if (readingLevel === 'beginner') {
    const simpleExplanations: Record<string, string> = {
      'PHISHING_MATCH': 'A phishing address is a wallet or contract that has been reported for tricking people into sending funds or revealing private keys. This scan found a match in a threat-intelligence list.',
      'UNLIMITED_APPROVAL': 'An unlimited approval means you are giving a contract permission to spend all of your tokens of a certain type, forever. This is dangerous because if the contract is malicious, it can drain all those tokens.',
      'ADDRESS_POISONING': 'Address poisoning is when an attacker sends a tiny amount of tokens from an address that looks similar to one you use, hoping you will accidentally copy the wrong address later.',
      'RUG_PULL': 'A rug pull is when the creators of a token remove all liquidity or use malicious contract functions to steal funds, making the token worthless.',
    }
    
    return simpleExplanations[evidence.code] || baseExplanation
  }
  
  return baseExplanation
}

export default router