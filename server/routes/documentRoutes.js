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

// POST /api/documents - Create new document
router.post('/', authMiddleware, createDocument);

// GET /api/documents - Get user's documents
router.get('/', authMiddleware, getUserDocuments);

// GET /api/documents/:id - Get single document
router.get('/:id', getDocument);

// PATCH /api/documents/:id - Update document metadata
router.patch('/:id', authMiddleware, updateDocument);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', authMiddleware, deleteDocument);


export default router;