import express from 'express';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { 
    acceptInvitation,
    getInvitationByToken,
    validateInvitation,
    resendInvitation,
    revokeInvitation 
} from '../controllers/invitationController.js';

const router = express.Router();

// Get invitation details (before accepting)
router.get('/:token', optionalAuth, getInvitationByToken);

// Validate invitation (check if valid and get doc details)
router.post('/:token/validate', optionalAuth, validateInvitation);

// Accept invitation (requires auth)
router.post('/:token/accept', authenticateUser, acceptInvitation);

// Resend invitation (requires auth)
router.post('/:id/resend', authenticateUser, resendInvitation);

// Revoke invitation (requires auth)
router.patch('/:id/revoke', authenticateUser, revokeInvitation);

export default router;