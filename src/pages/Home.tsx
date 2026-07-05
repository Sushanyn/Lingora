import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/useUserStats';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { stats, loading } = useUserStats();

  const userEmail = session?.user?.email || 'Language Learner';

  return (
    <div className="home-dashboard">
      <div className="welcome-banner card">
        <div className="welcome-content">
          <h1>Welcome back,</h1>
          <h2 className="welcome-email">{userEmail}</h2>
          <p>Ready to learn some new words today?</p>
          <div className="welcome-actions">
            <button onClick={() => navigate('/dictionaries')} className="btn-primary">
              My Dictionaries
            </button>
            <button onClick={() => navigate('/library')} className="btn-secondary">
              Explore Library
            </button>
          </div>
        </div>
        <div className="welcome-mascot">🐼</div>
      </div>

      <div className="dashboard-stats">
        <h3>Your Progress at a Glance</h3>
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{loading ? '...' : stats.totalDictionaries}</div>
            <div className="stat-label">Dictionaries</div>
          </div>
          
          <div className="stat-card card">
            <div className="stat-icon">📝</div>
            <div className="stat-value">{loading ? '...' : stats.totalWords}</div>
            <div className="stat-label">Total Words</div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">Ready</div>
            <div className="stat-label">Practice Status</div>
          </div>
        </div>
      </div>

      <div className="quick-tips card">
        <h3>💡 Panda's Quick Tips</h3>
        <ul className="tips-list">
          <li><strong>Stay Consistent:</strong> Practice your flashcards for at least 10 minutes every day.</li>
          <li><strong>Use the Library:</strong> Don't want to type words manually? Clone public dictionaries from the Library!</li>
          <li><strong>Auto-Translate:</strong> Remember to use the 🤖 Auto-Translate button when adding new words to save time.</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
