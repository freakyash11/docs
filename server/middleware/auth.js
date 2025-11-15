import { clerkClient } from '@clerk/clerk-sdk-node';

// Middleware to verify Clerk JWT tokens
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token with Clerk
    const payload = await clerkClient.verifyToken(token);
    
    // Get user info from Clerk
    const user = await clerkClient.users.getUser(payload.sub);
    
    // Attach user info to request object
    // middleware/auth.js - Update authenticateUser function
    req.user = await UserSyncService.getOrCreateUser(payload.sub);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional: Middleware for optional authentication (user can be null)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const payload = await clerkClient.verifyToken(token);
    const user = await clerkClient.users.getUser(payload.sub);
    
    // middleware/auth.js - Update authenticateUser function
    req.user = await UserSyncService.getOrCreateUser(payload.sub);

    next();
  } catch (error) {
    // If token is invalid, continue without user
    req.user = null;
    next();
  }
};

export { authenticateUser, optionalAuth };