import './Flashcard.css';

interface FlashcardProps {
  term: string;
  definition: string;
  exampleSentence?: string;
  isFlipped: boolean;
  onFlip: () => void;
}

const Flashcard = ({ term, definition, exampleSentence, isFlipped, onFlip }: FlashcardProps) => {
  return (
    <div className={`flashcard-container ${isFlipped ? 'flipped' : ''}`} onClick={onFlip}>
      <div className="flashcard-inner">
        {/* Front of card */}
        <div className="flashcard-front card">
          <div className="flashcard-content">
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
