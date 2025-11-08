import express from 'express';
import authMiddleware from '../middleware/authmiddleware.js';
import {
  createDocument,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  createInvitation  // Add this import if not already
} from '../controllers/documentController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/documents - Create new document
router.post('/', createDocument);

// GET /api/documents - Get user's documents
router.get('/', getUserDocuments);

// GET /api/documents/:id - Get single document
router.get('/:id', getDocument);

// PATCH /api/documents/:id - Update document metadata
router.patch('/:id', updateDocument);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', deleteDocument);

// POST /api/documents/:id/invite - Create invitation (new route)
router.post('/:id/invite', createInvitation);

export default router;