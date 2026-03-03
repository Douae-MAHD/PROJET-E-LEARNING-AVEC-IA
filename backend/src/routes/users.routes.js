import express from 'express';
import * as usersController from '../controllers/users.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticateToken, usersController.listUsers);
router.get('/me', authenticateToken, usersController.getProfile);
router.get('/:id', authenticateToken, usersController.getProfile);
router.put('/:id', authenticateToken, usersController.updateProfile);

export default router;
