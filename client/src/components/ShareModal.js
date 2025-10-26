import { useState, useEffect } from "react"
import { X, Mail, Globe, Lock, UserPlus, Check, Trash2, Link2, Copy } from "lucide-react"

export default function ShareModal({ 
  isOpen, 
  onClose, 
  documentId, 
  currentPermissions,
  socket,
  getToken,
  backendUrl 
}) {
  const [isPublic, setIsPublic] = useState(currentPermissions?.isPublic || false)
  const [collaborators, setCollaborators] = useState(currentPermissions?.collaborators || [])
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("viewer")
  const [saveStatus, setSaveStatus] = useState("")
  const [error, setError] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)

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

  // Update local state when props change
  useEffect(() => {
    if (currentPermissions) {
      console.log('🔐 ShareModal received permissions:', currentPermissions) // Debug log
      setIsPublic(currentPermissions.isPublic || false)
      setCollaborators(currentPermissions.collaborators || [])
    }
  }, [currentPermissions])

  // Update permissions on backend
  const updatePermissions = async (updates) => {
    try {
      setSaveStatus("saving")
      setError("")
      const token = await getToken()

      const response = await fetch(`${backendUrl}/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update permissions')
      }

      const data = await response.json()
      
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
      console.error('Update permissions error:', err)
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

  // Add collaborator
  const handleAddCollaborator = async () => {
    if (!newEmail.trim()) {
      setError("Please enter an email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setError("Please enter a valid email address")
      return
    }

    // Check if already exists
    if (collaborators.some(c => c.email === newEmail)) {
      setError("This user is already a collaborator")
      return
    }

    const newCollaborator = {
      email: newEmail.trim(),
      permission: newRole
    }

    const updatedCollaborators = [...collaborators, newCollaborator]
    setCollaborators(updatedCollaborators)
    setNewEmail("")
    setError("")

    try {
      await updatePermissions({ collaborators: updatedCollaborators })
    } catch (err) {
      setCollaborators(collaborators) // Revert on error
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
          {/* Save Status */}
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
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
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
              <button
                onClick={handleAddCollaborator}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

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