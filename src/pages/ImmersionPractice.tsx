import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import stringSimilarity from 'string-similarity';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import './ImmersionPractice.css';

declare global {
  interface Window {
    YG: any;
    onYouglishAPIReady: () => void;
  }
}

// ─── YouGlish language map ───────────────────────────────────────────────────
const YOUGLISH_LANGUAGES: { value: string; label: string }[] = [
  { value: 'english',    label: '🇬🇧 English' },
  { value: 'spanish',    label: '🇪🇸 Spanish' },
  { value: 'french',     label: '🇫🇷 French' },
  { value: 'german',     label: '🇩🇪 German' },
  { value: 'italian',    label: '🇮🇹 Italian' },
  { value: 'portuguese', label: '🇵🇹 Portuguese' },
  { value: 'russian',    label: '🇷🇺 Russian' },
  { value: 'turkish',    label: '🇹🇷 Turkish' },
  { value: 'dutch',      label: '🇳🇱 Dutch' },
  { value: 'polish',     label: '🇵🇱 Polish' },
  { value: 'greek',      label: '🇬🇷 Greek' },
  { value: 'chinese',    label: '🇨🇳 Chinese' },
  { value: 'japanese',   label: '🇯🇵 Japanese' },
  { value: 'korean',     label: '🇰🇷 Korean' },
  { value: 'arabic',     label: '🇸🇦 Arabic' },
  { value: 'hebrew',     label: '🇮🇱 Hebrew' },
  { value: 'hindi',      label: '🇮🇳 Hindi' },
  { value: 'swedish',    label: '🇸🇪 Swedish' },
  { value: 'ukrainian',  label: '🇺🇦 Ukrainian' },
  { value: 'romanian',   label: '🇷🇴 Romanian' },
  { value: 'thai',       label: '🇹🇭 Thai' },
  { value: 'vietnamese',  label: '🇻🇳 Vietnamese' },
  { value: 'indonesian', label: '🇮🇩 Indonesian' },
  { value: 'persian',    label: '🇮🇷 Persian' },
];

