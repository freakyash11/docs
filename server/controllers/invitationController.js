import Invitation from '../models/Invitation.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { emailService } from '../services/emailService.js';

// Rate limiting: Track invites per user/email
const inviteRateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_INVITES_PER_HOUR = 10;
const MAX_INVITES_PER_EMAIL_PER_DAY = 3;

// Helper: Check rate limit for user
function checkUserRateLimit(userId) {
  const key = `user:${userId}`;
  const now = Date.now();
  
  if (!inviteRateLimits.has(key)) {
    inviteRateLimits.set(key, { count: 0, resetAt: now + RATE_LIMIT_WINDOW });
  }
  
  const limit = inviteRateLimits.get(key);
  
  // Reset if window expired
  if (now > limit.resetAt) {
    limit.count = 0;
    limit.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  if (limit.count >= MAX_INVITES_PER_HOUR) {
    return { allowed: false, resetIn: Math.ceil((limit.resetAt - now) / 1000 / 60) };
  }
  
  limit.count += 1;
  return { allowed: true };
}

// Helper: Check rate limit for email
async function checkEmailRateLimit(email, documentId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentInvites = await Invitation.countDocuments({
    email,
    docId: documentId,
    createdAt: { $gte: oneDayAgo }
  });
  
  if (recentInvites >= MAX_INVITES_PER_EMAIL_PER_DAY) {
    return { allowed: false, count: recentInvites };
  }
  
  return { allowed: true };
}

// Create invitation (send invite)
export const createInvitation = async (req, res) => {
  try {
    const { id: documentId } = req.params;
    const { email, role, notes } = req.body;
    const userId = req.userId; // From auth middleware (Clerk ID)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log('createInvitation called - documentId:', documentId, 'Body:', req.body, 'UserId:', userId);

    // Validate inputs
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required in URL params' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required in request body' });
    }
    if (!role) {
      return res.status(400).json({ error: 'Role is required in request body' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be editor or viewer' });
    }

    // Validate document ID
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Find user by Clerk ID
    const user = await User.findOne({ clerkId: userId });
    console.log('User query - clerkId:', userId, 'Result:', user ? 'Found' : 'Not found', '- DB _id:', user?._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Rate limit: Check user
    const userRateLimit = checkUserRateLimit(user._id.toString());
    if (!userRateLimit.allowed) {
      return res.status(429).json({ 
        error: `Rate limit exceeded. Try again in ${userRateLimit.resetIn} minutes`,
        retryAfter: userRateLimit.resetIn * 60
      });
    }

    // Rate limit: Check email
    const emailRateLimit = await checkEmailRateLimit(email, documentId);
    if (!emailRateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Too many invitations sent to this email. Try again tomorrow',
        count: emailRateLimit.count
      });
    }

    // Check if document exists and user has permission to invite
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user is owner or editor
    const isOwner = document.ownerId.toString() === user._id.toString();
    const isEditor = document.collaborators.some(c => 
      c.userId?._id.toString() === user._id.toString() && c.permission === 'editor'
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ error: 'Only document owner or editors can send invitations' });
    }

    // Editors can only invite viewers
    if (!isOwner && role === 'editor') {
      return res.status(403).json({ error: 'Only document owner can invite editors' });
    }

    // Check if user is already a collaborator
    const existingCollab = document.collaborators.find(c => c.email === email);
    if (existingCollab) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    // Create invitation with security logging
    const { invitation, plainToken } = await Invitation.createInvitation({
      docId: documentId,
      email,
      role,
      invitedBy: user._id,
      notes,
      ip,
      userAgent
    });

    // Generate invitation link
    const frontendUrl = 'https://docsy-client.vercel.app/';
    const inviteLink = `${frontendUrl}/invite/${plainToken}`;

    // Send invitation email - non-blocking
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: `${user.name} invited you to collaborate on ${document.title}`,
      template: 'invitation',
      context: {
        senderName: user.name,
        documentName: document.title,
        invitationLink: inviteLink,
        recipientEmail: email,
      }
    }).catch(error => ({ success: false, error: error.message }));

    if (!emailResult.success) {
      console.warn('Email send failed (invitation saved):', emailResult.error);
      // Optional: Log to DB for retry
    }

    console.log('📧 Invitation created:', {
      id: invitation._id,
      email,
      role,
      link: inviteLink,
      expiresAt: invitation.expiresAt
    });

    res.status(201).json({
      success: true,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        status: invitation.status
      },
      // Only return link in development for testing
      ...(process.env.NODE_ENV !== 'production' && { inviteLink })
    });
  } catch (error) {
    console.error('Create invitation error:', error.message);
    
    if (error.message === 'Active invitation already exists for this email') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create invitation' });
  }
};

