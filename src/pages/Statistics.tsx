import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import './Statistics.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DictionaryInfo {
  id: string;
  title: string;
  target_language: string;
  wordCount: number;
}

interface WeekBucket {
  label: string;     // e.g. "Jun 9"
  count: number;
  weekStart: Date;
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedCount(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const from = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  icon,
  label,
  value,
  suffix = '',
  accent = 'var(--primary)',
  delay = 0,
}: {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
  delay?: number;
}) {
  const displayed = useAnimatedCount(value);

  return (
    <div className="stat-card" style={{ '--card-accent': accent, animationDelay: `${delay}ms` } as React.CSSProperties}>
      <div className="stat-card__icon" aria-hidden>{icon}</div>
      <div className="stat-card__body">
        <span className="stat-card__value">
          {displayed}
          {suffix && <span className="stat-card__suffix">{suffix}</span>}
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Heatmap helpers                                                    */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const WEEKS = 20;

function getHeatmapDates(): string[][] {
  const today = new Date();
  const todayDay = today.getDay(); // 0=Sun
  // Shift so Monday = 0
  const shifted = todayDay === 0 ? 6 : todayDay - 1;

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - shifted + 6); // end of current week (Sunday)

  const grid: string[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(endDate);
      dt.setDate(dt.getDate() - w * 7 + d - 6);
      // Don't include future dates
      if (dt > today) {
        week.push('');
      } else {
        week.push(dt.toISOString().slice(0, 10));
      }
    }
    grid.push(week);
  }
  return grid;
}

function intensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function getMonthLabels(grid: string[][]): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let lastMonth = -1;

  grid.forEach((week, i) => {
    const firstDate = week.find(d => d !== '');
    if (!firstDate) return;
    const month = parseInt(firstDate.split('-')[1], 10) - 1;
    if (month !== lastMonth) {
      labels.push({ label: months[month], col: i });
      lastMonth = month;
    }
  });

  return labels;
}

/* ------------------------------------------------------------------ */
/*  Heatmap Tooltip                                                    */
/* ------------------------------------------------------------------ */

