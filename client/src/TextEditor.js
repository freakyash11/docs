import { useCallback, useEffect, useState, useRef } from "react"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from '@clerk/clerk-react'
import { Share2, Globe, Lock, Users, Crown, Eye } from "lucide-react"
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

// Utility to generate initials from name
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Utility to generate avatar color from email
function getAvatarColor(email) {
  const colors = ['#3A86FF', '#6EEB83', '#FFBE0B', '#FF595E', '#ADB5BD', '#8B5CF6', '#EC4899', '#10B981'];
  if (!email) return colors[0];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function CollaboratorAvatar({ collaborator, index }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const initials = getInitials(collaborator.name || collaborator.email)
  const color = getAvatarColor(collaborator.email)
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 10 - index }}
    >
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      
      {showTooltip && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-ink text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg z-50">
          <div>{collaborator.name || collaborator.email}</div>
          <div className="text-gray-300 capitalize">{collaborator.permission}</div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-ink rotate-45"></div>
        </div>
      )}
    </div>
  )
}

function CollaboratorAvatars({ collaborators }) {
  const maxVisible = 4
  const visibleCollaborators = collaborators.slice(0, maxVisible)
  const remaining = Math.max(0, collaborators.length - maxVisible)
  
  if (collaborators.length === 0) return null
  
  return (
    <div className="flex items-center">
      {visibleCollaborators.map((collab, index) => (
        <CollaboratorAvatar key={collab.id || collab.email} collaborator={collab} index={index} />
      ))}
      {remaining > 0 && (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-cool-grey text-white ring-2 ring-white"
          style={{ marginLeft: '-8px', zIndex: 10 - maxVisible }}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

function StatusPill({ userRole, isPublic }) {
  const getStatusConfig = () => {
    if (userRole === 'owner') {
      return {
        icon: Crown,
        label: 'Owner',
        bgColor: 'bg-green-50',
        textColor: 'text-soft-green',
        iconColor: 'text-soft-green'
      }
    }
    if (userRole === 'viewer') {
      return {
        icon: Eye,
        label: 'View only',
        bgColor: 'bg-gray-100',
        textColor: 'text-muted-text',
        iconColor: 'text-muted-text'
      }
    }
    if (userRole === 'editor') {
      return {
        icon: Users,
        label: 'Editor',
        bgColor: 'bg-blue-50',
        textColor: 'text-docsy-blue',
        iconColor: 'text-docsy-blue'
      }
    }
    return null
  }
  
  const config = getStatusConfig()
  if (!config) return null
  
  const Icon = config.icon
  
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 ${config.bgColor} rounded-full`}>
        <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      
      {isPublic && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full">
          <Globe className="w-3.5 h-3.5 text-docsy-blue" />
          <span className="text-xs font-medium text-docsy-blue">
            Public
          </span>
        </div>
      )}
      
      {!isPublic && userRole === 'owner' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
          <Lock className="w-3.5 h-3.5 text-muted-text" />
          <span className="text-xs font-medium text-muted-text">
            Private
          </span>
        </div>
      )}
    </div>
  )
}

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [permissions, setPermissions] = useState({
    isPublic: false,
    collaborators: [],
    isOwner: false
  });
  const [userRole, setUserRole] = useState(null); 
  const [isPublicDoc, setIsPublicDoc] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  const handleSignInRedirect = () => {
    navigate('/auth');
  };

  // Fetch collaborators/invitations
  const fetchCollaborators = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/invite/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter for accepted invitations only and map to expected format
        const acceptedCollaborators = (data.invitations || [])
          .filter(inv => inv.status === 'accepted')
          .map(inv => ({
            id: inv.id,
            email: inv.email,
            name: inv.name || inv.email.split('@')[0], // Use email prefix if no name
            permission: inv.role // 'viewer' or 'editor'
          }));
        setCollaborators(acceptedCollaborators);
        
        // Update public status from API response
        if (data.document) {
          setIsPublicDoc(data.document.isPublic);
        }
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  }, [documentId, getToken, backendUrl]);

  useEffect(() => {
    if (documentId && isSignedIn) {
      fetchCollaborators();
    }
  }, [documentId, isSignedIn, fetchCollaborators]);

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
        let token = null;
        try {
          token = await getToken();
        } catch (err) {
          console.log('No auth token - connecting as guest');
        }

        const s = io(backendUrl, {
          auth: { token: token || '' }, 
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
      setUserRole(data.role);
      setIsPublicDoc(data.isPublic || false);
      quill.setContents(data.data || []);
      if (data.title) {
        setTitle(data.title);
      }
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

  useEffect(() => {
    if (!socket) return;

    const handlePermissionsUpdate = (data) => {
      console.log('Permissions updated:', data);
      
      if (data.updates.isPublic !== undefined) {
        setPermissions(prev => ({ ...prev, isPublic: data.updates.isPublic }));
        setIsPublicDoc(data.updates.isPublic);
      }
      
      if (data.updates.collaborators) {
        setPermissions(prev => ({ ...prev, collaborators: data.updates.collaborators }));
        fetchCollaborators(); // Refresh collaborator list
        
        const userCollab = data.updates.collaborators.find(c => c.isCurrentUser);
        if (userCollab) {
          const newRole = userCollab.permission;
          setUserRole(newRole);
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
  }, [socket, quill, fetchCollaborators]);

  useEffect(() => {
    if (socket == null || quill == null || userRole === 'viewer' || !userRole) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill, userRole]);

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
    <div className="h-screen flex flex-col bg-light-bg font-['Inter']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        /* Quill Editor Custom Styling with Docsy Brand */
        .ql-toolbar.ql-snow {
          border: none !important;
          background: #F1F3F5 !important;
          border-radius: 8px !important;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05) !important;
          padding: 12px 16px !important;
          margin-bottom: 24px !important;
          font-family: 'Inter', sans-serif !important;
        }

        .ql-container.ql-snow {
          border: none !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 16px !important;
          line-height: 1.6 !important;
          color: #2D2D2D !important;
        }

        .ql-editor {
          padding: 40px 64px !important;
          min-height: 800px !important;
        }

        .ql-editor h1 {
          font-size: 2.5em !important;
          font-weight: 700 !important;
          margin-bottom: 0.5em !important;
          color: #2D2D2D !important;
        }

        .ql-editor h2 {
          font-size: 2em !important;
          font-weight: 600 !important;
          margin-top: 1em !important;
          margin-bottom: 0.5em !important;
        }

        .ql-editor h3 {
          font-size: 1.5em !important;
          font-weight: 600 !important;
        }

        .ql-editor p {
          margin-bottom: 1em !important;
        }

        .ql-snow .ql-stroke {
          stroke: #6C757D !important;
        }

        .ql-snow .ql-fill {
          fill: #6C757D !important;
        }

        .ql-snow .ql-picker-label {
          color: #6C757D !important;
        }

        .ql-toolbar button:hover,
        .ql-toolbar button:focus {
          background: rgba(58, 134, 255, 0.1) !important;
          border-radius: 4px !important;
        }

        .ql-toolbar button.ql-active {
          background: rgba(58, 134, 255, 0.15) !important;
          border-radius: 4px !important;
        }

        .ql-snow .ql-picker.ql-expanded .ql-picker-label {
          border-color: #3A86FF !important;
        }

        /* Title Input Focus Effect */
        .title-input:focus {
          background: rgba(58, 134, 255, 0.05) !important;
          outline: none !important;
        }
        
        /* Title truncation */
        .title-input {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>

      {/* Guest Banner */}
      {!isSignedIn && isPublicDoc && userRole === 'viewer' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Globe className="w-4 h-4" />
            <span className="font-medium">You're viewing this document as a guest.</span>
          </div>
          <button
            onClick={handleSignInRedirect}
            className="px-5 py-2 bg-docsy-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign in to collaborate
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        {/* Left Section - Title & Status */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Title */}
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
            className={`title-input text-xl font-semibold text-slate-ink border-none px-3 py-1 rounded-md transition-all ${
              isEditingTitle ? 'bg-input-field' : 'bg-transparent hover:bg-gray-50'
            }`}
            placeholder="Untitled Document"
            disabled={userRole === "viewer"}
          />
          
          {/* Status Pills Row */}
          <div className="flex items-center gap-2 px-3">
            <StatusPill userRole={userRole} isPublic={isPublicDoc} />
            
            {/* Save Status */}
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-text font-medium flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-muted-text border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-soft-green font-medium flex items-center gap-1">
                <span className="text-sm">✓</span> Saved
              </span>
            )}
          </div>
        </div>
        
        {/* Right Section - Collaborators & Share Button */}
        <div className="flex items-center gap-3">
          {/* Collaborator Avatars */}
          <CollaboratorAvatars collaborators={collaborators} />
          
          {/* Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            disabled={userRole === "viewer"}
            className="px-4 py-2 bg-docsy-blue text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium disabled:bg-cool-grey disabled:cursor-not-allowed shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-auto bg-light-bg flex justify-center pt-6 pb-12">
        <div 
          className="w-full max-w-5xl h-fit bg-white shadow-lg rounded-lg mx-6 overflow-hidden" 
          ref={wrapperRef}
        ></div>
      </div>
      
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          fetchCollaborators(); // Refresh collaborators when modal closes
        }}
        documentId={documentId}
        currentPermissions={permissions}
        socket={socket}
        getToken={getToken}
        backendUrl={backendUrl}
      />
    </div>
  );
}