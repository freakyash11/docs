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

      socket.on("get-document", async (documentId) => {
        console.log('get-document event received for ID:', documentId, 'From user:', socket.userId);
        try {
          if (!documentId) {
            console.log('No documentId provided - emitting error');
            socket.emit("load-document", { error: 'No document ID provided' });
            return;
          }

          // Find user by Clerk ID
          const user = await User.findOne({ clerkId: socket.userId });
          if (!user) {
            console.log('User not found for Clerk ID:', socket.userId);
            socket.emit("load-document", { error: 'User not found' });
            return;
          }
          const mongoUserId = user._id;

          // Load document with populated fields
          const document = await Document.findById(documentId)
            .populate('ownerId', 'name email')
            .populate('collaborators.userId', 'name email');

          if (!document) {
            console.log('Document not found:', documentId);
            socket.emit("load-document", { error: 'Document not found' });
            return;
          }

          // Check permissions
          const isOwner = document.ownerId._id.toString() === mongoUserId.toString();
          const collaborator = document.collaborators.find(
            c => c.userId && c.userId._id.toString() === mongoUserId.toString()
          );
          const hasAccess = isOwner || collaborator || document.isPublic;

          if (!hasAccess) {
            console.log('User does not have access to document:', documentId);
            socket.emit("load-document", { error: 'Access denied' });
            return;
          }

          // Determine user role
          let userPermission = 'viewer';
          if (isOwner) {
            userPermission = 'editor';
          } else if (collaborator) {
            userPermission = collaborator.permission;
          } else if (document.isPublic) {
            userPermission = 'viewer';
          }

          console.log('Document loaded:', document._id, 'User role:', userPermission);

          socket.join(documentId);
          console.log('Joined room:', documentId);

          // Send document with permissions
          socket.emit("load-document", {
            data: document.data,
            title: document.title,
            isPublic: document.isPublic,
            isOwner,
            collaborators: document.collaborators.map(c => ({
              name: c.userId?.name,
              email: c.userId?.email || c.email,
              permission: c.permission,
              isCurrentUser: c.userId?._id.toString() === mongoUserId.toString()
            })),
            userPermission
          });
          console.log('Emitted load-document with permissions to socket:', socket.id);
        } catch (error) {
          console.error('Error in get-document handler:', error.message, 'Stack:', error.stack);
          socket.emit("load-document", { error: 'Failed to load document' });
        }
      });

      socket.on("send-changes", async (delta) => {
        console.log('send-changes received from:', socket.id);
        try {
          const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
          const documentId = rooms[0];

          if (!documentId) {
            console.log('No documentId found for send-changes');
            return;
          }

          // Find user and document to check permissions
          const user = await User.findOne({ clerkId: socket.userId });
          if (!user) {
            console.log('User not found for changes');
            return;
          }

          const document = await Document.findById(documentId);
          if (!document) {
            console.log('Document not found for changes');
            return;
          }

          // Check edit permission
          const hasEditPermission = checkEditPermission(document, user._id);
          if (!hasEditPermission) {
            console.log('User does not have edit permission:', socket.userId);
            socket.emit('error', { message: 'You do not have permission to edit this document' });
            return;
          }

          // Broadcast changes to others in the room
          socket.broadcast.to(documentId).emit("receive-changes", delta);
          console.log('Broadcasted receive-changes to room:', documentId);
        } catch (error) {
          console.error('Error in send-changes handler:', error.message);
        }
      });

      socket.on("save-document", async (data) => {
        console.log('save-document received from:', socket.id);
        try {
          const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
          const documentId = rooms[0];

          if (!documentId) {
            console.log('No documentId for save');
            return;
          }

          // Find user and check permissions
          const user = await User.findOne({ clerkId: socket.userId });
          if (!user) {
            console.log('User not found for save');
            return;
          }

          const document = await Document.findById(documentId);
          if (!document) {
            console.log('Document not found for save');
            return;
          }

          // Check edit permission
          const hasEditPermission = checkEditPermission(document, user._id);
          if (!hasEditPermission) {
            console.log('User does not have permission to save:', socket.userId);
            socket.emit('error', { message: 'You do not have permission to edit this document' });
            return;
          }

          // Save document
          await Document.findByIdAndUpdate(documentId, { 
            data,
            lastModifiedBy: user._id
          });
          console.log('Document saved:', documentId);
        } catch (error) {
          console.error('Error saving document:', error.message);
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