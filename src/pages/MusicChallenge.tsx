import { useState, useRef } from 'react';
import { trackEvent } from '../lib/analytics';
import './MusicChallenge.css';

type Phase = 'search' | 'difficulty' | 'playing' | 'results';

interface Track {
  id: number;
  title: string;
  artist: { name: string };
  album: { cover_medium: string };
  preview: string;
}

interface Blank {
  original: string;
  clean: string;
  isFilled: boolean;
  isRevealed: boolean;
}

export default function MusicChallenge() {
  const [phase, setPhase] = useState<Phase>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const [rawLyrics, setRawLyrics] = useState('');

  // Game state
  const [lyricsLines, setLyricsLines] = useState<(string | Blank)[][]>([]);
  const [totalBlanks, setTotalBlanks] = useState(0);
  const [filledBlanks, setFilledBlanks] = useState(0);
  const [difficulty, setDifficulty] = useState(0.25);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Focus management
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTracks([]);
    try {
      const res = await fetch(`/api/music?action=search&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.data) {
        // Filter out tracks without previews
        setTracks(data.data.filter((t: Track) => t.preview));
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectTrack = async (track: Track) => {
    setSelectedTrack(track);
    setIsLoadingLyrics(true);
    setLyricsError('');
    setPhase('difficulty');

    try {
      const res = await fetch(`/api/music?action=lyrics&artist=${encodeURIComponent(track.artist.name)}&title=${encodeURIComponent(track.title)}`);
      const data = await res.json();
      if (data.lyrics) {
        setRawLyrics(data.lyrics);
      } else {
        setLyricsError('Lyrics not found for this song. Please try another one.');
      }
    } catch (err) {
      setLyricsError('Error fetching lyrics. Please try another song.');
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const startGame = (diff: number) => {
    setDifficulty(diff);
    
    // Process lyrics
    // Remove "Paroles de la chanson..." headers if they exist from lyrics.ovh
    let cleanLyrics = rawLyrics.replace(/Paroles de la chanson.*?\r?\n/i, '');
    
    const lines = cleanLyrics.split(/\r?\n/);
    let blankCount = 0;
    
    const processed = lines.map(line => {
      // Split by words but preserve punctuation attached to them
      const words = line.split(/(\s+)/);
      return words.map(word => {
        if (!word.trim()) return word; // Return spaces/newlines as is
        
        // Clean word for checking
        const clean = word.replace(/[^\w\u00C0-\u024F]/g, '').toLowerCase();
        
        // Don't blank out tiny words or punctuation-only blocks
        if (clean.length > 2 && Math.random() < diff) {
          blankCount++;
          return {
            original: word,
            clean,
            isFilled: false,
            isRevealed: false
          } as Blank;
        }
        return word; // Keep as string if not blanked
      });
    });

    setLyricsLines(processed);
    setTotalBlanks(blankCount);
    setFilledBlanks(0);
    inputsRef.current = new Array(blankCount).fill(null);
    setPhase('playing');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, blankObj: Blank, lineIdx: number, wordIdx: number, globalInputIdx: number) => {
    const val = e.target.value;
    const cleanVal = val.replace(/[^\w\u00C0-\u024F]/g, '').toLowerCase();
    
    if (cleanVal === blankObj.clean) {
      // Correct!
      const newLines = [...lyricsLines];
      const newLine = [...newLines[lineIdx]];
      newLine[wordIdx] = { ...blankObj, isFilled: true };
      newLines[lineIdx] = newLine;
      setLyricsLines(newLines);
      
      const newFilled = filledBlanks + 1;
      setFilledBlanks(newFilled);

      // Focus next input
      for (let i = globalInputIdx + 1; i < inputsRef.current.length; i++) {
        if (inputsRef.current[i] && !inputsRef.current[i]?.disabled) {
          inputsRef.current[i]?.focus();
          break;
        }
      }

      if (newFilled === totalBlanks) {
        finishGame();
      }
    }
  };

  const revealAll = () => {
    const newLines = lyricsLines.map(line => 
      line.map(word => {
        if (typeof word === 'object' && !word.isFilled) {
          return { ...word, isRevealed: true };
        }
        return word;
      })
    );
    setLyricsLines(newLines);
    finishGame();
  };

  const finishGame = () => {
    trackEvent('practice_session_completed', { game: 'music_challenge', difficulty });
    setPhase('results');
  };

  return (
    <div className="music-challenge-container">
      <div className="music-challenge-header">
        <h1>Music Challenge 🎵</h1>
        <p>Listen to 30-second previews and fill in the missing lyrics.</p>
      </div>

      {phase === 'search' && (
        <div>
          <form className="search-form" onSubmit={handleSearch}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search for a song or artist (e.g., Coldplay, Adele)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary search-btn" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="results-grid">
            {tracks.map(track => (
              <div key={track.id} className="track-card" onClick={() => selectTrack(track)}>
                <img src={track.album.cover_medium} alt={track.title} className="track-image" />
                <div className="track-info">
                  <h3 className="track-title">{track.title}</h3>
                  <p className="track-artist">{track.artist.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'difficulty' && selectedTrack && (
        <div className="difficulty-selector">
          <button className="btn-secondary" onClick={() => setPhase('search')} style={{ marginBottom: '2rem' }}>
            ← Back to Search
          </button>
          
          <div className="difficulty-card">
            <img src={selectedTrack.album.cover_medium} alt={selectedTrack.title} />
            <div className="difficulty-card-info">
              <h3>{selectedTrack.title}</h3>
              <p>{selectedTrack.artist.name}</p>
            </div>
          </div>

          {isLoadingLyrics ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h2>Fetching Lyrics... 🎶</h2>
            </div>
          ) : lyricsError ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px solid #ef4444' }}>
              <h2 style={{ color: '#ef4444' }}>Oops!</h2>
              <p>{lyricsError}</p>
              <button className="btn-primary" onClick={() => setPhase('search')} style={{ marginTop: '1rem' }}>Search Another Song</button>
            </div>
          ) : (
            <>
              <h2>Select Difficulty</h2>
              <div className="difficulty-options">
                <button className="difficulty-btn easy" onClick={() => startGame(0.1)}>
                  Easy <span>10% Missing Words</span>
                </button>
                <button className="difficulty-btn medium" onClick={() => startGame(0.25)}>
                  Medium <span>25% Missing Words</span>
                </button>
                <button className="difficulty-btn hard" onClick={() => startGame(0.5)}>
                  Hard <span>50% Missing Words</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {phase === 'playing' && selectedTrack && (
        <div className="playing-container">
          <div className="audio-controls">
            <img src={selectedTrack.album.cover_medium} alt="Cover" />
            <div className="audio-details">
              <h3>{selectedTrack.title}</h3>
              <p>{selectedTrack.artist.name}</p>
              <audio 
                ref={audioRef} 
                src={selectedTrack.preview} 
                controls 
                autoPlay 
                className="custom-audio" 
                controlsList="nodownload"
              />
            </div>
          </div>

          <div className="lyrics-container">
            {lyricsLines.map((line, lineIdx) => {
              let blankInputIndex = -1;
              return (
                <div key={lineIdx}>
                  {line.map((wordObj, wordIdx) => {
                    if (typeof wordObj === 'string') {
                      return <span key={wordIdx}>{wordObj}</span>;
                    }
                    
                    blankInputIndex++;
                    const currentIdx = blankInputIndex; // Capture for closure

                    if (wordObj.isRevealed) {
                      return (
                        <span key={wordIdx} className="lyric-input revealed">
                          {wordObj.original}
                        </span>
                      );
                    }

                    if (wordObj.isFilled) {
                      return (
                        <span key={wordIdx} className="lyric-input correct">
                          {wordObj.original}
                        </span>
                      );
                    }

                    return (
                      <input
                        key={wordIdx}
                        type="text"
                        className="lyric-input"
                        style={{ width: `${Math.max(40, wordObj.clean.length * 14)}px` }}
                        onChange={(e) => handleInputChange(e, wordObj, lineIdx, wordIdx, currentIdx)}
                        ref={(el) => { inputsRef.current[currentIdx] = el; }}
                        autoComplete="off"
                        spellCheck="false"
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="game-actions">
            <span className="progress-text">
              Progress: {filledBlanks} / {totalBlanks}
            </span>
            <button className="btn-secondary" onClick={revealAll}>
              Give Up & Reveal
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="results-container">
          <h2>Challenge Complete!</h2>
          
          <div className="score-circle">
            <div className="score-number">{Math.round((filledBlanks / totalBlanks) * 100)}%</div>
          </div>

          <div className="results-stats">
            <div className="stat">
              <span>{filledBlanks}</span>
              <span>Words Found</span>
            </div>
            <div className="stat">
              <span>{totalBlanks}</span>
              <span>Total Blanks</span>
            </div>
          </div>

          <div className="results-actions">
            <button className="btn-secondary" onClick={() => setPhase('search')}>
              Play Another Song
            </button>
            <button className="btn-primary" onClick={() => {
              // Restart same song
              startGame(difficulty);
            }}>
              Retry Same Song
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
