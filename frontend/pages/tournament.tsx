import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, StandingEntry, PlayerRating, CompletedMatch, ScheduledMatch } from '@/lib/api';
import Link from 'next/link';

// ── Round date mapping ──────────────────────────────────────────────────────
// First game night: Oct 29 2025. Every Wednesday, 2 rounds are played.
const TOURNAMENT_START = new Date('2025-10-29T00:00:00');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Get the game-night date for a given round (1-indexed). */
function getRoundDate(round: number): Date {
  const gameNight = Math.ceil(round / 2);
  return new Date(TOURNAMENT_START.getTime() + (gameNight - 1) * MS_PER_WEEK);
}

/** Last round whose game-night is on or before today. */
function getMaxPlayedRound(totalRounds: number = 38): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  for (let r = totalRounds; r >= 1; r--) {
    if (getRoundDate(r) <= now) return r;
  }
  return 0;
}

/** Format a game-night date for display. */
function formatGameNight(round: number, locale: string): string {
  const date = getRoundDate(round);
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ── Compute standings from results (frontend, date-filtered) ────────────────
function computeStandings(filteredResults: CompletedMatch[]): StandingEntry[] {
  const playerSet = new Set<string>();
  filteredResults.forEach((m) => {
    playerSet.add(m.player1);
    playerSet.add(m.player2);
  });

  const records: Record<string, { played: number; wins: number; losses: number; legs_for: number; legs_against: number }> = {};
  playerSet.forEach((p) => {
    records[p] = { played: 0, wins: 0, losses: 0, legs_for: 0, legs_against: 0 };
  });

  filteredResults.forEach((m) => {
    if (m.is_draw) return; // Skip draws (not possible in best-of-5)

    const r1 = records[m.player1];
    const r2 = records[m.player2];
    if (r1) {
      r1.played++;
      r1.legs_for += m.score1;
      r1.legs_against += m.score2;
      if (m.winner === m.player1) r1.wins++;
      else r1.losses++;
    }
    if (r2) {
      r2.played++;
      r2.legs_for += m.score2;
      r2.legs_against += m.score1;
      if (m.winner === m.player2) r2.wins++;
      else r2.losses++;
    }
  });

  const list: StandingEntry[] = Object.entries(records).map(([player, s]) => ({
    rank: 0,
    player,
    played: s.played,
    wins: s.wins,
    losses: s.losses,
    draws: 0,
    legs_for: s.legs_for,
    legs_against: s.legs_against,
    leg_diff: s.legs_for - s.legs_against,
  }));

  list.sort((a, b) => b.wins - a.wins || b.leg_diff - a.leg_diff || b.legs_for - a.legs_for);
  list.forEach((r, i) => { r.rank = i + 1; });
  return list;
}

// ── FormDots — last N match results (W=green, L=red) ──────────────────────
function FormDots({ player, results }: { player: string; results: CompletedMatch[] }) {
  const form: ('W' | 'L')[] = [];
  // results are newest-first; collect 5 most recent for this player
  for (let i = 0; i < results.length && form.length < 5; i++) {
    const m = results[i];
    if (m.is_draw) continue; // skip forfeits
    if (m.player1 === player || m.player2 === player) {
      if (m.winner === player) form.push('W');
      else form.push('L');
    }
  }
  if (form.length === 0) return null;
  return (
    <div className="flex gap-0.5 ml-2">
      {form.reverse().map((r, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            r === 'W' ? 'bg-green-400' : 'bg-red-400'
          }`}
          title={r}
        />
      ))}
    </div>
  );
}

// ── Tooltip (CSS hover — no state) ──────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-block cursor-help">
      {children}
      <span className="invisible group-hover/tip:visible opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-dark-200 bg-dark-800 border border-dark-600 rounded-lg shadow-xl w-72 text-left pointer-events-none whitespace-normal">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark-800" />
      </span>
    </span>
  );
}

// ── Elo → decimal odds ──────────────────────────────────────────────────────
function eloToOdds(elo1: number, elo2: number): [string, string] {
  const e1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const e2 = 1 - e1;
  return [(1 / e1).toFixed(2), (1 / e2).toFixed(2)];
}

// ── Elo color helper ────────────────────────────────────────────────────────
function eloColorClass(elo: number): string {
  if (elo >= 1600) return 'text-yellow-400';
  if (elo >= 1500) return 'text-green-400';
  if (elo >= 1400) return 'text-dark-300';
  return 'text-red-400';
}

// ── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary-400">
          {t('nav.brand')}
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-dark-300 hover:text-white">{t('nav.markets')}</Link>
          <Link href="/leaderboard" className="text-dark-300 hover:text-white">{t('nav.leaderboard')}</Link>
          <Link href="/tournament" className="text-white font-medium">{t('nav.tournament')}</Link>
          <Link href="/activity" className="text-dark-300 hover:text-white">{t('nav.liveFeed')}</Link>
          {user?.is_admin && <Link href="/admin" className="text-yellow-400">{t('nav.admin')}</Link>}
          <LanguageToggle />
          <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
            <div className="text-right">
              <div className="text-sm text-dark-400">{user?.name}</div>
              <div className="text-primary-400 font-bold">{user?.balance.toFixed(0)} {t('nav.tokens')}</div>
            </div>
            <button onClick={logout} className="text-dark-400 hover:text-red-400">{t('nav.logout')}</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
type Tab = 'standings' | 'results' | 'upcoming' | 'ratings';

export default function Tournament() {
  const { user, loading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [eloExpanded, setEloExpanded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [r, res, u] = await Promise.all([
        api.getTournamentRatings(),
        api.getResults(),
        api.getUpcomingMatches(),
      ]);
      setRatings(r);
      setResults(res);
      setUpcoming(u);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // ── Date-based filtering ──────────────────────────────────────────────────
  const maxRound = getMaxPlayedRound();

  // Only include results from rounds that have been played by date
  const dateFilteredResults = results.filter((m) => m.round <= maxRound);

  // Compute standings from date-filtered results (excludes future auto-wins)
  const standings = computeStandings(dateFilteredResults);

  // Build lookups for cross-reference
  const ratingsByPlayer: Record<string, PlayerRating> = {};
  ratings.forEach((r) => { ratingsByPlayer[r.player] = r; });
  const standingsByPlayer: Record<string, StandingEntry> = {};
  standings.forEach((s) => { standingsByPlayer[s.player] = s; });

  // Group results by round (date-filtered)
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

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'standings', label: t('tournament.standings') },
    { key: 'results', label: t('tournament.results'), count: dateFilteredResults.length },
    { key: 'upcoming', label: t('tournament.upcoming'), count: upcoming.length },
    { key: 'ratings', label: t('tournament.eloRatings') },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{t('tournament.title')}</h1>
        <p className="text-dark-400 mb-6">
          {t('tournament.totalMatches')}: {dateFilteredResults.length + upcoming.length} &nbsp;·&nbsp; {t('tournament.completedMatches')}: {dateFilteredResults.length} ({t('tournament.throughRound')} {maxRound}) &nbsp;·&nbsp; {t('tournament.remainingMatches')}: {upcoming.length}
        </p>

        <div className="flex gap-1 mb-6 bg-dark-900 rounded-lg p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
              )}
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
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">{t('tournament.roundRobin')}</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                      <th className="pb-3 w-12">#</th>
                      <th className="pb-3">{t('tournament.player')}</th>
                      <th className="pb-3 text-center">{t('tournament.played')}</th>
                      <th className="pb-3 text-center">{t('tournament.won')}</th>
                      <th className="pb-3 text-center">{t('tournament.lost')}</th>
                      <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsFor')}</th>
                      <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsAgainst')}</th>
                      <th className="pb-3 text-center">{t('tournament.legDiff')}</th>
                      <th className="pb-3 text-center hidden sm:table-cell"><Tooltip text={t('tournament.winPctTooltip')}>{t('tournament.winRate')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                      <th className="pb-3 text-center hidden md:table-cell"><Tooltip text={t('tournament.eloTooltip')}>{t('tournament.elo')} <span className="text-dark-500 text-xs">ⓘ</span></Tooltip></th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => {
                      const winPct = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(0) : '0';
                      const playerRating = ratingsByPlayer[s.player];
                      const elo = playerRating ? playerRating.elo.toFixed(0) : '—';
                      return (
                        <tr key={s.player} className={`border-b border-dark-800 last:border-0 ${s.rank <= 8 ? 'bg-green-900/10' : ''}`}>
                          <td className="py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              s.rank <= 8 ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'
                            }`}>{s.rank}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center">
                              <span className="font-medium">{shortName(s.player)}</span>
                              <FormDots player={s.player} results={dateFilteredResults} />
                            </div>
                          </td>
                          <td className="py-3 text-center text-dark-300">{s.played}</td>
                          <td className="py-3 text-center text-green-400 font-semibold">{s.wins}</td>
                          <td className="py-3 text-center text-red-400">{s.losses}</td>
                          <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_for}</td>
                          <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_against}</td>
                          <td className={`py-3 text-center font-semibold ${
                            s.leg_diff > 0 ? 'text-green-400' : s.leg_diff < 0 ? 'text-red-400' : 'text-dark-400'
                          }`}>{s.leg_diff > 0 ? '+' : ''}{s.leg_diff}</td>
                          <td className="py-3 text-center hidden sm:table-cell">
                            <Tooltip text={t('tournament.winPctTooltip')}>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                Number(winPct) >= 60 ? 'bg-green-500/20 text-green-400' : Number(winPct) >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                              }`}>{winPct}%</span>
                            </Tooltip>
                          </td>
                          <td className="py-3 text-center hidden md:table-cell">
                            <Tooltip text={t('tournament.eloTooltip')}>
                              <span className={`font-bold text-sm ${eloColorClass(Number(elo))}`}>{elo}</span>
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
              </div>
            )}

            {/* ── Results Tab ── */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {sortedResultRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3">
                      {t('tournament.round')} {round}
                      <span className="ml-2 text-xs text-dark-500">{formatGameNight(round, locale)}</span>
                    </h3>
                    <div className="space-y-2">
                      {resultsByRound[round].map((m) => {
                        const p1IsWinner = m.winner === m.player1;
                        const p2IsWinner = m.winner === m.player2;
                        return (
                          <div key={m.match_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-800/50">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-xs text-dark-500 w-8 shrink-0">M{m.match_id}</span>
                              <span className={`font-medium truncate ${p1IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{shortName(m.player1)}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 shrink-0">
                              <span className={`text-lg font-bold ${p1IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{m.score1}</span>
                              <span className="text-dark-600">-</span>
                              <span className={`text-lg font-bold ${p2IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{m.score2}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                              <span className={`font-medium truncate text-right ${p2IsWinner ? 'text-green-400' : 'text-red-400/60'}`}>{shortName(m.player2)}</span>
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

            {/* ── Upcoming Tab ── */}
            {activeTab === 'upcoming' && (
              <div className="space-y-6">
                {sortedUpcomingRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3">
                      {t('tournament.round')} {round}
                      <span className="ml-2 text-xs text-dark-500">({upcomingByRound[round].length} {t('tournament.matches')})</span>
                      <span className="ml-2 text-xs text-primary-400">{formatGameNight(round, locale)}</span>
                    </h3>
                    <div className="space-y-3">
                      {upcomingByRound[round].map((m) => {
                        const p1r = ratingsByPlayer[m.player1];
                        const p2r = ratingsByPlayer[m.player2];
                        const p1s = standingsByPlayer[m.player1];
                        const p2s = standingsByPlayer[m.player2];
                        const p1Elo = p1r ? p1r.elo : 1500;
                        const p2Elo = p2r ? p2r.elo : 1500;
                        const [odds1, odds2] = eloToOdds(p1Elo, p2Elo);
                        const p1WinPct = p1s && p1s.played > 0 ? ((p1s.wins / p1s.played) * 100).toFixed(0) : '—';
                        const p2WinPct = p2s && p2s.played > 0 ? ((p2s.wins / p2s.played) * 100).toFixed(0) : '—';
                        return (
                          <div key={m.match_id} className="py-3 px-4 rounded-lg bg-dark-800/50">
                            <div className="flex items-start justify-between gap-2">
                              {/* P1 side */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium truncate">{shortName(m.player1)}</span>
                                  <FormDots player={m.player1} results={dateFilteredResults} />
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-dark-400">
                                  <Tooltip text={t('tournament.eloTooltip')}>
                                    <span className={`${eloColorClass(p1Elo)} font-semibold`}>{p1Elo.toFixed(0)}</span>
                                  </Tooltip>
                                  <Tooltip text={t('tournament.winPctTooltip')}>
                                    <span>{p1WinPct !== '—' ? `${p1WinPct}%` : '—'}</span>
                                  </Tooltip>
                                </div>
                              </div>
                              {/* Center: odds + date */}
                              <div className="flex flex-col items-center shrink-0 px-2">
                                <div className="flex items-center gap-2 text-sm font-bold">
                                  <span className="text-primary-400 min-w-[2.5rem] text-right">{odds1}</span>
                                  <span className="text-dark-600">—</span>
                                  <span className="text-primary-400 min-w-[2.5rem] text-left">{odds2}</span>
                                </div>
                                <span className="text-[10px] text-dark-500 mt-0.5">{formatGameNight(round, locale)}</span>
                              </div>
                              {/* P2 side */}
                              <div className="flex-1 min-w-0 text-right">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <FormDots player={m.player2} results={dateFilteredResults} />
                                  <span className="font-medium truncate">{shortName(m.player2)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-dark-400 justify-end">
                                  <Tooltip text={t('tournament.winPctTooltip')}>
                                    <span>{p2WinPct !== '—' ? `${p2WinPct}%` : '—'}</span>
                                  </Tooltip>
                                  <Tooltip text={t('tournament.eloTooltip')}>
                                    <span className={`${eloColorClass(p2Elo)} font-semibold`}>{p2Elo.toFixed(0)}</span>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {upcoming.length === 0 && (
                  <div className="card text-center py-12"><p className="text-dark-400">{t('tournament.allPlayed')}</p></div>
                )}
              </div>
            )}

            {/* ── Elo Ratings Tab ── */}
            {activeTab === 'ratings' && (
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">{t('tournament.eloRatings')}</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                      <th className="pb-3 w-12">#</th>
                      <th className="pb-3">{t('tournament.player')}</th>
                      <th className="pb-3 text-right">Elo</th>
                      <th className="pb-3 text-center">{t('tournament.played')}</th>
                      <th className="pb-3 text-center">{t('tournament.won')}</th>
                      <th className="pb-3 text-center">{t('tournament.lost')}</th>
                      <th className="pb-3 text-right hidden sm:table-cell">{t('tournament.winRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((r) => {
                      const winPct = r.games_played > 0 ? ((r.wins / r.games_played) * 100).toFixed(0) : '0';
                      return (
                        <tr key={r.player} className={`border-b border-dark-800 last:border-0 ${r.rank <= 8 ? 'bg-green-900/10' : ''}`}>
                          <td className="py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              r.rank <= 3 ? 'bg-yellow-500/20 text-yellow-400' : r.rank <= 8 ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'
                            }`}>{r.rank}</span>
                          </td>
                          <td className="py-3 font-medium">{shortName(r.player)}</td>
                          <td className="py-3 text-right">
                            <span className={`font-bold ${r.elo >= 1600 ? 'text-yellow-400' : r.elo >= 1500 ? 'text-green-400' : r.elo >= 1400 ? 'text-dark-300' : 'text-red-400'}`}>{r.elo.toFixed(0)}</span>
                          </td>
                          <td className="py-3 text-center text-dark-300">{r.games_played}</td>
                          <td className="py-3 text-center text-green-400">{r.wins}</td>
                          <td className="py-3 text-center text-red-400">{r.losses}</td>
                          <td className="py-3 text-right hidden sm:table-cell">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              Number(winPct) >= 60 ? 'bg-green-500/20 text-green-400' : Number(winPct) >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                            }`}>{winPct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Elo explanation accordion */}
                <div className="mt-6 border-t border-dark-700 pt-4">
                  <button
                    onClick={() => setEloExpanded(!eloExpanded)}
                    className="flex items-center gap-2 text-sm font-medium text-dark-300 hover:text-white transition-colors w-full text-left"
                  >
                    <span className={`transform transition-transform duration-200 text-xs ${eloExpanded ? 'rotate-90' : ''}`}>▶</span>
                    {t('tournament.eloExplainTitle')}
                  </button>
                  {eloExpanded && (
                    <div className="mt-4 space-y-4 text-sm text-dark-300 animate-in fade-in">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
