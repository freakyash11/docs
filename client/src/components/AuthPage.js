import { SignIn} from '@clerk/clerk-react';

export default function AuthPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div>
        <SignIn routing="hash" />
      </div>
    </div>
  );
}