import { verifyToken } from '@clerk/backend';
import User from '../models/User.js';  // Import User model

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

    const clerkId = payload.sub;  // Clerk ID from payload.sub
    console.log('Token verified - clerkId:', clerkId);  // Optional log for debug

    // Find or create user based on clerkId
    let user = await User.findOne({ clerkId });
    if (!user) {
      // Auto-create on first login
      user = new User({
        clerkId: clerkId,
        name: payload.name || 'New User',  // From Clerk payload
        email: payload.email || 'no-email@example.com',
        emailVerified: payload.email_verified || false,  // From payload
        provider: payload.sub.split('_')[0] || 'email',  // Infer from clerkId (e.g., 'user_' -> 'email')
        lastSeen: new Date()
      });
      await user.save();
      console.log('New user created with clerkId:', clerkId);
    } else {
      // Update lastSeen on login
      user.lastSeen = new Date();
      await user.save();
    }

    req.userId = clerkId;  // Attach clerkId for routes
    req.user = user;  // Attach full user object (optional)
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;