import express from 'express';
import authMiddleware from '../middleware/authmiddleware.js';
import {
  createDocument,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();

router.post('/', authMiddleware, createDocument);
router.get('/', authMiddleware, getUserDocuments);
router.get('/:id', getDocument);
router.patch('/:id', authMiddleware, updateDocument);
router.delete('/:id', authMiddleware, deleteDocument);


export default router;