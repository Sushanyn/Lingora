import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Practice from './pages/Practice';
import Dictionaries from './pages/Dictionaries';
import DictionaryView from './pages/DictionaryView';
import Library from './pages/Library';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import ErrorPage from './pages/ErrorPage';
import { useAuth } from './hooks/useAuth';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/auth" element={<Auth />} />

      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } 
        errorElement={<ErrorPage />}
      >
        <Route index element={<Home />} />
        <Route path="dictionaries" element={<Dictionaries />} />
        <Route path="dictionaries/:id" element={<DictionaryView />} />
        <Route path="practice" element={<Practice />} />
        <Route path="library" element={<Library />} />
        <Route path="profile" element={<Profile />} />
        <Route path="pricing" element={<Pricing />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
