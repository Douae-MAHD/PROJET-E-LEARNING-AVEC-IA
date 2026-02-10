import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Upload un PDF
router.post('/upload', authenticateToken, requireRole(['professeur']), upload.single('pdf'), async (req, res) => {
  try {
    const { sub_module_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier PDF fourni' });
    }

    if (!sub_module_id) {
      return res.status(400).json({ error: 'ID du cours requis' });
    }

    // Vérifier que le cours existe
    const [subModules] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [sub_module_id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    const [result] = await pool.execute(
      'INSERT INTO pdfs (nom_fichier, chemin_fichier, taille_fichier, sub_module_id) VALUES (?, ?, ?, ?)',
      [req.file.originalname, req.file.path, req.file.size, sub_module_id]
    );

    res.status(201).json({
      message: 'PDF uploadé avec succès',
      pdf: {
        id: result.insertId,
        nom_fichier: req.file.originalname,
        chemin_fichier: req.file.path,
        taille_fichier: req.file.size,
        sub_module_id
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du PDF:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un PDF par ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [pdfs] = await pool.execute(
      'SELECT * FROM pdfs WHERE id = ?',
      [id]
    );

    if (pdfs.length === 0) {
      return res.status(404).json({ error: 'PDF non trouvé' });
    }

    res.json(pdfs[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du PDF:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Télécharger un PDF
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [pdfs] = await pool.execute(
      'SELECT * FROM pdfs WHERE id = ?',
      [id]
    );

    if (pdfs.length === 0) {
      return res.status(404).json({ error: 'PDF non trouvé' });
    }

    const pdf = pdfs[0];
    res.download(pdf.chemin_fichier, pdf.nom_fichier);
  } catch (error) {
    console.error('Erreur lors du téléchargement du PDF:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un PDF
router.delete('/:id', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { id } = req.params;

    const [pdfs] = await pool.execute(
      'SELECT * FROM pdfs WHERE id = ?',
      [id]
    );

    if (pdfs.length === 0) {
      return res.status(404).json({ error: 'PDF non trouvé' });
    }

    await pool.execute('DELETE FROM pdfs WHERE id = ?', [id]);

    res.json({ message: 'PDF supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du PDF:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;




