import { verifyToken, createClerkClient } from '@clerk/backend';  // Named imports for latest v4+
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });  // Initialize client

    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,
      authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],
      issuer: 'https://ethical-javelin-15.clerk.accounts.dev',
      clockSkewInSeconds: 10
    });

    const clerkId = payload.sub;

    // Find or create user
    let user = await User.findOne({ clerkId });
    if (!user) {
      // Fetch full user data from Clerk if payload is incomplete
      let fullUser;
      try {
        fullUser = await clerk.users.getUser(clerkId);  // Use initialized client
      } catch (fetchError) {
        console.warn('Failed to fetch full user from Clerk:', fetchError.message);
        fullUser = null;
      }

      const name = fullUser?.firstName && fullUser?.lastName 
        ? `${fullUser.firstName} ${fullUser.lastName}`.trim() 
        : payload.name || 'New User';

      const email = fullUser?.emailAddresses[0]?.emailAddress || payload.email || 'no-email@example.com';

      const inferredProvider = payload.sub.startsWith('user_') ? 'email' : (payload.sub.startsWith('google_') ? 'google' : 'email');

      user = new User({
        clerkId: clerkId,
        name: name,
        email: email,
        emailVerified: fullUser?.emailAddresses[0]?.verification?.status === 'verified' || false,
        provider: inferredProvider,
        profileImage: fullUser?.profileImageUrl || null,
        lastSeen: new Date()
      });

      await user.save();
      console.log('New user created with full data:', clerkId, '- Name:', name, 'Email:', email);
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