import express from 'express';
import http from 'http';
import { Server } from 'socket.io';  // Add this import for Socket.IO
import { createAdapter } from '@socket.io/redis-adapter';  // Add for Redis adapter
import { Redis } from 'ioredis';  // Add for Redis client (supports Render's rediss://)
import setupSocket from './sockets/collab.js';
import connectDB from './config/db.js';
import 'dotenv/config';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// MongoDB connection
await connectDB();
app.use('/api/auth', authRoutes);

// Redis Setup (for sharing Socket.IO sessions/SIDs)
const redis = new Redis(process.env.REDIS_URL);  // REDIS_URL from Render env vars

// Socket.IO Setup with Redis Adapter
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'https://docsy-client.vercel.app/' : 'http://localhost:3000',  // Adjust to your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
  },
  cookie: { secure: true, sameSite: 'lax' }  // Secure for HTTPS on Render
});

// Attach Redis adapter to share SIDs (fixes "Session ID unknown" and enables polling/WS seamlessly)
io.adapter(createAdapter(redis, redis.duplicate()));

// Pass io to your setupSocket function (assuming it handles events/connections)
setupSocket(io);  // Changed to pass io instead of server

app.use('/api/webhooks', webhookRoutes);

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