// Get invitation by token (validate before showing accept page)
export const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Find invitation by hashed token
    const invitation = await Invitation.findByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or invalid' });
    }
    
    // Check if expired
    if (invitation.isExpired) {
      await invitation.save(); // Trigger pre-save middleware to mark as expired
      return res.status(410).json({ error: 'Invitation has expired' });
    }
    
    // Check if already used
    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        error: `Invitation has been ${invitation.status}`,
        status: invitation.status
      });
    }
    
    // Return invitation details (without sensitive data)
    res.json({
      success: true,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        documentTitle: invitation.docId?.title,
        invitedBy: invitation.invitedBy?.name,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        requiresAuth: !req.userId // Flag if user needs to log in
      }
    });
  } catch (error) {
    console.error('Get invitation error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve invitation' });
  }
};

// Validate invitation (check email match)
export const validateInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId; // From optional auth middleware
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const invitation = await Invitation.findByToken(token);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or invalid' });
    }
    
    if (!invitation.isValid) {
      return res.status(400).json({ 
        error: invitation.isExpired ? 'Invitation has expired' : `Invitation is ${invitation.status}` 
      });
    }
    
    // If user is logged in, check email match
    if (userId) {
      const user = await User.findOne({ clerkId: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const emailMatches = invitation.email.toLowerCase() === user.email.toLowerCase();
      
      res.json({
        success: true,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          documentTitle: invitation.docId?.title,
          invitedBy: invitation.invitedBy?.name,
          emailMatches,
          canAccept: emailMatches // Only allow accept if email matches
        }
      });
    } else {
      // User not logged in - return basic info
      res.json({
        success: true,
        invitation: {
          email: invitation.email,
          documentTitle: invitation.docId?.title,
          requiresAuth: true
        }
      });
    }
  } catch (error) {
    console.error('Validate invitation error:', error.message);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
};

