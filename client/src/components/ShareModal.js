import { useState, useEffect } from "react"
import { X, Mail, Globe, Lock, UserPlus, Check, Trash2, Link2} from "lucide-react"

export default function ShareModal({ 
  isOpen, 
  onClose, 
  documentId, 
  currentPermissions,
  socket,
  getToken,
  backendUrl 
}) {
  const [isPublic, setIsPublic] = useState(false)
  const [collaborators, setCollaborators] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("viewer")
  const [saveStatus, setSaveStatus] = useState("")
  const [error, setError] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)

  // Handle resend invitation
  const handleResendInvite = async (inviteId) => {
    try {
      const token = await getToken()
      const response = await fetch(`${backendUrl}/api/invite/${inviteId}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resend invitation')
      }

      const data = await response.json()
      
      setSaveStatus('Invitation resent successfully')
      setTimeout(() => setSaveStatus(''), 3000)

      setPendingInvites(prev => prev.map(invite => 
        invite.id === inviteId 
          ? { ...data.invitation, id: data.invitation.id } 
          : invite
      ))

    } catch (err) {
      console.error('Resend invitation error:', err)
      setError(err.message)
    }
  }

  // Handle revoke invitation
  const handleRevokeInvite = async (inviteId) => {
    try {
      const token = await getToken()
      const response = await fetch(`${backendUrl}/api/invite/revoke/${inviteId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke invitation')
      }

      // Remove from pending invites list immediately
      setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId))
      
      setSaveStatus('Invitation revoked')
      setTimeout(() => setSaveStatus(''), 3000)

      // Notify via socket
      if (socket) {
        socket.emit("invitation-revoked", {
          documentId,
          invitationId: inviteId
        })
      }

    } catch (err) {
      console.error('Revoke invitation error:', err)
      setError(err.message)
    }
  }

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      const documentLink = `${window.location.origin}/documents/${documentId}`
      await navigator.clipboard.writeText(documentLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      setError('Failed to copy link to clipboard')
    }
  }

  // Fetch document permissions when modal opens
  useEffect(() => {
    const fetchDocumentPermissions = async () => {
      if (!isOpen || !documentId) return;
      
      try {
        const token = await getToken();
        const response = await fetch(`${backendUrl}/api/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch document');
        
        const data = await response.json();
        console.log('📄 Document data loaded:', data);
        
        setIsPublic(data.document?.isPublic || false);
        setCollaborators(data.document?.collaborators || []);
      } catch (err) {
        console.error('Fetch document permissions error:', err);
      }
    };

    fetchDocumentPermissions();
  }, [isOpen, documentId, getToken, backendUrl]);

  // Fetch pending invitations when modal opens
  useEffect(() => {
    const fetchPendingInvites = async () => {
      if (!isOpen) return;
      
      try {
        const token = await getToken()
        const response = await fetch(`${backendUrl}/api/invite/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) throw new Error('Failed to fetch invitations')
        
        const data = await response.json()
        
        // Filter only pending invitations (not accepted, not revoked)
        const pending = (data.invitations || []).filter(
          invite => invite.status === 'pending'
        )
        
        console.log('📬 All invitations:', data.invitations?.length);
        console.log('⏳ Pending invitations:', pending.length);
        
        setPendingInvites(pending)
      } catch (err) {
        console.error('Fetch pending invites error:', err)
      }
    }

    fetchPendingInvites()
  }, [isOpen, documentId, getToken, backendUrl])

  // Listen for invitation acceptance via socket to refresh lists
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleCollaboratorAdded = async () => {
      console.log('🔔 Collaborator added - refreshing lists');
      
      // Refetch document permissions to get updated collaborators
      try {
        const token = await getToken();
        const response = await fetch(`${backendUrl}/api/documents/${documentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCollaborators(data.document?.collaborators || []);
        }
        
        // Refetch pending invites
        const inviteResponse = await fetch(`${backendUrl}/api/invite/documents/${documentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          const pending = (inviteData.invitations || []).filter(
            invite => invite.status === 'pending'
          );
          setPendingInvites(pending);
        }
      } catch (err) {
        console.error('Failed to refresh lists:', err);
      }
    };

    socket.on('collaborator-added', handleCollaboratorAdded);

    return () => {
      socket.off('collaborator-added', handleCollaboratorAdded);
    };
  }, [socket, isOpen, documentId, getToken, backendUrl])

  // Update permissions on backend
  const updatePermissions = async (updates) => {
    try {
      setSaveStatus("saving")
      setError("")
      const token = await getToken()

      console.log('🔄 Updating permissions:', updates);
      console.log('📍 URL:', `${backendUrl}/api/invite/document/${documentId}`);

      const response = await fetch(`${backendUrl}/api/invite/document/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Response:', text);
        
        let errorMessage = 'Failed to update permissions';
        try {
          const data = JSON.parse(text);
          errorMessage = data.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json()
      console.log('✅ Permissions updated:', data);
      
      // Notify other collaborators via socket
      if (socket) {
        socket.emit("permissions-updated", {
          documentId,
          updates
        })
      }

      setSaveStatus("saved")
      setTimeout(() => setSaveStatus(""), 2000)
      
      return data
    } catch (err) {
      console.error('❌ Update permissions error:', err)
      setError(err.message)
      setSaveStatus("")
      throw err
    }
  }

  // Toggle public/private
  const handlePublicToggle = async () => {
    const newIsPublic = !isPublic
    setIsPublic(newIsPublic)
    
    try {
      await updatePermissions({ isPublic: newIsPublic })
    } catch (err) {
      setIsPublic(!newIsPublic) // Revert on error
    }
  }

  // Send invitation
  const handleAddCollaborator = async () => {
    if (!newEmail.trim()) {
      setError("Please enter an email address")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setError("Please enter a valid email address")
      return
    }

    if (collaborators.some(c => c.email === newEmail)) {
      setError("This user is already a collaborator")
      return
    }

    setSaveStatus("sending")
    setError("")

    try {
      const token = await getToken()
      const response = await fetch(`${backendUrl}/api/invite/${documentId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send invitation')
      }

      const data = await response.json()
      
      setSaveStatus("sent")
      setNewEmail("")
      
      setPendingInvites(prev => [...prev, data.invitation])
      
      const successMessage = `Invitation sent to ${newEmail} (expires in 7 days)`
      setError("")
      setSaveStatus(successMessage)
      
      setTimeout(() => {
        setSaveStatus("")
      }, 3000)

      if (socket) {
        socket.emit("invitation-sent", {
          documentId,
          invitation: data.invitation
        })
      }

    } catch (err) {
      console.error('Send invitation error:', err)
      setError(err.message)
      setSaveStatus("")
    }
  }

  // Update collaborator role
  const handleUpdateRole = async (email, newPermission) => {
    const updatedCollaborators = collaborators.map(c =>
      c.email === email ? { ...c, permission: newPermission } : c
    )
    setCollaborators(updatedCollaborators)

    try {
      await updatePermissions({ collaborators: updatedCollaborators })
    } catch (err) {
      setCollaborators(collaborators) // Revert on error
    }
  }

  // Remove collaborator
  const handleRemoveCollaborator = async (email) => {
    const updatedCollaborators = collaborators.filter(c => c.email !== email)
    setCollaborators(updatedCollaborators)

    try {
      await updatePermissions({ collaborators: updatedCollaborators })
    } catch (err) {
      setCollaborators(collaborators) // Revert on error
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Share Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Save/Send Status */}
          {saveStatus && (
            <div className="mb-4 flex items-center gap-2 text-sm">
              {saveStatus === "saving" && (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-600">Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Changes saved</span>
                </>
              )}
              {saveStatus === "sending" && (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-600">Sending invitation...</span>
                </>
              )}
              {(saveStatus.includes("sent to") || saveStatus.includes("revoked") || saveStatus.includes("resent")) && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">{saveStatus}</span>
                </>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Public/Private Toggle */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">General Access</h3>
            <button
              onClick={handlePublicToggle}
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="w-5 h-5 text-blue-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-600" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">
                    {isPublic ? "Public" : "Private"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isPublic ? "Anyone with the link can view" : "Only invited people can access"}
                  </p>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out mt-0.5 ${
                  isPublic ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                }`} />
              </div>
            </button>

            {/* Copy Link Button */}
            {isPublic && (
              <button
                onClick={handleCopyLink}
                className="w-full mt-3 flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Link copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Add Collaborator */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Invite People</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddCollaborator()
                      }
                    }}
                    placeholder="Enter email address"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <button
                onClick={handleAddCollaborator}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Send Invitation
              </button>
            </div>
          </div>

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Pending Invitations ({pendingInvites.length})
              </h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {invite.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {invite.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Invited as {invite.role} • Expires in {Math.ceil((new Date(invite.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResendInvite(invite.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Resend invitation"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Revoke invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collaborators List */}
          {collaborators.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                People with access ({collaborators.length})
              </h3>
              <div className="space-y-2">
                {collaborators.map((collaborator, index) => (
                  <div
                    key={collaborator.email || index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {collaborator.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {collaborator.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {collaborator.permission === 'editor' ? 'Can edit' : 'Can view only'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={collaborator.permission || 'viewer'}
                        onChange={(e) => handleUpdateRole(collaborator.email, e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.email)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}