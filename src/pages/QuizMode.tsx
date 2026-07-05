import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import stringSimilarity from 'string-similarity';
import { trackEvent } from '../lib/analytics';
import type { Dictionary, Word } from '../lib/types';
import './QuizMode.css';

type QuizPhase = 'setup' | 'playing' | 'results';
type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';
type MixedQuestionType = QuestionType | 'mixed';

interface Question {
  id: string;
  type: QuestionType;
  word: Word;
  // For multiple choice
  options?: string[]; // definitions
  correctOptionIdx?: number;
  // For true/false
  tfDefinition?: string;
  isTrue?: boolean;
}

export default function QuizMode() {
  const { session } = useAuth();
  const { updateStreak } = useProfile();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<QuizPhase>('setup');
  
  // Setup state
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [selectedDict, setSelectedDict] = useState<string>('');
  const [selectedType, setSelectedType] = useState<MixedQuestionType>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [loadingDicts, setLoadingDicts] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Playing state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  // Question interaction state
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [tfSelected, setTfSelected] = useState<boolean | null>(null);
  const [fillValue, setFillValue] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Fetch dictionaries on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchDicts = async () => {
      setLoadingDicts(true);
      const { data, error } = await supabase
        .from('dictionaries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setDictionaries(data);
      }
      setLoadingDicts(false);
    };
    fetchDicts();
  }, [session?.user?.id]);

  // Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === 'playing') {
      timer = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, startTime]);

  const generateQuiz = async () => {
    if (!selectedDict) {
      setSetupError('Please select a dictionary first.');
      return;
    }
    
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
    
    const { data: words, error } = await query;
      
    if (error || !words || words.length < 4) {
      setSetupError('Not enough words in this dictionary to generate a quiz (minimum 4 required).');
      return;
    }

    // Shuffle and pick requested number
    const shuffledWords = [...words].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledWords.slice(0, Math.min(questionCount, words.length));
    
    const allDefs = words.map(w => w.definition);

    const generatedQs: Question[] = selectedWords.map((word, idx) => {
      // Determine actual type for this question if mixed
      const qType: QuestionType = selectedType === 'mixed' 
        ? ['multiple_choice', 'true_false', 'fill_blank'][Math.floor(Math.random() * 3)] as QuestionType
        : selectedType;

      const q: Question = { id: `q_${idx}`, type: qType, word };

      if (qType === 'multiple_choice') {
        const otherDefs = allDefs.filter(d => d !== word.definition).sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [...otherDefs, word.definition].sort(() => 0.5 - Math.random());
        q.options = options;
        q.correctOptionIdx = options.indexOf(word.definition);
      } else if (qType === 'true_false') {
        const isTrue = Math.random() > 0.5;
        if (isTrue) {
          q.tfDefinition = word.definition;
          q.isTrue = true;
        } else {
          const wrongDef = allDefs.filter(d => d !== word.definition)[Math.floor(Math.random() * (allDefs.length - 1))];
          q.tfDefinition = wrongDef;
          q.isTrue = false;
        }
      }
      return q;
    });

    setQuestions(generatedQs);
    setCurrentQIdx(0);
    setScore(0);
    setAnswers([]);
    setStartTime(Date.now());
    setElapsedTime(0);
    resetInteractionState();
    setPhase('playing');
  };

  const resetInteractionState = () => {
    setMcqSelected(null);
    setTfSelected(null);
    setFillValue('');
    setShowFeedback(false);
    setIsCorrect(false);
  };

  const cleanStr = (s: string) => 
    s.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .trim()
     .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

  const handleMCQAnswer = (idx: number) => {
    if (showFeedback) return;
    const q = questions[currentQIdx];
    const correct = idx === q.correctOptionIdx;
    setMcqSelected(idx);
    setIsCorrect(correct);
    finalizeAnswer(correct);
  };

  const handleTFAnswer = (val: boolean) => {
    if (showFeedback) return;
    const q = questions[currentQIdx];
    const correct = val === q.isTrue;
    setTfSelected(val);
    setIsCorrect(correct);
    finalizeAnswer(correct);
  };

  const handleFillSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (showFeedback || !fillValue.trim()) return;
    const q = questions[currentQIdx];
    const sim = stringSimilarity.compareTwoStrings(cleanStr(fillValue), cleanStr(q.word.term));
    const correct = sim >= 0.75;
    setIsCorrect(correct);
    finalizeAnswer(correct);
  };

  const finalizeAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setAnswers([...answers, isCorrect]);
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
      resetInteractionState();
    } else {
      updateStreak();
      
      const timeTaken = (Date.now() - startTime) / 1000;
      if (score + (isCorrect ? 1 : 0) === questions.length) {
        localStorage.setItem('lingora_perfect', 'true');
      }
      if (timeTaken < 30) {
        localStorage.setItem('lingora_flash', 'true');
      }
      trackEvent('practice_session_completed', { game: 'quiz' });
      setPhase('results');
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // --- RENDERS ---

  if (phase === 'setup') {
    return (
      <div className="quiz-container">
        <div className="quiz-header" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
          <button onClick={() => navigate('/practice')} className="quit-btn" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer' }}>
            ✖ Back to Hub
          </button>
        </div>
        <div className="quiz-card setup-card">
          <div className="setup-header">
            <span className="setup-icon">🧠</span>
            <h2>Quiz Mode</h2>
            <p>Test your knowledge and strengthen your memory.</p>
          </div>

          {setupError && <div className="quiz-error">{setupError}</div>}

          <div className="setup-form">
            <div className="form-group">
              <label>Select Dictionary</label>
              {loadingDicts ? (
                <div className="quiz-loading">Loading dictionaries...</div>
              ) : dictionaries.length === 0 ? (
                <div className="quiz-error">You don't have any dictionaries yet.</div>
              ) : (
                <select 
                  className="quiz-select"
                  value={selectedDict}
                  onChange={(e) => setSelectedDict(e.target.value)}
                >
                  <option value="" disabled>-- Choose a dictionary --</option>
                  <option value="random">🎲 All My Words (Random)</option>
                  {dictionaries.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Quiz Type</label>
              <div className="type-options">
                {[
                  { id: 'multiple_choice', label: 'Options', icon: '📝' },
                  { id: 'true_false', label: 'True/False', icon: '✅' },
                  { id: 'fill_blank', label: 'Typing', icon: '⌨️' },
                  { id: 'mixed', label: 'Mixed', icon: '🔀' }
                ].map(t => (
                  <button 
                    key={t.id}
                    className={`type-btn ${selectedType === t.id ? 'active' : ''}`}
                    onClick={() => setSelectedType(t.id as MixedQuestionType)}
                  >
                    <span className="type-icon">{t.icon}</span>
                    <span className="type-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Number of Questions: {questionCount}</label>
              <input 
                type="range" 
                min="5" 
                max="30" 
                step="5" 
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="quiz-slider"
              />
              <div className="slider-marks">
                <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
              </div>
            </div>

            <button 
              className="start-quiz-btn" 
              onClick={generateQuiz}
              disabled={!selectedDict || dictionaries.length === 0}
            >
              🚀 Start Challenge
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    const q = questions[currentQIdx];
    const progressPct = ((currentQIdx) / questions.length) * 100;

    return (
      <div className="quiz-container">
        <div className="quiz-topbar">
          <div className="quiz-progress-wrapper">
            <div className="quiz-progress-text">
              <span>Question {currentQIdx + 1} of {questions.length}</span>
              <span className="quiz-timer">⏱ {formatTime(elapsedTime)}</span>
            </div>
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
          <button className="quit-btn" onClick={() => setPhase('setup')}>Quit</button>
        </div>

        <div className="quiz-card playing-card">
          
          {/* MULTIPLE CHOICE */}
          {q.type === 'multiple_choice' && (
            <div className="mcq-container">
              <div className="q-badge">Translate</div>
              <h2 className="q-term">{q.word.term}</h2>
              <div className="mcq-options">
                {q.options?.map((opt, i) => {
                  let statusClass = '';
                  if (showFeedback) {
                    if (i === q.correctOptionIdx) statusClass = 'correct';
                    else if (i === mcqSelected) statusClass = 'incorrect';
                    else statusClass = 'dimmed';
                  }
                  
                  return (
                    <button 
                      key={i} 
                      className={`mcq-opt ${statusClass}`}
                      onClick={() => handleMCQAnswer(i)}
                      disabled={showFeedback}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TRUE FALSE */}
          {q.type === 'true_false' && (
            <div className="tf-container">
              <div className="q-badge">True or False?</div>
              <h2 className="q-term">{q.word.term}</h2>
              <div className="tf-means">means</div>
              <h3 className="q-def">"{q.tfDefinition}"</h3>
              
              <div className="tf-actions">
                <button 
                  className={`tf-btn true ${showFeedback ? (q.isTrue ? 'correct' : (tfSelected === true ? 'incorrect' : 'dimmed')) : ''}`}
                  onClick={() => handleTFAnswer(true)}
                  disabled={showFeedback}
                >
                  <span className="tf-icon">👍</span> True
                </button>
                <button 
                  className={`tf-btn false ${showFeedback ? (!q.isTrue ? 'correct' : (tfSelected === false ? 'incorrect' : 'dimmed')) : ''}`}
                  onClick={() => handleTFAnswer(false)}
                  disabled={showFeedback}
                >
                  <span className="tf-icon">👎</span> False
                </button>
              </div>
            </div>
          )}

          {/* FILL BLANK */}
          {q.type === 'fill_blank' && (
            <div className="fb-container">
              <div className="q-badge">Type the word</div>
              <h3 className="q-def-large">"{q.word.definition}"</h3>
              
              <form onSubmit={handleFillSubmit} className="fb-form">
                <input 
                  type="text"
                  className={`fb-input ${showFeedback ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
                  value={fillValue}
                  onChange={e => setFillValue(e.target.value)}
                  disabled={showFeedback}
                  placeholder="Type the original word..."
                  autoFocus
                  autoComplete="off"
                />
                {!showFeedback && <button type="submit" className="fb-submit">Check</button>}
              </form>
              
              {showFeedback && !isCorrect && (
                <div className="fb-correction">
                  Correct answer: <strong>{q.word.term}</strong>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Next Button appearing at bottom when feedback shown */}
        {showFeedback && (
          <div className="quiz-bottom-actions">
            <div className={`feedback-msg ${isCorrect ? 'right' : 'wrong'}`}>
              {isCorrect ? '✨ Awesome!' : '❌ Not quite!'}
            </div>
            <button className="next-q-btn" onClick={handleNext} autoFocus>
              {currentQIdx < questions.length - 1 ? 'Next Question ➔' : 'See Results 🏁'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'results') {
    const pct = Math.round((score / questions.length) * 100);
    let emoji = '🐼';
    if (pct >= 90) emoji = '🏆';
    else if (pct >= 70) emoji = '🎉';
    else if (pct >= 50) emoji = '💪';

    const wrongQs = questions.filter((_, i) => !answers[i]);

    return (
      <div className="quiz-container">
        <div className="quiz-card results-card">
          <div className="res-emoji bounce-in">{emoji}</div>
          <h2 className="res-title">Quiz Complete!</h2>
          
          <div className="res-stats">
            <div className="res-stat-box">
              <div className="rs-val">{score}/{questions.length}</div>
              <div className="rs-lbl">Score</div>
            </div>
            <div className="res-stat-box highlight">
              <div className="rs-val">{pct}%</div>
              <div className="rs-lbl">Accuracy</div>
            </div>
            <div className="res-stat-box">
              <div className="rs-val">{formatTime(elapsedTime)}</div>
              <div className="rs-lbl">Time</div>
            </div>
          </div>

          {wrongQs.length > 0 && (
            <div className="wrong-answers-review">
              <h3>Words to Review ({wrongQs.length})</h3>
              <ul className="wrong-list">
                {wrongQs.map(q => (
                  <li key={q.id}>
                    <span className="w-term">{q.word.term}</span>
                    <span className="w-sep">—</span>
                    <span className="w-def">{q.word.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="res-actions">
            <button className="res-btn-primary" onClick={generateQuiz}>
              🔄 Try Again
            </button>
            <button className="res-btn-secondary" onClick={() => setPhase('setup')}>
              ⚙️ Back to Setup
            </button>
            <button className="res-btn-secondary" onClick={() => navigate('/practice')}>
              🔙 Back to Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
