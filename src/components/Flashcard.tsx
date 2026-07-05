import './Flashcard.css';

interface FlashcardProps {
  term: string;
  definition: string;
  exampleSentence?: string;
  targetLanguage: string;
  isFlipped: boolean;
  onFlip: () => void;
}

const Flashcard = ({ term, definition, exampleSentence, targetLanguage, isFlipped, onFlip }: FlashcardProps) => {
  const speak = (e: React.MouseEvent, text: string, lang: string) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`flashcard-container ${isFlipped ? 'flipped' : ''}`} onClick={onFlip}>
      <div className="flashcard-inner">
        {/* Front of card */}
        <div className="flashcard-front card">
          <div className="flashcard-content" style={{ position: 'relative' }}>
            <button 
              className="tts-btn" 
              onClick={(e) => speak(e, term, targetLanguage)}
              style={{ position: 'absolute', top: '-20px', right: '-20px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}
              title="Listen"
            >
              🔊
            </button>
            <h2 className="flashcard-term">{term}</h2>
            <p className="flashcard-hint">Tap to reveal</p>
          </div>
        </div>

        {/* Back of card */}
        <div className="flashcard-back card">
          <div className="flashcard-content">
            <h2 className="flashcard-definition">{definition}</h2>
            {exampleSentence && (
              <div className="flashcard-example">
                <i>"{exampleSentence}"</i>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
