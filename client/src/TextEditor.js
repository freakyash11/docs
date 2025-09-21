import { useCallback, useEffect, useState, useRef } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams } from "react-router-dom"
import { useAuth } from '@clerk/clerk-react'

const SAVE_INTERVAL_MS = 2000
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]

export default function TextEditor() {
  const { getToken } = useAuth();
  const { id: documentId } = useParams()
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()
  const socketRef = useRef(null);


useEffect(() => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
  
  const connectSocket = async () => {
    try {
      const token = await getToken();  // Assumes this is from Clerk's useAuth hook
      const s = io(backendUrl, {
        auth: { token },  // Passes Clerk JWT for server verification
        transports: process.env.NODE_ENV === 'production' ? ['websocket'] : ['polling', 'websocket'],  // WS-only in prod to fix SID issues on Render
        secure: true,  // Enforce HTTPS for prod
        timeout: 20000,  // Allow time for Render proxy
        reconnection: true,  // Auto-reconnect on drops
        reconnectionAttempts: 5,
        forceNew: true
      });
      
      // Optional: Listen for connect error to log specifics
      s.on('connect_error', (err) => {
        console.error('Socket connect error:', err.message);
      });
      
      socketRef.current = s;  // Store in ref for reliable cleanup
      setSocket(s);  // Still update state for component use
    } catch (error) {
      console.error('Failed to get token or connect socket:', error);
    }
  };
  
  connectSocket();

  // Cleanup: Always disconnect the ref-tracked socket
  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;  // Clear ref to avoid stale refs
    }
  };
}, [useAuth]);
  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", document => {
      quill.setContents(document)
      quill.enable()
    })

    socket.emit("get-document", documentId)
  }, [socket, quill, documentId])

  useEffect(() => {
    if (socket == null || quill == null) return

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents())
    }, SAVE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = delta => {
      quill.updateContents(delta)
    }
    socket.on("receive-changes", handler)

    return () => {
      socket.off("receive-changes", handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return
      socket.emit("send-changes", delta)
    }
    quill.on("text-change", handler)

    return () => {
      quill.off("text-change", handler)
    }
  }, [socket, quill])

  const wrapperRef = useCallback(wrapper => {
    if (wrapper == null) return

    wrapper.innerHTML = ""
    const editor = document.createElement("div")
    wrapper.append(editor)
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    })
    q.disable()
    q.setText("Loading...")
    setQuill(q)
  }, [])
  
  return <div className="container" ref={wrapperRef}></div>
}