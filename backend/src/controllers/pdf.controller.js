/**
 * Note style: `quizController` utilise un style classe par choix.
 * Ce controller conserve le style `export const` pour cohérence locale.
 */

import { asyncHandler, ValidationError, NotFoundError } from '../utils/errorHandler.js';
import * as pdfService from '../services/pdf.service.js';
import fs from 'fs';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/responseFormatter.js';

// Upload handler
export const uploadPdf = asyncHandler(async (req, res) => {
  try {
    const seanceIdRaw = req.body?.seance_id || req.body?.seanceId;

    if (!req.file) throw new ValidationError('Aucun fichier PDF fourni', 'pdf');
    if (!seanceIdRaw) throw new ValidationError('ID de séance requis', 'seance_id');
    if (!mongoose.Types.ObjectId.isValid(seanceIdRaw)) throw new ValidationError('ID séance invalide', 'seance_id');

    const data = {
      nomFichier: req.file.originalname,
      cheminFichier: req.file.path,
      tailleFichier: req.file.size,
      seanceId: new mongoose.Types.ObjectId(seanceIdRaw),
    };

    const saved = await pdfService.createPdf(data);

    sendSuccess(res, {
      id: saved._id,
      nomFichier: saved.nomFichier,
      cheminFichier: saved.cheminFichier,
      tailleFichier: saved.tailleFichier,
      seanceId: saved.seanceId
    }, 'PDF uploadé avec succès', 201);
  } catch (error) {
    throw error;
  }
});

export const downloadPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ValidationError('ID invalide', 'id');

  const pdf = await pdfService.getPdf(id);
  if (!pdf) throw new NotFoundError('PDF');

  if (!fs.existsSync(pdf.cheminFichier)) throw new NotFoundError('Fichier');

  res.download(pdf.cheminFichier, pdf.nomFichier);
});

export const deletePdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ValidationError('ID invalide', 'id');

  const pdf = await pdfService.getPdf(id);
  if (!pdf) throw new NotFoundError('PDF');

  // Delete file if exists
  try {
    if (fs.existsSync(pdf.cheminFichier)) fs.unlinkSync(pdf.cheminFichier);
  } catch (err) {
    console.warn('Failed to delete file from disk', err);
  }

  // Delete DB record
  const professorId = req.user.id;
  await pdfService.deletePdf(id, professorId);

  sendSuccess(res, null, 'PDF supprimé avec succès');
});

export const getPdf = asyncHandler(async (req, res) => {
  const pdf = await pdfService.getPdf(req.params.id);
  if (!pdf) throw new NotFoundError('PDF');
  sendSuccess(res, pdf, 'PDF récupéré');
});

export const listBySubModule = asyncHandler(async (req, res) => {
  const pdfs = await pdfService.listBySubModule(req.params.subModuleId);
  sendSuccess(res, pdfs, 'PDFs récupérés');
});
