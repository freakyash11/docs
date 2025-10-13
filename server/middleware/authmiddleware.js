import { verifyToken } from '@clerk/backend';

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
      secretKey: process.env.CLERK_SECRET_KEY,
      issuer: 'https://ethical-javelin-15.clerk.accounts.dev',  // Your specific dev issuer
      clockSkewInSec: 60  // Increased grace for expiration (1 min)
    });
    console.log('Token verified. Payload:', payload);
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;