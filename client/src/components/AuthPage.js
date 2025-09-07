import { SignIn, SignUp } from '@clerk/clerk-react';

export default function AuthPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div>
        <SignIn routing="hash" />
        <SignUp routing="hash" />
      </div>
    </div>
  );
}