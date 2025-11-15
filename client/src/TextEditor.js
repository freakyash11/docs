import { useCallback, useEffect, useState, useRef } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from '@clerk/clerk-react'
import { Share2, Globe } from "lucide-react"
import ShareModal from "./components/ShareModal"

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

export default function TextEditor({ role = 'owner' }) {
  const { getToken, isSignedIn } = useAuth();
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Untitled Document");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const titleTimeoutRef = useRef(null);
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const socketRef = useRef(null);
  
  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    isPublic: false,
    collaborators: [],
    isOwner: false
  });
  const [userRole, setUserRole] = useState(null); // Start with null, will be set by server
  const [isPublicDoc, setIsPublicDoc] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  // Handle sign in redirect
  const handleSignInRedirect = () => {
    navigate('/auth');
  };

  // Function to update document title via PATCH API
  const updateDocumentTitle = useCallback(async (newTitle) => {
    if (userRole === "viewer") return;

    try {
      setSaveStatus("saving");
      const token = await getToken();
      
      const response = await fetch(`${backendUrl}/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error('Error updating document title:', error);
      setSaveStatus("");
    }
  }, [userRole, documentId, getToken, backendUrl]);

  // Debounced title update handler
  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    titleTimeoutRef.current = setTimeout(() => {
      updateDocumentTitle(newTitle);
    }, 1000);
  }, [updateDocumentTitle]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
      updateDocumentTitle(title);
    }
  }, [title, updateDocumentTitle]);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        // Try to get token, but don't fail if not authenticated
        let token = null;
        try {
          token = await getToken();
        } catch (err) {
          console.log('No auth token - connecting as guest');
        }

        const s = io(backendUrl, {
          auth: { token: token || '' }, // Send empty string if no token
          transports: ['websocket'],
          secure: true,
          withCredentials: true,
          path: '/socket.io/',
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 10,
          forceNew: true
        });
        
        s.on('connect', () => console.log('Socket connected successfully!'));
        s.on('connect_error', (err) => {
          console.error('Socket connect error:', err.message);
        });
        s.on('disconnect', (reason) => console.log('Disconnect reason:', reason));
        s.on('error', (err) => {
          console.error('Socket error:', err);
          alert(err.message || 'An error occurred');
        });
        
        socketRef.current = s;
        setSocket(s);
      } catch (error) {
        console.error('Failed to connect socket:', error);
      }
    };
    
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, [getToken, backendUrl]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    socket.once("load-document", (data) => {
      console.log('Document loaded with role:', data.role);
      
      // Set role from server response
      setUserRole(data.role);
      setIsPublicDoc(data.isPublic || false);
      
      // Load document content
      quill.setContents(data.data || []);
      
      // Set title from data
      if (data.title) {
        setTitle(data.title);
      }
      
      // Enable/disable editor based on role
      if (data.role === 'viewer') {
        quill.disable();
        console.log('Editor disabled for viewer');
      } else {
        quill.enable();
        console.log('Editor enabled for role:', data.role);
      }
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  // Listen for permission updates from other users
  useEffect(() => {
    if (!socket) return;

    const handlePermissionsUpdate = (data) => {
      console.log('Permissions updated:', data);
      
      if (data.updates.isPublic !== undefined) {
        setPermissions(prev => ({ ...prev, isPublic: data.updates.isPublic }));
      }
      
      if (data.updates.collaborators) {
        setPermissions(prev => ({ ...prev, collaborators: data.updates.collaborators }));
        
        // Check if current user's role changed
        const userCollab = data.updates.collaborators.find(c => c.isCurrentUser);
        if (userCollab) {
          const newRole = userCollab.permission;
          setUserRole(newRole);
          
          // Disable/enable editor based on new role
          if (newRole === "viewer" && quill) {
            quill.disable();
            alert("Your access has been changed to view-only");
          } else if (newRole === "editor" && quill) {
            quill.enable();
            alert("Your access has been changed to editor");
          }
        }
      }
    };

    socket.on("permissions-updated", handlePermissionsUpdate);

    return () => {
      socket.off("permissions-updated", handlePermissionsUpdate);
    };
  }, [socket, quill]);

  // Auto-save interval - only for editors/owners
  useEffect(() => {
    if (socket == null || quill == null || userRole === 'viewer' || !userRole) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill, userRole]);

  // Receive changes from other users
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = delta => {
      quill.updateContents(delta);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  // Send changes to other users - only for editors/owners
  useEffect(() => {
    if (socket == null || quill == null || userRole === 'viewer' || !userRole) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill, userRole]);

  const wrapperRef = useCallback(wrapper => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });
    q.disable();
    q.setText("Loading...");
    setQuill(q);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Guest Banner - Show if user is not signed in and viewing public doc */}
      {!isSignedIn && isPublicDoc && userRole === 'viewer' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Globe className="w-4 h-4" />
            <span>You're viewing this document as a guest.</span>
          </div>
          <button
            onClick={handleSignInRedirect}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign in to collaborate
          </button>
        </div>
      )}

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
              e.target.blur();
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
        {userRole === "editor" && (
          <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
            Editor
          </span>
        )}
        {userRole === "owner" && (
          <span className="px-3 py-1 bg-green-100 text-green-600 text-sm font-medium rounded-full">
            Owner
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
          disabled={userRole === "viewer"}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center">
        <div className="w-full max-w-4xl bg-white shadow-lg my-8 mx-4" ref={wrapperRef}></div>
      </div>
      
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
  );
}