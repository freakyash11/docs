import express from 'express';
import { 
  createInvitation, 
  getInvitationByToken, 
  validateInvitation, 
  acceptInvitation, 
  revokeInvitation, 
  getDocumentInvitations, 
  resendInvitation, 
  cleanupExpiredInvitations 
} from '../controllers/invitationController.js';  // Adjust path to your controller file

const router = express.Router();

// POST /api/invite - Create invitation (from document page)
router.post('/documents/:id/invite', createInvitation);

// GET /api/invite/:token - Fetch invitation details by token
router.get('/:token', getInvitationByToken);

// POST /api/invite/:token/validate - Validate invitation (email match, etc.)
router.post('/:token/validate', validateInvitation);

// POST /api/invite/:token/accept - Accept invitation
router.post('/:token/accept', acceptInvitation);

// DELETE /api/invite/:invitationId - Revoke invitation (owner only)
router.delete('/:invitationId', revokeInvitation);

// GET /api/invite/documents/:documentId - Get all invitations for a document
router.get('/documents/:documentId', getDocumentInvitations);

// POST /api/invite/:invitationId/resend - Resend invitation
router.post('/:invitationId/resend', resendInvitation);

// GET /api/invite/cleanup - Cleanup expired invitations (admin/cron)
router.get('/cleanup', cleanupExpiredInvitations);

export default router;