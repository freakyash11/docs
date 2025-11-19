import { UserButton, useUser } from '@clerk/clerk-react';

export default function UserProfileHeader() {
  const { user, isSignedIn } = useUser();
  const logoSrc = '/logo.png'; 

  // Reusable Logo Component with Tailwind classes
  const Logo = ({ onClick }) => (
    <div 
      className={`flex items-center ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <img 
        src={logoSrc} 
        alt="Docsy Logo" 
        className="h-10 mr-2.5" 
      />
    </div>
  );

  // State: Not Signed In
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-between px-8 py-4 bg-[#f8f9fa] border-b border-[#e9ecef]">
        <Logo />
        <a 
          href="/auth" 
          className="text-sm no-underline text-[#3A86FF] font-medium hover:text-blue-600 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  // State: Signed In
  return (
    <div className="flex items-center justify-between px-8 py-4 bg-[#f8f9fa] border-b border-[#e9ecef]">
      {/* Logo links to dashboard when signed in */}
      <Logo onClick={() => window.location.href = '/dashboard'} />
      
      <div className="flex items-center gap-4">
        <span className="text-sm text-[#666666]">
          Welcome, {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
        </span>
        
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-10 h-10" // Tailwind classes work here in Clerk too
            }
          }}
          userProfileProps={{
            appearance: {
              elements: {
                rootBox: "w-full"
              }
            }
          }}
        />
      </div>
    </div>
  );
}