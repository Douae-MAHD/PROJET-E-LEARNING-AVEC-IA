import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Créer un module de cours (Professeur uniquement)
router.post('/', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { titre, description } = req.body;
    const professeur_id = req.user.id;

    if (!titre) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    const [result] = await pool.execute(
      'INSERT INTO course_modules (titre, description, professeur_id) VALUES (?, ?, ?)',
      [titre, description || null, professeur_id]
    );

    res.status(201).json({
      message: 'Module créé avec succès',
      module: {
        id: result.insertId,
        titre,
        description,
        professeur_id
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du module:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les modules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'professeur') {
      // Les professeurs voient uniquement leurs propres modules
      const [modules] = await pool.execute(`
        SELECT cm.*, u.nom as professeur_nom 
        FROM course_modules cm
        JOIN users u ON cm.professeur_id = u.id
        WHERE cm.professeur_id = ?
        ORDER BY cm.created_at DESC
      `, [userId]);

      res.json(modules);
    } else if (userRole === 'etudiant') {
      // Les étudiants voient uniquement les modules auxquels ils sont inscrits
      const [modules] = await pool.execute(`
        SELECT cm.*, u.nom as professeur_nom 
        FROM course_modules cm
        JOIN users u ON cm.professeur_id = u.id
        JOIN module_enrollments me ON cm.id = me.module_id
        WHERE me.etudiant_id = ?
        ORDER BY cm.created_at DESC
      `, [userId]);

      res.json(modules);
    } else {
      res.status(403).json({ error: 'Accès non autorisé' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un module par ID avec ses cours
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ?',
      [id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé' });
    }

    const module = modules[0];

    // Vérifier les permissions d'accès
    if (userRole === 'professeur') {
      // Le professeur doit être le propriétaire du module
      if (module.professeur_id !== userId) {
        return res.status(403).json({ error: 'Vous n\'avez pas accès à ce module' });
      }
    } else if (userRole === 'etudiant') {
      // L'étudiant doit être inscrit au module
      const [enrollments] = await pool.execute(
        'SELECT * FROM module_enrollments WHERE module_id = ? AND etudiant_id = ?',
        [id, userId]
      );

      if (enrollments.length === 0) {
        return res.status(403).json({ error: 'Vous n\'êtes pas inscrit à ce module' });
      }
    }

    // Récupérer les cours de premier niveau
    const [subModules] = await pool.execute(`
      SELECT * FROM sub_modules 
      WHERE parent_module_id = ? AND parent_sub_module_id IS NULL
      ORDER BY created_at ASC
    `, [id]);

    // Pour chaque cours, récupérer les sous-cours
    for (let subModule of subModules) {
      const [subSubModules] = await pool.execute(
        'SELECT * FROM sub_modules WHERE parent_sub_module_id = ? ORDER BY created_at ASC',
        [subModule.id]
      );
      subModule.sous_modules = subSubModules;
    }

    res.json({
      ...modules[0],
      sub_modules: subModules
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du module:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un cours
router.post('/:moduleId/submodules', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { titre, description, parentSubModuleId } = req.body;

    if (!titre) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }

    // Vérifier que le module parent existe
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ?',
      [moduleId]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module parent non trouvé' });
    }

    // Si c'est un sous-cours, vérifier que le parent existe
    if (parentSubModuleId) {
      const [parentSubModules] = await pool.execute(
        'SELECT * FROM sub_modules WHERE id = ?',
        [parentSubModuleId]
      );
      if (parentSubModules.length === 0) {
        return res.status(404).json({ error: 'Cours parent non trouvé' });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO sub_modules (titre, description, parent_module_id, parent_sub_module_id) VALUES (?, ?, ?, ?)',
      [titre, description || null, moduleId, parentSubModuleId || null]
    );

    res.status(201).json({
      message: 'Cours créé avec succès',
      subModule: {
        id: result.insertId,
        titre,
        description,
        parent_module_id: moduleId,
        parent_sub_module_id: parentSubModuleId || null
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du cours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un cours avec ses PDFs
router.get('/submodules/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [subModules] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ error: 'Sous-module non trouvé' });
    }

    // Récupérer les PDFs
    const [pdfs] = await pool.execute(
      'SELECT * FROM pdfs WHERE sub_module_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      ...subModules[0],
      pdfs
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du cours:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;


