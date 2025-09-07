import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get current authenticated user
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.user.clerkId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    res.json({
      id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      provider: user.provider,
      profileImage: user.profileImage,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile (additional data not handled by Clerk)
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    
    const user = await User.findOneAndUpdate(
      { clerkId: req.user.clerkId },
      { name },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user's documents
router.get('/documents', authenticateUser, async (req, res) => {
  try {
    // You'll need to add userId field to Document model
    const documents = await Document.find({ userId: req.user.clerkId });
    
    res.json({
      documents: documents.map(doc => ({
        id: doc._id,
        title: doc.title || 'Untitled Document',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete user account (removes from both Clerk and MongoDB)
router.delete('/account', authenticateUser, async (req, res) => {
  try {
    // Delete from Clerk
    await clerkClient.users.deleteUser(req.user.clerkId);
    
    // Delete from MongoDB
    await User.findOneAndDelete({ clerkId: req.user.clerkId });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Verify user exists in database (useful after webhook sync)
router.post('/verify', authenticateUser, async (req, res) => {
  try {
    let user = await User.findOne({ clerkId: req.user.clerkId });
    
    // If user doesn't exist in DB, create them (fallback)
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(req.user.clerkId);
      
      user = new User({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        provider: clerkUser.externalAccounts?.[0]?.provider || 'email',
        googleId: clerkUser.externalAccounts?.find(acc => acc.provider === 'google')?.providerUserId,
        profileImage: clerkUser.imageUrl,
        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified'
      });
      
      await user.save();
    }

    res.json({
      message: 'User verified',
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Health check for auth system
router.get('/health', optionalAuth, (req, res) => {
  res.json({
    authSystem: 'operational',
    authenticated: !!req.user,
    user: req.user ? req.user.email : null
  });
});

// routes/auth.js - Replace the /verify route
router.post('/sync', authenticateUser, async (req, res) => {
  try {
    const user = await UserSyncService.syncUserFromClerk(req.user.clerkId);
    res.json({ message: 'User synced', user });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// routes/auth.js - Add admin cleanup
router.post('/cleanup-orphaned', async (req, res) => {
  try {
    const count = await UserSyncService.cleanupOrphanedUsers();
    res.json({ message: `Cleaned up ${count} orphaned users` });
  } catch (error) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;