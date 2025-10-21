import { Server } from 'socket.io';
import Document from '../models/Document.js';
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
      transports: ['polling', 'websocket'],  // Polling fallback for Render
      cookie: { secure: true, sameSite: 'lax' },
      pingInterval: 10000,
      pingTimeout: 60000,  // Increased for Render proxy
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
        socket.userId = payload.sub;
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

          const document = await findOrCreateDocument(documentId);
          console.log('Document loaded/created:', document._id, 'Data length:', document.data.length);

          socket.join(documentId);
          console.log('Joined room:', documentId);

          socket.emit("load-document", document.data);
          console.log('Emitted load-document to socket:', socket.id);
        } catch (error) {
          console.error('Error in get-document handler:', error.message, 'Stack:', error.stack);
          socket.emit("load-document", { error: 'Failed to load document' });
        }
      });

      socket.on("send-changes", (delta) => {
        console.log('send-changes received from:', socket.id);
        // Note: documentId must be tracked per socket or from room - assume it's in scope or use socket.rooms
        const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        if (rooms.length > 0) {
          socket.broadcast.to(rooms[0]).emit("receive-changes", delta);
        }
        console.log('Broadcasted receive-changes to room:', rooms[0] || 'unknown');
      });

      socket.on("save-document", async (data) => {
        console.log('save-document received from:', socket.id);
        try {
          // Assume documentId from room or pass it in event
          const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
          const documentId = rooms[0];
          if (documentId) {
            await Document.findByIdAndUpdate(documentId, { data });
            console.log('Document saved:', documentId);
          } else {
            console.log('No documentId for save');
          }
        } catch (error) {
          console.error('Error saving document:', error.message);
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