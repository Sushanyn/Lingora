import { useNavigate } from 'react-router-dom';
import './Practice.css';

const PracticeHub = () => {
  const navigate = useNavigate();

  return (
    <div className="practice-page selection-mode">
      <div className="selection-container" style={{ maxWidth: '900px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Training Hub 🏋️</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Choose a training mode to level up your language skills today.</p>
        </div>

        <div className="mode-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          {/* Spaced Repetition */}
          <div className="mode-card card" onClick={() => navigate('/dictionaries')}>
            <div className="mode-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>📇</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Flashcards (SRS)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Review words using our smart Spaced Repetition algorithm. 
              <br/><br/>
              <em>(Select a dictionary from the Library to start)</em>
            </p>
          </div>

          {/* Quiz Mode */}
          <div className="mode-card card" onClick={() => navigate('/quiz')}>
            <div className="mode-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Quiz Mode</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Test your active recall with multiple choice, true/false, and typing challenges.
            </p>
          </div>

          {/* Immersion */}
          <div className="mode-card card" onClick={() => navigate('/immersion')}>
            <div className="mode-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍿</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Immersion</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Watch real YouTube videos featuring your vocabulary words in context.
            </p>
          </div>

          {/* Word Match */}
          <div className="mode-card card" onClick={() => navigate('/practice/match')} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)' }}>
            <div className="mode-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧩</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Word Match <span style={{fontSize:'0.6rem', background:'var(--primary)', color:'#000', padding:'2px 6px', borderRadius:'10px', verticalAlign:'middle'}}>NEW</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              A fast-paced mini-game. Find the matching pairs between terms and definitions.
            </p>
          </div>

          {/* Listening Challenge */}
          <div className="mode-card card" onClick={() => navigate('/practice/listen')} style={{ border: '2px solid rgba(var(--primary-rgb), 0.3)' }}>
            <div className="mode-icon" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Listening Challenge <span style={{fontSize:'0.6rem', background:'var(--primary)', color:'#000', padding:'2px 6px', borderRadius:'10px', verticalAlign:'middle'}}>NEW</span></h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Listen to the pronunciation and type what you hear. Perfect your ear!
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PracticeHub;
