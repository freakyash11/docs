import { verifyToken } from '@clerk/backend';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,  // Local dev verification
      authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],  // Match frontend origins
      issuer: 'https://clerk.dev',  // Dev issuer; check jwt.io if different (e.g., 'https://your-instance.clerk.accounts.dev')
      clockSkewInSec: 10  // Grace for timing issues
    });
    console.log('Dev token verified. Payload:', payload);  // Log for debug
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error('Dev token error:', error.message, 'Token snippet:', token.substring(0, 20) + '...');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;