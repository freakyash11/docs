import express from 'express';
import authMiddleware from '../middleware/authmiddleware.js';
import {
  createDocument,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  updateDocumentTitle
} from '../controllers/documentController.js';
import { createInvitation } from '../controllers/invitationController.js';
import { getInvitationByToken, validateInvitation, acceptInvitation } from '../controllers/invitationController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/documents - Create new document
router.post('/', createDocument);

// GET /api/documents - Get user's documents
console.log('Loading documentRoutes.js - start');
router.get('/', getUserDocuments);
console.log('Loading documentRoutes.js - end');
// GET /api/documents/:id - Get single document
router.get('/:id', getDocument);

// PATCH /api/documents/:id - Update document metadata
router.patch('/:id', updateDocumentTitle);

router.put('/:id', updateDocument);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', deleteDocument);

// Document invitation routes
router.post('/:id/invite', createInvitation);
router.get('/:token', getInvitationByToken);  // GET /api/invite/:token
router.post('/:token/validate', validateInvitation);  // POST /api/invite/:token/validate
router.post('/:token/accept', acceptInvitation);  // POST /api/invite/:token/accept

export default router;