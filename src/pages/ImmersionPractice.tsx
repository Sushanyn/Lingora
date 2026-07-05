import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import stringSimilarity from 'string-similarity';
import { supabase } from '../lib/supabase';
import './ImmersionPractice.css';

interface Clip {
  id: string;
  target_word: string;
  video_id: string;
  start_time: number;
  end_time: number;
  exact_transcript: string;
}

export default function ImmersionPractice() {
  const [searchParams] = useSearchParams();
  const word = searchParams.get('word') || 'example';
  
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [inputValue, setInputValue] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const playerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClips();
  }, [word]);

  const fetchClips = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-youtube-clips', {
        body: { word }
      });
      if (error) throw error;
      if (data && data.clips && data.clips.length > 0) {
        setClips(data.clips);
      } else {
        setError("No clips found for this word.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch clips");
    } finally {
      setLoading(false);
    }
  };

  const currentClip = clips[currentClipIndex];

  const handleReady = (event: any) => {
    playerRef.current = event.target;
    // We start playing automatically, but the user might need to interact first based on browser policy
    event.target.seekTo(currentClip?.start_time || 0);
    event.target.playVideo();
  };

  const handleStateChange = (event: any) => {
    // When playing, ensure we stop at end_time
    if (event.data === 1) { // 1 = playing
      const checkTime = setInterval(() => {
        if (event.target.getCurrentTime() >= (currentClip?.end_time || 0)) {
          event.target.pauseVideo();
          clearInterval(checkTime);
          inputRef.current?.focus();
        }
      }, 100);
    }
  };

  const handleReplay = () => {
    if (playerRef.current && currentClip) {
      playerRef.current.seekTo(currentClip.start_time);
      playerRef.current.playVideo();
    }
  };

  const cleanString = (str: string) => {
    return str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClip) return;

    const cleanedInput = cleanString(inputValue);
    const cleanedTranscript = cleanString(currentClip.exact_transcript);

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
    if (currentClipIndex + 1 < clips.length) {
      setCurrentClipIndex(prev => prev + 1);
      // Play next clip
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.seekTo(clips[currentClipIndex + 1].start_time);
          playerRef.current.playVideo();
        }
      }, 100);
    } else {
      // Loop or finish
      setCurrentClipIndex(0);
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.seekTo(clips[0].start_time);
          playerRef.current.playVideo();
        }
      }, 100);
    }
  };

  if (loading) return <div className="immersion-loading">Loading movie clips... 🍿</div>;
  if (error) return <div className="immersion-error">{error}</div>;
  if (!currentClip) return <div className="immersion-empty">No clips found.</div>;

  const opts = {
    height: '390',
    width: '640',
    playerVars: {
      autoplay: 1,
      controls: 0, // hide controls
      disablekb: 1,
      cc_load_policy: 0, // try to hide CC initially
      modestbranding: 1,
      rel: 0,
      start: Math.floor(currentClip.start_time),
      end: Math.ceil(currentClip.end_time) + 1,
    },
  };

  return (
    <div className="immersion-container">
      <h2>Listen and type!</h2>
      <p>Target word: <strong>{word}</strong></p>

      <div className="video-wrapper">
        <YouTube 
          videoId={currentClip.video_id} 
          opts={opts} 
          onReady={handleReady} 
          onStateChange={handleStateChange}
          className="youtube-player"
        />
      </div>

      <div className="controls">
        <button onClick={handleReplay} className="btn-secondary replay-btn">🔁 Replay Clip</button>
      </div>

      <div className="dictation-area card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type exactly what you heard..."
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
            <h3>{isCorrect ? 'Excellent! 🎉' : 'Almost there!'}</h3>
            <div className="transcript-comparison">
              <p className="actual-transcript"><strong>They said:</strong> {currentClip.exact_transcript}</p>
            </div>
            <button onClick={handleNext} className="btn-primary next-btn">
              Next Clip ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
