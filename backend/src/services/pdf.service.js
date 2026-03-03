import fs from 'fs/promises';
import mongoose from 'mongoose';
import * as repo from '../repositories/pdf.repository.js';
import PDF from '../models/PDF.js';
import SubModule from '../models/SubModule.js';
import CourseModule from '../models/CourseModule.js';
import { extractTextFromPDF } from './pdf/pdfService.js';
import logger from '../utils/logger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errorHandler.js';

export const getPdf = (id) => repo.findById(id);
export const listBySubModule = (subModuleId) => repo.findBySubModule(subModuleId);

export const createPdf = async (data) => {
	const savedPdf = await repo.createPdf(data);

	try {
		const extractedText = await extractTextFromPDF(data.cheminFichier);
		savedPdf.textContent = extractedText || null;
		savedPdf.textExtractedAt = new Date();
		await savedPdf.save();
	} catch (error) {
		logger.warn('PDF text extraction failed', {
			pdfId: savedPdf?._id,
			path: data?.cheminFichier,
			error: error.message,
		});
	}

	return savedPdf;
};

export const deletePdf = async (id, professorId) => {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		throw new ValidationError('Identifiant PDF invalide', 'pdfId');
	}
	if (!mongoose.Types.ObjectId.isValid(professorId)) {
		throw new ValidationError('Identifiant professeur invalide', 'professorId');
	}

	const pdf = await PDF.findById(id);
	if (!pdf) throw new NotFoundError('PDF');

	const subModule = await SubModule.findById(pdf.subModuleId).select('parentModuleId');
	if (!subModule?.parentModuleId) throw new NotFoundError('SubModule');

	const module = await CourseModule.findById(subModule.parentModuleId).select('professorId');
	if (!module) throw new NotFoundError('Module');

	const moduleProfessorId = module.professorId?._id || module.professorId;
	if (moduleProfessorId?.toString() !== professorId.toString()) {
		throw new ForbiddenError('Accès interdit');
	}

	try {
		await fs.unlink(pdf.cheminFichier);
	} catch (error) {
		logger.warn('Failed to delete PDF file', {
			pdfId: pdf._id,
			path: pdf.cheminFichier,
			error: error.message,
		});
	}

	return repo.deleteById(id);
};
