import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './DictionaryModal.css';

interface WordModalProps {
  initialData?: { term: string; definition: string; example_sentence?: string | null } | null;
  targetLanguage: string;
  nativeLanguage: string;
  onClose: () => void;
  onSave: (data: { term: string; definition: string; example_sentence: string }) => void;
}

const WordModal = ({ initialData, targetLanguage, nativeLanguage, onClose, onSave }: WordModalProps) => {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [direction, setDirection] = useState<'target-to-native' | 'native-to-target'>('target-to-native');

  useEffect(() => {
    if (initialData) {
      setTerm(initialData.term);
      setDefinition(initialData.definition);
      setExampleSentence(initialData.example_sentence || '');
    }
  }, [initialData]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      if (direction === 'target-to-native') {
        if (!term) return;
        
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {})
          },
          body: JSON.stringify({ text: term, sourceLang: targetLanguage, targetLang: nativeLanguage })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Translation failed');
        
        if (data?.translatedText) {
          setDefinition(data.translatedText);
        } else {
          alert('Could not find translation. Please try manually.');
        }
      } else {
        if (!definition) return;
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {})
          },
          body: JSON.stringify({ text: definition, sourceLang: nativeLanguage, targetLang: targetLanguage })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Translation failed');
        
        if (data?.translatedText) {
          setTerm(data.translatedText);
        } else {
          alert('Could not find translation. Please try manually.');
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Translation error occurred: ' + (err.message || 'Unknown error'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ term, definition, example_sentence: exampleSentence });
  };

  const toggleDirection = () => {
    setDirection(prev => prev === 'target-to-native' ? 'native-to-target' : 'target-to-native');
  };

  const isTranslateDisabled = isTranslating || (direction === 'target-to-native' ? !term : !definition);

  return (
    <div className="modal-overlay">
      <div className="card modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Word' : 'Add New Word'}</h2>
          <button type="button" onClick={onClose} className="close-btn">✖</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <button 
              type="button" 
              onClick={toggleDirection} 
              className="btn-secondary" 
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span style={{ fontWeight: direction === 'target-to-native' ? 700 : 400 }}>{targetLanguage.toUpperCase()}</span>
              <span>⇄</span>
              <span style={{ fontWeight: direction === 'native-to-target' ? 700 : 400 }}>{nativeLanguage.toUpperCase()}</span>
            </button>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Term (Target Language)
              {direction === 'target-to-native' && (
                <button 
                  type="button" 
                  onClick={handleTranslate} 
                  disabled={isTranslateDisabled} 
                  className="btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  {isTranslating ? 'Translating...' : '🤖 Auto-Translate'}
                </button>
              )}
            </label>
            <input 
              type="text" 
              value={term} 
              onChange={(e) => setTerm(e.target.value)} 
              placeholder="e.g. Hola"
              required 
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Definition (Native Language)
              {direction === 'native-to-target' && (
                <button 
                  type="button" 
                  onClick={handleTranslate} 
                  disabled={isTranslateDisabled} 
                  className="btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  {isTranslating ? 'Translating...' : '🤖 Auto-Translate'}
                </button>
              )}
            </label>
            <input 
              type="text" 
              value={definition} 
              onChange={(e) => setDefinition(e.target.value)} 
              placeholder="e.g. Hello"
              required 
            />
          </div>

          <div className="form-group">
            <label>Example Sentence (Optional)</label>
            <textarea 
              value={exampleSentence} 
              onChange={(e) => setExampleSentence(e.target.value)} 
              placeholder="e.g. ¡Hola! ¿Cómo estás?"
              rows={2}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Word</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WordModal;
