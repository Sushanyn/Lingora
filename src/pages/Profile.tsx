import { useUserStats } from '../hooks/useUserStats';
import { useAuth } from '../hooks/useAuth';
import './Profile.css';

const Profile = () => {
  const { session, signOut } = useAuth();
  const { stats, loading, error } = useUserStats();

  // Create a fun avatar based on the user's email first letter
  const userEmail = session?.user?.email || 'Student';
  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-header card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-info">
          <h1 className="profile-name">Language Learner</h1>
          <p className="profile-email">{userEmail}</p>
          <span className="profile-badge">Free Plan</span>
        </div>
        <button onClick={signOut} className="btn-secondary sign-out-btn-desktop">
          Sign Out
        </button>
      </div>

      <div className="profile-content">
        <div className="stats-section">
          <h2>Your Learning Statistics</h2>
          
          {loading ? (
            <div className="loading-state">Loading stats...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card card">
                <div className="stat-icon">📚</div>
                <div className="stat-value">{stats.totalDictionaries}</div>
                <div className="stat-label">Dictionaries</div>
              </div>
              
              <div className="stat-card card">
                <div className="stat-icon">📝</div>
                <div className="stat-value">{stats.totalWords}</div>
                <div className="stat-label">Total Words</div>
              </div>

              <div className="stat-card card">
                <div className="stat-icon">🌍</div>
                <div className="stat-value">{stats.publicDictionaries}</div>
                <div className="stat-label">Public (Shared)</div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-section card">
          <h2>Account Settings</h2>
          <p className="text-secondary">More settings coming soon.</p>
          
          <div className="settings-list">
            <div className="setting-item">
              <div>
                <strong>Email Notifications</strong>
                <p>Receive weekly progress reports.</p>
              </div>
              <input type="checkbox" disabled />
            </div>
            <div className="setting-item">
              <div>
                <strong>Dark Mode Default</strong>
                <p>Always start the app in dark mode.</p>
              </div>
              <input type="checkbox" disabled />
            </div>
          </div>
          
          <div className="danger-zone">
            <h3>Danger Zone</h3>
            <button className="btn-danger" onClick={() => alert('This feature is not yet active.')}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
