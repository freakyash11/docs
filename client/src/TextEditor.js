import { useCallback, useEffect, useState, useRef } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams } from "react-router-dom"
import { useAuth } from '@clerk/clerk-react'
import { Share2 } from "lucide-react"
import ShareModal from "./components/ShareModal"  // Import the ShareModal component

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

export default function TextEditor({ role = 'editor' }) {
  const { getToken } = useAuth();
  const { id: documentId } = useParams()
  const [title, setTitle] = useState("Untitled Document")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const titleTimeoutRef = useRef(null)
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()
  const socketRef = useRef(null)
  
  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [permissions, setPermissions] = useState({
    isPublic: false,
    collaborators: [],
    isOwner: false
  })
  const [userRole, setUserRole] = useState("editor") // "viewer" or "editor"

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'

  // Function to update document title via PATCH API
  const updateDocumentTitle = async (newTitle) => {
    try {
      setSaveStatus("saving")
      const token = await getToken()
      
      const response = await fetch(`${backendUrl}/api/documents/${documentId}`, {
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
    const connectSocket = async () => {
      try {
        const token = await getToken()
        const s = io(backendUrl, {
          auth: { token },
          transports: ['websocket'],
          secure: true,
          withCredentials: true,
          path: '/socket.io/',
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 10,
          forceNew: true
        })
        
        s.on('connect', () => console.log('Socket connected successfully!'))
        s.on('connect_error', (err) => {
          console.error('Socket connect error:', err.message)
        })
        s.on('disconnect', (reason) => console.log('Disconnect reason:', reason))
        s.on('error', (err) => console.error('Socket error:', err))
        
        socketRef.current = s
        setSocket(s)
      } catch (error) {
        console.error('Failed to get token or connect socket:', error)
      }
    }
    
    connectSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current)
      }
    }
  }, [getToken, backendUrl])

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", (data) => {
      quill.setContents(data.data);
      if (role === 'viewer') {
        quill.disable();  // Keep disabled for viewer
        quill.setText(data.data || 'Loading...');
      } else {
        quill.enable();
      }
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId, role]);

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", document => {
      quill.setContents(document.data || document)
      if (document.title) {
        setTitle(document.title)
      }
      // Load permissions
      if (document.isOwner !== undefined) {
        setPermissions({
          isPublic: document.isPublic || false,
          collaborators: document.collaborators || [],
          isOwner: document.isOwner
        })
        
        // Set user role based on permissions
        if (document.isOwner) {
          setUserRole("editor")
        } else {
          const userCollab = document.collaborators?.find(c => c.isCurrentUser)
          setUserRole(userCollab?.permission || "viewer")
        }
      }
      quill.enable()
    })

    socket.emit("get-document", documentId)
  }, [socket, quill, documentId])

  // Listen for permission updates from other users
  useEffect(() => {
    if (!socket) return

    const handlePermissionsUpdate = (data) => {
      console.log('Permissions updated:', data)
      
      if (data.updates.isPublic !== undefined) {
        setPermissions(prev => ({ ...prev, isPublic: data.updates.isPublic }))
      }
      
      if (data.updates.collaborators) {
        setPermissions(prev => ({ ...prev, collaborators: data.updates.collaborators }))
        
        // Check if current user's role changed
        const userCollab = data.updates.collaborators.find(c => c.isCurrentUser)
        if (userCollab) {
          setUserRole(userCollab.permission)
          
          // Disable editor if downgraded to viewer
          if (userCollab.permission === "viewer" && quill) {
            quill.disable()
            alert("Your access has been changed to view-only")
          } else if (userCollab.permission === "editor" && quill) {
            quill.enable()
          }
        }
      }
    }

    socket.on("permissions-updated", handlePermissionsUpdate)

    return () => {
      socket.off("permissions-updated", handlePermissionsUpdate)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null || role === 'viewer') return;  // Skip for viewer

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill, role]);

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
    if (socket == null || quill == null || role === 'viewer') return;  // Skip for viewer

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill, role]);

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
          disabled={userRole === "viewer"}
        />
        
        {/* User Role Badge */}
        {userRole === "viewer" && (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
            View Only
          </span>
        )}
        
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
        
        {/* Share Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Editor Container */}
      <div className="container flex-1 overflow-auto" ref={wrapperRef}></div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={documentId}
        currentPermissions={permissions}
        socket={socket}
        getToken={getToken}
        backendUrl={backendUrl}
      />
    </div>
  )
}