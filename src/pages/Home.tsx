import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/useUserStats';
import { useProfile } from '../hooks/useProfile';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { stats, loading } = useUserStats();
  const { profile } = useProfile();
  const [dueWordsCount, setDueWordsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchDueWords = async () => {
      const { count } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .lte('next_review_date', new Date().toISOString());
      setDueWordsCount(count || 0);
    };
    fetchDueWords();
  }, [session]);

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
        <div className="welcome-mascot" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '4rem' }}>🐼</div>
          {profile && profile.current_streak > 0 && (
            <div style={{ marginTop: '0.5rem', background: '#fef3c7', color: '#d97706', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              🔥 {profile.current_streak} Day Streak!
            </div>
          )}
        </div>
      </div>

      {dueWordsCount !== null && dueWordsCount > 0 && (
        <div className="review-banner card" style={{ background: 'linear-gradient(135deg, var(--primary-color), #2563eb)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Time to review!</h3>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>You have <strong>{dueWordsCount} words</strong> waiting to be reviewed across your dictionaries.</p>
          </div>
          <button onClick={() => navigate('/dictionaries')} style={{ background: 'white', color: 'var(--primary-color)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Start Reviewing
          </button>
        </div>
      )}

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
