import PDF from '../models/PDF.js';
import { DatabaseError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const findById = async (id) => {
	try {
		return await PDF.findById(id);
	} catch (error) {
		logger.error('Error finding PDF by ID', error, { id });
		throw new DatabaseError('Failed to retrieve PDF');
	}
};

export const findBySeance = async (seanceId) => {
	try {
		return await PDF.find({ seanceId }).sort({ createdAt: -1 });
	} catch (error) {
		logger.error('Error finding PDF by seance', error, { seanceId });
		throw new DatabaseError('Failed to retrieve PDFs');
	}
};

export const findBySeanceIds = async (seanceIds = []) => {
	try {
		return await PDF.find({ seanceId: { $in: seanceIds } }).sort({ createdAt: -1 });
	} catch (error) {
		logger.error('Error finding PDFs by seances', error, { count: seanceIds.length });
		throw new DatabaseError('Failed to retrieve PDFs');
	}
};

export const createPdf = async (data) => {
	try {
		const p = new PDF(data);
		const saved = await p.save();
		logger.debug('PDF created', { pdfId: saved._id });
		return saved;
	} catch (error) {
		logger.error('Error creating PDF', error);
		throw new DatabaseError('Failed to create PDF');
	}
};

export const deleteById = async (id) => {
	try {
		const result = await PDF.findByIdAndDelete(id);
		logger.debug('PDF deleted', { pdfId: id });
		return result;
	} catch (error) {
		logger.error('Error deleting PDF', error, { id });
		throw new DatabaseError('Failed to delete PDF');
	}
};
