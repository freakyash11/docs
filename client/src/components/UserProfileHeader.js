import { UserButton, useUser } from '@clerk/react';

export default function UserProfileHeader() {
  const { user, isSignedIn } = useUser();

  if (!isSignedIn) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e9ecef'
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Docsy</h2>
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem' 
      }}>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>
          Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
        </span>
        
        <UserButton 
          appearance={{
            elements: {
              avatarBox: {
                width: '40px',
                height: '40px'
              }
            }
          }}
          userProfileProps={{
            appearance: {
              elements: {
                rootBox: {
                  width: '100%'
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}