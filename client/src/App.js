import TextEditor from "./TextEditor";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import { ClerkProvider } from "@clerk/clerk-react";
import AuthPage from "./components/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from './components/Dashboard';
//comment
// Wrapper component to generate UUID only when the root route is rendered
const NewDocumentRedirect = () => {
  return <Navigate to={`/documents/${uuidV4()}`} replace />;
};

function App() {
  return (
    <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY}>
    <Router>
      <Routes>
       <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
          <Dashboard />
          </Layout>
        </ProtectedRoute>
        } />
        <Route path="/documents/:id" element={
            <ProtectedRoute>
              <Layout>
              <TextEditor />
              </Layout>
            </ProtectedRoute>
          }  />
      </Routes>
    </Router>
    </ClerkProvider>
  );
}

export default App;