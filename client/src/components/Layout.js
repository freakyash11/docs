import UserProfileHeader from './UserProfileHeader';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div>
      <UserProfileHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}