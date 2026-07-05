import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWords } from '../hooks/useWords';
import { useDictionaries } from '../hooks/useDictionaries';
import type { Word } from '../lib/types';
import Flashcard from '../components/Flashcard';
import QuizMode from '../components/QuizMode';
import './Practice.css';

type PracticeMode = 'selection' | 'flashcards' | 'quiz' | 'finished';

const Practice = () => {
  const [searchParams] = useSearchParams();
  const dictId = searchParams.get('dict');
  const navigate = useNavigate();

  const { words, loading, error } = useWords(dictId || '');
  
  const [mode, setMode] = useState<PracticeMode>('selection');
  
  // Flashcard State
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  // Quiz State
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  const startFlashcards = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentIndex(0);
    setMasteredCount(0);
    setIsFlipped(false);
    setMode('flashcards');
  };

  const startQuiz = () => {
    setMode('quiz');
  };

  const handleGotIt = () => {
    setMasteredCount(prev => prev + 1);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 >= queue.length) {
        setMode('finished');
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 150);
  };

  const handleMissedIt = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setQueue(prev => [...prev, currentWord]);
      setCurrentIndex(prev => prev + 1);
    }, 150);
  };

  const handleQuizFinish = (score: number, total: number) => {
    setQuizScore(score);
    setQuizTotal(total);
    setMode('finished');
  };

  const { dictionaries, loading: dictLoading, error: dictError } = useDictionaries();

  if (!dictId) {
    if (dictLoading) return <div className="practice-empty">Loading your dictionaries...</div>;
    if (dictError) return <div className="practice-empty">Error loading dictionaries: {dictError}</div>;
    
    if (dictionaries.length === 0) {
      return (
        <div className="practice-empty">
          <div className="empty-mascot">🐼</div>
          <h2>You don't have any dictionaries yet.</h2>
          <button onClick={() => navigate('/dictionaries')} className="btn-primary">Create One</button>
        </div>
      );
    }

    return (
      <div className="practice-page selection-mode">
        <div className="selection-container">
          <h1 className="selection-title">Which dictionary do you want to practice?</h1>
          <div className="mode-cards" style={{ flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
            {dictionaries.map(dict => (
              <div 
                key={dict.id} 
                className="card mode-card-hover" 
                style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', transition: 'all 0.2s' }}
                onClick={() => navigate(`/practice?dict=${dict.id}`)}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{dict.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {dict.target_language.toUpperCase()} • {dict.wordCount || 0} words
                  </p>
                </div>
                <button className="btn-primary" style={{ pointerEvents: 'none' }}>Practice</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="practice-empty">Loading flashcards...</div>;
  if (error) return <div className="practice-empty">Error: {error}</div>;

  if (words.length === 0) {
    return (
      <div className="practice-empty">
        <div className="empty-mascot">🐼</div>
        <h2>This dictionary has no words yet!</h2>
        <p>Add some words before starting practice.</p>
        <button onClick={() => navigate(`/dictionaries/${dictId}`)} className="btn-primary">Add Words</button>
      </div>
    );
  }

  if (mode === 'finished') {
    return (
      <div className="practice-finished">
        <div className="finished-mascot">🐼🎉</div>
        <h1 className="finished-title">Session Complete!</h1>
        {quizTotal > 0 ? (
          <p className="finished-desc">You scored {quizScore} out of {quizTotal} correct!</p>
        ) : (
          <p className="finished-desc">You've successfully reviewed {words.length} words.</p>
        )}
        <div className="finished-actions">
          <button onClick={() => navigate(`/dictionaries/${dictId}`)} className="btn-secondary">Back to Dictionary</button>
          <button onClick={() => {
            setMode('selection');
            setQuizTotal(0);
          }} className="btn-primary">Practice Again</button>
        </div>
      </div>
    );
  }

  if (mode === 'selection') {
    const canQuiz = words.length >= 4;
    return (
      <div className="practice-page selection-mode">
        <div className="practice-header">
          <button onClick={() => navigate(`/dictionaries/${dictId}`)} className="close-practice-btn">
            &larr; Back to Dictionary
          </button>
        </div>
        
        <div className="selection-container">
          <h1 className="selection-title">Choose your practice mode</h1>
          <div className="mode-cards">
            
            <div className="mode-card card" onClick={startFlashcards}>
              <div className="mode-icon">📇</div>
              <h2>Classic Flashcards</h2>
              <p>Flip cards to reveal the definition. Best for initial learning and memorization.</p>
            </div>

            <div className={`mode-card card ${!canQuiz ? 'disabled' : ''}`} onClick={canQuiz ? startQuiz : undefined}>
              <div className="mode-icon">🎯</div>
              <h2>Multiple Choice Quiz</h2>
              <p>Test your active recall by selecting the correct definition out of 4 options.</p>
              {!canQuiz && <div className="mode-warning">Requires at least 4 words in dictionary.</div>}
            </div>

          </div>
        </div>
      </div>
    );
  }

  const currentWord = queue[currentIndex];
  const progressPercentage = words.length > 0 ? Math.round((masteredCount / words.length) * 100) : 0;

  return (
    <div className="practice-page">
      <div className="practice-header">
        <button onClick={() => setMode('selection')} className="close-practice-btn">
          ✖ Exit Session
        </button>
        
        {mode === 'flashcards' && (
          <div className="progress-container">
            <div className="progress-stats">
              <span>{masteredCount} Mastered</span>
              <span>{words.length - masteredCount} Remaining</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="practice-workspace">
        {mode === 'flashcards' && currentWord && (
          <Flashcard 
            term={currentWord.term} 
            definition={currentWord.definition} 
            exampleSentence={currentWord.example_sentence}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
          />
        )}

        {mode === 'quiz' && (
          <QuizMode 
            words={words} 
            onFinish={handleQuizFinish} 
          />
        )}
      </div>

      {mode === 'flashcards' && (
        <div className={`practice-controls ${isFlipped ? 'visible' : ''}`}>
          <button onClick={handleMissedIt} className="control-btn missed-btn">
            <span className="control-icon">❌</span>
            Missed It
          </button>
          <button onClick={handleGotIt} className="control-btn got-btn">
            <span className="control-icon">✅</span>
            Got It
          </button>
        </div>
      )}
    </div>
  );
};

export default Practice;
