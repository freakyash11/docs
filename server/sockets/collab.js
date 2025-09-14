import { Server } from 'socket.io'
import Document from '../models/Document.js'

const defaultValue = ""

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://docsy-client.vercel.app",
        new RegExp('^https://.*\\.vercel\\.app$')  // Proper RegExp to match any Vercel subdomain (e.g., your full frontend URL)
      ],
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],  // Add if using auth headers
      credentials: true  // Enable if your app uses cookies/sessions; otherwise, set to false
    },
    path: '/socket.io'
  })

  io.on("connection", async socket => {
    const token = socket.handshake.auth.token;
  
  try {
    const payload = await clerkClient.verifyToken(token);
    socket.userId = payload.sub;
  } catch (error) {
    socket.disconnect();
    return;
  }
    socket.on("get-document", async documentId => {
      const document = await findOrCreateDocument(documentId)
      socket.join(documentId)
      socket.emit("load-document", document.data)

      socket.on("send-changes", delta => {
        socket.broadcast.to(documentId).emit("receive-changes", delta)
      })

      socket.on("save-document", async data => {
        await Document.findByIdAndUpdate(documentId, { data })
      })
    })
  })

  return io
}

async function findOrCreateDocument(id) {
  if (id == null) return

  const document = await Document.findById(id)
  if (document) return document
  return await Document.create({ _id: id, data: defaultValue })
}

export default setupSocket