// ─── Dictionary language code → YouGlish language name ───────────────────────
function mapDictLangToYouglish(lang: string): string {
  const code = lang.toLowerCase().split('-')[0];
  const map: Record<string, string> = {
    en: 'english', es: 'spanish', fr: 'french', de: 'german',
    it: 'italian', pt: 'portuguese', ru: 'russian', tr: 'turkish',
    nl: 'dutch', pl: 'polish', el: 'greek', zh: 'chinese',
    ja: 'japanese', ko: 'korean', ar: 'arabic', he: 'hebrew',
    hi: 'hindi', sv: 'swedish', uk: 'ukrainian', ro: 'romanian',
    th: 'thai', vi: 'vietnamese', id: 'indonesian', fa: 'persian',
  };
  return map[code] || 'english';
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface DictInfo {
  id: string;
  title: string;
  target_language: string;
}

interface WordItem {
  id: string;
  term: string;
  definition: string;
}

// ─── Setup Screen ────────────────────────────────────────────────────────────
function SetupScreen({
  onStart,
}: {
  onStart: (words: string[], language: string) => void;
}) {
  const { session } = useAuth();
  const [dictionaries, setDictionaries] = useState<DictInfo[]>([]);
  const [selectedDict, setSelectedDict] = useState<string | null>(null);
  const [dictWords, setDictWords] = useState<WordItem[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [customWord, setCustomWord] = useState('');
  const [customWords, setCustomWords] = useState<string[]>([]);
  const [language, setLanguage] = useState('english');
  const [loadingDicts, setLoadingDicts] = useState(true);
  const [loadingWords, setLoadingWords] = useState(false);
  const [tab, setTab] = useState<'dictionary' | 'custom'>('dictionary');

  // Fetch dictionaries
  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      setLoadingDicts(true);
      const { data } = await supabase
        .from('dictionaries')
        .select('id, title, target_language')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setDictionaries(data || []);
      setLoadingDicts(false);
    })();
  }, [session?.user.id]);

  // Fetch words when dict is selected
  useEffect(() => {
    if (!selectedDict) return;
    (async () => {
      setLoadingWords(true);
      
      let query = supabase.from('words').select('id, term, definition');
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
      
      const { data } = await query;
      setDictWords(data || []);
      setSelectedWordIds(new Set());
      setLoadingWords(false);

      // Auto-detect language from dictionary
      if (selectedDict !== 'random') {
        const dict = dictionaries.find((d) => d.id === selectedDict);
        if (dict) {
          setLanguage(mapDictLangToYouglish(dict.target_language));
        }
      }
    })();
  }, [selectedDict, dictionaries]);

  const toggleWord = (id: string) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedWordIds.size === dictWords.length) {
      setSelectedWordIds(new Set());
    } else {
      setSelectedWordIds(new Set(dictWords.map((w) => w.id)));
    }
  };

  const selectRandom = (n: number) => {
    const shuffled = [...dictWords].sort(() => Math.random() - 0.5);
    setSelectedWordIds(new Set(shuffled.slice(0, n).map((w) => w.id)));
  };

  const addCustomWord = () => {
    const trimmed = customWord.trim();
    if (trimmed && !customWords.includes(trimmed)) {
      setCustomWords((prev) => [...prev, trimmed]);
      setCustomWord('');
    }
  };

  const removeCustomWord = (w: string) => {
    setCustomWords((prev) => prev.filter((x) => x !== w));
  };

  const handleStart = () => {
    let words: string[] = [];
    if (tab === 'dictionary') {
      words = dictWords
        .filter((w) => selectedWordIds.has(w.id))
        .map((w) => w.term);
    } else {
      words = customWords;
    }
    if (words.length === 0) return;
    onStart(words, language);
  };

  const readyCount =
    tab === 'dictionary' ? selectedWordIds.size : customWords.length;

  return (
    <div className="im-setup">
      <div className="im-setup-header">
        <h2>🎬 Immersion Mode</h2>
        <p className="im-setup-sub">
          Hear real people use your words in context. Pick words, pick a language, and go.
        </p>
      </div>

      {/* Language Selector */}
      <div className="im-lang-row">
        <label htmlFor="im-lang-select">Language:</label>
        <select
          id="im-lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="im-select"
        >
          {YOUGLISH_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Switcher */}
      <div className="im-tabs">
        <button
          className={`im-tab ${tab === 'dictionary' ? 'active' : ''}`}
          onClick={() => setTab('dictionary')}
        >
          📚 From Dictionary
        </button>
        <button
          className={`im-tab ${tab === 'custom' ? 'active' : ''}`}
          onClick={() => setTab('custom')}
        >
          ✏️ Custom Words
        </button>
      </div>

      {/* Dictionary Tab */}
      {tab === 'dictionary' && (
        <div className="im-dict-tab">
          {loadingDicts ? (
            <p className="im-muted">Loading dictionaries...</p>
          ) : dictionaries.length === 0 ? (
            <p className="im-muted">
              No dictionaries yet. Create one first, or switch to Custom Words.
            </p>
          ) : (
            <>
              {/* Dictionary picker */}
              <select
                className="im-select im-dict-select"
                value={selectedDict || ''}
                onChange={(e) => setSelectedDict(e.target.value || null)}
              >
                <option value="" disabled>— Select a dictionary —</option>
                <option value="random">🎲 All My Words (Random)</option>
                {dictionaries.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>

              {/* Words grid */}
              {selectedDict && (
                <>
                  {loadingWords ? (
                    <p className="im-muted">Loading words...</p>
                  ) : dictWords.length === 0 ? (
                    <p className="im-muted">
                      This dictionary is empty. Add words first!
                    </p>
                  ) : (
                    <>
                      <div className="im-quick-actions">
                        <button className="im-chip" onClick={selectAll}>
                          {selectedWordIds.size === dictWords.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                        <button
                          className="im-chip"
                          onClick={() => selectRandom(5)}
                        >
                          Random 5
                        </button>
                        <button
                          className="im-chip"
                          onClick={() => selectRandom(10)}
                        >
                          Random 10
                        </button>
                      </div>

                      <div className="im-word-grid">
                        {dictWords.map((w) => (
                          <button
                            key={w.id}
                            className={`im-word-chip ${
                              selectedWordIds.has(w.id) ? 'selected' : ''
                            }`}
                            onClick={() => toggleWord(w.id)}
                            title={w.definition}
                          >
                            {w.term}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Custom Tab */}
      {tab === 'custom' && (
        <div className="im-custom-tab">
          <div className="im-custom-input-row">
            <input
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomWord();
                }
              }}
              placeholder="Type a word and press Enter..."
              className="im-custom-input"
            />
            <button className="im-chip add" onClick={addCustomWord}>
              + Add
            </button>
          </div>

          {customWords.length > 0 && (
            <div className="im-word-grid">
              {customWords.map((w) => (
                <button
                  key={w}
                  className="im-word-chip selected"
                  onClick={() => removeCustomWord(w)}
                  title="Click to remove"
                >
                  {w} ✕
                </button>
              ))}
            </div>
          )}
          {customWords.length === 0 && (
            <p className="im-muted">
              Add words you want to practice hearing in real video clips.
            </p>
          )}
        </div>
      )}

      {/* Start Button */}
      <button
        className="im-start-btn"
        disabled={readyCount === 0}
        onClick={handleStart}
      >
        🚀 Start Immersion ({readyCount} word{readyCount !== 1 ? 's' : ''})
      </button>
    </div>
  );
}

// ─── Player Screen ───────────────────────────────────────────────────────────
function PlayerScreen({
  words,
  language,
  onExit,
}: {
  words: string[];
  language: string;
  onExit: () => void;
}) {
  const { updateStreak } = useProfile();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noResults, setNoResults] = useState(false);
  const [totalTracks, setTotalTracks] = useState(0);
  const [currentCaption, setCurrentCaption] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);

  const widgetRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  const currentWord = words[currentIdx];
  const isLastWord = currentIdx >= words.length - 1;

  // ─── YouGlish lifecycle ──────────────────────────────────────────────
  const onFetchDone = useCallback((event: any) => {
    setLoading(false);
    if (event.totalResult === 0) {
      setNoResults(true);
    } else {
      setNoResults(false);
      setTotalTracks(event.totalResult);
    }
  }, []);

  const onVideoChange = useCallback(() => {
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);
    setCurrentCaption('');
    hasPausedRef.current = false;
  }, []);

  // Track whether we've already paused for the current caption segment
  const hasPausedRef = useRef(false);

  const onCaptionConsumed = useCallback((event: any) => {
    if (event && event.text) {
      setCurrentCaption(event.text);
      // Only pause once per caption segment
      if (!hasPausedRef.current) {
        hasPausedRef.current = true;
        // Pause immediately — the phrase has been spoken
        if (widgetRef.current) {
          widgetRef.current.pause();
        }
      }
    }
  }, []);

  // Initialize or re-fetch when word changes
  useEffect(() => {
    setLoading(true);
    setNoResults(false);
    setTotalTracks(0);
    setCurrentCaption('');
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);

    const initOrFetch = () => {
      if (!isInitializedRef.current) {
        // First time: create widget
        widgetRef.current = new window.YG.Widget('youglish-widget', {
          width: 640,
          components: 8, // Just caption, no search bar
          events: {
            onFetchDone: onFetchDone,
            onVideoChange: onVideoChange,
            onCaptionConsumed: onCaptionConsumed,
          },
        });
        isInitializedRef.current = true;
      }
      widgetRef.current.fetch(currentWord, language);
    };

    if (window.YG) {
      initOrFetch();
    } else {
      window.onYouglishAPIReady = initOrFetch;
      if (!document.getElementById('youglish-script')) {
        const script = document.createElement('script');
        script.id = 'youglish-script';
        script.src = 'https://youglish.com/public/emb/widget.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [currentWord, language, onFetchDone, onVideoChange, onCaptionConsumed]);

  // ─── Handlers ────────────────────────────────────────────────────────
  const cleanString = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .toLowerCase()
      .trim();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCaption) return;

    const similarity = stringSimilarity.compareTwoStrings(
      cleanString(inputValue),
      cleanString(currentCaption),
    );

    if (similarity >= 0.75) {
      setIsCorrect(true);
      setShowFeedback(true);
      setScore((prev) => prev + 1);
    } else {
      setIsCorrect(false);
      setShowFeedback(true);
    }
  };

  const handleReplay = () => {
    hasPausedRef.current = false;
    widgetRef.current?.replay();
  };

  const handleNextClip = () => {
    setInputValue('');
    setShowFeedback(false);
    setIsCorrect(false);
    hasPausedRef.current = false;
    widgetRef.current?.next();
  };

  const handleNextWord = () => {
    if (isLastWord) {
      updateStreak();
      onExit();
      return;
    }
    setCurrentIdx((prev) => prev + 1);
  };

  const handleSkipWord = () => {
    if (isLastWord) {
      updateStreak();
      onExit();
      return;
    }
    setCurrentIdx((prev) => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="im-player" ref={containerRef}>
      {/* Top Bar */}
      <div className="im-topbar">
        <button className="im-back-btn" onClick={onExit}>
          ← Back
        </button>
        <div className="im-progress-info">
          <span className="im-word-label">
            Word {currentIdx + 1}/{words.length}
          </span>
          <span className="im-score">✨ {score} correct</span>
        </div>
      </div>

      {/* Current Word Badge */}
      <div className="im-current-word">
        <span className="im-badge">{currentWord}</span>
        {totalTracks > 0 && (
          <span className="im-tracks">{totalTracks} clips available</span>
        )}
      </div>

      {/* Word Queue Dots */}
      <div className="im-word-dots">
        {words.map((w, i) => (
          <span
            key={i}
            className={`im-dot ${i === currentIdx ? 'active' : ''} ${
              i < currentIdx ? 'done' : ''
            }`}
            title={w}
          />
        ))}
      </div>

      {/* Video */}
      <div className="im-video-card">
        <div id="youglish-widget" className="im-youglish">
          {loading && (
            <div className="im-loading">
              <div className="im-spinner" />
              Searching clips for "{currentWord}"...
            </div>
          )}
        </div>
      </div>

      {/* No results? Skip. */}
      {noResults && (
        <div className="im-no-results">
          <p>😕 No clips found for "{currentWord}" in this language.</p>
          <button className="im-chip" onClick={handleSkipWord}>
            {isLastWord ? 'Finish' : 'Skip to next word →'}
          </button>
        </div>
      )}

      {/* Controls */}
      {!loading && !noResults && (
        <div className="im-controls-area">
          {/* Dictation Input */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (showFeedback && !isCorrect) setShowFeedback(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type what you hear... (Enter to check)"
            disabled={isCorrect}
            className={`im-textarea ${
              showFeedback
                ? isCorrect
                  ? 'correct'
                  : 'incorrect'
                : ''
            }`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            rows={2}
          />

          {/* Feedback */}
          {showFeedback && !isCorrect && (
            <div className="im-feedback wrong">
              <p>
                <strong>They said:</strong> "{currentCaption}"
              </p>
            </div>
          )}
          {showFeedback && isCorrect && (
            <div className="im-feedback right">
              <p>✨ Nailed it!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="im-actions">
            <button className="im-btn secondary" onClick={handleReplay}>
              🔁 Replay
            </button>
            <button className="im-btn secondary" onClick={handleNextClip}>
              ⏭ Next Clip
            </button>
            <button className="im-btn primary" onClick={handleNextWord}>
              {isLastWord ? '🏁 Finish' : '→ Next Word'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Results Screen ──────────────────────────────────────────────────────────
function ResultsScreen({
  words,
  score,
  onRestart,
}: {
  words: string[];
  score: number;
  onRestart: () => void;
}) {
  const pct = Math.round((score / Math.max(words.length, 1)) * 100);
  return (
    <div className="im-results">
      <div className="im-results-card">
        <div className="im-results-emoji">
          {pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '🐼'}
        </div>
        <h2>Session Complete!</h2>
        <p className="im-results-score">
          {score} / {words.length} words nailed
        </p>
        <div className="im-results-bar-track">
          <div
            className="im-results-bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="im-results-pct">{pct}%</p>
        <button className="im-start-btn" onClick={onRestart}>
          🔄 Practice Again
        </button>
      </div>
    </div>
  );
}

// ─── Main Component (State Machine) ──────────────────────────────────────────
export default function ImmersionPractice() {
  const [searchParams] = useSearchParams();
  const urlWord = searchParams.get('word');

  const [phase, setPhase] = useState<'setup' | 'playing' | 'results'>(
    urlWord ? 'playing' : 'setup',
  );
  const [words, setWords] = useState<string[]>(urlWord ? [urlWord] : []);
  const [language, setLanguage] = useState('english');
  const [score, setScore] = useState(0);

  const handleStart = (w: string[], lang: string) => {
    setWords(w);
    setLanguage(lang);
    setScore(0);
    setPhase('playing');
  };

  const handleExit = () => {
    setPhase('results');
  };

  const handleRestart = () => {
    setPhase('setup');
    setWords([]);
    setScore(0);
  };

  if (phase === 'setup') {
    return <SetupScreen onStart={handleStart} />;
  }

  if (phase === 'results') {
    return (
      <ResultsScreen words={words} score={score} onRestart={handleRestart} />
    );
  }

  return (
    <PlayerScreen
      words={words}
      language={language}
      onExit={handleExit}
    />
  );
}
