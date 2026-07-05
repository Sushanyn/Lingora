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
  const inputRef = useRef<HTMLInputElement>(null);

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
      <h2>Listen and practice!</h2>
      <p>Target word: <strong>{word}</strong> {totalTracks > 0 && <span className="track-count">({totalTracks} tracks found)</span>}</p>

      <div className="video-wrapper">
        <div id="youglish-widget" className="youglish-container">
          {loading && <div className="immersion-loading">Loading YouGlish... 🍿</div>}
        </div>
      </div>

      {!loading && (
        <>
          <div className="controls">
            <button onClick={handleReplay} className="btn-secondary replay-btn">🔁 Replay Clip</button>
          </div>

          <div className="dictation-area card">
            <p className="dictation-hint">
              <strong>Challenge:</strong> Try not to look at the subtitles! Close your eyes, listen closely, and type what you hear to test your dictation skills.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type the sentence you just heard..."
                disabled={showFeedback}
                className="dictation-input"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {!showFeedback && <button type="submit" className="btn-primary">Check</button>}
            </form>

            {showFeedback && (
              <div className={`feedback-box ${isCorrect ? 'correct' : 'incorrect'}`}>
                <h3>{isCorrect ? 'Excellent! 🎉' : 'Keep practicing!'}</h3>
                <div className="transcript-comparison">
                  <p className="actual-transcript"><strong>Captured Transcript:</strong> {currentCaption}</p>
                </div>
                <button onClick={handleNext} className="btn-primary next-btn">
                  Next Clip ➔
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
