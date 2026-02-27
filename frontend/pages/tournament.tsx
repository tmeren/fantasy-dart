import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { shortName, TranslationKey } from '@/lib/i18n';
import { eloToOdds, eloColorClass, eloBgClass, winPctBgClass, FormBoxes, computeAllInsights, computeStandings } from '@/lib/tournament-utils';
import { api, StandingEntry, PlayerRating, CompletedMatch, ScheduledMatch, PlayoffBracketResponse } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

// ── Round date mapping ──────────────────────────────────────────────────────
const TOURNAMENT_START = new Date('2025-10-29T00:00:00');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function getRoundDate(round: number): Date {
  const gameNight = Math.ceil(round / 2);
  return new Date(TOURNAMENT_START.getTime() + (gameNight - 1) * MS_PER_WEEK);
}

function getMaxPlayedRound(totalRounds: number = 38): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  for (let r = totalRounds; r >= 1; r--) {
    if (getRoundDate(r) <= now) return r;
  }
  return 0;
}

function formatGameNight(round: number, locale: string): string {
  const date = getRoundDate(round);
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}




// ── Tooltip (portal-based — escapes overflow clipping) ──────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShow(true);
  };
  const lines = text.split('\n');
  return (
    <span ref={ref} className="inline-block cursor-help" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
          className="z-[9999] px-3 py-2 text-xs text-dark-200 bg-dark-800 border border-dark-600 rounded-lg shadow-xl max-w-[20rem] text-left pointer-events-none whitespace-normal"
        >
          {lines.length > 1 ? lines.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-semibold text-white' : 'text-dark-300 mt-0.5'}>{line}</div>
          )) : text}
        </div>,
        document.body
      )}
    </span>
  );
}

