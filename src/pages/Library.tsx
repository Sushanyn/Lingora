import { useLibrary } from '../hooks/useLibrary';
import './Library.css';
import { useNavigate } from 'react-router-dom';

const Library = () => {
  const { publicDictionaries, loading, error, cloneDictionary, isCloning } = useLibrary();
  const navigate = useNavigate();

  if (loading) return <div className="loading-state">Loading library...</div>;
  if (error) return <div className="empty-state">Error: {error}</div>;

  const handleClone = async (id: string) => {
    const success = await cloneDictionary(id);
    if (success) {
      navigate('/dictionaries');
    }
  };

  return (
    <div className="library-page">
      <div className="library-header">
        <div>
          <h1 className="page-title">Community Library</h1>
          <p className="page-subtitle">Discover and clone dictionaries created by other learners.</p>
        </div>
      </div>

      {publicDictionaries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mascot">🐼🌍</div>
          <p>The library is currently empty. Be the first to share a dictionary!</p>
        </div>
      ) : (
        <div className="library-grid">
          {publicDictionaries.map((dict) => (
            <div key={dict.id} className="card library-card">
              <div className="dict-header">
                <span className="dict-lang-badge">{dict.target_language.toUpperCase()}</span>
                <span className="public-badge">🌍 Public</span>
              </div>
              <h2 className="dict-title">{dict.title}</h2>
              <p className="dict-desc">{dict.description || 'No description provided.'}</p>
              
              <div className="library-card-footer">
                <button 
                  onClick={() => handleClone(dict.id)} 
                  className="btn-primary clone-btn"
                  disabled={isCloning}
                >
                  {isCloning ? 'Cloning...' : '📥 Clone to My Dictionaries'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
