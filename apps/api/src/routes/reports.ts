import { Router, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getCollection, COLLECTIONS } from '../config/database.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

const router = Router()

const reportSchema = z.object({
  scanIds: z.array(z.string()).min(1).max(10),
  format: z.enum(['pdf']).default('pdf'),
  includeEvidence: z.boolean().default(true),
})

// GET /reports
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit
    
    const filter: any = { userId: req.user!.id }
    if (req.query.status) filter.status = req.query.status
    
    const collection = getCollection(COLLECTIONS.reports)
    const [data, total] = await Promise.all([
      collection.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ])
    
    res.json({
      data: data.map(r => ({
        id: r._id,
        userId: r.userId,
        scanIds: r.scanIds,
        format: r.format,
        status: r.status,
        downloadUrl: r.downloadUrl,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      meta: {
        page,
        limit,
        total,
        hasNext: skip + data.length < total,
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /reports
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = reportSchema.parse(req.body)
    
    // Verify scans belong to user
    const scans = await getCollection(COLLECTIONS.scans).find({
      _id: { $in: data.scanIds },
      userId: req.user!.id,
    }).toArray()
    
    if (scans.length !== data.scanIds.length) {
      throw ApiError.notFound('One or more scans not found')
    }
    
    const reportId = `rpt_${uuidv4()}`
    const now = new Date().toISOString()
    
    const reportDoc = {
      _id: reportId,
      userId: req.user!.id,
      scanIds: data.scanIds,
      format: data.format,
      status: 'queued',
      includeEvidence: data.includeEvidence,
      createdAt: now,
    }
    
    await getCollection(COLLECTIONS.reports).insertOne(reportDoc)
    
    // Queue report generation job
    await getCollection(COLLECTIONS.jobs).insertOne({
      _id: `job_${uuidv4()}`,
      type: 'report:generate',
      reportId,
      payload: { scanIds: data.scanIds, format: data.format, includeEvidence: data.includeEvidence },
      status: 'pending',
      runAt: new Date().toISOString(),
      createdAt: now,
    })
    
    res.status(202).json({
      id: reportId,
      status: 'queued',
      pollUrl: `/api/v1/reports/${reportId}`,
    })
  } catch (error) {
    next(error)
  }
})

// GET /reports/:reportId
router.get('/:reportId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const report = await getCollection(COLLECTIONS.reports).findOne({
      _id: req.params.reportId,
      userId: req.user!.id,
    })
    
    if (!report) {
      throw ApiError.notFound('Report not found')
    }
    
    res.json({
      id: report._id,
      userId: report.userId,
      scanIds: report.scanIds,
      format: report.format,
      status: report.status,
      downloadUrl: report.downloadUrl,
      createdAt: report.createdAt,
      completedAt: report.completedAt,
    })
  } catch (error) {
    next(error)
  }
})

// GET /reports/:reportId/download
router.get('/:reportId/download', async (req: AuthenticatedRequest, res, next) => {
  try {
    const report = await getCollection(COLLECTIONS.reports).findOne({
      _id: req.params.reportId,
      userId: req.user!.id,
    })
    
    if (!report) {
      throw ApiError.notFound('Report not found')
    }
    
    if (report.status !== 'completed') {
      throw ApiError.conflict('Report is not ready for download')
    }
    
    // In a real implementation, this would serve the PDF from object storage
    // For now, generate a simple PDF on the fly
    const pdfBuffer = await generateReportPDF(report)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="cryptoshield-report-${report._id}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

async function generateReportPDF(report: any): Promise<Buffer> {
  // Simple PDF generation using a basic approach
  // In production, use pdfkit or similar
  const { PDFDocument } = await import('pdf-lib')
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()
  const { width, height } = page.getSize()
  
  page.drawText('CryptoShield AI - Security Report', {
    x: 50,
    y: height - 50,
    size: 24,
  })
  
  page.drawText(`Report ID: ${report._id}`, {
    x: 50,
    y: height - 100,
    size: 12,
  })
  
  page.drawText(`Generated: ${new Date(report.createdAt).toLocaleString()}`, {
    x: 50,
    y: height - 120,
    size: 12,
  })
  
  page.drawText(`Scans Included: ${report.scanIds.length}`, {
    x: 50,
    y: height - 140,
    size: 12,
  })
  
  page.drawText('Disclaimer: This report provides risk estimates, not guarantees.', {
    x: 50,
    y: height - 180,
    size: 10,
  })
  
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export default router