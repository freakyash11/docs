import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogIn, FileText, Clock, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react'; // Assuming you have this

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, signIn } = useAuth();
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  // Validate invitation on load
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/invitations/${token}/validate`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to validate invitation');
        }

        setInvitation(data.invitation);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  // Accept invitation
  const handleAcceptInvitation = async () => {
    try {
      setAccepting(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Redirect to document
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      setError(err.message);
      setAccepting(false);
    }
  };

  // Handle login redirect
  const handleLogin = () => {
    // Store the invitation URL to redirect back after login
    localStorage.setItem('inviteRedirect', window.location.pathname);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isEmailMatch = isAuthenticated && user?.email === invitation?.email;
  const canAccept = isAuthenticated && (isEmailMatch || !invitation?.requiresEmailMatch);
  const expiresIn = invitation?.expiresAt 
    ? Math.ceil((new Date(invitation.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Document Invitation
          </h2>
          {invitation?.invitedBy && (
            <p className="text-gray-600">
              {invitation.invitedBy} invited you to collaborate
            </p>
          )}
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-1">
              {invitation?.documentTitle || 'Untitled Document'}
            </h3>
            <p className="text-sm text-gray-600">
              You'll have {invitation?.role} access
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Expires in {expiresIn} days</span>
          </div>

          {isAuthenticated && !isEmailMatch && invitation?.requiresEmailMatch && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                This invitation was sent to {invitation.email}. Please sign in with that email address to accept.
              </p>
            </div>
          )}
        </div>

        {!isAuthenticated ? (
          <button
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Sign in to accept invitation
          </button>
        ) : canAccept ? (
          <button
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Accept Invitation
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => signIn()} // Sign out and sign in with correct email
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Switch Account
          </button>
        )}
      </div>
    </div>
  );
}