// Accept invitation
export const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;

    console.log('acceptInvitation called - token:', token, 'userId:', userId);

    if (!token || !userId) {
      return res.status(400).json({ error: 'Token and user ID required' });
    }

    // Find user by Clerk ID
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find invitation by token
    const invitation = await Invitation.findByToken(token);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or invalid' });
    }

    // Check if expired
    if (invitation.isExpired) {
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // Check if already used
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has been ${invitation.status}` });
    }

    // Strict email validation
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      await invitation.incrementAttempts();
      return res.status(403).json({ 
        error: 'This invitation is for a different email address',
        attempts: invitation.attempts
      });
    }

    // Accept invitation
    await invitation.accept();

    // Add user as collaborator to document
    const document = await Document.findById(invitation.docId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if already collaborator
    const existingCollab = document.collaborators.find(
      c => c.userId?.toString() === user._id.toString()
    );

    if (!existingCollab) {
      document.collaborators.push({
        userId: user._id,
        email: user.email,
        permission: invitation.role  // Save as 'viewer' or 'editor'
      });
      await document.save();

      // Notify existing collaborators via socket
      const io = req.app.get('io');
      io.to(document._id.toString()).emit('collaborator-added', {
        userId: user._id,
        email: user.email,
        role: invitation.role
      });
    }

    console.log('Invitation accepted:', {
      invitationId: invitation._id,
      userId: user._id,
      documentId: document._id,
      role: invitation.role
    });

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      role: invitation.role,  // Send role to frontend for TextEditor
      redirectTo: `/documents/${document._id}`
    });
  } catch (error) {
    console.error('Accept invitation error:', error.message);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

// Add this to your invitationController.js

export const updateDocumentPermissions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId; // From auth middleware
    const updates = req.body; // { isPublic, collaborators }

    console.log('updateDocumentPermissions called:', { documentId, userId, updates });

    // Find user by Clerk ID
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user is owner
    if (document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only the owner can update document permissions' });
    }

    // Update isPublic if provided
    if (updates.isPublic !== undefined) {
      document.isPublic = updates.isPublic;
      console.log('Updated isPublic to:', updates.isPublic);
    }

    // Update collaborators if provided
    if (updates.collaborators) {
      document.collaborators = updates.collaborators.map(collab => ({
        userId: collab.userId,
        email: collab.email,
        permission: collab.permission || 'viewer'
      }));
      console.log('Updated collaborators:', document.collaborators.length);
    }

    await document.save();

    res.json({
      success: true,
      message: 'Document permissions updated',
      document: {
        id: document._id,
        isPublic: document.isPublic,
        collaborators: document.collaborators
      }
    });

  } catch (error) {
    console.error('Update document permissions error:', error);
    res.status(500).json({ error: 'Failed to update document permissions' });
  }
};
// Revoke invitation (owner can cancel pending invites)
export const revokeInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.userId; // Clerk ID
    
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }
    
    // Find user
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find invitation
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Check if user is the document owner
    const document = await Document.findById(invitation.docId);
    if (!document || document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only document owner can revoke invitations' });
    }
    
    // Revoke invitation
    await invitation.revoke();
    
    console.log('🚫 Invitation revoked:', {
      invitationId: invitation._id,
      revokedBy: user._id
    });
    
    res.json({
      success: true,
      message: 'Invitation revoked successfully',
      invitation: {
        id: invitation._id,
        status: invitation.status,
        revokedAt: invitation.revokedAt
      }
    });
  } catch (error) {
    console.error('Revoke invitation error:', error.message);
    
    if (error.message.includes('Cannot revoke')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to revoke invitation' });
  }
};

// Get all invitations for a document (owner only)
export const getDocumentInvitations = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId; // Clerk ID
    
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Find user
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is document owner
    const document = await Document.findById(documentId);
    if (!document || document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only document owner can view invitations' });
    }
    
    // Get all invitations for this document
    const invitations = await Invitation.find({ docId: documentId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      invitations: invitations.map(inv => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        acceptedAt: inv.acceptedAt,
        revokedAt: inv.revokedAt,
        invitedBy: inv.invitedBy?.name,
        attempts: inv.attempts,
        isExpired: inv.isExpired,
        isValid: inv.isValid
      }))
    });
  } catch (error) {
    console.error('Get document invitations error:', error.message);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

// Resend invitation (creates new token, marks old as revoked)
export const resendInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.userId;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }
    
    // Find user
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find old invitation
    const oldInvitation = await Invitation.findById(invitationId);
    if (!oldInvitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Check ownership
    const document = await Document.findById(oldInvitation.docId);
    if (!document || document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only document owner can resend invitations' });
    }
    
    // Check rate limit
    const userRateLimit = checkUserRateLimit(user._id.toString());
    if (!userRateLimit.allowed) {
      return res.status(429).json({ 
        error: `Rate limit exceeded. Try again in ${userRateLimit.resetIn} minutes`
      });
    }
    
    // Revoke old invitation
    if (oldInvitation.status === 'pending') {
      await oldInvitation.revoke();
    }
    
    // Create new invitation
    const { invitation, plainToken } = await Invitation.createInvitation({
      docId: oldInvitation.docId,
      email: oldInvitation.email,
      role: oldInvitation.role,
      invitedBy: user._id,
      notes: `Resent invitation (original: ${invitationId})`,
      ip,
      userAgent
    });
    
    // Generate new link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/accept-invite?token=${plainToken}`;
    
    // Send invitation email
    await emailService.sendEmail({
      to: invitation.email,
      subject: `${user.name} sent you another invitation to collaborate on ${document.title}`,
      template: 'invitation',
      context: {
        senderName: user.name,
        documentName: document.title,
        invitationLink: inviteLink,
        recipientEmail: invitation.email,
        companyName: process.env.COMPANY_NAME || 'Our Company',
        companyAddress: process.env.COMPANY_ADDRESS || ''
      }
    });

    console.log('📧 Invitation resent:', {
      oldId: oldInvitation._id,
      newId: invitation._id,
      email: invitation.email
    });
    
    res.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      },
      ...(process.env.NODE_ENV !== 'production' && { inviteLink })
    });
  } catch (error) {
    console.error('Resend invitation error:', error.message);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
};

// Cleanup: Expire old pending invitations (run periodically via cron)
export const cleanupExpiredInvitations = async (req, res) => {
  try {
    const result = await Invitation.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    console.log(`🧹 Expired ${result.modifiedCount} old invitations`);
    
    res.json({
      success: true,
      message: `Expired ${result.modifiedCount} invitations`
    });
  } catch (error) {
    console.error('Cleanup error:', error.message);
    res.status(500).json({ error: 'Failed to cleanup invitations' });
  }
};