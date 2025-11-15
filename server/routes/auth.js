import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

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

router.get('/documents', authenticateUser, async (req, res) => {
  try {
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

router.delete('/account', authenticateUser, async (req, res) => {
  try {
    await clerkClient.users.deleteUser(req.user.clerkId);
    await User.findOneAndDelete({ clerkId: req.user.clerkId });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.post('/verify', authenticateUser, async (req, res) => {
  try {
    let user = await User.findOne({ clerkId: req.user.clerkId });
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

router.get('/health', optionalAuth, (req, res) => {
  res.json({
    authSystem: 'operational',
    authenticated: !!req.user,
    user: req.user ? req.user.email : null
  });
});

router.post('/sync', authenticateUser, async (req, res) => {
  try {
    const user = await UserSyncService.syncUserFromClerk(req.user.clerkId);
    res.json({ message: 'User synced', user });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// admin cleanup
router.post('/cleanup-orphaned', async (req, res) => {
  try {
    const count = await UserSyncService.cleanupOrphanedUsers();
    res.json({ message: `Cleaned up ${count} orphaned users` });
  } catch (error) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;