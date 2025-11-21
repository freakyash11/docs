import { SignIn } from '@clerk/clerk-react';

export default function AuthPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-light-bg p-8">
      <div>
        <SignIn
          routing="hash"
          redirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: '#3A86FF',
              colorBackground: '#FFFFFF',
              colorText: '#2D2D2D',
              colorInputBackground: '#F1F3F5',
              colorInputText: '#2D2D2D',
              colorSuccess: '#6EEB83',
              colorWarning: '#FFBE0B',
              colorDanger: '#FF595E',
              colorTextSecondary: '#6C757D',
              colorNeutral: '#ADB5BD',
              borderRadius: '0.5rem',
            },
            elements: {
              card: {
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #D6D6D6',
              },
              formButtonPrimary: {
                backgroundColor: '#3A86FF',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#2A76EF',
                },
              },
              formFieldInput: {
                backgroundColor: '#F1F3F5',
                borderColor: '#D6D6D6',
                color: '#2D2D2D',
                '&:focus': {
                  borderColor: '#3A86FF',
                },
              },
              footerActionLink: {
                color: '#3A86FF',
                '&:hover': {
                  color: '#2A76EF',
                },
              },
              formFieldLabel: {
                color: '#2D2D2D',
              },
              identityPreviewText: {
                color: '#6C757D',
              },
              dividerLine: {
                backgroundColor: '#D6D6D6',
              },
              dividerText: {
                color: '#6C757D',
              },
            },
          }}
        />
      </div>
    </div>
  );
}
