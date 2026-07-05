import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getRandomWords } from '../lib/wordLists';
import './DictionaryModal.css';

interface PandaSuggestModalProps {
  targetLanguage: string;
  nativeLanguage: string;
  onClose: () => void;
  onImport: (words: { term: string; definition: string; example_sentence: string }[]) => Promise<void>;
}

export default function PandaSuggestModal({ targetLanguage, nativeLanguage, onClose, onImport }: PandaSuggestModalProps) {
  const [level, setLevel] = useState('A1');
  const [amount, setAmount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get random English words
      const englishWords = getRandomWords(level, amount);
      
      // 2. We need to translate them into the target language and native language.
      // If target language is NOT English, we translate EN -> Target.
      // If native language is NOT English, we translate EN -> Native.
      // To keep it simple, we just call the translate API.
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const newWords: { term: string; definition: string; example_sentence: string }[] = [];

      for (const enWord of englishWords) {
        // Translate to Target Language (term)
        let term = enWord;
        if (!targetLanguage.toLowerCase().startsWith('en')) {
          const resTarget = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ text: enWord, sourceLang: 'EN', targetLang: targetLanguage })
          });
          const dataTarget = await resTarget.json();
          if (resTarget.ok && dataTarget.translatedText) {
            term = dataTarget.translatedText;
          }
        }

        // Translate to Native Language (definition)
        let definition = enWord;
        if (!nativeLanguage.toLowerCase().startsWith('en')) {
          const resNative = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ text: enWord, sourceLang: 'EN', targetLang: nativeLanguage })
          });
          const dataNative = await resNative.json();
          if (resNative.ok && dataNative.translatedText) {
            definition = dataNative.translatedText;
          }
        }

        newWords.push({
          term: term.toLowerCase(),
          definition: definition.toLowerCase(),
          example_sentence: ''
        });
        
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      }

      await onImport(newWords);
      onClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate words');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="card modal-content" style={{ textAlign: 'center' }}>
        <div className="modal-header">
          <h2>🐼 Ask Panda for Words</h2>
          <button type="button" onClick={onClose} className="close-btn" disabled={isLoading}>✖</button>
        </div>

        {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleGenerate} className="modal-form">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Panda will find common words for your level and automatically translate them into {targetLanguage.toUpperCase()} and {nativeLanguage.toUpperCase()}!
          </p>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Language Level (CEFR)</label>
            <select 
              value={level} 
              onChange={(e) => setLevel(e.target.value)} 
              className="dictation-input" 
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={isLoading}
            >
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
            </select>
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Amount of Words</label>
            <select 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))} 
              className="dictation-input"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={isLoading}
            >
              <option value={5}>5 Words</option>
              <option value={10}>10 Words</option>
              <option value={20}>20 Words</option>
            </select>
          </div>

          <div className="modal-footer" style={{ marginTop: '2rem', justifyContent: 'center' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>🐼</div>
                <p>Panda is translating your words...</p>
              </div>
            ) : (
              <button type="submit" className="btn-primary practice-btn-large" style={{ width: '100%' }}>
                Get Magic Words ✨
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}
