import express from 'express';
import http from 'http';
import { Redis } from 'ioredis';  // Keep Redis import for graceful shutdown
import setupSocket from './sockets/collab.js';
import connectDB from './config/db.js';
import 'dotenv/config';
import cors from 'cors';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documentRoutes.js';


const app = express();
const server = http.createServer(app);

app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://docsy-client.vercel.app',
    new RegExp('^https://.*\\.vercel\\.app$')  // Vercel previews/deployments
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.some(allowed => typeof allowed === 'string' ? allowed === origin : allowed.test(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);  // Respond OK to preflight
  } else {
    next();
  }
});

// Middleware
app.use(express.json());

// MongoDB connection
await connectDB();
app.use('/api/auth', authRoutes);

// Redis Setup (for sharing Socket.IO sessions/SIDs)
const redis = new Redis(process.env.REDIS_URL);  // REDIS_URL from Render env vars

// Socket.IO Setup - now handled entirely in collab.js
const io = setupSocket(server, redis);  // Pass both server and redis instance
console.log('Socket.IO setup completed');

app.use('/api/webhooks', webhookRoutes);
app.use('/api/documents', documentRoutes);
// Basic health check route
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Graceful shutdown for Redis
process.on('SIGTERM', async () => {
  await redis.quit();
  server.close(() => process.exit(0));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});