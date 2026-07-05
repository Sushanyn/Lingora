import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDictionaries } from '../hooks/useDictionaries';
import type { Dictionary } from '../lib/types';
import DictionaryModal from '../components/DictionaryModal';
import './Dictionaries.css';

const Dictionaries = () => {
  const navigate = useNavigate();
  const { dictionaries, loading, error, createDictionary, updateDictionary, deleteDictionary } = useDictionaries();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDict, setEditingDict] = useState<Dictionary | null>(null);

  const handleOpenCreate = () => {
    setEditingDict(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, dict: Dictionary) => {
    e.stopPropagation();
    setEditingDict(dict);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteDictionary(id);
    }
  };

  const handleSave = (dictData: { title: string; description: string; target_language: string; native_language: string; is_public: boolean }) => {
    if (editingDict) {
      updateDictionary(editingDict.id, dictData);
    } else {
      createDictionary(dictData);
    }
    setIsModalOpen(false);
  };

  if (loading) {
    return <div className="loading-state">Loading dictionaries...</div>;
  }

  if (error) {
    return <div className="empty-state" style={{color: 'var(--text-primary)'}}>Error: {error}</div>;
  }

  return (
    <div className="dictionaries-page">
      <div className="dictionaries-header">
        <div>
          <h1 className="page-title">My Dictionaries</h1>
          <p className="page-subtitle">Manage your custom vocabularies.</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary create-btn">
          + New Dictionary
        </button>
      </div>

      {dictionaries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-mascot">🐼</div>
          <p>You don't have any dictionaries yet.</p>
          <button onClick={handleOpenCreate} className="btn-primary">Create your first dictionary</button>
        </div>
      ) : (
        <div className="dictionaries-grid">
          {dictionaries.map((dict) => (
            <div 
              key={dict.id} 
              className="card dictionary-card" 
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/dictionaries/${dict.id}`)}
            >
              <div className="dict-header">
                <span className="dict-lang-badge">{dict.target_language.toUpperCase()}</span>
                <div className="dict-actions">
                  <button onClick={(e) => handleOpenEdit(e, dict)} className="action-btn edit-btn" title="Edit">✏️</button>
                  <button onClick={(e) => handleDelete(e, dict.id, dict.title)} className="action-btn delete-btn" title="Delete">🗑️</button>
                </div>
              </div>
              <h2 className="dict-title">{dict.title}</h2>
              <p className="dict-desc">{dict.description}</p>
              <div className="dict-footer">
                <span className="word-count"><strong>{dict.wordCount || 0}</strong> words</span>
                <button 
                  className="btn-primary practice-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/practice?dict=${dict.id}`);
                  }}
                  disabled={!dict.wordCount || dict.wordCount === 0}
                  title={(!dict.wordCount || dict.wordCount === 0) ? "Add some words first" : "Practice"}
                >
                  Practice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <DictionaryModal 
          initialData={editingDict}
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
};

export default Dictionaries;
