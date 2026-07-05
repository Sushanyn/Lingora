import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWords } from '../hooks/useWords';
import { useProfile } from '../hooks/useProfile';
import type { Word } from '../lib/types';
import { calculateSM2 } from '../utils/sm2';
import Flashcard from '../components/Flashcard';
import './Practice.css';

const PracticeFlashcards = () => {
  const [searchParams] = useSearchParams();
  const dictId = searchParams.get('dict');
  const navigate = useNavigate();

  const { words, loading, error, updateWordProgress } = useWords(dictId || '');
  const { updateStreak } = useProfile();
  
  const dueWords = words.filter(w => !w.next_review_date || new Date(w.next_review_date) <= new Date());
  
  const [isFinished, setIsFinished] = useState(false);
  
  // Flashcard State
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  useEffect(() => {
    if (words.length > 0 && queue.length === 0 && !isFinished) {
      const shuffled = [...dueWords].sort(() => Math.random() - 0.5);
      if (shuffled.length > 0) {
        setQueue(shuffled);
        setCurrentIndex(0);
        setMasteredCount(0);
        setIsFlipped(false);
      } else {
        // If no due words, just finish immediately
        setIsFinished(true);
      }
    }
  }, [words, dueWords, queue.length, isFinished]);

  const handleSR = async (quality: number) => {
    const currentWord = queue[currentIndex];
    if (!currentWord) return;

    // Calculate new SM-2 values
    const progress = calculateSM2(
      quality, 
      currentWord.repetitions || 0, 
      currentWord.ease_factor || 2.5, 
      currentWord.interval || 0
    );

    // Update in background
    updateWordProgress(currentWord.id, progress);

    if (quality >= 3) {
      setMasteredCount(prev => prev + 1);
    } else {
      // If 'Again', add back to queue
      setQueue(prev => [...prev, currentWord]);
    }

    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 >= queue.length) {
        updateStreak();
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 150);
  };

  if (!dictId) {
    navigate('/practice');
    return null;
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

  if (isFinished) {
    return (
      <div className="practice-finished">
        <div className="finished-mascot">🐼🎉</div>
        <h1 className="finished-title">Session Complete!</h1>
        <p className="finished-desc">You've successfully reviewed {masteredCount} words.</p>
        <div className="finished-actions">
          <button onClick={() => navigate('/practice')} className="btn-secondary">Back to Hub</button>
          <button onClick={() => window.location.reload()} className="btn-primary">Practice Again</button>
        </div>
      </div>
    );
  }

  const currentWord = queue[currentIndex];
  const progressPercentage = words.length > 0 ? Math.round((masteredCount / words.length) * 100) : 0;

  return (
    <div className="practice-page">
      <div className="practice-header">
        <button onClick={() => navigate('/practice')} className="close-practice-btn">
          ✖ Exit Session
        </button>
        
        <div className="progress-container">
          <div className="progress-stats">
            <span>{masteredCount} Reviewed</span>
            <span>{queue.length - currentIndex} Remaining</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="practice-workspace">
        {currentWord && (
          <Flashcard 
            term={currentWord.term} 
            definition={currentWord.definition} 
            exampleSentence={currentWord.example_sentence}
            targetLanguage="en"
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
          />
        )}
      </div>

      <div className={`practice-controls ${isFlipped ? 'visible' : ''}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => handleSR(0)} className="control-btn missed-btn" style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
          <div>Again</div><small style={{opacity: 0.7}}>1m</small>
        </button>
        <button onClick={() => handleSR(3)} className="control-btn" style={{ background: '#3b82f6', color: 'white', padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
          <div>Hard</div><small style={{opacity: 0.7}}>{currentWord?.repetitions === 0 ? '1d' : 'Wait'}</small>
        </button>
        <button onClick={() => handleSR(4)} className="control-btn got-btn" style={{ padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
          <div>Good</div><small style={{opacity: 0.7}}>{currentWord?.repetitions === 0 ? '1d' : currentWord?.interval ? `${currentWord.interval * 2}d` : '1d'}</small>
        </button>
        <button onClick={() => handleSR(5)} className="control-btn" style={{ background: '#10b981', color: 'white', padding: '1rem 0.5rem', fontSize: '0.9rem' }}>
          <div>Easy</div><small style={{opacity: 0.7}}>{currentWord?.repetitions === 0 ? '4d' : currentWord?.interval ? `${currentWord.interval * 3}d` : '4d'}</small>
        </button>
      </div>
    </div>
  );
};

export default PracticeFlashcards;
