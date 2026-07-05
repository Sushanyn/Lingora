import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { trackEvent } from '../lib/analytics';
import './MusicChallenge.css';

type Phase = 'search' | 'difficulty' | 'playing' | 'results';
type GameMode = 'quick' | 'full';

interface LrcTrack {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  syncedLyrics: string;
}

interface Blank {
  original: string;
  clean: string;
  isFilled: boolean;
  isRevealed: boolean;
}

interface LyricLine {
  time: number;
  words: (string | Blank)[];
  rawText: string;
}

export default function MusicChallenge() {
  const [phase, setPhase] = useState<Phase>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tracks, setTracks] = useState<LrcTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<LrcTrack | null>(null);

  // Difficulty & Mode
  const [difficulty, setDifficulty] = useState(0.25);
  const [gameMode, setGameMode] = useState<GameMode>('quick');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [youtubeId, setYoutubeId] = useState('');

  // Game state
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const [totalBlanks, setTotalBlanks] = useState(0);
  const [filledBlanks, setFilledBlanks] = useState(0);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(true);

  // Refs
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. Search LRCLIB
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTracks([]);
    try {
      const res = await fetch(`/api/music?action=search&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectTrack = (track: LrcTrack) => {
    setSelectedTrack(track);
    setPhase('difficulty');
  };

  // 2. Start Game Setup
  const handleStartGame = async (mode: GameMode) => {
    if (!selectedTrack) return;
    setGameMode(mode);
    setIsLoadingVideo(true);

    try {
      // Find YouTube video
      const q = `${selectedTrack.artistName} ${selectedTrack.name}`;
      const res = await fetch(`/api/music?action=youtube&q=${encodeURIComponent(q)}`);
      
      if (res.ok) {
        const data = await res.json();
        setYoutubeId(data.id);
        
        // Process LRC Lyrics
        processLyrics(selectedTrack.syncedLyrics, difficulty);
        setPhase('playing');
        setIsPlaying(true);
      } else {
        alert('Could not find audio for this track. Please try another one.');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching audio.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const processLyrics = (syncedLrc: string, diff: number) => {
    const lines = syncedLrc.split(/\r?\n/);
    let blankCount = 0;
    const parsedLines: LyricLine[] = [];

    const timeRegex = /\[(\d{2}):(\d{2}\.\d{2})\]/;

    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (!match) return;

      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const timeInSeconds = minutes * 60 + seconds;

      const rawText = line.replace(timeRegex, '').trim();
      if (!rawText) return;

      const words = rawText.split(/(\s+)/);
      const processedWords = words.map(word => {
        if (!word.trim()) return word; 
        
        const clean = word.replace(/[^\w\u00C0-\u024F]/g, '').toLowerCase();
        
        if (clean.length > 2 && Math.random() < diff) {
          blankCount++;
          return {
            original: word,
            clean,
            isFilled: false,
            isRevealed: false
          } as Blank;
        }
        return word; 
      });

      parsedLines.push({
        time: timeInSeconds,
        words: processedWords,
        rawText
      });
    });

    setLyricsLines(parsedLines);
    setTotalBlanks(blankCount);
    setFilledBlanks(0);
    inputsRef.current = new Array(blankCount).fill(null);
    lineRefs.current = new Array(parsedLines.length).fill(null);
  };

  // 3. Audio Progress & Sync
  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);

    // If Quick 30s mode, stop at 30 seconds
    if (gameMode === 'quick' && state.playedSeconds >= 30) {
      finishGame();
      return;
    }

    // Find active line
    let activeIdx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (state.playedSeconds >= lyricsLines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== activeLineIdx && activeIdx !== -1) {
      setActiveLineIdx(activeIdx);
      // Auto-scroll to active line
      const lineEl = lineRefs.current[activeIdx];
      if (lineEl && viewportRef.current) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, blankObj: Blank, lineIdx: number, wordIdx: number, globalInputIdx: number) => {
    const val = e.target.value;
    const cleanVal = val.replace(/[^\w\u00C0-\u024F]/g, '').toLowerCase();
    
    if (cleanVal === blankObj.clean) {
      // Correct!
      const newLines = [...lyricsLines];
      const newLineWords = [...newLines[lineIdx].words];
      newLineWords[wordIdx] = { ...blankObj, isFilled: true };
      newLines[lineIdx] = { ...newLines[lineIdx], words: newLineWords };
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
    const newLines = lyricsLines.map(line => ({
      ...line,
      words: line.words.map(word => {
        if (typeof word === 'object' && !word.isFilled) {
          return { ...word, isRevealed: true };
        }
        return word;
      })
    }));
    setLyricsLines(newLines);
    finishGame();
  };

  const finishGame = () => {
    setIsPlaying(false);
    trackEvent('practice_session_completed', { game: 'music_challenge', difficulty, gameMode });
    setPhase('results');
  };

  return (
    <div className="music-challenge-container">
      <div className="music-challenge-header">
        <h1>Music Challenge 🎤</h1>
        <p>Karaoke-style synchronized lyrics challenge.</p>
      </div>

      {phase === 'search' && (
        <div>
          <form className="search-form" onSubmit={handleSearch}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search for a song or artist (e.g., Ed Sheeran, Coldplay)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary search-btn" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="results-list">
            {tracks.map(track => (
              <div key={track.id} className="track-item" onClick={() => selectTrack(track)}>
                <div className="track-info">
                  <h3 className="track-title">{track.name}</h3>
                  <p className="track-artist">{track.artistName} &bull; {track.albumName}</p>
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
          
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '0.25rem' }}>{selectedTrack.name}</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{selectedTrack.artistName}</p>
          </div>

          <h3>1. Choose Difficulty</h3>
          <div className="difficulty-options">
            <button className={`difficulty-btn ${difficulty === 0.1 ? 'active' : ''}`} onClick={() => setDifficulty(0.1)}>
              Easy <span>10% Missing Words</span>
            </button>
            <button className={`difficulty-btn ${difficulty === 0.25 ? 'active' : ''}`} onClick={() => setDifficulty(0.25)}>
              Medium <span>25% Missing Words</span>
            </button>
            <button className={`difficulty-btn ${difficulty === 0.5 ? 'active' : ''}`} onClick={() => setDifficulty(0.5)}>
              Hard <span>50% Missing Words</span>
            </button>
          </div>

          <h3>2. Choose Mode</h3>
          {isLoadingVideo ? (
            <div className="card" style={{ padding: '2rem' }}>Loading Audio... 🎧</div>
          ) : (
            <div className="mode-selector">
              <button className="mode-btn quick" onClick={() => handleStartGame('quick')}>
                ⏱ Quick 30s
              </button>
              <button className="mode-btn full" onClick={() => handleStartGame('full')}>
                🎧 Full Song
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'playing' && selectedTrack && (
        <div className="karaoke-container">
          <div className="karaoke-header">
            <div>
              <h3 style={{ margin: 0 }}>{selectedTrack.name}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {gameMode === 'quick' ? '⏱ Quick 30s Mode' : '🎧 Full Song Mode'}
              </p>
            </div>
            <div className="karaoke-progress">
              <span>{Math.floor(currentTime)}s {gameMode === 'quick' && '/ 30s'}</span>
              <span>•</span>
              <span style={{ color: 'var(--primary-color)' }}>{filledBlanks} / {totalBlanks}</span>
            </div>
          </div>

          <div className="lyrics-viewport" ref={viewportRef}>
            <div className="lyrics-content">
              {lyricsLines.map((line, lineIdx) => {
                const isActive = activeLineIdx === lineIdx;
                const isPassed = activeLineIdx > lineIdx;
                
                let className = "lyric-line";
                if (isActive) className += " active";
                if (isPassed) className += " passed";

                let blankInputIndex = lyricsLines.slice(0, lineIdx).reduce((acc, l) => acc + l.words.filter(w => typeof w !== 'string').length, 0) - 1;

                return (
                  <div key={lineIdx} className={className} ref={(el) => { lineRefs.current[lineIdx] = el; }}>
                    {line.words.map((wordObj, wordIdx) => {
                      if (typeof wordObj === 'string') {
                        return <span key={wordIdx}>{wordObj}</span>;
                      }
                      
                      blankInputIndex++;
                      const currentIdx = blankInputIndex; 

                      if (wordObj.isRevealed) {
                        return <span key={wordIdx} className="lyric-input revealed">{wordObj.original}</span>;
                      }

                      if (wordObj.isFilled) {
                        return <span key={wordIdx} className="lyric-input correct">{wordObj.original}</span>;
                      }

                      return (
                        <input
                          key={wordIdx}
                          type="text"
                          className="lyric-input"
                          style={{ width: `${Math.max(50, wordObj.clean.length * 16)}px` }}
                          onChange={(e) => handleInputChange(e, wordObj, lineIdx, wordIdx, currentIdx)}
                          ref={(el) => { inputsRef.current[currentIdx] = el; }}
                          autoComplete="off"
                          spellCheck="false"
                          disabled={!isActive && !isPassed} // Optional: disable inputs for future lines
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn-secondary" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? '⏸ Pause' : '▶️ Resume'}
            </button>
            <button className="btn-secondary" onClick={revealAll}>
              Give Up & Reveal
            </button>
          </div>

          {/* Invisible YouTube Player */}
          {youtubeId && (
            <div className="hidden-player">
              <ReactPlayer 
                url={`https://www.youtube.com/watch?v=${youtubeId}`}
                playing={isPlaying}
                // @ts-ignore
                onProgress={handleProgress}
                onEnded={finishGame}
                width="0"
                height="0"
                config={{
                  youtube: {
                    playerVars: { autoplay: 1, controls: 0, disablekb: 1 }
                  }
                } as any}
              />
            </div>
          )}
        </div>
      )}

      {phase === 'results' && (
        <div className="results-container">
          <h2>Challenge Complete! 🎤</h2>
          
          <div className="score-circle">
            <div className="score-number">{totalBlanks > 0 ? Math.round((filledBlanks / totalBlanks) * 100) : 100}%</div>
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
            <button className="btn-primary" onClick={() => handleStartGame(gameMode)}>
              Retry Same Song
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
