import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './LoginForm.css';

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Flag to redirect them to the pricing page immediately upon login
        localStorage.setItem('isNewUser', 'true');
        
        // In Supabase, if email confirmation is required, it returns user but session is null.
        // For this demo, let's assume it logs them in or asks for confirmation.
        alert('Successfully registered! Logging you in...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card login-form-card">
      <h2 className="login-title">{isSignUp ? 'Create an Account' : 'Welcome Back!'}</h2>
      {error && <div className="login-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="panda@lingora.com"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn-primary login-btn" disabled={loading}>
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
        </button>
      </form>

      <div className="login-footer">
        <p>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button 
            type="button" 
            className="toggle-auth-mode" 
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