function HeatmapCell({
  dateStr,
  count,
}: {
  dateStr: string;
  count: number;
}) {
  const [showTip, setShowTip] = useState(false);

  if (!dateStr) {
    return <div className="heatmap-cell heatmap-cell--empty" />;
  }

  const level = intensityLevel(count);
  const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`heatmap-cell heatmap-cell--L${level}`}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      aria-label={`${count} words on ${formatted}`}
    >
      {showTip && (
        <div className="heatmap-tooltip">
          <strong>{count} word{count !== 1 ? 's' : ''}</strong>
          <span>{formatted}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streak Heatmap                                                     */
/* ------------------------------------------------------------------ */

function StreakHeatmap({ activity }: { activity: Map<string, number> }) {
  const grid = useMemo(() => getHeatmapDates(), []);
  const monthLabels = useMemo(() => getMonthLabels(grid), [grid]);

  return (
    <div className="stat-section stat-section--heatmap fade-in-section">
      <h2 className="stat-section__title">📅 Activity Heatmap</h2>
      <p className="stat-section__subtitle">Words added over the last {WEEKS} weeks</p>

      <div className="heatmap-wrapper">
        {/* Month labels */}
        <div className="heatmap-months">
          <div className="heatmap-months__spacer" />
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="heatmap-month-label"
              style={{ gridColumnStart: m.col + 2 }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="heatmap-grid-container">
          {/* Day labels */}
          <div className="heatmap-day-labels">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="heatmap-day-label">{d}</span>
            ))}
          </div>

          {/* Grid */}
          <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {/* Transpose: iterate days first, then weeks */}
            {Array.from({ length: 7 }).map((_, dayIdx) =>
              grid.map((week, weekIdx) => {
                const dateStr = week[dayIdx];
                const count = dateStr ? (activity.get(dateStr) ?? 0) : 0;
                return (
                  <HeatmapCell
                    key={`${weekIdx}-${dayIdx}`}
                    dateStr={dateStr}
                    count={count}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="heatmap-legend__label">Less</span>
        {[0, 1, 2, 3, 4].map(l => (
          <div key={l} className={`heatmap-cell heatmap-cell--L${l} heatmap-legend__cell`} />
        ))}
        <span className="heatmap-legend__label">More</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Words Over Time – SVG Bar Chart                                    */
/* ------------------------------------------------------------------ */

function WordsOverTimeChart({ buckets }: { buckets: WeekBucket[] }) {
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const barWidth = 36;
  const gap = 12;
  const chartHeight = 200;
  const chartWidth = buckets.length * (barWidth + gap);
  const yTicks = 4;

  return (
    <div className="stat-section fade-in-section" style={{ animationDelay: '200ms' }}>
      <h2 className="stat-section__title">📈 Words Over Time</h2>
      <p className="stat-section__subtitle">Words added per week (last 12 weeks)</p>

      <div className="chart-scroll">
        <svg
          className="bar-chart-svg"
          viewBox={`0 0 ${chartWidth + 60} ${chartHeight + 60}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const y = 10 + (chartHeight / yTicks) * i;
            const val = Math.round(maxCount - (maxCount / yTicks) * i);
            return (
              <g key={i}>
                <line
                  x1="40"
                  y1={y}
                  x2={chartWidth + 50}
                  y2={y}
                  className="chart-grid-line"
                />
                <text x="34" y={y + 4} className="chart-axis-label" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {buckets.map((b, i) => {
            const barH = (b.count / maxCount) * chartHeight;
            const x = 44 + i * (barWidth + gap);
            const y = 10 + chartHeight - barH;
            return (
              <g key={i} className="bar-group">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  fill="url(#barGradient)"
                  className="bar-rect"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
                {b.count > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    className="bar-value-label"
                    textAnchor="middle"
                  >
                    {b.count}
                  </text>
                )}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 28}
                  className="chart-axis-label"
                  textAnchor="middle"
                >
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dictionary Breakdown                                               */
/* ------------------------------------------------------------------ */

const DICT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#3b82f6', '#84cc16',
];

function DictionaryBreakdown({ dicts }: { dicts: DictionaryInfo[] }) {
  const maxWords = Math.max(...dicts.map(d => d.wordCount), 1);

  return (
    <div className="stat-section fade-in-section" style={{ animationDelay: '400ms' }}>
      <h2 className="stat-section__title">📚 Dictionary Breakdown</h2>
      <p className="stat-section__subtitle">Word count per dictionary</p>

      {dicts.length === 0 ? (
        <div className="stat-empty">
          <span className="stat-empty__icon">📖</span>
          <p>No dictionaries yet. Create one to start tracking!</p>
        </div>
      ) : (
        <div className="dict-bars">
          {dicts.map((d, i) => {
            const pct = (d.wordCount / maxWords) * 100;
            const color = DICT_COLORS[i % DICT_COLORS.length];
            return (
              <div key={d.id} className="dict-bar-row" style={{ animationDelay: `${500 + i * 100}ms` }}>
                <div className="dict-bar-row__header">
                  <span className="dict-bar-row__title">{d.title}</span>
                  <span className="dict-bar-row__lang">{d.target_language}</span>
                  <span className="dict-bar-row__count">{d.wordCount}</span>
                </div>
                <div className="dict-bar-row__track">
                  <div
                    className="dict-bar-row__fill"
                    style={{ '--bar-pct': `${pct}%`, '--bar-color': color } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Learning Insights                                                  */
/* ------------------------------------------------------------------ */

const PANDA_QUOTES = [
  { emoji: '🐼', text: 'Bamboo grows slowly, but it never stops. Keep going!' },
  { emoji: '🎋', text: 'Every word you learn is a step closer to fluency.' },
  { emoji: '🐾', text: "Pandas rest, but they always come back for more bamboo. Don't forget to practice!" },
  { emoji: '🌿', text: 'Small daily progress leads to stunning results.' },
  { emoji: '✨', text: "You're doing amazing! One word at a time." },
  { emoji: '🎯', text: 'Focus on consistency, not perfection.' },
  { emoji: '🌙', text: 'Even the longest journey starts with a single word.' },
  { emoji: '🔥', text: "Your streak is your superpower. Don't let it break!" },
];

function LearningInsights({
  mostActiveDay,
  bestStreak,
  avgWordsPerDay,
  totalDaysActive,
}: {
  mostActiveDay: string;
  bestStreak: number;
  avgWordsPerDay: number;
  totalDaysActive: number;
}) {
  const quote = useMemo(
    () => PANDA_QUOTES[Math.floor(Math.random() * PANDA_QUOTES.length)],
    []
  );

  return (
    <div className="stat-section stat-section--insights fade-in-section" style={{ animationDelay: '600ms' }}>
      <h2 className="stat-section__title">💡 Learning Insights</h2>

      <div className="insights-grid">
        <div className="insight-card">
          <div className="insight-card__icon">📅</div>
          <div className="insight-card__body">
            <span className="insight-card__value">{mostActiveDay || '—'}</span>
            <span className="insight-card__label">Most Active Day</span>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-card__icon">🏆</div>
          <div className="insight-card__body">
            <span className="insight-card__value">{bestStreak} days</span>
            <span className="insight-card__label">Best Streak</span>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-card__icon">📊</div>
          <div className="insight-card__body">
            <span className="insight-card__value">{avgWordsPerDay.toFixed(1)}</span>
            <span className="insight-card__label">Avg Words / Day</span>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-card__icon">🗓️</div>
          <div className="insight-card__body">
            <span className="insight-card__value">{totalDaysActive}</span>
            <span className="insight-card__label">Days Active</span>
          </div>
        </div>
      </div>

      <div className="panda-quote">
        <span className="panda-quote__emoji">{quote.emoji}</span>
        <p className="panda-quote__text">{quote.text}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Statistics Component                                          */
/* ------------------------------------------------------------------ */

export default function Statistics() {
  const { session } = useAuth();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [totalWords, setTotalWords] = useState(0);
  const [totalDicts, setTotalDicts] = useState(0);
  const [masteryRate, setMasteryRate] = useState(0);
  const [activity, setActivity] = useState<Map<string, number>>(new Map());
  const [weekBuckets, setWeekBuckets] = useState<WeekBucket[]>([]);
  const [dictBreakdown, setDictBreakdown] = useState<DictionaryInfo[]>([]);
  const [mostActiveDay, setMostActiveDay] = useState('');
  const [avgWordsPerDay, setAvgWordsPerDay] = useState(0);
  const [totalDaysActive, setTotalDaysActive] = useState(0);

  const userId = session?.user?.id;

  /* ---- Data Fetching ---- */
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // 1. Fetch all dictionaries
      const { data: dicts } = await supabase
        .from('dictionaries')
        .select('id, title, target_language')
        .eq('user_id', userId);

      const dictList = dicts ?? [];
      setTotalDicts(dictList.length);

      // 2. Fetch all words
      const { data: words } = await supabase
        .from('words')
        .select('id, dictionary_id, ease_factor, repetitions, created_at')
        .eq('user_id', userId);

      const wordList = words ?? [];
      setTotalWords(wordList.length);

      // 3. Mastery rate
      const mastered = wordList.filter(
        (w) => (w.ease_factor ?? 0) >= 2.5 && (w.repetitions ?? 0) >= 3
      );
      setMasteryRate(wordList.length > 0 ? Math.round((mastered.length / wordList.length) * 100) : 0);

      // 4. Build activity map (words per day)
      const actMap = new Map<string, number>();
      wordList.forEach((w) => {
        if (!w.created_at) return;
        const day = w.created_at.slice(0, 10);
        actMap.set(day, (actMap.get(day) ?? 0) + 1);
      });
      setActivity(actMap);

      // 5. Total days active
      setTotalDaysActive(actMap.size);

      // 6. Avg words per day (across active days)
      const totalAdded = Array.from(actMap.values()).reduce((s, v) => s + v, 0);
      setAvgWordsPerDay(actMap.size > 0 ? totalAdded / actMap.size : 0);

      // 7. Most active day of week
      const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
      actMap.forEach((count, dateStr) => {
        const dt = new Date(dateStr + 'T00:00:00');
        const dow = dt.getDay(); // 0=Sun
        const shifted = dow === 0 ? 6 : dow - 1; // 0=Mon
        dayOfWeekCounts[shifted] += count;
      });
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const maxDayIdx = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
      setMostActiveDay(dayOfWeekCounts[maxDayIdx] > 0 ? dayNames[maxDayIdx] : '');

      // 8. Words over time – weekly buckets (last 12 weeks)
      const now = new Date();
      const buckets: WeekBucket[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - i * 7); // Monday
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        let count = 0;
        wordList.forEach((w) => {
          if (!w.created_at) return;
          const d = new Date(w.created_at);
          if (d >= weekStart && d < weekEnd) count++;
        });

        const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets.push({ label, count, weekStart });
      }
      setWeekBuckets(buckets);

      // 9. Dictionary breakdown
      const dictMap = new Map<string, number>();
      wordList.forEach((w) => {
        dictMap.set(w.dictionary_id, (dictMap.get(w.dictionary_id) ?? 0) + 1);
      });

      const breakdown: DictionaryInfo[] = dictList.map((d) => ({
        id: d.id,
        title: d.title,
        target_language: d.target_language ?? '',
        wordCount: dictMap.get(d.id) ?? 0,
      }));
      breakdown.sort((a, b) => b.wordCount - a.wordCount);
      setDictBreakdown(breakdown);
    } catch (err) {
      console.error('Statistics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ---- Loading State ---- */
  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-loading">
          <div className="stats-loading__spinner" />
          <p className="stats-loading__text">Crunching your numbers…</p>
        </div>
      </div>
    );
  }

  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;

  return (
    <div className="stats-page">
      {/* Header */}
      <header className="stats-header">
        <div className="stats-header__text">
          <h1 className="stats-header__title">Your Statistics</h1>
          <p className="stats-header__subtitle">
            Track your language learning journey
          </p>
        </div>
        <button className="stats-refresh-btn" onClick={fetchStats} title="Refresh statistics">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
          </svg>
          Refresh
        </button>
      </header>

      {/* Key Metrics */}
      <section className="stats-metrics-row">
        <MetricCard icon="📝" label="Total Words" value={totalWords} delay={0} />
        <MetricCard icon="📚" label="Dictionaries" value={totalDicts} delay={100} accent="#8b5cf6" />
        <MetricCard icon="🔥" label="Current Streak" value={currentStreak} suffix=" days" delay={200} accent="#f59e0b" />
        <MetricCard icon="🎯" label="Mastery Rate" value={masteryRate} suffix="%" delay={300} accent="#10b981" />
      </section>

      {/* Heatmap */}
      <StreakHeatmap activity={activity} />

      {/* Charts Row */}
      <div className="stats-charts-row">
        <WordsOverTimeChart buckets={weekBuckets} />
        <DictionaryBreakdown dicts={dictBreakdown} />
      </div>

      {/* Learning Insights */}
      <LearningInsights
        mostActiveDay={mostActiveDay}
        bestStreak={longestStreak}
        avgWordsPerDay={avgWordsPerDay}
        totalDaysActive={totalDaysActive}
      />
    </div>
  );
}
