import express from 'express';
import * as pdfController from '../controllers/pdf.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// Upload a PDF
router.post('/upload', authenticateToken, requireRole(['professeur']), upload.single('pdf'), pdfController.uploadPdf);

// Get PDF metadata
router.get('/:id', authenticateToken, pdfController.getPdf);

// Download PDF file
router.get('/:id/download', authenticateToken, pdfController.downloadPdf);

// Delete PDF
router.delete('/:id', authenticateToken, requireRole(['professeur']), pdfController.deletePdf);

// List PDFs by submodule
router.get('/submodule/:subModuleId', authenticateToken, pdfController.listBySubModule);

export default router;
