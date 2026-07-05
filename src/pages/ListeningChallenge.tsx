import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import stringSimilarity from 'string-similarity';
import type { Dictionary, Word } from '../lib/types';
import './ListeningChallenge.css';

type Phase = 'setup' | 'playing' | 'results';

export default function ListeningChallenge() {
  const { session } = useAuth();
  const { updateStreak } = useProfile();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('setup');
  
  // Setup state
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [selectedDict, setSelectedDict] = useState<string>('random');
  const [loadingDicts, setLoadingDicts] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('en-US');

  // Playing state
  const [words, setWords] = useState<Word[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  
  // Fetch dictionaries on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchDicts = async () => {
      setLoadingDicts(true);
      const { data } = await supabase
        .from('dictionaries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (data) setDictionaries(data);
      setLoadingDicts(false);
    };
    fetchDicts();
  }, [session?.user?.id]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = language;
      msg.rate = 0.85; // slightly slower for language learners
      window.speechSynthesis.speak(msg);
    } else {
      alert("Text-to-speech is not supported in your browser.");
    }
  };

  const startGame = async () => {
    setSetupError(null);
    let query = supabase.from('words').select('*');
    if (selectedDict !== 'random') {
      query = query.eq('dictionary_id', selectedDict);
      
      const dict = dictionaries.find(d => d.id === selectedDict);
      if (dict) {
        // Map common lang codes to speech synthesis codes
        const mapLang = (l: string) => {
          const m: Record<string, string> = {
            'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
            'it': 'it-IT', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN',
            'ru': 'ru-RU', 'pt': 'pt-BR'
          };
          return m[l.toLowerCase()] || 'en-US';
        };
        setLanguage(mapLang(dict.target_language));
      }
    } else {
      query = query.eq('user_id', session!.user.id);
      setLanguage('en-US'); // Default fallback for random across dictionaries
    }
    
    const { data: dbWords, error } = await query;
      
    if (error || !dbWords || dbWords.length < 3) {
      setSetupError('Not enough words to play. You need at least 3 words.');
      return;
    }

    // Pick 10 random words (or all if less than 10)
    const shuffledWords = [...dbWords].sort(() => 0.5 - Math.random()).slice(0, 10);
    
    setWords(shuffledWords);
    setCurrentIdx(0);
    setScore(0);
    setWrongWords([]);
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);
    setPhase('playing');

    // Speak first word after a tiny delay
    setTimeout(() => {
      speak(shuffledWords[0].term);
    }, 500);
  };

  const cleanStr = (s: string) => s.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showFeedback || !inputValue.trim()) return;

    const currentWord = words[currentIdx];
    const sim = stringSimilarity.compareTwoStrings(cleanStr(inputValue), cleanStr(currentWord.term));
    
    const correct = sim >= 0.85; // stricter than fill-in-the-blank
    setIsCorrect(correct);
    
    if (correct) {
      setScore(s => s + 1);
    } else {
      setWrongWords(prev => [...prev, currentWord]);
    }
    
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentIdx < words.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setInputValue('');
      setShowFeedback(false);
      setIsCorrect(false);
      
      // Speak next word automatically
      setTimeout(() => {
        speak(words[nextIdx].term);
      }, 300);
    } else {
      updateStreak();
      setPhase('results');
    }
  };

  if (phase === 'setup') {
    return (
      <div className="lc-container">
        <div className="lc-header">
          <button onClick={() => navigate('/practice')} className="lc-close-btn">✖ Back to Hub</button>
        </div>
        <div className="lc-card setup-card">
          <div className="setup-icon" style={{fontSize: '4rem'}}>🎧</div>
          <h2>Listening Challenge</h2>
          <p>Train your ear! Listen carefully and type what you hear.</p>

          {setupError && <div className="lc-error">{setupError}</div>}

          <div className="lc-form">
            <label>Select Vocabulary Source</label>
            {loadingDicts ? (
              <div className="lc-loading">Loading dictionaries...</div>
            ) : (
              <select 
                className="lc-select"
                value={selectedDict}
                onChange={(e) => setSelectedDict(e.target.value)}
              >
                <option value="random">🎲 All My Words (Random)</option>
                {dictionaries.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            )}

            <button className="lc-btn-primary" onClick={startGame} disabled={loadingDicts}>
              Start Listening 🎧
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    const currentWord = words[currentIdx];
    const progressPct = ((currentIdx) / words.length) * 100;

    return (
      <div className="lc-container">
        <div className="lc-topbar">
          <div className="lc-progress-wrapper">
            <div className="lc-progress-text">
              <span>Word {currentIdx + 1} of {words.length}</span>
            </div>
            <div className="lc-progress-bar">
              <div className="lc-progress-fill" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
          <button className="lc-quit-btn" onClick={() => setPhase('setup')}>Quit</button>
        </div>

        <div className="lc-card playing-card">
          <div className="lc-player-area">
            <button 
              className="lc-play-btn" 
              onClick={() => speak(currentWord.term)}
              title="Listen again"
            >
              <span className="lc-play-icon">▶️</span>
              Listen
            </button>
            <p className="lc-hint">Hint: "{currentWord.definition}"</p>
          </div>

          <form onSubmit={handleSubmit} className="lc-form-area">
            <input 
              type="text"
              className={`lc-input ${showFeedback ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={showFeedback}
              placeholder="Type the word here..."
              autoFocus
              autoComplete="off"
            />
            {!showFeedback && <button type="submit" className="lc-submit-btn">Check</button>}
          </form>

          {showFeedback && (
            <div className="lc-feedback-area">
              <div className={`lc-message ${isCorrect ? 'correct' : 'incorrect'}`}>
                {isCorrect ? '✅ Perfect!' : '❌ Not quite!'}
              </div>
              
              {!isCorrect && (
                <div className="lc-correction">
                  Correct answer: <strong>{currentWord.term}</strong>
                </div>
              )}
              
              <button className="lc-next-btn" onClick={handleNext} autoFocus>
                {currentIdx < words.length - 1 ? 'Next Word ➔' : 'See Results 🏁'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const pct = Math.round((score / words.length) * 100);
    
    return (
      <div className="lc-container">
        <div className="lc-card results-card">
          <div className="res-emoji bounce-in">🎯</div>
          <h2>Challenge Complete!</h2>
          
          <div className="lc-score-box">
            <div className="lc-score-label">Accuracy</div>
            <div className="lc-score-value">{pct}%</div>
            <div className="lc-score-detail">{score} out of {words.length} correct</div>
          </div>

          {wrongWords.length > 0 && (
            <div className="lc-review-box">
              <h3>Words to Practice Hearing</h3>
              <ul className="lc-wrong-list">
                {wrongWords.map(w => (
                  <li key={w.id}>
                    <strong>{w.term}</strong> — <span>{w.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="lc-actions">
            <button className="lc-btn-primary" onClick={startGame}>
              🔄 Try Again
            </button>
            <button className="lc-btn-secondary" onClick={() => navigate('/practice')}>
              🔙 Back to Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