// ── OddsButton — clickable odds badge → adds to betslip (S3+S12) ─────────
function OddsButton({ label, player, matchId }: { label: string; player: string; matchId: number }) {
  const { addSelection, isSelected } = useBetslip();
  // Use negative matchId as pseudo-market ID for upcoming matches (no real market yet)
  const pseudoMarketId = -matchId;
  const selectionId = -(matchId * 1000 + player.charCodeAt(0));
  const selected = isSelected(selectionId);

  const handleClick = () => {
    addSelection({
      marketId: pseudoMarketId,
      selectionId,
      name: shortName(player),
      odds: parseFloat(label),
      marketName: `M${matchId}`,
      marketType: 'match',
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`font-bold px-3 py-1.5 rounded-lg text-base min-w-[3.5rem] text-center transition-all ${
        selected
          ? 'bg-white text-blue-900 ring-2 ring-primary-400'
          : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
      }`}
    >
      {label}
    </button>
  );
}


// ── TrendArrow ──────────────────────────────────────────────────────────────
function TrendArrow({ player, history }: { player: string; history: Record<string, number[]> }) {
  const positions = history[player];
  if (!positions || positions.length < 2) return <span className="text-dark-600 text-sm">—</span>;
  const current = positions[positions.length - 1];
  const previous = positions[positions.length - 2];
  const diff = previous - current;
  if (diff > 0) return <span className="text-green-400 text-sm font-bold">▲{diff}</span>;
  if (diff < 0) return <span className="text-red-400 text-sm font-bold">▼{Math.abs(diff)}</span>;
  return <span className="text-dark-500 text-sm">—</span>;
}

// ── Standings position chart (SofaScore style) ─────────────────────────────
const CHART_COLORS = ['#4ade80', '#60a5fa', '#c084fc', '#fb923c', '#f472b6', '#facc15', '#34d399', '#a78bfa'];
const NUM_PLAYERS = 20;

function StandingsChart({
  history, gameNights, selectedPlayers, onTogglePlayer, allPlayers, t,
}: {
  history: Record<string, number[]>;
  gameNights: number;
  selectedPlayers: string[];
  onTogglePlayer: (p: string) => void;
  allPlayers: StandingEntry[];
  t: (key: TranslationKey) => string;
}) {
  const W = 800, H = 380;
  const PAD = { top: 30, right: 80, bottom: 50, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const xScale = (gn: number) => PAD.left + ((gn - 1) / Math.max(gameNights - 1, 1)) * chartW;
  const yScale = (pos: number) => PAD.top + ((pos - 1) / (NUM_PLAYERS - 1)) * chartH;

  return (
    <div className="card mb-6">
      <h3 className="text-base font-bold text-dark-300 mb-4">{t('tournament.positionChart')}</h3>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" style={{ maxHeight: 400 }}>
          {[1, 5, 10, 15, 20].map(pos => (
            <g key={pos}>
              <line x1={PAD.left} y1={yScale(pos)} x2={W - PAD.right} y2={yScale(pos)} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD.left - 8} y={yScale(pos) + 4} textAnchor="end" fill="#6b7280" fontSize="11">{pos}</text>
            </g>
          ))}
          <line x1={PAD.left} y1={yScale(8.5)} x2={W - PAD.right} y2={yScale(8.5)} stroke="#22c55e" strokeWidth="1" strokeDasharray="6 3" opacity="0.25" />
          {Array.from({ length: gameNights }, (_, i) => i + 1).map(gn => (
            <text key={gn} x={xScale(gn)} y={H - PAD.bottom + 18} textAnchor="middle" fill="#6b7280" fontSize="10">{gn}</text>
          ))}
          <text x={W / 2} y={H - 5} textAnchor="middle" fill="#9ca3af" fontSize="11">{t('tournament.gameNight')}</text>
          {selectedPlayers.map((player, idx) => {
            const positions = history[player];
            if (!positions || positions.length === 0) return null;
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const points = positions.map((pos, i) => `${xScale(i + 1)},${yScale(pos)}`).join(' ');
            const lastPos = positions[positions.length - 1];
            return (
              <g key={player}>
                <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {positions.map((pos, i) => (
                  <circle key={i} cx={xScale(i + 1)} cy={yScale(pos)} r="3" fill={color} stroke="#111827" strokeWidth="1.5" />
                ))}
                <text x={xScale(positions.length) + 8} y={yScale(lastPos) + 4} fill={color} fontSize="10" fontWeight="600">
                  {shortName(player)} ({lastPos})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {allPlayers.map((s) => {
          const selIdx = selectedPlayers.indexOf(s.player);
          const isSelected = selIdx >= 0;
          const color = isSelected ? CHART_COLORS[selIdx % CHART_COLORS.length] : undefined;
          return (
            <button
              key={s.player}
              onClick={() => onTogglePlayer(s.player)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors border ${
                isSelected ? 'text-white' : 'bg-dark-800 text-dark-400 hover:text-white border-dark-700'
              }`}
              style={isSelected ? { backgroundColor: color + '20', borderColor: color, color } : undefined}
              disabled={!isSelected && selectedPlayers.length >= 8}
            >
              #{s.rank} {shortName(s.player)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-dark-500 mt-2">{t('tournament.selectPlayers')}</p>
    </div>
  );
}

// ── Navbar (shared component) ───────────────────────────────────────────────

// ── Main component ──────────────────────────────────────────────────────────
type Tab = 'standings' | 'upcoming' | 'results';

export default function Tournament() {
  const { user, loading } = useAuth();
  const { t, locale } = useLanguage();
  const { addSelection: addSel, isSelected: isSel } = useBetslip();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);
  const [bracket, setBracket] = useState<PlayoffBracketResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [eloExpanded, setEloExpanded] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const chartInitRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  // WebSocket: live auto-refresh when results are entered (exponential backoff)
  useEffect(() => {
    if (!user) return;
    let delay = 5000;
    const maxDelay = 30000;
    const connectWebSocket = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      let wsUrl: string;
      if (apiUrl) {
        const baseUrl = apiUrl.replace(/\/api\/?$/, '');
        wsUrl = baseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/ws';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host.replace(':3000', ':8000')}/ws`;
      }
      try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => { delay = 5000; };
        ws.onmessage = () => { loadAllSilent(); };
        ws.onerror = () => {};
        ws.onclose = () => {
          setTimeout(connectWebSocket, delay);
          delay = Math.min(delay * 2, maxDelay);
        };
        return ws;
      } catch { return null; }
    };
    const ws = connectWebSocket();
    return () => { ws?.close(); };
  }, [user]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [r, res, u, b] = await Promise.all([
        api.getTournamentRatings(),
        api.getResults(),
        api.getUpcomingMatches(),
        api.getPlayoffBracket(),
      ]);
      setRatings(r); setResults(res); setUpcoming(u); setBracket(b);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  // Silent reload (no loading spinner — for WebSocket updates)
  const loadAllSilent = async () => {
    try {
      const [r, res, u, b] = await Promise.all([
        api.getTournamentRatings(),
        api.getResults(),
        api.getUpcomingMatches(),
        api.getPlayoffBracket(),
      ]);
      setRatings(r); setResults(res); setUpcoming(u); setBracket(b);
    } catch (err) { console.error(err); }
  };

  // ── Derive max round from actual results (not calendar math) ─────────────
  const maxRound = results.length > 0 ? Math.max(...results.map(r => r.round)) : 0;
  const dateFilteredResults = results.filter((m) => m.round <= maxRound);
  const standings = computeStandings(dateFilteredResults);

  // Build lookups
  const ratingsByPlayer: Record<string, PlayerRating> = {};
  ratings.forEach((r) => { ratingsByPlayer[r.player] = r; });
  const standingsByPlayer: Record<string, StandingEntry> = {};
  standings.forEach((s) => { standingsByPlayer[s.player] = s; });

  // Standings history for position chart (must be before early return — React hooks ordering)
  const { history: standingsHistory, gameNights: totalGameNights } = useMemo(() => {
    const maxGN = Math.ceil(maxRound / 2);
    const hist: Record<string, number[]> = {};
    for (let gn = 1; gn <= maxGN; gn++) {
      const throughRound = gn * 2;
      const filtered = dateFilteredResults.filter(m => m.round <= throughRound);
      const s = computeStandings(filtered);
      s.forEach(entry => {
        if (!hist[entry.player]) hist[entry.player] = [];
        hist[entry.player].push(entry.rank);
      });
    }
    return { history: hist, gameNights: maxGN };
  }, [dateFilteredResults, maxRound]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Default chart selection: top 8 on first load
  if (!chartInitRef.current && standings.length > 0) {
    chartInitRef.current = true;
    // Use setTimeout to avoid setState during render
    setTimeout(() => setSelectedPlayers(standings.slice(0, 8).map(s => s.player)), 0);
  }

  const togglePlayer = (player: string) => {
    setSelectedPlayers(prev =>
      prev.includes(player) ? prev.filter(p => p !== player) : prev.length < 8 ? [...prev, player] : prev
    );
  };

  // Group results by round
  const resultsByRound: Record<number, CompletedMatch[]> = {};
  dateFilteredResults.forEach((m) => {
    if (!resultsByRound[m.round]) resultsByRound[m.round] = [];
    resultsByRound[m.round].push(m);
  });
  const sortedResultRounds = Object.keys(resultsByRound).map(Number).sort((a, b) => b - a);

  // Group upcoming by round
  const upcomingByRound: Record<number, ScheduledMatch[]> = {};
  upcoming.forEach((m) => {
    if (!upcomingByRound[m.round]) upcomingByRound[m.round] = [];
    upcomingByRound[m.round].push(m);
  });
  const sortedUpcomingRounds = Object.keys(upcomingByRound).map(Number).sort((a, b) => a - b);

  // Tabs: Standings → Upcoming → Results (no Elo Ratings tab)
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'standings', label: t('tournament.standings') },
    { key: 'upcoming', label: t('tournament.upcoming') },
    { key: 'results', label: t('tournament.results'), count: dateFilteredResults.length },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="w-full px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-extrabold mb-3">{t('tournament.title')}</h1>
        <p className="text-dark-300 text-sm sm:text-lg mb-6 sm:mb-8">
          {t('tournament.totalMatches')}: <span className="text-white font-semibold">{results.length + upcoming.length}</span> &nbsp;·&nbsp; {t('tournament.completedMatches')}: <span className="text-white font-semibold">{results.length}</span> ({t('tournament.throughRound')} {maxRound}) &nbsp;·&nbsp; {t('tournament.remainingMatches')}: <span className="text-white font-semibold">{upcoming.length}</span>
        </p>

        <div className="grid grid-cols-3 gap-1 mb-8 bg-dark-900 rounded-xl p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2.5 rounded-lg text-sm sm:text-base font-semibold text-center transition-colors ${
                activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-1 text-xs sm:text-sm opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* ── Standings Tab ── */}
            {activeTab === 'standings' && (
              <>
                {totalGameNights >= 2 && (
                  <StandingsChart
                    history={standingsHistory}
                    gameNights={totalGameNights}
                    selectedPlayers={selectedPlayers}
                    onTogglePlayer={togglePlayer}
                    allPlayers={standings}
                    t={t}
                  />
                )}

                <div className="card overflow-x-auto">
                  <h2 className="text-xl font-bold mb-5">{t('tournament.roundRobin')}</h2>
                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-left text-dark-400 text-sm font-semibold border-b border-dark-700 uppercase tracking-wide">
                        <th className="pb-3 w-12">#</th>
                        <th className="pb-3">{t('tournament.player')}</th>
                        <th className="pb-3 text-center">{t('tournament.last5')}</th>
                        <th className="pb-3 text-center"><Tooltip text={t('tournament.trendTooltip')}>{t('tournament.trend')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                        <th className="pb-3 text-center">{t('tournament.played')}</th>
                        <th className="pb-3 text-center">{t('tournament.won')}</th>
                        <th className="pb-3 text-center">{t('tournament.lost')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsFor')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsAgainst')}</th>
                        <th className="pb-3 text-center">{t('tournament.legDiff')}</th>
                        <th className="pb-3 text-center"><Tooltip text={t('tournament.scoreTooltip')}>{t('tournament.score')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                        <th className="pb-3 text-center hidden sm:table-cell"><Tooltip text={t('tournament.tiebreakerTooltip')}>{t('tournament.tiebreakerCol')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                        <th className="pb-3 text-center hidden sm:table-cell"><Tooltip text={t('tournament.remainingTooltip')}>{t('tournament.remainingCol')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                        <th className="pb-3 text-center hidden sm:table-cell"><Tooltip text={t('tournament.winPctTooltip')}>{t('tournament.winRate')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                        <th className="pb-3 text-center hidden md:table-cell"><Tooltip text={t('tournament.eloTooltip')}>{t('tournament.elo')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s) => {
                        const winPct = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(0) : '0';
                        const playerRating = ratingsByPlayer[s.player];
                        const elo = playerRating ? playerRating.elo.toFixed(0) : '—';
                        const name = shortName(s.player);
                        // Per-player formula tooltips with actual data
                        const winPctFormula = locale === 'tr'
                          ? `${name}: ${s.wins} / ${s.played} × 100 = ${winPct}%\n(Galibiyetler / Oynanan Maçlar × 100)`
                          : `${name}: ${s.wins} / ${s.played} × 100 = ${winPct}%\n(Wins / Matches Played × 100)`;
                        // Compute actual K-factor decay for this player
                        const gp = playerRating ? playerRating.games_played : 0;
                        const decay = gp >= 30 ? 0.75 : +(1.5 + (0.75 - 1.5) * (gp / 30)).toFixed(2);
                        const kEff = +(32 * decay).toFixed(1);
                        const eloFormula = playerRating
                          ? locale === 'tr'
                            ? `${name}: ${elo} Elo (Sıra #${s.rank})\n${playerRating.wins}G ${playerRating.losses}M ${playerRating.draws}B — ${gp} maç\nK azalma: ${decay}× (${gp}/30 maç)\nEtkili K = 32 × ${decay} = ${kEff}\nHer maçta: ΔElo = ${kEff} × faz × MOV × (S−E)\nMOV: 3-0→1.30×, 3-1→1.10×, 3-2→0.85×`
                            : `${name}: ${elo} Elo (Rank #${s.rank})\n${playerRating.wins}W ${playerRating.losses}L ${playerRating.draws}D — ${gp} games\nK decay: ${decay}× (${gp}/30 games)\nEffective K = 32 × ${decay} = ${kEff}\nPer match: ΔElo = ${kEff} × phase × MOV × (S−E)\nMOV: 3-0→1.30×, 3-1→1.10×, 3-2→0.85×`
                          : '—';
                        return (
                          <tr key={s.player} className={`border-b border-dark-800 last:border-0 ${s.rank <= 8 ? 'bg-green-900/10' : ''}`}>
                            <td className="py-3.5">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                s.rank <= 8 ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'
                              }`}>{s.rank}</span>
                            </td>
                            <td className="py-3.5 font-bold text-lg">{name}</td>
                            <td className="py-3.5">
                              <div className="flex justify-center">
                                <FormBoxes player={s.player} results={dateFilteredResults} />
                              </div>
                            </td>
                            <td className="py-3.5 text-center">
                              <TrendArrow player={s.player} history={standingsHistory} />
                            </td>
                            <td className="py-3.5 text-center text-dark-300 text-base font-semibold">{s.played}</td>
                            <td className="py-3.5 text-center text-green-400 text-base font-semibold">{s.wins}</td>
                            <td className="py-3.5 text-center text-red-400 text-base font-semibold">{s.losses}</td>
                            <td className="py-3.5 text-center text-dark-300 text-base font-semibold hidden sm:table-cell">{s.legs_for}</td>
                            <td className="py-3.5 text-center text-dark-300 text-base font-semibold hidden sm:table-cell">{s.legs_against}</td>
                            <td className={`py-3.5 text-center text-base font-semibold ${
                              s.leg_diff > 0 ? 'text-green-400' : s.leg_diff < 0 ? 'text-red-400' : 'text-dark-400'
                            }`}>{s.leg_diff > 0 ? '+' : ''}{s.leg_diff}</td>
                            <td className="py-3.5 text-center">
                              <span className="px-2.5 py-1 rounded-md text-base font-semibold bg-primary-600/20 text-primary-400">{s.score ?? 0}</span>
                            </td>
                            <td className="py-3.5 text-center text-dark-300 text-base font-semibold hidden sm:table-cell">{s.tiebreaks ?? 0}</td>
                            <td className="py-3.5 text-center text-dark-400 text-base font-semibold hidden sm:table-cell">{s.remaining ?? 0}</td>
                            <td className="py-3.5 text-center hidden sm:table-cell">
                              <Tooltip text={winPctFormula}>
                                <span className={`px-2.5 py-1 rounded-md text-sm font-bold ${winPctBgClass(Number(winPct))}`}>{winPct}%</span>
                              </Tooltip>
                            </td>
                            <td className="py-3.5 text-center hidden md:table-cell">
                              <Tooltip text={eloFormula}>
                                <span className={`px-2.5 py-1 rounded-md text-base font-bold ${eloBgClass(Number(elo))}`}>{elo}</span>
                              </Tooltip>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {standings.length > 0 && (
                    <p className="text-xs text-dark-500 mt-3">{t('tournament.top8')}</p>
                  )}

                  {/* Elo explanation accordion */}
                  <div className="mt-4 border-t border-dark-700 pt-4">
                    <button
                      onClick={() => setEloExpanded(!eloExpanded)}
                      className="flex items-center gap-2 text-base font-semibold text-dark-300 hover:text-white transition-colors w-full text-left"
                    >
                      <span className={`transform transition-transform duration-200 text-sm ${eloExpanded ? 'rotate-90' : ''}`}>▶</span>
                      {t('tournament.eloExplainTitle')}
                    </button>
                    {eloExpanded && (
                      <div className="mt-4 space-y-4 text-sm text-dark-300">
                        <p>{t('tournament.eloExplainIntro')}</p>
                        <div className="space-y-1.5 bg-dark-800 rounded-lg p-4 font-mono text-xs">
                          <p className="text-primary-400">{t('tournament.eloFormula')}</p>
                          <p className="text-primary-400">{t('tournament.eloKFactor')}</p>
                          <p className="text-primary-400">{t('tournament.eloChange')}</p>
                        </div>
                        <div className="space-y-2 text-xs text-dark-400">
                          <p>• {t('tournament.initialElo')}</p>
                          <p>• {t('tournament.kBase')}</p>
                          <p>• {t('tournament.eloDecay')}</p>
                          <p>• {t('tournament.eloPhase')}</p>
                          <p>• {t('tournament.eloMov')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Upcoming Matches Tab ── */}
            {activeTab === 'upcoming' && (
              <div className="space-y-6">
                {sortedUpcomingRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-base font-bold text-dark-300 mb-4">
                      {t('tournament.round')} {round}
                      <span className="ml-2 text-sm text-dark-500 font-medium">({upcomingByRound[round].length} {t('tournament.matches')})</span>
                      <span className="ml-2 text-sm text-primary-400 font-semibold">{formatGameNight(round, locale)}</span>
                    </h3>
                    <div
                      className="hidden lg:grid items-center py-2 mb-1"
                      style={{ gridTemplateColumns: '1fr 5rem 4rem 10rem 17rem 10rem 4rem 5rem 1fr' }}
                    >
                      <div className="text-right pr-4 text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.player')}</div>
                      <div className="text-center text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.elo')}</div>
                      <div className="text-center text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.winRate')}</div>
                      <div className="text-right text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.last5')}</div>
                      <div></div>
                      <div className="text-left text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.last5')}</div>
                      <div className="text-center text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.winRate')}</div>
                      <div className="text-center text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.elo')}</div>
                      <div className="pl-4 text-xs uppercase tracking-wide text-dark-500 font-semibold">{t('tournament.player')}</div>
                    </div>
                    <div className="space-y-2">
                      {upcomingByRound[round].map((m) => {
                        const p1r = ratingsByPlayer[m.player1];
                        const p2r = ratingsByPlayer[m.player2];
                        const p1s = standingsByPlayer[m.player1];
                        const p2s = standingsByPlayer[m.player2];
                        const p1Elo = p1r ? p1r.elo : 1500;
                        const p2Elo = p2r ? p2r.elo : 1500;
                        const [odds1, odds2] = eloToOdds(p1Elo, p2Elo);
                        const p1Name = shortName(m.player1);
                        const p2Name = shortName(m.player2);
                        const p1EloStr = p1Elo.toFixed(0);
                        const p2EloStr = p2Elo.toFixed(0);
                        const p1WinPctNum = p1s && p1s.played > 0 ? Math.round((p1s.wins / p1s.played) * 100) : 0;
                        const p2WinPctNum = p2s && p2s.played > 0 ? Math.round((p2s.wins / p2s.played) * 100) : 0;
                        // Elo tooltips
                        const p1gp = p1r ? p1r.games_played : 0;
                        const p2gp = p2r ? p2r.games_played : 0;
                        const p1decay = p1gp >= 30 ? 0.75 : +(1.5 + (0.75 - 1.5) * (p1gp / 30)).toFixed(2);
                        const p2decay = p2gp >= 30 ? 0.75 : +(1.5 + (0.75 - 1.5) * (p2gp / 30)).toFixed(2);
                        const p1kEff = +(32 * p1decay).toFixed(1);
                        const p2kEff = +(32 * p2decay).toFixed(1);
                        const p1Rank = p1s ? p1s.rank : '—';
                        const p2Rank = p2s ? p2s.rank : '—';
                        const p1EloTip = p1r
                          ? locale === 'tr'
                            ? `${p1Name}: ${p1EloStr} Elo (Sıra #${p1Rank})\n${p1r.wins}G ${p1r.losses}M ${p1r.draws}B — ${p1gp} maç\nK azalma: ${p1decay}× (${p1gp}/30)\nEtkili K = 32 × ${p1decay} = ${p1kEff}\nΔElo = ${p1kEff} × faz × MOV × (S−E)`
                            : `${p1Name}: ${p1EloStr} Elo (Rank #${p1Rank})\n${p1r.wins}W ${p1r.losses}L ${p1r.draws}D — ${p1gp} games\nK decay: ${p1decay}× (${p1gp}/30)\nEffective K = 32 × ${p1decay} = ${p1kEff}\nΔElo = ${p1kEff} × phase × MOV × (S−E)`
                          : '—';
                        const p2EloTip = p2r
                          ? locale === 'tr'
                            ? `${p2Name}: ${p2EloStr} Elo (Sıra #${p2Rank})\n${p2r.wins}G ${p2r.losses}M ${p2r.draws}B — ${p2gp} maç\nK azalma: ${p2decay}× (${p2gp}/30)\nEtkili K = 32 × ${p2decay} = ${p2kEff}\nΔElo = ${p2kEff} × faz × MOV × (S−E)`
                            : `${p2Name}: ${p2EloStr} Elo (Rank #${p2Rank})\n${p2r.wins}W ${p2r.losses}L ${p2r.draws}D — ${p2gp} games\nK decay: ${p2decay}× (${p2gp}/30)\nEffective K = 32 × ${p2decay} = ${p2kEff}\nΔElo = ${p2kEff} × phase × MOV × (S−E)`
                          : '—';
                        // Win% tooltips
                        const p1WinTip = p1s && p1s.played > 0
                          ? locale === 'tr'
                            ? `${p1Name}: ${p1s.wins} / ${p1s.played} × 100 = ${p1WinPctNum}%\n(Galibiyetler / Oynanan Maçlar × 100)`
                            : `${p1Name}: ${p1s.wins} / ${p1s.played} × 100 = ${p1WinPctNum}%\n(Wins / Matches Played × 100)`
                          : '—';
                        const p2WinTip = p2s && p2s.played > 0
                          ? locale === 'tr'
                            ? `${p2Name}: ${p2s.wins} / ${p2s.played} × 100 = ${p2WinPctNum}%\n(Galibiyetler / Oynanan Maçlar × 100)`
                            : `${p2Name}: ${p2s.wins} / ${p2s.played} × 100 = ${p2WinPctNum}%\n(Wins / Matches Played × 100)`
                          : '—';
                        return (
                          <div key={m.match_id}>
                            {/* Desktop: full 9-column grid */}
                            <div
                              className="hidden lg:grid items-center py-3.5 rounded-lg bg-dark-800/50"
                              style={{ gridTemplateColumns: '1fr 5rem 4rem 10rem 17rem 10rem 4rem 5rem 1fr' }}
                            >
                              <div className="flex items-center justify-end pl-4 overflow-hidden">
                                <span className="font-bold text-lg truncate">{p1Name}</span>
                              </div>
                              <div className="flex items-center justify-center">
                                <Tooltip text={p1EloTip}>
                                  <span className={`px-2 py-1 rounded-md text-base font-bold ${eloBgClass(p1Elo)}`}>{p1EloStr}</span>
                                </Tooltip>
                              </div>
                              <div className="flex items-center justify-center">
                                <Tooltip text={p1WinTip}>
                                  <span className={`px-1.5 py-1 rounded-md text-base font-bold ${winPctBgClass(p1WinPctNum)}`}>{p1WinPctNum}%</span>
                                </Tooltip>
                              </div>
                              <div className="flex items-center justify-end">
                                <FormBoxes player={m.player1} results={dateFilteredResults} />
                              </div>
                              <div className="flex items-center justify-center gap-2.5">
                                <OddsButton label={odds1} player={m.player1} matchId={m.match_id} />
                                <span className="text-dark-400 text-sm whitespace-nowrap font-medium">{formatGameNight(round, locale)}</span>
                                <OddsButton label={odds2} player={m.player2} matchId={m.match_id} />
                              </div>
                              <div className="flex items-center justify-start">
                                <FormBoxes player={m.player2} results={dateFilteredResults} />
                              </div>
                              <div className="flex items-center justify-center">
                                <Tooltip text={p2WinTip}>
                                  <span className={`px-1.5 py-1 rounded-md text-base font-bold ${winPctBgClass(p2WinPctNum)}`}>{p2WinPctNum}%</span>
                                </Tooltip>
                              </div>
                              <div className="flex items-center justify-center">
                                <Tooltip text={p2EloTip}>
                                  <span className={`px-2 py-1 rounded-md text-base font-bold ${eloBgClass(p2Elo)}`}>{p2EloStr}</span>
                                </Tooltip>
                              </div>
                              <div className="flex items-center pr-4 overflow-hidden">
                                <span className="font-bold text-lg truncate">{p2Name}</span>
                              </div>
                            </div>
                            {/* Mobile: compact card — centered flex layout */}
                            <div className="lg:hidden p-3 rounded-lg bg-dark-800/50 space-y-2 overflow-hidden">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-base text-white truncate max-w-[40%] text-right">{p1Name}</span>
                                <span className="text-dark-500 text-xs font-bold shrink-0">VS</span>
                                <span className="font-bold text-base text-white truncate max-w-[40%] text-left">{p2Name}</span>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p1WinPctNum)}`}>{p1WinPctNum}%</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(p1Elo)}`}>{p1EloStr}</span>
                                <OddsButton label={odds1} player={m.player1} matchId={m.match_id} />
                                <OddsButton label={odds2} player={m.player2} matchId={m.match_id} />
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(p2Elo)}`}>{p2EloStr}</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p2WinPctNum)}`}>{p2WinPctNum}%</span>
                              </div>
                              <div className="flex items-center justify-center gap-3">
                                <FormBoxes player={m.player1} results={dateFilteredResults} />
                                <FormBoxes player={m.player2} results={dateFilteredResults} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* ── Playoff Bracket (list format) ── */}
                {bracket && bracket.quarterfinals.length > 0 && (
                  <div className="mt-8 space-y-4">
                    {/* ── Horizontal Bracket Flowchart ── */}
                    {(() => {
                      const finalistNames = bracket.top8.map(p => p.player);
                      const allInsights = computeAllInsights(finalistNames, results, locale as 'en' | 'tr');
                      const qfs = bracket.quarterfinals;

                      /* Compact QF card for horizontal bracket */
                      const QFCardH = ({ qf, idx }: { qf: typeof qfs[0]; idx: number }) => {
                        const ins1 = allInsights[qf.higher_seed] || { tag: '', strength: '', weakness: '' };
                        const ins2 = allInsights[qf.lower_seed] || { tag: '', strength: '', weakness: '' };
                        const mktId = -(9000 + idx);
                        const sel1Id = -(9000 + idx * 10 + 1);
                        const sel2Id = -(9000 + idx * 10 + 2);
                        return (
                          <div className="bg-dark-800 border border-dark-700 rounded-lg p-2">
                            <div className="text-[10px] text-dark-500 font-bold mb-1.5">{t('playoffs.quarterfinal')} {idx + 1}</div>
                            <div className="flex items-stretch gap-2">
                              {/* Player 1 (higher seed) */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-white text-xs truncate">{shortName(qf.higher_seed)}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`px-1 py-0.5 rounded text-[10px] font-bold leading-none ${eloBgClass(qf.elo_higher)}`}>{qf.elo_higher.toFixed(0)}</span>
                                    <button onClick={() => addSel({ marketId: mktId, selectionId: sel1Id, name: shortName(qf.higher_seed), odds: qf.odds_higher, marketName: `QF${idx+1}`, marketType: 'match' })} className={`font-bold px-1.5 py-0.5 rounded text-[10px] leading-none cursor-pointer transition-colors ${isSel(sel1Id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'}`}>{qf.odds_higher.toFixed(2)}</button>
                                  </div>
                                </div>
                                <div className="text-[10px] text-orange-400 font-bold italic truncate">{ins1.tag}</div>
                                <div className="flex items-start gap-1"><span className="text-green-400 text-[10px] shrink-0">▲</span><span className="text-[10px] text-dark-300 leading-tight">{ins1.strength}</span></div>
                                <div className="flex items-start gap-1"><span className="text-red-400 text-[10px] shrink-0">▼</span><span className="text-[10px] text-dark-400 leading-tight">{ins1.weakness}</span></div>
                              </div>
                              {/* VS divider */}
                              <div className="flex items-center">
                                <span className="text-[10px] text-dark-500 font-bold leading-none">VS</span>
                              </div>
                              {/* Player 2 (lower seed) */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-dark-200 text-xs truncate">{shortName(qf.lower_seed)}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className={`px-1 py-0.5 rounded text-[10px] font-bold leading-none ${eloBgClass(qf.elo_lower)}`}>{qf.elo_lower.toFixed(0)}</span>
                                    <button onClick={() => addSel({ marketId: mktId, selectionId: sel2Id, name: shortName(qf.lower_seed), odds: qf.odds_lower, marketName: `QF${idx+1}`, marketType: 'match' })} className={`font-bold px-1.5 py-0.5 rounded text-[10px] leading-none cursor-pointer transition-colors ${isSel(sel2Id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'}`}>{qf.odds_lower.toFixed(2)}</button>
                                  </div>
                                </div>
                                <div className="text-[10px] text-orange-400 font-bold italic truncate">{ins2.tag}</div>
                                <div className="flex items-start gap-1"><span className="text-green-400 text-[10px] shrink-0">▲</span><span className="text-[10px] text-dark-300 leading-tight">{ins2.strength}</span></div>
                                <div className="flex items-start gap-1"><span className="text-red-400 text-[10px] shrink-0">▼</span><span className="text-[10px] text-dark-400 leading-tight">{ins2.weakness}</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="overflow-x-auto">
                          <div className="min-w-[900px]">
                            <div className="grid grid-cols-[1fr_1.5rem_auto_1.5rem_auto_1.5rem_auto_1.5rem_1fr] items-center gap-y-3">
                              {/* Header row */}
                              <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.quarterfinals')}</div>
                              <div />
                              <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.semifinals')}</div>
                              <div />
                              <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.final')}</div>
                              <div />
                              <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.semifinals')}</div>
                              <div />
                              <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.quarterfinals')}</div>

                              {/* Row 1: QF1 — bracket — SF1 — line — Final — line — SF2 — bracket — QF3 */}
                              <QFCardH qf={qfs[0]} idx={0} />
                              {/* Left bracket connector ──┐ ├── ──┘ */}
                              <div className="row-span-2 self-stretch relative" style={{ width: '1.5rem' }}>
                                <div className="absolute left-0 h-px bg-dark-600" style={{ top: '25%', right: '50%' }} />
                                <div className="absolute left-0 h-px bg-dark-600" style={{ top: '75%', right: '50%' }} />
                                <div className="absolute w-px bg-dark-600" style={{ left: '50%', top: '25%', bottom: '25%' }} />
                                <div className="absolute right-0 h-px bg-dark-600" style={{ top: '50%', left: '50%' }} />
                              </div>
                              {/* SF1 */}
                              <div className="row-span-2 flex items-center">
                                <div className="bg-dark-800/60 border border-dark-700 border-dashed rounded-lg px-2 py-1.5 whitespace-nowrap text-center">
                                  <div className="text-[10px] text-dark-500 font-bold mb-0.5">SF1</div>
                                  <div className="text-[11px] text-dark-400 italic">{shortName(qfs[0]?.higher_seed)} / {shortName(qfs[0]?.lower_seed)}</div>
                                  <div className="text-[10px] text-dark-500 font-bold my-0.5 text-center">VS</div>
                                  <div className="text-[11px] text-dark-400 italic">{shortName(qfs[1]?.higher_seed)} / {shortName(qfs[1]?.lower_seed)}</div>
                                </div>
                              </div>
                              <div className="row-span-2 flex items-center justify-center"><div className="w-full h-0.5 bg-dark-600" /></div>
                              {/* Final */}
                              <div className="row-span-2 flex items-center">
                                <div className="bg-dark-800/60 border border-yellow-600/30 border-dashed rounded-lg px-3 py-1.5 whitespace-nowrap text-center">
                                  <div className="text-2xl mb-0.5">🏆</div>
                                  <div className="text-[10px] text-yellow-500 font-bold mb-0.5">{t('playoffs.final')}</div>
                                  <div className="text-[11px] text-dark-400 italic">SF1 {t('playoffs.winner')}</div>
                                  <div className="text-[10px] text-dark-500 font-bold my-0.5">VS</div>
                                  <div className="text-[11px] text-dark-400 italic">SF2 {t('playoffs.winner')}</div>
                                </div>
                              </div>
                              <div className="row-span-2 flex items-center justify-center"><div className="w-full h-0.5 bg-dark-600" /></div>
                              {/* SF2 */}
                              <div className="row-span-2 flex items-center">
                                <div className="bg-dark-800/60 border border-dark-700 border-dashed rounded-lg px-2 py-1.5 whitespace-nowrap text-center">
                                  <div className="text-[10px] text-dark-500 font-bold mb-0.5">SF2</div>
                                  <div className="text-[11px] text-dark-400 italic">{shortName(qfs[2]?.higher_seed)} / {shortName(qfs[2]?.lower_seed)}</div>
                                  <div className="text-[10px] text-dark-500 font-bold my-0.5 text-center">VS</div>
                                  <div className="text-[11px] text-dark-400 italic">{shortName(qfs[3]?.higher_seed)} / {shortName(qfs[3]?.lower_seed)}</div>
                                </div>
                              </div>
                              {/* Right bracket connector (mirrored) ┌── ──┤ └── */}
                              <div className="row-span-2 self-stretch relative" style={{ width: '1.5rem' }}>
                                <div className="absolute right-0 h-px bg-dark-600" style={{ top: '25%', left: '50%' }} />
                                <div className="absolute right-0 h-px bg-dark-600" style={{ top: '75%', left: '50%' }} />
                                <div className="absolute w-px bg-dark-600" style={{ left: '50%', top: '25%', bottom: '25%' }} />
                                <div className="absolute left-0 h-px bg-dark-600" style={{ top: '50%', right: '50%' }} />
                              </div>
                              <QFCardH qf={qfs[2]} idx={2} />

                              {/* Row 2: QF2 and QF4 (cols 2-8 auto-skipped by row-span-2) */}
                              <QFCardH qf={qfs[1]} idx={1} />
                              <QFCardH qf={qfs[3]} idx={3} />
                            </div>
                          </div>
                          <p className="text-xs text-dark-500 mt-4 text-center">{t('playoffs.liveOdds')}</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── Results Tab ── */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {sortedResultRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-base font-bold text-dark-300 mb-4">
                      {t('tournament.round')} {round}
                      <span className="ml-2 text-sm text-dark-500 font-medium">{formatGameNight(round, locale)}</span>
                    </h3>
                    <div className="space-y-2">
                      {resultsByRound[round].map((m) => {
                        const p1IsWinner = m.winner === m.player1;
                        const p2IsWinner = m.winner === m.player2;
                        return (
                          <div key={m.match_id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-dark-800/50">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-sm text-dark-500 w-10 shrink-0 font-medium">M{m.match_id}</span>
                              <span className={`font-semibold text-base truncate ${p1IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{shortName(m.player1)}</span>
                            </div>
                            <div className="flex items-center gap-3 px-4 shrink-0">
                              <span className={`text-2xl font-extrabold ${p1IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{m.score1}</span>
                              <span className="text-dark-600 text-lg">-</span>
                              <span className={`text-2xl font-extrabold ${p2IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{m.score2}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                              <span className={`font-semibold text-base truncate text-right ${p2IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{shortName(m.player2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {dateFilteredResults.length === 0 && (
                  <div className="card text-center py-12"><p className="text-dark-400">{t('tournament.noResults')}</p></div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
