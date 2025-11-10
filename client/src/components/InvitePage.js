import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, RedirectToSignIn, RedirectToSignUp } from '@clerk/clerk-react';

const InvitePage = () => {
  const { token: invitationToken } = useParams();
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  // Stable fetchInvitation with useCallback
  const fetchInvitation = useCallback(async () => {
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
  }, [backendUrl, invitationToken]);

  useEffect(() => {
    if (!invitationToken) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [invitationToken, fetchInvitation]);

  const acceptInvitation = async () => {
    try {
      const jwtToken = await getToken();
      const response = await fetch(`${backendUrl}/api/invite/${invitationToken}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-4">Invitation to Collaborate</h1>
        <p className="text-gray-600 mb-4">
          You've been invited to <strong>{invitation.role}</strong> on "<strong>{invitation.documentTitle}</strong>" by <strong>{invitation.invitedBy}</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-6">This invitation is for {invitation.email}. Expires {new Date(invitation.expiresAt).toLocaleDateString()}.</p>
        
        {!isSignedIn ? (
          <div className="space-y-4">
            <p className="text-gray-600">Sign up or sign in with the invited email to accept.</p>
            <div className="space-y-2">
              <RedirectToSignUp 
                afterSignUpUrl={`/invite/${invitationToken}`} 
                redirectUrl={`/invite/${invitationToken}`} 
              />
              <p className="text-sm text-gray-500">or</p>
              <RedirectToSignIn 
                afterSignInUrl={`/invite/${invitationToken}`} 
                redirectUrl={`/invite/${invitationToken}`} 
              />
            </div>
          </div>
        ) : (
          <>
            {error ? (
              <p className="text-red-600 mb-4">{error}</p>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-500">This invitation is for {invitation.email}. Your email matches.</p>
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
      </div>
    </div>
  );
};

export default InvitePage;