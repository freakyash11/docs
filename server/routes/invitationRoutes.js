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
  updateDocumentPermissions  
} from '../controllers/invitationController.js';
import authMiddleware from '../middleware/authmiddleware.js';

const router = express.Router();
router.post('/:id/invite', authMiddleware, createInvitation);
router.patch('/document/:documentId', authMiddleware, updateDocumentPermissions);
router.get('/:token', getInvitationByToken);
router.post('/:token/validate', authMiddleware, validateInvitation);
router.post('/:token/accept', authMiddleware, acceptInvitation);
router.patch('/revoke/:invitationId', authMiddleware, revokeInvitation);
router.get('/documents/:documentId', authMiddleware, getDocumentInvitations);
router.post('/:invitationId/resend', authMiddleware, resendInvitation);
router.get('/cleanup', cleanupExpiredInvitations);

export default router;