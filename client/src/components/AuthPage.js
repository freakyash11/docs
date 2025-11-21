import { SignIn } from '@clerk/clerk-react';

export default function AuthPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-light-bg p-8">
      <div>
        <SignIn
          routing="hash"
          redirectUrl="/dashboard"
          appearance={{
            layout: {
              unsafe_disableDevelopmentModeWarnings: true, // Hides dev mode banner
            },
            variables: {
              // Primary Colors
              colorPrimary: '#3A86FF', // Docsy Blue
              colorBackground: '#FFFFFF',
              colorText: '#2D2D2D', // Slate Ink
              colorInputBackground: '#F1F3F5', // Light input field
              colorInputText: '#2D2D2D',
              
              // Secondary Colors
              colorSuccess: '#6EEB83',
              colorWarning: '#FFBE0B',
              colorDanger: '#FF595E',
              
              // Neutral Colors
              colorTextSecondary: '#6C757D', // Muted text
              colorNeutral: '#ADB5BD',
              
              // Typography
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              fontFamilyButtons: 'Inter, system-ui, -apple-system, sans-serif',
              
              // Spacing & Borders
              borderRadius: '16px',
              spacingUnit: '1rem',
            },
            elements: {
              // Main Card Styling
              card: {
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                borderRadius: '20px',
                padding: '2.5rem',
                border: 'none',
              },
              
              // Header Styling
              headerTitle: {
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                color: '#2D2D2D',
                fontSize: '1.5rem',
              },
              
              headerSubtitle: {
                color: '#6C757D',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              },
              
              // Primary CTA Button
              formButtonPrimary: {
                backgroundColor: '#3A86FF',
                color: '#FFFFFF',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                fontSize: '1rem',
                padding: '0.875rem 1.5rem',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#2A76EF',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(58, 134, 255, 0.3)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              },
              
              // Input Field Styling
              formFieldInput: {
                backgroundColor: '#F1F3F5',
                borderColor: '#D6D6D6',
                borderRadius: '12px',
                color: '#2D2D2D',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: '0.9375rem',
                padding: '0.875rem 1rem',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                '&::placeholder': {
                  color: '#6C757D',
                },
                '&:focus': {
                  borderColor: '#3A86FF',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 0 0 3px rgba(58, 134, 255, 0.1)',
                  outline: 'none',
                },
              },
              
              formFieldLabel: {
                color: '#2D2D2D',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
              },
              
              // Google Sign-In Button
              socialButtonsBlockButton: {
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #D6D6D6',
                borderRadius: '12px',
                color: '#2D2D2D',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                padding: '0.875rem 1.5rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#ADB5BD',
                  backgroundColor: '#F7F9FC',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                },
              },
              
              socialButtonsBlockButtonText: {
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                fontSize: '0.9375rem',
              },
              
              // Divider Styling
              dividerLine: {
                backgroundColor: '#D6D6D6',
                height: '1px',
              },
              
              dividerText: {
                color: '#6C757D',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: '0.8125rem',
                fontWeight: '400',
                padding: '0 1rem',
              },
              
              // Footer Links
              footerActionLink: {
                color: '#3A86FF',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                '&:hover': {
                  color: '#2A76EF',
                  textDecoration: 'underline',
                },
              },
              
              footerActionText: {
                color: '#6C757D',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: '0.875rem',
              },
              
              // Form Container
              form: {
                gap: '1.25rem',
              },
              
              // Identity Preview (Email/Username display)
              identityPreviewText: {
                color: '#6C757D',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              },
              
              // Error Messages
              formFieldErrorText: {
                color: '#FF595E',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: '0.8125rem',
                marginTop: '0.25rem',
              },
              
              // Internal Form Spacing
              main: {
                gap: '1.5rem',
              },
            },
          }}
        />
      </div>
    </div>
  );
}
