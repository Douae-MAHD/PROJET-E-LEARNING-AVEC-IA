import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Obtenir tous les étudiants inscrits à un module (Professeur uniquement)
router.get('/module/:moduleId/students', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const professeur_id = req.user.id;

    // Vérifier que le module appartient au professeur
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ? AND professeur_id = ?',
      [moduleId, professeur_id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé ou vous n\'avez pas accès à ce module' });
    }

    // Récupérer tous les étudiants inscrits
    const [enrollments] = await pool.execute(`
      SELECT u.id, u.nom, u.email, me.created_at as inscription_date
      FROM module_enrollments me
      JOIN users u ON me.etudiant_id = u.id
      WHERE me.module_id = ?
      ORDER BY me.created_at DESC
    `, [moduleId]);

    res.json(enrollments);
  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les étudiants disponibles (non inscrits) pour un module
router.get('/module/:moduleId/available-students', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const professeur_id = req.user.id;

    // Vérifier que le module appartient au professeur
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ? AND professeur_id = ?',
      [moduleId, professeur_id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé ou vous n\'avez pas accès à ce module' });
    }

    // Récupérer tous les étudiants qui ne sont PAS encore inscrits
    const [students] = await pool.execute(`
      SELECT u.id, u.nom, u.email
      FROM users u
      WHERE u.role = 'etudiant'
      AND u.id NOT IN (
        SELECT etudiant_id FROM module_enrollments WHERE module_id = ?
      )
      ORDER BY u.nom ASC
    `, [moduleId]);

    res.json(students);
  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants disponibles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Inscrire un étudiant à un module (Professeur uniquement)
router.post('/module/:moduleId/student/:studentId', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId, studentId } = req.params;
    const professeur_id = req.user.id;

    // Vérifier que le module appartient au professeur
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ? AND professeur_id = ?',
      [moduleId, professeur_id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé ou vous n\'avez pas accès à ce module' });
    }

    // Vérifier que l'utilisateur est un étudiant
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND role = ?',
      [studentId, 'etudiant']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Étudiant non trouvé' });
    }

    // Vérifier si l'inscription existe déjà
    const [existing] = await pool.execute(
      'SELECT * FROM module_enrollments WHERE module_id = ? AND etudiant_id = ?',
      [moduleId, studentId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Cet étudiant est déjà inscrit à ce module' });
    }

    // Créer l'inscription
    const [result] = await pool.execute(
      'INSERT INTO module_enrollments (module_id, etudiant_id) VALUES (?, ?)',
      [moduleId, studentId]
    );

    res.status(201).json({
      message: 'Étudiant inscrit avec succès',
      enrollment: {
        id: result.insertId,
        module_id: moduleId,
        etudiant_id: studentId
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Désinscrire un étudiant d'un module (Professeur uniquement)
router.delete('/module/:moduleId/student/:studentId', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId, studentId } = req.params;
    const professeur_id = req.user.id;

    // Vérifier que le module appartient au professeur
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ? AND professeur_id = ?',
      [moduleId, professeur_id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé ou vous n\'avez pas accès à ce module' });
    }

    // Supprimer l'inscription
    const [result] = await pool.execute(
      'DELETE FROM module_enrollments WHERE module_id = ? AND etudiant_id = ?',
      [moduleId, studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    res.json({ message: 'Étudiant désinscrit avec succès' });
  } catch (error) {
    console.error('Erreur lors de la désinscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Inscrire plusieurs étudiants à la fois
router.post('/module/:moduleId/students', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { studentIds } = req.body; // Array d'IDs d'étudiants
    const professeur_id = req.user.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Liste d\'étudiants requise' });
    }

    // Vérifier que le module appartient au professeur
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ? AND professeur_id = ?',
      [moduleId, professeur_id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé ou vous n\'avez pas accès à ce module' });
    }

    const enrolled = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        // Vérifier si l'inscription existe déjà
        const [existing] = await pool.execute(
          'SELECT * FROM module_enrollments WHERE module_id = ? AND etudiant_id = ?',
          [moduleId, studentId]
        );

        if (existing.length === 0) {
          const [result] = await pool.execute(
            'INSERT INTO module_enrollments (module_id, etudiant_id) VALUES (?, ?)',
            [moduleId, studentId]
          );
          enrolled.push(studentId);
        }
      } catch (error) {
        errors.push({ studentId, error: error.message });
      }
    }

    res.status(201).json({
      message: `${enrolled.length} étudiant(s) inscrit(s) avec succès`,
      enrolled,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription multiple:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;



