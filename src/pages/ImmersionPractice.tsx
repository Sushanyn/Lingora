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
    // Note: YouGlish fires this frequently. We keep the last sentence chunk.
    if (event && event.text) {
       setCurrentCaption(event.text);
    }
  };

  const handleReplay = () => {
    if (widgetRef.current) {
      widgetRef.current.replay();
    }
  };

  const cleanString = (str: string) => {
    return str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCaption) return;

    const cleanedInput = cleanString(inputValue);
    const cleanedTranscript = cleanString(currentCaption);

    // Fuzzy matching
    const similarity = stringSimilarity.compareTwoStrings(cleanedInput, cleanedTranscript);
    
    if (similarity > 0.8) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
    setShowFeedback(true);
  };

  const handleNext = () => {
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);
    if (widgetRef.current) {
      widgetRef.current.next();
    }
  };

  if (error) return <div className="immersion-error">{error}</div>;

  return (
    <div className="immersion-container">
      <div className="immersion-header">
        <h2>🎬 Immersion Mode</h2>
        <p className="immersion-subtitle">
          Watch real movie clips containing the word: <strong className="highlight-word">{word}</strong>
          {totalTracks > 0 && <span className="track-count">({totalTracks} tracks found)</span>}
        </p>
      </div>

      <div className="immersion-layout">
        {/* Left Side: Video Player */}
        <div className="video-section card">
          <div className="video-wrapper">
            <div id="youglish-widget" className="youglish-container">
              {loading && <div className="immersion-loading">Loading videos... 🍿</div>}
            </div>
          </div>
          
          {!loading && (
            <div className="video-controls">
              <button onClick={handleReplay} className="btn-secondary replay-btn">
                <span className="icon">🔁</span> Replay Clip
              </button>
              <button onClick={handleNext} className="btn-secondary next-vid-btn">
                <span className="icon">⏭️</span> Skip to Next Video
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Dictation Challenge */}
        {!loading && (
          <div className="dictation-section card">
            <div className="challenge-header">
              <h3>✍️ Dictation Challenge</h3>
              <span className="badge-optional">Optional</span>
            </div>
            
            <div className="dictation-instructions">
              <p>Close your eyes, listen to the clip, and type exactly what you hear!</p>
            </div>
            
            <form onSubmit={handleSubmit} className="dictation-form">
              <textarea 
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type the sentence here..."
                disabled={showFeedback}
                className="dictation-textarea"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                rows={3}
              />
              {!showFeedback && <button type="submit" className="btn-primary check-btn">Check My Answer</button>}
            </form>

            {showFeedback && (
              <div className={`feedback-box ${isCorrect ? 'correct' : 'incorrect'}`}>
                <h3>{isCorrect ? '✨ Perfect Match!' : '💪 Keep practicing!'}</h3>
                <div className="transcript-comparison">
                  <p className="actual-transcript"><strong>They said:</strong> "{currentCaption}"</p>
                </div>
                <button onClick={handleNext} className="btn-primary next-btn">
                  Play Next Clip ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
