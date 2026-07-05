import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import './Achievements.css';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'words' | 'dictionaries' | 'streaks' | 'special';
  check: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => number; // 0‒1
  progressLabel: (stats: UserStats) => string;
}

interface UserStats {
  totalWords: number;
  totalDicts: number;
  uniqueLanguages: number;
  currentStreak: number;
  longestStreak: number;
  wordsWithHighReps: number;   // words with repetitions >= 5
  maxWordsInOneDay: number;
  hasNightWord: boolean;       // word created after 23:00
  hasEarlyWord: boolean;       // word created before 07:00
  hasPublicDict: boolean;
}

/* ────────────────────────────────────────────
   Achievement definitions (16 total)
   ──────────────────────────────────────────── */

const ACHIEVEMENTS: Achievement[] = [
  // ── Words ──
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Add your very first word',
    emoji: '🐣',
    category: 'words',
    check: (s) => s.totalWords >= 1,
    progress: (s) => Math.min(s.totalWords / 1, 1),
    progressLabel: (s) => `${Math.min(s.totalWords, 1)}/1`,
  },
  {
    id: 'word-collector',
    name: 'Word Collector',
    description: 'Collect 10 words in your library',
    emoji: '📝',
    category: 'words',
    check: (s) => s.totalWords >= 10,
    progress: (s) => Math.min(s.totalWords / 10, 1),
    progressLabel: (s) => `${Math.min(s.totalWords, 10)}/10`,
  },
  {
    id: 'vocabulary-builder',
    name: 'Vocabulary Builder',
    description: 'Build a collection of 50 words',
    emoji: '📚',
    category: 'words',
    check: (s) => s.totalWords >= 50,
    progress: (s) => Math.min(s.totalWords / 50, 1),
    progressLabel: (s) => `${Math.min(s.totalWords, 50)}/50`,
  },
  {
    id: 'word-master',
    name: 'Word Master',
    description: 'Master 100 words across all dictionaries',
    emoji: '🏆',
    category: 'words',
    check: (s) => s.totalWords >= 100,
    progress: (s) => Math.min(s.totalWords / 100, 1),
    progressLabel: (s) => `${Math.min(s.totalWords, 100)}/100`,
  },
  {
    id: 'lexicon-legend',
    name: 'Lexicon Legend',
    description: 'Reach the legendary 500-word milestone',
    emoji: '👑',
    category: 'words',
    check: (s) => s.totalWords >= 500,
    progress: (s) => Math.min(s.totalWords / 500, 1),
    progressLabel: (s) => `${Math.min(s.totalWords, 500)}/500`,
  },

  // ── Dictionaries ──
  {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Create at least 3 dictionaries',
    emoji: '📖',
    category: 'dictionaries',
    check: (s) => s.totalDicts >= 3,
    progress: (s) => Math.min(s.totalDicts / 3, 1),
    progressLabel: (s) => `${Math.min(s.totalDicts, 3)}/3`,
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    description: 'Study 3 or more different languages',
    emoji: '🌍',
    category: 'dictionaries',
    check: (s) => s.uniqueLanguages >= 3,
    progress: (s) => Math.min(s.uniqueLanguages / 3, 1),
    progressLabel: (s) => `${Math.min(s.uniqueLanguages, 3)}/3`,
  },

  // ── Streaks ──
  {
    id: 'streak-starter',
    name: 'Streak Starter',
    description: 'Maintain a 3-day learning streak',
    emoji: '🔥',
    category: 'streaks',
    check: (s) => s.currentStreak >= 3,
    progress: (s) => Math.min(s.currentStreak / 3, 1),
    progressLabel: (s) => `${Math.min(s.currentStreak, 3)}/3 days`,
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Keep your streak alive for a full week',
    emoji: '⚡',
    category: 'streaks',
    check: (s) => s.currentStreak >= 7,
    progress: (s) => Math.min(s.currentStreak / 7, 1),
    progressLabel: (s) => `${Math.min(s.currentStreak, 7)}/7 days`,
  },
  {
    id: 'monthly-master',
    name: 'Monthly Master',
    description: 'An incredible 30-day streak — unstoppable!',
    emoji: '💎',
    category: 'streaks',
    check: (s) => s.currentStreak >= 30,
    progress: (s) => Math.min(s.currentStreak / 30, 1),
    progressLabel: (s) => `${Math.min(s.currentStreak, 30)}/30 days`,
  },
  {
    id: 'dedicated-learner',
    name: 'Dedicated Learner',
    description: 'Achieve a longest streak of 14+ days',
    emoji: '🎓',
    category: 'streaks',
    check: (s) => s.longestStreak >= 14,
    progress: (s) => Math.min(s.longestStreak / 14, 1),
    progressLabel: (s) => `${Math.min(s.longestStreak, 14)}/14 days`,
  },

  // ── Special ──
  {
    id: 'perfect-memory',
    name: 'Perfect Memory',
    description: 'Have 10+ words with 5 or more repetitions',
    emoji: '🧠',
    category: 'special',
    check: (s) => s.wordsWithHighReps >= 10,
    progress: (s) => Math.min(s.wordsWithHighReps / 10, 1),
    progressLabel: (s) => `${Math.min(s.wordsWithHighReps, 10)}/10`,
  },
  {
    id: 'speed-learner',
    name: 'Speed Learner',
    description: 'Add 10 or more words in a single day',
    emoji: '🚀',
    category: 'special',
    check: (s) => s.maxWordsInOneDay >= 10,
    progress: (s) => Math.min(s.maxWordsInOneDay / 10, 1),
    progressLabel: (s) => `${Math.min(s.maxWordsInOneDay, 10)}/10`,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Add a word after 23:00 — burning the midnight oil',
    emoji: '🦉',
    category: 'special',
    check: (s) => s.hasNightWord,
    progress: (s) => (s.hasNightWord ? 1 : 0),
    progressLabel: (s) => (s.hasNightWord ? 'Unlocked' : 'Not yet'),
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Add a word before 07:00 — rise and shine!',
    emoji: '🐦',
    category: 'special',
    check: (s) => s.hasEarlyWord,
    progress: (s) => (s.hasEarlyWord ? 1 : 0),
    progressLabel: (s) => (s.hasEarlyWord ? 'Unlocked' : 'Not yet'),
  },
  {
    id: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Make a dictionary public to share with others',
    emoji: '🦋',
    category: 'special',
    check: (s) => s.hasPublicDict,
    progress: (s) => (s.hasPublicDict ? 1 : 0),
    progressLabel: (s) => (s.hasPublicDict ? 'Unlocked' : 'Not yet'),
  },
];

