import { Navigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

const Auth = () => {
  const { session, loading } = useAuth();

  // If already logged in, redirect to pricing if new user, else dictionaries
  if (session) {
    const isNewUser = localStorage.getItem('isNewUser');
    if (isNewUser) {
      localStorage.removeItem('isNewUser');
      return <Navigate to="/pricing" replace />;
    }
    return <Navigate to="/dictionaries" replace />;
  }

  if (loading) {
    return <div className="auth-loading">Loading...</div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-mascot-section">
          <div className="auth-mascot">🐼</div>
          <h1 className="auth-greeting">Ready to learn?</h1>
          <p className="auth-subtitle">Join Lingora and build your vocabulary today!</p>
        </div>
        
        <div className="auth-form-section">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Auth;
