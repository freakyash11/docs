import express from 'express'
import http from 'http'
import setupSocket from './sockets/collab.js'
import connectDB from './config/db.js'
import 'dotenv/config';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth.js';


const app = express()
const server = http.createServer(app)
// Middleware
app.use(express.json())

// MongoDB connection
await connectDB()
app.use('/api/auth', authRoutes);
// Setup Socket.IO with the HTTP server
setupSocket(server)
app.use('/api/webhooks', webhookRoutes);
// Basic health check route
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})