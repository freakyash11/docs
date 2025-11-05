import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';

const InvitePage = () => {
  const { token: invitationToken } = useParams();  // Invitation token from URL
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!invitationToken) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [invitationToken]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/invite/${invitationToken}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invitation');
      }

      setInvitation(data.invitation);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    try {
      const jwtToken = await getToken();  // JWT for Authorization header
      const response = await fetch(`${backendUrl}/api/invite/${invitationToken}/accept`, {  // invitationToken in URL
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`  // JWT in header
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      console.log('Invitation accepted:', data);
      navigate(data.redirectTo || '/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading invitation...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="bg-blue-500 text-white px-4 py-2 rounded">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return <div className="flex justify-center items-center h-screen">Invitation not found</div>;
  }

  return (
    <div className="min-h-screens flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-4">Invitation to Collaborate</h1>
        <p className="text-gray-600 mb-4">You've been invited to {invitation.role} on "{invitation.documentTitle}" by {invitation.invitedBy}.</p>
        
        {!isSignedIn ? (
          <RedirectToSignIn afterSignInUrl={`/invite/${invitationToken}`} />
        ) : (
          <>
            {error ? (
              <p className="text-red-600 mb-4">{error}</p>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-500">This invitation is for {invitation.email}.</p>
              </div>
            )}
            <button
              onClick={acceptInvitation}
              disabled={!!error}
              className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Accept Invitation
            </button>
          </>
        )}
        
        <div className="text-center mt-6 text-sm text-gray-500">
          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default InvitePage;