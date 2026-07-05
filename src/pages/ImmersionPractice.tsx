import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import stringSimilarity from 'string-similarity';
import './ImmersionPractice.css';

declare global {
  interface Window {
    YG: any;
    onYouglishAPIReady: () => void;
  }
}

export default function ImmersionPractice() {
  const [searchParams] = useSearchParams();
  const word = searchParams.get('word') || 'example';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [totalTracks, setTotalTracks] = useState(0);
  
  const [inputValue, setInputValue] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const widgetRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);

    const initWidget = () => {
      widgetRef.current = new window.YG.Widget("youglish-widget", {
        width: 640,
        components: 9, // Search box and caption display
        events: {
          'onFetchDone': onFetchDone,
          'onVideoChange': onVideoChange,
          'onCaptionConsumed': onCaptionConsumed
        }
      });
      // The word to search for
      widgetRef.current.fetch(word, "english");
    };

    if (window.YG) {
      initWidget();
    } else {
      window.onYouglishAPIReady = initWidget;

      if (!document.getElementById('youglish-script')) {
        const script = document.createElement('script');
        script.id = 'youglish-script';
        script.src = 'https://youglish.com/public/emb/widget.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      // Cleanup widget if needed
    };
  }, [word]);

  const onFetchDone = (event: any) => {
    setLoading(false);
    if (event.totalResult === 0) {
      setError("No clips found for this word on YouGlish.");
    } else {
      setTotalTracks(event.totalResult);
    }
  };

  const onVideoChange = () => {
    // Reset dictation state on new video
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);
    setCurrentCaption('');
  };

  const onCaptionConsumed = (event: any) => {
    // event object contains the text being spoken
    if (event && event.text) {
       setCurrentCaption(event.text);
       // Pause the video shortly after the phrase so it doesn't keep playing infinitely
       setTimeout(() => {
         if (widgetRef.current) {
           widgetRef.current.pause();
         }
       }, 1000); // 1 second buffer to let the sentence finish naturally
    }
  };

  const cleanString = (str: string) => {
    return str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCaption) return;

    const cleanedInput = cleanString(inputValue);
    const cleanedTranscript = cleanString(currentCaption);

    const similarity = stringSimilarity.compareTwoStrings(cleanedInput, cleanedTranscript);
    
    if (similarity > 0.8) {
      setIsCorrect(true);
      setShowFeedback(true);
      // Auto-advance after 1.5s
      setTimeout(() => {
        handleNext();
      }, 1500);
    } else {
      setIsCorrect(false);
      setShowFeedback(true);
    }
  };

  const handleNext = () => {
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);
    if (widgetRef.current) {
      widgetRef.current.next();
    }
  };

  const handleReplay = () => {
    if (widgetRef.current) {
      widgetRef.current.replay();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (error) return <div className="immersion-error">{error}</div>;

  return (
    <div className="immersion-container-simple">
      <div className="immersion-header-simple">
        <h2>Immersion: <span className="highlight-word">{word}</span></h2>
        {totalTracks > 0 && <span className="track-count">{totalTracks} clips found</span>}
      </div>

      <div className="video-card-simple">
        <div id="youglish-widget" className="youglish-container-simple">
          {loading && <div className="immersion-loading">Loading YouGlish... 🍿</div>}
        </div>
      </div>

      {!loading && (
        <div className="dictation-card-simple">
          <textarea 
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (showFeedback && !isCorrect) setShowFeedback(false); // Hide error while typing
            }}
            onKeyDown={handleKeyDown}
            placeholder="Close your eyes, listen, and type what you hear... (Press Enter to check)"
            disabled={isCorrect}
            className={`dictation-input-simple ${showFeedback ? (isCorrect ? 'input-correct' : 'input-incorrect') : ''}`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            rows={2}
          />
          
          <div className="simple-controls">
             <button onClick={handleReplay} className="btn-secondary">🔁 Replay</button>
             <button onClick={handleNext} className="btn-primary">Next Video ➔</button>
          </div>

          {showFeedback && !isCorrect && (
            <div className="feedback-hint-simple">
              <p><strong>Hint:</strong> "{currentCaption}"</p>
            </div>
          )}
          {showFeedback && isCorrect && (
            <div className="feedback-success-simple">
              <p>✨ Perfect! Loading next clip...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
