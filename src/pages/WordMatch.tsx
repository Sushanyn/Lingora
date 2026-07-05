import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { trackEvent } from '../lib/analytics';
import type { Dictionary } from '../lib/types';
import './WordMatch.css';

type Phase = 'setup' | 'playing' | 'results';

interface Tile {
  id: string; // unique
  text: string;
  matchId: string; // the word id
  type: 'term' | 'definition';
  status: 'idle' | 'selected' | 'matched' | 'error';
}

export default function WordMatch() {
  const { session } = useAuth();
  const { updateStreak } = useProfile();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('setup');
  
  // Setup state
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [selectedDict, setSelectedDict] = useState<string>('random');
  const [loadingDicts, setLoadingDicts] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Playing state
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Fetch dictionaries on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchDicts = async () => {
      setLoadingDicts(true);
      const { data } = await supabase
        .from('dictionaries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (data) setDictionaries(data);
      setLoadingDicts(false);
    };
    fetchDicts();
  }, [session?.user?.id]);

  // Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === 'playing') {
      timer = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100); // 100ms for more responsive timer
    }
    return () => clearInterval(timer);
  }, [phase, startTime]);

  // Check for win condition
  useEffect(() => {
    if (phase === 'playing' && tiles.length > 0) {
      if (tiles.every(t => t.status === 'matched')) {
        trackEvent('practice_session_completed', { game: 'match' });
        updateStreak();
        setTimeout(() => setPhase('results'), 500);
      }
    }
  }, [tiles, phase, updateStreak]);

  const startGame = async () => {
    setSetupError(null);
    let query = supabase.from('words').select('*');
      if (selectedDict !== 'random') {
        query = query.eq('dictionary_id', selectedDict);
      } else {
        const dictIds = dictionaries.map(d => d.id);
        if (dictIds.length > 0) {
          query = query.in('dictionary_id', dictIds);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }
    
    const { data: words, error } = await query;
      
    if (error || !words || words.length < 5) {
      setSetupError('Not enough words to play. You need at least 5 words.');
      return;
    }

    // Pick 5 random words
    const shuffledWords = [...words].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    // Create 10 tiles (5 terms, 5 definitions)
    let newTiles: Tile[] = [];
    shuffledWords.forEach(w => {
      newTiles.push({
        id: `term_${w.id}`,
        text: w.term,
        matchId: w.id,
        type: 'term',
        status: 'idle'
      });
      newTiles.push({
        id: `def_${w.id}`,
        text: w.definition,
        matchId: w.id,
        type: 'definition',
        status: 'idle'
      });
    });

    // Shuffle tiles
    newTiles = newTiles.sort(() => 0.5 - Math.random());

    setTiles(newTiles);
    setSelectedTileId(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setPhase('playing');
  };

  const handleTileClick = (tile: Tile) => {
    if (tile.status === 'matched' || tile.status === 'error') return;

    if (!selectedTileId) {
      // Select first tile
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, status: 'selected' } : t));
      setSelectedTileId(tile.id);
    } else {
      // If clicking the same tile, unselect it
      if (selectedTileId === tile.id) {
        setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, status: 'idle' } : t));
        setSelectedTileId(null);
        return;
      }

      // We have a second tile selected. Let's check for match.
      const firstTile = tiles.find(t => t.id === selectedTileId)!;
      const isMatch = firstTile.matchId === tile.matchId && firstTile.type !== tile.type;

      if (isMatch) {
        // Success
        setTiles(prev => {
          const newTiles = prev.map(t => 
            (t.id === tile.id || t.id === selectedTileId) ? { ...t, status: 'matched' as const } : t
          );
          
          if (newTiles.every(t => t.status === 'matched')) {
            setTimeout(() => {
              updateStreak();
              
              // Perfect Score isn't super applicable to matching (since you just click until done)
              // But we'll grant it for clearing the board anyway to be nice
              localStorage.setItem('lingora_perfect', 'true');
              
              // Flash: under 15 seconds
              if (elapsedTime < 15000) {
                localStorage.setItem('lingora_flash', 'true');
              }
              
              trackEvent('practice_session_completed', { game: 'match' });
              setPhase('results');
            }, 500);
          }
          return newTiles;
        });
        setSelectedTileId(null);
      } else {
        // Fail
        setTiles(prev => prev.map(t => 
          (t.id === tile.id || t.id === selectedTileId) ? { ...t, status: 'error' } : t
        ));
        setSelectedTileId(null);

        // Reset error state after 500ms
        setTimeout(() => {
          setTiles(prev => prev.map(t => 
            t.status === 'error' ? { ...t, status: 'idle' } : t
          ));
        }, 500);
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const deci = Math.floor((ms % 1000) / 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${deci}`;
  };

  if (phase === 'setup') {
    return (
      <div className="wm-container">
        <div className="wm-header">
          <button onClick={() => navigate('/practice')} className="wm-close-btn">✖ Back to Hub</button>
        </div>
        <div className="wm-card setup-card">
          <div className="setup-icon" style={{fontSize: '4rem'}}>🧩</div>
          <h2>Word Match</h2>
          <p>Find the matching pairs as fast as you can!</p>

          {setupError && <div className="wm-error">{setupError}</div>}

          <div className="wm-form">
            <label>Select Vocabulary Source</label>
            {loadingDicts ? (
              <div className="wm-loading">Loading dictionaries...</div>
            ) : (
              <select 
                className="wm-select"
                value={selectedDict}
                onChange={(e) => setSelectedDict(e.target.value)}
              >
                <option value="random">🎲 All My Words (Random)</option>
                {dictionaries.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            )}

            <button className="wm-btn-primary" onClick={startGame} disabled={loadingDicts}>
              Start Game 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="wm-container">
        <div className="wm-header">
          <button onClick={() => setPhase('setup')} className="wm-close-btn">✖ Quit</button>
          <div className="wm-timer">{formatTime(elapsedTime)}</div>
        </div>
        
        <div className="wm-grid">
          {tiles.map(tile => (
            <button 
              key={tile.id}
              className={`wm-tile ${tile.status}`}
              onClick={() => handleTileClick(tile)}
              disabled={tile.status === 'matched'}
            >
              {tile.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="wm-container">
        <div className="wm-card results-card">
          <div className="res-emoji bounce-in">⚡</div>
          <h2>Board Cleared!</h2>
          
          <div className="wm-score-box">
            <div className="wm-score-label">Your Time</div>
            <div className="wm-score-value">{formatTime(elapsedTime)}</div>
          </div>

          <div className="wm-actions">
            <button className="wm-btn-primary" onClick={startGame}>
              🔄 Play Again
            </button>
            <button className="wm-btn-secondary" onClick={() => setPhase('setup')}>
              ⚙️ Setup
            </button>
            <button className="wm-btn-secondary" onClick={() => navigate('/practice')}>
              🔙 Back to Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
