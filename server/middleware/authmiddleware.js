import { verifyToken } from '@clerk/backend';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,
      authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],
      issuer: 'https://ethical-javelin-15.clerk.accounts.dev',
      clockSkewInSeconds: 60
    });

    const clerkId = payload.sub;
    console.log('Token verified - clerkId:', clerkId);

    // Find or create user
    let user = await User.findOne({ clerkId });
    if (!user) {
      // Auto-create on first login
      const inferredProvider = payload.sub.startsWith('user_') ? 'email' : (payload.sub.startsWith('google_') ? 'google' : 'email');  // Fixed: Map 'user_' to 'email'

      user = new User({
        clerkId: clerkId,
        name: payload.name || 'New User',
        email: payload.email || 'no-email@example.com',
        emailVerified: payload.email_verified || false,
        provider: inferredProvider,  // Now 'email' for 'user_', 'google' for 'google_'
        lastSeen: new Date()
      });
      await user.save();
      console.log('New user created:', clerkId, '- Provider:', inferredProvider);
    } else {
      user.lastSeen = new Date();
      await user.save();
    }

    req.userId = clerkId;
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;