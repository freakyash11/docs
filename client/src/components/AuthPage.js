import { SignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for invitation redirect
    const inviteRedirect = localStorage.getItem('inviteRedirect');
    if (inviteRedirect) {
      localStorage.removeItem('inviteRedirect');
      navigate(inviteRedirect);
    }
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div>
        <SignIn
          routing="hash"
          redirectUrl={(params) => {
            // Check if we have a stored invite redirect
            const inviteRedirect = localStorage.getItem('inviteRedirect');
            return inviteRedirect || '/dashboard';
          }}
        />
      </div>
    </div>
  );
}