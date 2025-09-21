import UserProfileHeader from './UserProfileHeader';

export default function Layout({ children }) {
  return (
    <div>
      <UserProfileHeader />
      <main>{children}</main>
    </div>
  );
}