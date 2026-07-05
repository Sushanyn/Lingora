import { useState, useEffect, useMemo } from 'react';
import type { Word } from '../lib/types';
import './QuizMode.css';

interface QuizModeProps {
  words: Word[];
  onFinish: (score: number, total: number) => void;
}

const QuizMode = ({ words, onFinish }: QuizModeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Shuffle all words once for the quiz order
  const shuffledQueue = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
  }, [words]);

  const currentWord = shuffledQueue[currentIndex];

  // Generate options when the current word changes
  useEffect(() => {
    if (!currentWord || words.length < 4) return;

    // 1 correct answer
    const correct = currentWord.definition;
    
    // 3 incorrect answers
    const others = words
      .filter((w) => w.id !== currentWord.id)
      .map((w) => w.definition)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
      
    // Combine and shuffle options
    const allOptions = [correct, ...others].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setSelectedAnswer(null);
  }, [currentWord, words]);

  const handleSelect = (answer: string) => {
    if (selectedAnswer || isTransitioning) return; // Prevent double clicking
    
    setSelectedAnswer(answer);
    
    const isCorrect = answer === currentWord.definition;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setIsTransitioning(true);
    
    // Wait briefly so user sees the correct/incorrect colors
    setTimeout(() => {
      setIsTransitioning(false);
      if (currentIndex + 1 < shuffledQueue.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onFinish(score + (isCorrect ? 1 : 0), shuffledQueue.length);
      }
    }, 1500);
  };

  if (words.length < 4) {
    return (
      <div className="quiz-error">
        <h2>Not Enough Words</h2>
        <p>Multiple Choice Quiz requires at least 4 words in the dictionary.</p>
      </div>
    );
  }

  if (!currentWord) return null;

  const progressPercentage = Math.round((currentIndex / shuffledQueue.length) * 100);

  return (
    <div className="quiz-container">
      <div className="quiz-progress-bar-bg">
        <div className="quiz-progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
      </div>
      <div className="quiz-progress-text">
        Question {currentIndex + 1} of {shuffledQueue.length}
      </div>

      <div className="quiz-card card">
        <h2 className="quiz-term">{currentWord.term}</h2>
        {currentWord.example_sentence && (
          <p className="quiz-example">"{currentWord.example_sentence}"</p>
        )}
      </div>

      <div className="quiz-options">
        {options.map((opt, i) => {
          let btnClass = 'quiz-option-btn';
          
          if (selectedAnswer) {
            if (opt === currentWord.definition) {
              btnClass += ' correct'; // Always highlight the correct one
            } else if (opt === selectedAnswer) {
              btnClass += ' incorrect'; // Highlight if they picked the wrong one
            } else {
              btnClass += ' faded'; // Fade out the rest
            }
          }

          return (
            <button 
              key={i} 
              className={btnClass}
              onClick={() => handleSelect(opt)}
              disabled={!!selectedAnswer}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizMode;
