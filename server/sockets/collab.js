import { Server } from 'socket.io';
import Document from '../models/Document.js';
import { createClerkClient } from '@clerk/backend';  // Updated import for latest Clerk SDK

const defaultValue = "";

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://docsy-client.vercel.app",
        new RegExp('^https://.*\\.vercel\\.app$')
      ],
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    path: '/socket.io'
  });

  io.engine.on('connection_error', (err) => {
    console.log('Socket.IO error:', err.message || err);
  });

  io.on("connection", async socket => {
    console.log('New connection established:', socket.id, 'User agent:', socket.request.headers['user-agent']);

    const token = socket.handshake.auth.token;
    console.log('Handshake auth token received:', token ? 'Present' : 'Missing');

    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });  // Initialize with createClerkClient
      const payload = await clerk.verifyToken(token);
      socket.userId = payload.sub;
      console.log('Authenticated user:', socket.userId);
    } catch (error) {
      console.error('Auth failed for socket:', socket.id, 'Error:', error.message);
      socket.disconnect(true);
      return;
    }

    socket.on("disconnect", (reason) => {
      console.log('Disconnected:', socket.id, 'Reason:', reason);
    });

    socket.on("get-document", async documentId => {
      console.log('get-document event received for ID:', documentId, 'From user:', socket.userId);
      try {
        const document = await findOrCreateDocument(documentId);
        console.log('Document loaded/created:', document._id, 'Data length:', document.data.length);
        socket.join(documentId);
        socket.emit("load-document", document.data);
        console.log('Emitted load-document to socket:', socket.id);
      } catch (error) {
        console.error('Error handling get-document:', error.message);
      }
    });

    socket.on("send-changes", delta => {
      console.log('send-changes received from:', socket.id, 'Delta:', JSON.stringify(delta));
      socket.broadcast.to(documentId).emit("receive-changes", delta);
      console.log('Broadcasted receive-changes to room:', documentId);
    });

    socket.on("save-document", async data => {
      console.log('save-document received from:', socket.id, 'Data length:', data.length);
      try {
        await Document.findByIdAndUpdate(documentId, { data });
        console.log('Document saved:', documentId);
      } catch (error) {
        console.error('Error saving document:', error.message);
      }
    });
  });

  return io;
}

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}

export default setupSocket;