const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length; // 16

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

/** Count max words created on the same calendar date (UTC) */
function computeMaxWordsPerDay(
  words: { created_at: string }[]
): number {
  const counts: Record<string, number> = {};
  for (const w of words) {
    const day = w.created_at.slice(0, 10); // YYYY-MM-DD
    counts[day] = (counts[day] || 0) + 1;
  }
  return Math.max(0, ...Object.values(counts));
}

/** Check whether any word was created after 23:00 local time */
function hasWordAfter23(words: { created_at: string }[]): boolean {
  return words.some((w) => {
    const hour = new Date(w.created_at).getHours();
    return hour >= 23;
  });
}

/** Check whether any word was created before 07:00 local time */
function hasWordBefore7(words: { created_at: string }[]): boolean {
  return words.some((w) => {
    const hour = new Date(w.created_at).getHours();
    return hour < 7;
  });
}

/** Get a human-readable category label */
function categoryLabel(cat: Achievement['category']): string {
  switch (cat) {
    case 'words':
      return '📝 Words';
    case 'dictionaries':
      return '📖 Dictionaries';
    case 'streaks':
      return '🔥 Streaks';
    case 'special':
      return '✨ Special';
  }
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

export default function Achievements() {
  const { session } = useAuth();
  const { profile } = useProfile();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | Achievement['category']
  >('all');

  /* ── Fetch data from Supabase ── */
  useEffect(() => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        // Fetch dictionaries
        const { data: dicts, error: dictsErr } = await supabase
          .from('dictionaries')
          .select('id, target_language, is_public')
          .eq('user_id', userId);

        if (dictsErr) throw dictsErr;

        // Fetch words
        const { data: words, error: wordsErr } = await supabase
          .from('words')
          .select('id, created_at, repetitions')
          .eq('user_id', userId);

        if (wordsErr) throw wordsErr;

        const safeDicts = dicts ?? [];
        const safeWords = words ?? [];

        const uniqueLangs = new Set(
          safeDicts.map((d) => d.target_language?.toLowerCase().trim())
        );

        const computed: UserStats = {
          totalWords: safeWords.length,
          totalDicts: safeDicts.length,
          uniqueLanguages: uniqueLangs.size,
          currentStreak: profile?.current_streak ?? 0,
          longestStreak: profile?.longest_streak ?? 0,
          wordsWithHighReps: safeWords.filter(
            (w) => (w.repetitions ?? 0) >= 5
          ).length,
          maxWordsInOneDay: computeMaxWordsPerDay(safeWords),
          hasNightWord: hasWordAfter23(safeWords),
          hasEarlyWord: hasWordBefore7(safeWords),
          hasPublicDict: safeDicts.some((d) => d.is_public),
        };

        setStats(computed);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load achievements';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [session?.user?.id, profile?.current_streak, profile?.longest_streak]);

  /* ── Derived data ── */
  const unlockedCount = useMemo(() => {
    if (!stats) return 0;
    return ACHIEVEMENTS.filter((a) => a.check(stats)).length;
  }, [stats]);

  const overallProgress = useMemo(
    () => unlockedCount / TOTAL_ACHIEVEMENTS,
    [unlockedCount]
  );

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  /** Closest-to-unlock achievement (highest progress < 1) */
  const nextAchievement = useMemo(() => {
    if (!stats) return null;
    let best: Achievement | null = null;
    let bestProgress = -1;

    for (const a of ACHIEVEMENTS) {
      const p = a.progress(stats);
      if (p < 1 && p > bestProgress) {
        bestProgress = p;
        best = a;
      }
    }
    return best;
  }, [stats]);

  /* ── Render helpers ── */

  const renderSkeleton = () => (
    <div className="ach-page">
      <div className="ach-header">
        <div className="ach-skeleton ach-skeleton-title" />
        <div className="ach-skeleton ach-skeleton-bar" />
      </div>
      <div className="ach-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ach-card ach-card--skeleton">
            <div className="ach-skeleton ach-skeleton-emoji" />
            <div className="ach-skeleton ach-skeleton-text" />
            <div className="ach-skeleton ach-skeleton-text short" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderError = () => (
    <div className="ach-page">
      <div className="ach-error">
        <span className="ach-error__icon">⚠️</span>
        <p className="ach-error__message">{error}</p>
        <button
          className="ach-error__retry"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  if (loading) return renderSkeleton();
  if (error) return renderError();
  if (!stats) return null;

  const categories: Array<'all' | Achievement['category']> = [
    'all',
    'words',
    'dictionaries',
    'streaks',
    'special',
  ];

  return (
    <div className="ach-page">
      {/* ── Header ── */}
      <header className="ach-header">
        <div className="ach-header__top">
          <h1 className="ach-header__title">Achievements</h1>
          <span className="ach-header__count">
            {unlockedCount}
            <span className="ach-header__count-separator">/</span>
            {TOTAL_ACHIEVEMENTS} unlocked
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="ach-progress-overall">
          <div className="ach-progress-overall__track">
            <div
              className="ach-progress-overall__fill"
              style={{ width: `${overallProgress * 100}%` }}
            />
          </div>
          <span className="ach-progress-overall__label">
            {Math.round(overallProgress * 100)}%
          </span>
        </div>
      </header>

      {/* ── Category Filters ── */}
      <nav className="ach-filters" aria-label="Filter achievements">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`ach-filter-btn ${
              selectedCategory === cat ? 'ach-filter-btn--active' : ''
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? '🏅 All' : categoryLabel(cat)}
          </button>
        ))}
      </nav>

      {/* ── Grid ── */}
      <section className="ach-grid" aria-label="Achievements grid">
        {filteredAchievements.map((achievement) => {
          const unlocked = achievement.check(stats);
          const progress = achievement.progress(stats);

          return (
            <article
              key={achievement.id}
              className={`ach-card ${
                unlocked ? 'ach-card--unlocked' : 'ach-card--locked'
              }`}
              aria-label={`${achievement.name} — ${
                unlocked ? 'Unlocked' : 'Locked'
              }`}
            >
              {/* Emoji */}
              <div className="ach-card__emoji-wrap">
                <span className="ach-card__emoji" role="img" aria-hidden>
                  {achievement.emoji}
                </span>
                {unlocked && (
                  <span className="ach-card__check" aria-label="Unlocked">
                    ✓
                  </span>
                )}
                {!unlocked && (
                  <span className="ach-card__lock" aria-label="Locked">
                    🔒
                  </span>
                )}
              </div>

              {/* Info */}
              <h3 className="ach-card__name">{achievement.name}</h3>
              <p className="ach-card__desc">{achievement.description}</p>

              {/* Category badge */}
              <span className="ach-card__category">
                {categoryLabel(achievement.category)}
              </span>

              {/* Progress (locked only) */}
              {!unlocked && (
                <div className="ach-card__progress">
                  <div className="ach-card__progress-track">
                    <div
                      className="ach-card__progress-fill"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <span className="ach-card__progress-label">
                    {achievement.progressLabel(stats)}
                  </span>
                </div>
              )}

              {/* Unlocked shimmer overlay */}
              {unlocked && <div className="ach-card__shimmer" />}
            </article>
          );
        })}
      </section>

      {/* ── Next Achievement ── */}
      {nextAchievement && (
        <section className="ach-next" aria-label="Next achievement">
          <h2 className="ach-next__heading">🎯 Next Achievement</h2>
          <div className="ach-next__card">
            <span className="ach-next__emoji" role="img" aria-hidden>
              {nextAchievement.emoji}
            </span>
            <div className="ach-next__info">
              <h3 className="ach-next__name">{nextAchievement.name}</h3>
              <p className="ach-next__desc">
                {nextAchievement.description}
              </p>
              <div className="ach-next__progress">
                <div className="ach-next__progress-track">
                  <div
                    className="ach-next__progress-fill"
                    style={{
                      width: `${nextAchievement.progress(stats) * 100}%`,
                    }}
                  />
                </div>
                <span className="ach-next__progress-label">
                  {nextAchievement.progressLabel(stats)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── All Unlocked celebration ── */}
      {unlockedCount === TOTAL_ACHIEVEMENTS && (
        <section className="ach-celebration">
          <div className="ach-celebration__content">
            <span className="ach-celebration__emoji" role="img" aria-hidden>
              🎉
            </span>
            <h2 className="ach-celebration__title">
              Congratulations!
            </h2>
            <p className="ach-celebration__text">
              You've unlocked every single achievement. You are a true Lingora
              master!
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
