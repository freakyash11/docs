import { verifyToken, createClerkClient } from '@clerk/backend';  // Named imports for latest v4+
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  console.log('Auth middleware called for route:', req.path);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token length:', token.length);
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });  // Initialize client

    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,
      authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],
      issuer: 'https://ethical-javelin-15.clerk.accounts.dev',
      clockSkewInSeconds: 10
    });

    const clerkId = payload.sub;
    console.log('Token verified - clerkId:', clerkId);

    // Find or create user
    let user = await User.findOne({ clerkId });
    if (!user) {
  // Fetch full user data from Clerk if payload is incomplete
  let fullUser;
  try {
    fullUser = await clerk.users.getUser(clerkId);
    console.log('Full user fetched from Clerk:', fullUser ? 'Success' : 'Null');  // Log fetch result
    if (fullUser) {
      console.log('Full user name:', fullUser.firstName, fullUser.lastName);  // Debug name
      console.log('Full user email:', fullUser.emailAddresses?.[0]?.emailAddress);  // Debug email
    }
  } catch (fetchError) {
    console.warn('Failed to fetch full user from Clerk:', fetchError.message);
    fullUser = null;
  }

  // Robust fallback: Prioritize fullUser, then payload, then defaults
  const firstName = fullUser?.firstName || payload.first_name || '';
  const lastName = fullUser?.lastName || payload.last_name || payload.family_name || '';  // family_name as fallback
  const name = `${firstName} ${lastName}`.trim() || payload.name || 'New User';

  const email = fullUser?.emailAddresses?.[0]?.emailAddress || payload.email || 'no-email@example.com';

  const emailVerified = fullUser?.emailAddresses?.[0]?.verification?.status === 'verified' 
    ? true 
    : (payload.email_verified || false);

  const inferredProvider = payload.sub.startsWith('user_') ? 'email' 
    : (payload.sub.startsWith('google_') ? 'google' : 'email');

  const profileImage = fullUser?.profileImageUrl || payload.picture || payload.image_url || null;

  user = new User({
    clerkId: clerkId,
    name: name,
    email: email,
    emailVerified: emailVerified,
    provider: inferredProvider,
    profileImage: profileImage,
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
    console.log('Auth successful - req.userId set:', clerkId);
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;