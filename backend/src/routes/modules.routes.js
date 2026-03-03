import express from 'express';
import * as modulesController from '../controllers/modules.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.post('/', authenticateToken, requireRole(['professeur']), modulesController.createModule);
/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Liste les modules accessibles à l'utilisateur connecté
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des modules
 *       401:
 *         description: Non authentifié
 */
router.get('/', authenticateToken, modulesController.listModules);
/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Récupère un module avec ses sous-modules
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détail du module
 *       404:
 *         description: Module non trouvé
 */
router.get('/:id', authenticateToken, modulesController.getModule);
router.get('/submodules/:id', authenticateToken, modulesController.getSubModule);
router.post('/:moduleId/submodules', authenticateToken, requireRole(['professeur']), modulesController.createSubModule);

export default router;
