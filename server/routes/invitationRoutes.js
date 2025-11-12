import express from 'express';
import { 
  createInvitation, 
  getInvitationByToken, 
  validateInvitation, 
  acceptInvitation, 
  revokeInvitation, 
  getDocumentInvitations, 
  resendInvitation, 
  cleanupExpiredInvitations,
  updateDocumentPermissions  // Add this new controller
} from '../controllers/invitationController.js';
import authMiddleware from '../middleware/authmiddleware.js';

const router = express.Router();

// POST /api/invite/:id/invite - Create invitation (from document page)
router.post('/:id/invite', authMiddleware, createInvitation);

// PATCH /api/invite/document/:documentId - Update document permissions (public/private, collaborators)
router.patch('/document/:documentId', authMiddleware, updateDocumentPermissions);

// GET /api/invite/:token - Fetch invitation details by token
router.get('/:token', getInvitationByToken);

// POST /api/invite/:token/validate - Validate invitation (email match, etc.)
router.post('/:token/validate', authMiddleware, validateInvitation);

// POST /api/invite/:token/accept - Accept invitation
router.post('/:token/accept', authMiddleware, acceptInvitation);

// PATCH /api/invite/revoke/:invitationId - Revoke invitation (change status to 'revoked')
router.patch('/revoke/:invitationId', authMiddleware, revokeInvitation);

// GET /api/invite/documents/:documentId - Get all invitations for a document
router.get('/documents/:documentId', authMiddleware, getDocumentInvitations);

// POST /api/invite/:invitationId/resend - Resend invitation
router.post('/:invitationId/resend', authMiddleware, resendInvitation);

// GET /api/invite/cleanup - Cleanup expired invitations (admin/cron)
router.get('/cleanup', cleanupExpiredInvitations);

export default router;