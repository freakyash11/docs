import TextEditor from "./TextEditor";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
//import { v4 as uuidV4 } from "uuid";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import AuthPage from "./components/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from './components/Dashboard';
import InvitePage from './components/InvitePage';
import DocsyLanding from './components/LandingPage';
//comment
// Wrapper component to generate UUID only when the root route is rendered
// const NewDocumentRedirect = () => {
//   return <Navigate to={`/documents/${uuidV4()}`} replace />;
// };

function App() {
  return (
    <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY} routing="path">
    <Router>
      <Routes>
        <Route 
            path="/" 
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>

                <SignedOut>
                  <Layout>
                    <DocsyLanding />
                  </Layout>
                </SignedOut>
              </>
            } 
          />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/landing" element={
          <Layout>
            <DocsyLanding />
          </Layout>} />
        <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
          <Dashboard />
          </Layout>
        </ProtectedRoute>
        } />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/documents/:id" element={
            //<ProtectedRoute>
              <Layout>
              <TextEditor />
              </Layout>
            //</ProtectedRoute>
          }  />
      </Routes>
    </Router>
    </ClerkProvider>
  );
}

export default App;