import { useState, useRef, useEffect } from 'react';
import { trackEvent } from '../lib/analytics';
import './MusicChallenge.css';

type Phase = 'search' | 'difficulty' | 'playing' | 'results';
type GameMode = 'quick' | 'full';

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
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

// Extend Window to include YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function MusicChallenge() {
  const [phase, setPhase] = useState<Phase>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tracks, setTracks] = useState<ITunesTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<ITunesTrack | null>(null);

  // Difficulty & Mode
  const [difficulty, setDifficulty] = useState(0.25);
  const [gameMode, setGameMode] = useState<GameMode>('quick');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

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
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }
    return () => {
      stopProgressTimer();
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, []);

  const stopProgressTimer = () => {
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    progressIntervalRef.current = window.setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 100);
  };

  // Sync lyrics when currentTime changes
  useEffect(() => {
    if (phase !== 'playing') return;

    if (gameMode === 'quick' && currentTime >= 30) {
      finishGame();
      return;
    }

    let activeIdx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (currentTime >= lyricsLines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== activeLineIdx && activeIdx !== -1) {
      setActiveLineIdx(activeIdx);
      const lineEl = lineRefs.current[activeIdx];
      if (lineEl && viewportRef.current) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, lyricsLines, gameMode, phase, activeLineIdx]);

  // 1. Search iTunes
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTracks([]);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.results || []);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectTrack = (track: ITunesTrack) => {
    setSelectedTrack(track);
    setPhase('difficulty');
  };

  // 2. Start Game Setup
  const handleStartGame = async (mode: GameMode) => {
    if (!selectedTrack) return;
    setGameMode(mode);
    setIsLoadingAudio(true);

    try {
      // 1. Fetch Synced Lyrics from LRCLIB
      const lrcRes = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(selectedTrack.trackName)}&artist_name=${encodeURIComponent(selectedTrack.artistName)}`);
      
      if (!lrcRes.ok) throw new Error('Lyrics API error');
      const lrcData = await lrcRes.json();
      
      const trackWithLyrics = lrcData.find((t: any) => t.syncedLyrics);
      if (!trackWithLyrics) {
        alert('Could not find synced lyrics for this track. Please try another one.');
        setIsLoadingAudio(false);
        return;
      }

      // Process LRC Lyrics
      processLyrics(trackWithLyrics.syncedLyrics, difficulty);
      
      setPhase('playing');
      setIsPlaying(true);
      
      // Initialize YouTube Player
      setTimeout(() => {
        initYouTubePlayer(selectedTrack.trackName, selectedTrack.artistName);
      }, 500);

    } catch (err) {
      console.error(err);
      alert('Error fetching lyrics.');
      setIsLoadingAudio(false);
    }
  };

  const initYouTubePlayer = async (trackName: string, artistName: string) => {
    if (!window.YT || !window.YT.Player) {
      // Retry if API not ready yet
      setTimeout(() => initYouTubePlayer(trackName, artistName), 500);
      return;
    }

    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (e) {}
    }

    const query = `${artistName} ${trackName} audio`;

    try {
      const searchRes = await fetch(`/api/music?action=youtube&q=${encodeURIComponent(query)}`);
      let searchData: any = {};
      try {
        searchData = await searchRes.json();
      } catch (e) {}

      if (!searchRes.ok) {
        throw new Error(searchData.error || `HTTP ${searchRes.status}`);
      }
      
      if (!searchData.id) {
        throw new Error('No video ID returned');
      }

      playerRef.current = new window.YT.Player('yt-player-container', {
        height: '200',
        width: '200',
        videoId: searchData.id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            setIsLoadingAudio(false);
            event.target.playVideo();
            startProgressTimer();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              finishGame();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
          onError: (event: any) => {
            alert(`YouTube audio failed to load. (Error code: ${event.data})`);
            setIsLoadingAudio(false);
          }
        }
      });
    } catch (error: any) {
      console.error(error);
      alert(`Ошибка поиска трека: ${error.message}\nУбедитесь, что переменная YOUTUBE_API_KEY добавлена и проект пересобран (Redeploy).`);
      setIsLoadingAudio(false);
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setIsPlaying(!isPlaying);
  };

  const processLyrics = (syncedLrc: string, diff: number) => {
    const lines = syncedLrc.split(/\r?\n/);
    let blankCount = 0;
    const parsedLines: LyricLine[] = [];

    const timeRegex = /\[(\d{2}):(\d{2}\.\d{2,3})\]/;

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

  // (handleProgress logic was moved to useEffect)

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

      if (newFilled === totalBlanks && totalBlanks > 0) {
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
    stopProgressTimer();
    if (playerRef.current) {
      try { playerRef.current.pauseVideo(); } catch (e) {}
    }
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
              <div key={track.trackId} className="track-item" onClick={() => selectTrack(track)}>
                <img 
                  src={track.artworkUrl100.replace('100x100', '300x300')} 
                  alt={track.trackName} 
                  style={{ width: '60px', height: '60px', borderRadius: '4px', marginRight: '1rem', objectFit: 'cover' }}
                />
                <div className="track-info">
                  <h3 className="track-title">{track.trackName}</h3>
                  <p className="track-artist">{track.artistName} &bull; {track.collectionName}</p>
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
          
          <div className="card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
              src={selectedTrack.artworkUrl100.replace('100x100', '300x300')} 
              alt={selectedTrack.trackName} 
              style={{ width: '150px', height: '150px', borderRadius: '8px', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
            />
            <h2 style={{ marginBottom: '0.25rem' }}>{selectedTrack.trackName}</h2>
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
          {isLoadingAudio ? (
            <div className="card" style={{ padding: '2rem' }}>Loading Audio & Lyrics... 🎧</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img 
                src={selectedTrack.artworkUrl100} 
                alt="Cover" 
                style={{ width: '40px', height: '40px', borderRadius: '4px' }}
              />
              <div>
                <h3 style={{ margin: 0 }}>{selectedTrack.trackName}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {gameMode === 'quick' ? '⏱ Quick 30s Mode' : '🎧 Full Song Mode'}
                </p>
              </div>
            </div>
            <div className="karaoke-progress">
              <span>{Math.floor(currentTime)}s {gameMode === 'quick' && '/ 30s'}</span>
              <span>•</span>
              <span style={{ color: 'var(--primary-color)' }}>{filledBlanks} / {totalBlanks}</span>
            </div>
          </div>

          {isLoadingAudio && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5 }}>
              <h2>Loading Audio... 🎧</h2>
            </div>
          )}

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
                          disabled={!isActive && !isPassed}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
            <button className="btn-secondary" onClick={togglePlayPause}>
              {isPlaying ? '⏸ Pause' : '▶️ Resume'}
            </button>
            <button className="btn-secondary" onClick={revealAll}>
              Give Up & Reveal
            </button>
          </div>

          {/* Invisible YouTube Player Container */}
          <div id="yt-player-container" style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}></div>
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
            <button className="btn-primary" onClick={() => {
              setPhase('difficulty');
              setGameMode('quick');
            }}>
              Retry Same Song
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
