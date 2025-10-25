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
  const [title, setTitle] = useState("Untitled Document")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [saveStatus, setSaveStatus] = useState("") // "saving" | "saved" | ""
  const titleTimeoutRef = useRef(null)
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()
  const socketRef = useRef(null);

  // Function to update document title via PATCH API
const updateDocumentTitle = async (newTitle) => {
  try {
    setSaveStatus("saving")
    const token = await getToken()
    
    const response = await fetch(`${backendUrl}/documents/${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title: newTitle })
    })

    if (!response.ok) {
      throw new Error('Failed to update title')
    }

    setSaveStatus("saved")
    setTimeout(() => setSaveStatus(""), 2000)
  } catch (error) {
    console.error('Error updating document title:', error)
    setSaveStatus("")
  }
}

// Debounced title update handler
const handleTitleChange = (e) => {
  const newTitle = e.target.value
  setTitle(newTitle)

  if (titleTimeoutRef.current) {
    clearTimeout(titleTimeoutRef.current)
  }

  titleTimeoutRef.current = setTimeout(() => {
    updateDocumentTitle(newTitle)
  }, 1000)
}

const handleTitleBlur = () => {
  setIsEditingTitle(false)
  if (titleTimeoutRef.current) {
    clearTimeout(titleTimeoutRef.current)
    updateDocumentTitle(title)
  }
}

  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    const connectSocket = async () => {
      try {
        const token = await getToken();  // Assumes this is from Clerk's useAuth hook
        const s = io(backendUrl, {
          auth: { token },  // Passes Clerk JWT for server verification
          transports: ['websocket'],  // WS-only in prod to fix SID issues on Render
          secure: true,
          withCredentials: true,
          path: '/socket.io/',
          timeout: 20000,  // Allow time for Render proxy
          reconnection: true,  // Auto-reconnect on drops
          reconnectionAttempts: 10,
          forceNew: true
        });
        
        s.on('connect', () => console.log('Socket connected successfully!'));
        // Optional: Listen for connect error to log specifics
        s.on('connect_error', (err) => {
          console.error('Socket connect error:', err.message);
        });
        s.on('disconnect', (reason) => console.log('Disconnect reason:', reason));
        s.on('error', (err) => console.error('Socket error:', err));
        s.on('documentLoaded', () => console.log('Initial data received!'));
        s.on('connect_error', (err) => {
        console.error('Socket connect error:', err.message, 'Transport:', err.type);  // Log type (e.g., 'TransportError')
  if (err.type === 'TransportError' && err.description.includes('websocket')) {
    console.log('WS failed - falling back to polling');
  }
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
      if (titleTimeoutRef.current) {
    clearTimeout(titleTimeoutRef.current)
  }
    };
  }, [useAuth]);

  // Token refresh useEffect - add this new useEffect here, after socket connection
  useEffect(() => {
    if (!socket) return;

    const tokenRefreshInterval = setInterval(async () => {
      try {
        const newToken = await getToken();
        socket.emit('refresh-token', newToken);  // Emit to server for optional re-auth
        console.log('Token refreshed and emitted');
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    }, 30000);  // Every 30 seconds

    return () => clearInterval(tokenRefreshInterval);  // Cleanup interval
  }, [socket, getToken]);

  useEffect(() => {
  if (socket == null || quill == null) return

  socket.once("load-document", document => {
    quill.setContents(document.data || document)
    // Add this to load title from server
    if (document.title) {
      setTitle(document.title)
    }
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
     
  return (
  <div className="h-screen flex flex-col">
    {/* Title Bar */}
    <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm">
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        onFocus={() => setIsEditingTitle(true)}
        onBlur={handleTitleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.target.blur()
          }
        }}
        className={`text-xl font-medium border-none outline-none px-3 py-2 rounded-md flex-1 max-w-2xl cursor-text transition-colors ${
          isEditingTitle ? 'bg-gray-100' : 'bg-transparent'
        }`}
        placeholder="Untitled Document"
      />
      {saveStatus === "saving" && (
        <span className="text-sm text-gray-600 font-medium flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          Saving...
        </span>
      )}
      {saveStatus === "saved" && (
        <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
          <span className="text-base">✔</span> Saved
        </span>
      )}
    </div>

    {/* Editor Container */}
    <div className="container flex-1 overflow-auto" ref={wrapperRef}></div>
  </div>
)
}