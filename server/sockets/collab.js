import { Server } from 'socket.io';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { verifyToken } from '@clerk/backend';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

const defaultValue = "";

function setupSocket(server, redis) {
  try {
    console.log('setupSocket called - initializing...');

    const io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? 'https://docsy-client.vercel.app' : [
          "http://localhost:3000",
          "https://docsy-client.vercel.app",
          new RegExp('^https://.*\\.vercel\\.app$')
        ],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      },
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      cookie: { secure: true, sameSite: 'lax' },
      pingInterval: 10000,
      pingTimeout: 60000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6
    });

    io.adapter(createAdapter(redis, redis.duplicate()));
    console.log('Redis adapter attached');

    io.engine.on('connection_error', (err) => {
      console.error('Socket.IO engine error:', err.message);
    });

    io.on("connection", async socket => {
      console.log('New connection established:', socket.id, 'Transport:', socket.conn.transport.name);

      const token = socket.handshake.auth.token;
      console.log('Handshake auth token received:', token ? 'Present' : 'Missing');

      try {
        const payload = await verifyToken(token, {
          jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,
          authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],
          issuer: 'https://ethical-javelin-15.clerk.accounts.dev',
          clockSkewInSec: 60
        });
        socket.userId = payload.sub; // Clerk ID
        console.log('Authenticated user:', socket.userId);
      } catch (error) {
        console.error('Auth failed for socket:', socket.id, 'Error:', error.message);
        socket.disconnect(true);
        return;
      }

      socket.on("disconnect", (reason) => {
        console.log('Disconnected:', socket.id, 'Reason:', reason, 'Transport:', socket.conn.transport.name);
      });
      
      if (socket.userId) {
          console.log('Authenticated user:', socket.userId, 'Role:', socket.userRole || 'unknown');
      }

  socket.on("get-document", async (documentId) => {
    console.log('get-document event from:', socket.userId, 'Role:', socket.userRole);
    try {
      const document = await findOrCreateDocument(documentId);
      socket.join(documentId);
      socket.emit("load-document", {
        data: document.data,
        title: document.title || 'Untitled Document',
        role: socket.userRole || 'owner'  // Emit role to frontend
      });
    } catch {
      console.error('Error loading document for user:', socket.userId, 'Role:', socket.userRole);
      socket.emit("load-document", { error: 'Failed to load document' });
    }
  });

    socket.on("send-changes", (delta) => {
    if (socket.userRole === 'viewer') {
      console.log('Viewer edit attempt blocked:', socket.id);
      return;  // Block for viewer
    }

    console.log('send-changes event from:', socket.id);
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    if (rooms.length > 0) {
      socket.broadcast.to(rooms[0]).emit("receive-changes", delta);
    }
  });

    socket.on("save-document", async (data) => {
    if (socket.userRole === 'viewer') {
      console.log('Blocked save from viewer:', socket.id);
      return;  // Block for viewer
    }
    try {
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    const documentId = rooms[0];  // Assume first room is document ID
    if (!documentId) {
      console.error('No documentId for save - socket rooms:', socket.rooms);
      return;
    }
    await Document.findByIdAndUpdate(documentId, { data });
    console.log('Document saved:', documentId);
    } catch (error) {
      console.error('Save error for user:', socket.userId, 'Role:', socket.userRole, error);
    }
  });

      // Handle permission updates
      socket.on("permissions-updated", (data) => {
        const { documentId, updates } = data;
        
        console.log('Broadcasting permission update for document:', documentId);
        
        // Broadcast to all users in this document room EXCEPT sender
        socket.to(documentId).emit('permissions-updated', {
          documentId,
          updates
        });
        
        console.log('Permission update broadcasted to room:', documentId);
      });

      // Handle token refresh
      socket.on("refresh-token", async (newToken) => {
        try {
          const payload = await verifyToken(newToken, {
            jwtKey: process.env.CLERK_JWT_VERIFICATION_KEY,
            authorizedParties: ['https://docsy-client.vercel.app', 'http://localhost:3000'],
            issuer: 'https://ethical-javelin-15.clerk.accounts.dev',
            clockSkewInSec: 60
          });
          socket.userId = payload.sub;
          console.log('Token refreshed for user:', socket.userId);
        } catch (error) {
          console.error('Token refresh failed:', error.message);
          socket.emit('error', { message: 'Authentication expired. Please refresh the page.' });
        }
      });
    });

    console.log('Socket.IO server initialized successfully');
    return io;
  } catch (error) {
    console.error('setupSocket error:', error.message);
    throw error;
  }
}

// Helper function to check if user has edit permission
function checkEditPermission(document, mongoUserId) {
  // Owner always has edit permission
  if (document.ownerId.toString() === mongoUserId.toString()) {
    return true;
  }

  // Check if user is a collaborator with editor permission
  const collaborator = document.collaborators.find(
    c => c.userId && c.userId.toString() === mongoUserId.toString()
  );

  return collaborator && collaborator.permission === 'editor';
}

async function findOrCreateDocument(id) {
  if (id == null) {
    console.log('findOrCreateDocument called with null ID - returning null');
    return null;
  }

  console.log('findOrCreateDocument called with ID:', id);

  const document = await Document.findById(id);
  if (document) {
    console.log('Existing document found:', id);
    return document;
  }

  console.log('No document found - creating new with ID:', id);
  const newDoc = await Document.create({ _id: id, data: defaultValue });
  console.log('New document created:', newDoc._id);
  return newDoc;
}

export default setupSocket;