/**
 * PDF Service
 * Handles PDF text extraction and processing
 * 
 * Responsibilities:
 * - Extract text from PDF files
 * - Handle multiple PDF extraction
 * - PDF validation
 * - Error handling for corrupted PDFs
 * 
 * Does NOT:
 * - Generate quiz/exercises (that's AI service)
 * - Store PDFs (that's repository)
 * - Handle HTTP requests (that's controller)
 */

import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { ServiceError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

export class PDFService {
  constructor() {
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.maxTextLength = 50000; // chars
  }

  /**
   * Extract text from single PDF
   */
  async extractText(pdfPath) {
    try {
      logger.debug('Extracting text from PDF', { pdfPath });

      // Validate file exists
      const normalizedPath = this.normalizePath(pdfPath);
      if (!fs.existsSync(normalizedPath)) {
        throw new ServiceError(`PDF file not found: ${normalizedPath}`);
      }

      // Check file size
      const stats = fs.statSync(normalizedPath);
      if (stats.size > this.maxFileSize) {
        throw new ServiceError(`PDF file too large: ${stats.size} bytes`);
      }

      // Read and parse PDF
      const dataBuffer = fs.readFileSync(normalizedPath);
      const pdfData = await pdfParse(dataBuffer);

      let text = pdfData.text || '';

      // Clean up text
      text = this.cleanText(text);

      // Limit length
      if (text.length > this.maxTextLength) {
        logger.warn('PDF text truncated', { 
          originalLength: text.length,
          maxLength: this.maxTextLength 
        });
        text = text.substring(0, this.maxTextLength);
      }

      logger.success('PDF text extracted', { 
        pdfPath,
        textLength: text.length,
        pages: pdfData.numpages 
      });

      return text;
    } catch (error) {
      logger.error('PDF extraction failed', error, { pdfPath });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(`Failed to extract PDF text: ${error.message}`);
    }
  }

  /**
   * Extract text from multiple PDFs
   */
  async extractTextFromMultiple(pdfPaths) {
    try {
      logger.info('Extracting text from multiple PDFs', { count: pdfPaths.length });

      const results = [];
      const errors = [];

      for (const pdfPath of pdfPaths) {
        try {
          const text = await this.extractText(pdfPath);
          results.push({
            path: pdfPath,
            text,
            success: true
          });
        } catch (error) {
          logger.warn('Failed to extract individual PDF', error, { pdfPath });
          errors.push({
            path: pdfPath,
            error: error.message,
            success: false
          });
        }
      }

      logger.info('Multiple PDF extraction completed', {
        successful: results.length,
        failed: errors.length
      });

      return {
        results,
        errors,
        combinedText: results.map(r => r.text).join('\n\n')
      };
    } catch (error) {
      logger.error('Multiple PDF extraction failed', error);
      throw new ServiceError('Failed to extract multiple PDFs', error);
    }
  }

  /**
   * Normalize PDF file path
   * Handles relative paths, Windows paths, etc.
   */
  normalizePath(filePath) {
    // Handle URLs and remove query strings
    if (filePath.includes('?')) {
      filePath = filePath.split('?')[0];
    }

    // Resolve relative paths
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(process.cwd(), filePath);
    }

    // Normalize path separators
    return path.normalize(filePath);
  }

  /**
   * Clean extracted text
   * Remove extra whitespace, null characters, etc.
   */
  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\0/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
      .replace(/[ \t]{2,}/g, ' ') // Normalize multiple spaces/tabs
      .trim();
  }

  /**
   * Validate PDF file
   */
  async validatePDF(filePath) {
    try {
      const normalizedPath = this.normalizePath(filePath);

      // Check file exists
      if (!fs.existsSync(normalizedPath)) {
        return { valid: false, reason: 'File not found' };
      }

      // Check extension
      if (!normalizedPath.toLowerCase().endsWith('.pdf')) {
        return { valid: false, reason: 'Not a PDF file' };
      }

      // Check file size
      const stats = fs.statSync(normalizedPath);
      if (stats.size === 0) {
        return { valid: false, reason: 'Empty file' };
      }

      if (stats.size > this.maxFileSize) {
        return { valid: false, reason: `File too large (${stats.size} bytes)` };
      }

      // Try to parse
      try {
        const dataBuffer = fs.readFileSync(normalizedPath);
        await pdfParse(dataBuffer);
        return { valid: true };
      } catch (parseError) {
        return { valid: false, reason: `Invalid PDF: ${parseError.message}` };
      }
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Get PDF metadata
   */
  async getPDFMetadata(filePath) {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const dataBuffer = fs.readFileSync(normalizedPath);
      const pdfData = await pdfParse(dataBuffer);

      return {
        pages: pdfData.numpages,
        size: fs.statSync(normalizedPath).size,
        textLength: pdfData.text?.length || 0,
        hasText: (pdfData.text?.length || 0) > 100,
        info: pdfData.info || {}
      };
    } catch (error) {
      throw new ServiceError(`Failed to get PDF metadata: ${error.message}`);
    }
  }
}

const pdfService = new PDFService();

/**
 * Backward compatibility exports
 * These are used by the old aiService facade
 */
export const extractTextFromPDF = async (pdfPath) => {
  return pdfService.extractText(pdfPath);
};

export const extractTextFromMultiplePDFs = async (pdfPaths) => {
  const results = [];
  for (const pdfPath of pdfPaths) {
    try {
      const text = await pdfService.extractText(pdfPath);
      results.push({ success: true, path: pdfPath, text });
    } catch (error) {
      results.push({ success: false, path: pdfPath, error: error.message });
    }
  }
  return results;
};

export default pdfService;
