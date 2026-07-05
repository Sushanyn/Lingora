import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import stringSimilarity from 'string-similarity';
import { trackEvent } from '../lib/analytics';
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

  // Playing state
  const [words, setWords] = useState<Word[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  
  // Preload TTS voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);
  
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

  const getWordLang = (word: Word) => {
    const dict = dictionaries.find(d => d.id === word.dictionary_id);
    return dict?.target_language || 'en';
  };

  const speak = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(text);
      
      const mapLang = (l: string) => {
        const lower = l.toLowerCase();
        const m: Record<string, string> = {
          'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
          'it': 'it-IT', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN',
          'ru': 'ru-RU', 'pt': 'pt-BR', 'uk': 'uk-UA', 'cs': 'cs-CZ'
        };
        return m[lower] || lower;
      };
      
      const fullLang = mapLang(langCode);
      msg.lang = fullLang;
      msg.rate = 0.85;
      
      const voices = window.speechSynthesis.getVoices();
      const baseLang = fullLang.split('-')[0];
      
      const matchingVoices = voices.filter(v => v.lang.startsWith(baseLang) || v.lang.replace('_', '-').startsWith(baseLang));
      
      if (matchingVoices.length > 0) {
        // Prioritize high-quality, natural-sounding voices
        const premiumVoice = matchingVoices.find(v => 
          v.name.includes('Google') || 
          v.name.includes('Premium') || 
          v.name.includes('Enhanced') ||
          v.name.includes('Siri') ||
          v.name.includes('Natural')
        );
        
        // Fallback to exact region match if no premium voice
        const exactMatch = matchingVoices.find(v => v.lang === fullLang || v.lang.replace('_', '-') === fullLang);
        
        msg.voice = premiumVoice || exactMatch || matchingVoices[0];
      }
      
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
      } else {
        const dictIds = dictionaries.map(d => d.id);
        if (dictIds.length > 0) {
          query = query.in('dictionary_id', dictIds);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
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
    setStartTime(Date.now());
    setPhase('playing');

    // Speak first word after a tiny delay
    setTimeout(() => {
      speak(shuffledWords[0].term, getWordLang(shuffledWords[0]));
    }, 500);
  };

  const cleanStr = (s: string) => 
    s.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .trim()
     .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showFeedback || !inputValue.trim()) return;

    const currentWord = words[currentIdx];
    const sim = stringSimilarity.compareTwoStrings(cleanStr(inputValue), cleanStr(currentWord.term));
    
    // 0.75 allows for minor 1-2 letter typos
    const correct = sim >= 0.75;
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
        speak(words[nextIdx].term, getWordLang(words[nextIdx]));
      }, 300);
    } else {
      updateStreak();
      
      const timeTaken = (Date.now() - startTime) / 1000;
      if (score + (isCorrect ? 1 : 0) === words.length) {
        localStorage.setItem('lingora_perfect', 'true');
      }
      if (timeTaken < 30) {
        localStorage.setItem('lingora_flash', 'true');
      }
      trackEvent('practice_session_completed', { game: 'listening' });
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
              onClick={() => speak(currentWord.term, getWordLang(currentWord))}
              disabled={showFeedback}
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
