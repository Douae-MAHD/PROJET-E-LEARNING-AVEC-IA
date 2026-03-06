import fs from 'fs/promises';
import mongoose from 'mongoose';
import * as repo from '../repositories/pdf.repository.js';
import PDF from '../models/PDF.js';
import Seance from '../models/Seance.js';
import SubModule from '../models/SubModule.js';
import CourseModule from '../models/CourseModule.js';
import { extractTextFromPDF } from './pdf/pdfService.js';
import logger from '../utils/logger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errorHandler.js';

export const getPdf = (id) => repo.findById(id);
export const listBySeance = (seanceId) => repo.findBySeance(seanceId);
export const listBySubModule = async (subModuleId) => {
	if (!mongoose.Types.ObjectId.isValid(subModuleId)) {
		throw new ValidationError('Identifiant sous-module invalide', 'subModuleId');
	}

	const seances = await Seance.find({ subModuleId }).select('_id').lean();
	if (!seances.length) {
		return [];
	}

	const seanceIds = seances.map((seance) => seance._id);
	return repo.findBySeanceIds(seanceIds);
};

export const createPdf = async (data) => {
	if (!data?.seanceId) {
		throw new ValidationError('Identifiant séance requis', 'seanceId');
	}

	const seanceExists = await Seance.findById(data.seanceId).select('_id');
	if (!seanceExists) {
		throw new NotFoundError('Séance');
	}

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

	const seance = await Seance.findById(pdf.seanceId).select('subModuleId');
	if (!seance?.subModuleId) throw new NotFoundError('Séance');

	const subModule = await SubModule.findById(seance.subModuleId).select('parentModuleId');
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
