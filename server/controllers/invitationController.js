import Invitation from '../models/Invitation.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { emailService } from '../services/emailService.js';

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

export const createInvitation = async (req, res) => {
  try {
    const { id: documentId } = req.params;
    const { email, role } = req.body;
    const userId = req.userId; // Clerk ID

    console.log('CreateInvitation called - documentId:', documentId, 'Body:', req.body, 'UserId:', userId);

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['viewer', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be viewer or editor' });
    }

    const user = await User.findOne({ clerkId: userId });
    console.log('User query - clerkId:', userId, 'Result:', user ? `Found - DB _id: ${user._id}` : 'Not found');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const document = await Document.findById(documentId);
    console.log('Document query - documentId:', documentId, 'Result:', document ? `Found - ownerId: ${document.ownerId}` : 'Not found');
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.ownerId) {
      console.error('Document has no ownerId!', document);
      return res.status(500).json({ error: 'Document has no owner' });
    }

    // Since ownerId is stored as String in your schema, convert user._id to string for comparison
    const userIdString = user._id.toString();
    
    console.log('Comparing - document.ownerId (string):', document.ownerId, 'user._id.toString():', userIdString);

    // Direct string comparison (no .toString() on document.ownerId since it's already a string)
    if (document.ownerId !== userIdString) {
      return res.status(403).json({ error: 'Only the document owner can send invitations' });
    }

    // Check if user is inviting themselves
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    // Check if already a collaborator
    const existingCollab = document.collaborators.find(
      c => c.email && c.email.toLowerCase() === email.toLowerCase()
    );

    if (existingCollab) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    // Check for existing pending invitation
    const existingInvite = await Invitation.findOne({
      docId: documentId,
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'An invitation is already pending for this email' });
    }

    // Create invitation
    const invitation = await Invitation.create({
      docId: documentId,
      email: email.toLowerCase(),
      role: role,
      invitedBy: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log('Invitation created:', invitation._id);

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        status: invitation.status
      }
    });

  } catch (error) {
    console.error('Create invitation error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
};


export const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const invitation = await Invitation.findByToken(token);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or invalid' });
    }
     
    if (invitation.isExpired) {
      await invitation.save(); 
      return res.status(410).json({ error: 'Invitation has expired' });
    }
    
    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        error: `Invitation has been ${invitation.status}`,
        status: invitation.status
      });
    }
    
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
        requiresAuth: !req.userId 
      }
    });
  } catch (error) {
    console.error('Get invitation error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve invitation' });
  }
};

export const validateInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId; 
    
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
          canAccept: emailMatches 
        }
      });
    } else {
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



export const updateDocumentPermissions = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId; 
    const updates = req.body; 
    console.log('updateDocumentPermissions called:', { documentId, userId, updates });

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only the owner can update document permissions' });
    }

    if (updates.isPublic !== undefined) {
      document.isPublic = updates.isPublic;
      console.log('Updated isPublic to:', updates.isPublic);
    }

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


export const revokeInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.userId;
    
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    const document = await Document.findById(invitation.docId);
    if (!document || document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only document owner can revoke invitations' });
    }
    
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
    const userId = req.userId;
    
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
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
    
      const formattedInvitations = invitations.map(inv => ({
      id: inv._id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
      acceptedBy: inv.acceptedBy 
    }));

    res.json({
      success: true,
      invitations: formattedInvitations,
      document: { 
        isPublic: document.isPublic
      }
    });
  } catch (error) {
    console.error('Get document invitations error:', error.message);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

export const resendInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.userId;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldInvitation = await Invitation.findById(invitationId);
    if (!oldInvitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    const document = await Document.findById(oldInvitation.docId);
    if (!document || document.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Only document owner can resend invitations' });
    }
    
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
    
    const { invitation, plainToken } = await Invitation.createInvitation({
      docId: oldInvitation.docId,
      email: oldInvitation.email,
      role: oldInvitation.role,
      invitedBy: user._id,
      notes: `Resent invitation (original: ${invitationId})`,
      ip,
      userAgent
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/accept-invite?token=${plainToken}`;
    
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