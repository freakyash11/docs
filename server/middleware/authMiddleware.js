import { verifyToken } from '@clerk/backend';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,  // Local verification
      authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],  // Match frontend origins
      secretKey: process.env.CLERK_SECRET_KEY  // Fallback if jwtKey fails
    });
    req.userId = payload.sub;  // Attach user ID for route use
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;