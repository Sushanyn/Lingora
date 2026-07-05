import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWords } from '../hooks/useWords';
import type { Word } from '../lib/types';
import WordModal from '../components/WordModal';
import ImportModal from '../components/ImportModal';
import PandaSuggestModal from '../components/PandaSuggestModal';
import './DictionaryView.css';
import { supabase } from '../lib/supabase';
import type { Dictionary } from '../lib/types';

const DictionaryView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { words, loading, error, createWord, bulkCreateWords, updateWord, deleteWord, refreshWords } = useWords(id || '');
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPandaModalOpen, setIsPandaModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch the dictionary details
    const fetchDictionary = async () => {
      if (!id) return;
      const { data, error } = await supabase.from('dictionaries').select('*').eq('id', id).single();
      if (!error && data) {
        setDictionary(data);
      } else {
        navigate('/dictionaries'); // Go back if not found
      }
    };
    fetchDictionary();
    refreshWords();
  }, [id, navigate, refreshWords]);

  const handleOpenCreate = () => {
    setEditingWord(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (word: Word) => {
    setEditingWord(word);
    setIsModalOpen(true);
  };

  const handleDelete = (wordId: string, term: string) => {
    if (window.confirm(`Delete the word "${term}"?`)) {
      deleteWord(wordId);
    }
  };

  const handleSave = (wordData: { term: string; definition: string; example_sentence: string }) => {
    if (editingWord) {
      updateWord(editingWord.id, wordData);
    } else {
      createWord(wordData);
    }
    setIsModalOpen(false);
  };

  const exportToAnki = () => {
    let tsv = '';
    words.forEach(w => {
      // Escape tabs and newlines in data just in case
      const term = w.term.replace(/\t|\n/g, ' ');
      const def = w.definition.replace(/\t|\n/g, ' ');
      const ex = w.example_sentence ? w.example_sentence.replace(/\t|\n/g, ' ') : '';
      tsv += `${term}\t${def}\t${ex}\n`;
    });
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dictionary?.title || 'lingora'}_anki_export.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredWords = words.filter(
    (w) =>
      w.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !dictionary) {
    return <div className="loading-state">Loading dictionary...</div>;
  }

  if (error) {
    return <div className="empty-state">Error: {error}</div>;
  }

  return (
    <div className="dictionary-view-page">
      <button onClick={() => navigate('/dictionaries')} className="back-btn">
        &larr; Back to Dictionaries
      </button>

      <div className="dict-view-header card">
        <div className="dict-view-title-section">
          <span className="dict-lang-badge">{dictionary.target_language.toUpperCase()}</span>
          <h1 className="page-title">{dictionary.title}</h1>
          <p className="page-subtitle">{dictionary.description}</p>
        </div>
        <div className="dict-view-stats">
          <div className="stat-box">
            <span className="stat-number">{words.length}</span>
            <span className="stat-label">Words</span>
          </div>
          <button 
            className="btn-primary practice-btn-large"
            onClick={() => navigate(`/practice/flashcards?dict=${dictionary.id}`)}
            disabled={words.length === 0}
            title={words.length === 0 ? "Add some words first" : "Start Practice"}
          >
            Start Practice
          </button>
        </div>
      </div>

      <div className="words-toolbar">
        <input 
          type="text" 
          placeholder="Search words..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => setIsPandaModalOpen(true)} className="btn-secondary" style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}>
            🐼 Ask Panda
          </button>
          <button onClick={exportToAnki} className="btn-secondary" title="Export to Anki (TXT)">
            Export Anki
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="btn-secondary">
            Import Words
          </button>
          <button onClick={handleOpenCreate} className="btn-primary">
            + Add Word
          </button>
        </div>
      </div>

      <div className="words-table-container card">
        {filteredWords.length === 0 ? (
          <div className="empty-words-state">
            <div className="empty-mascot">🐼</div>
            <p>{searchQuery ? 'No words match your search.' : 'This dictionary is empty.'}</p>
            {!searchQuery && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setIsPandaModalOpen(true)} className="btn-secondary">🐼 Ask Panda for Words</button>
                <button onClick={handleOpenCreate} className="btn-primary">Add your first word</button>
              </div>
            )}
          </div>
        ) : (
          <table className="words-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Definition</th>
                <th>Example Sentence</th>
                <th className="actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((word) => (
                <tr key={word.id}>
                  <td className="font-medium text-primary">{word.term}</td>
                  <td>{word.definition}</td>
                  <td className="text-secondary">{word.example_sentence || '-'}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleOpenEdit(word)} className="action-btn edit-btn" title="Edit">✏️</button>
                    <button onClick={() => handleDelete(word.id, word.term)} className="action-btn delete-btn" title="Delete">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <WordModal 
          initialData={editingWord} 
          targetLanguage={dictionary.target_language}
          nativeLanguage={dictionary.native_language}
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
        />
      )}

      {isImportModalOpen && (
        <ImportModal 
          onClose={() => setIsImportModalOpen(false)}
          onImport={async (parsedWords) => {
            await bulkCreateWords(parsedWords);
          }}
        />
      )}

      {isPandaModalOpen && (
        <PandaSuggestModal 
          targetLanguage={dictionary.target_language}
          nativeLanguage={dictionary.native_language}
          onClose={() => setIsPandaModalOpen(false)}
          onImport={async (newWords) => {
            await bulkCreateWords(newWords);
          }}
        />
      )}
    </div>
  );
};

export default DictionaryView;
