import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, StandingEntry, PlayerRating, CompletedMatch, ScheduledMatch } from '@/lib/api';
import Link from 'next/link';

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

/** Colored dots for last N match results (W=green, L=red, D=yellow) */
function FormDots({ player, results }: { player: string; results: CompletedMatch[] }) {
  const form: ('W' | 'L' | 'D')[] = [];
  // Walk results newest-first to get last 5
  for (let i = results.length - 1; i >= 0 && form.length < 5; i--) {
    const m = results[i];
    if (m.player1 === player || m.player2 === player) {
      if (m.is_draw) form.push('D');
      else if (m.winner === player) form.push('W');
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
            r === 'W' ? 'bg-green-400' : r === 'L' ? 'bg-red-400' : 'bg-yellow-400'
          }`}
          title={r}
        />
      ))}
    </div>
  );
}

type Tab = 'standings' | 'results' | 'upcoming' | 'ratings';

export default function Tournament() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('standings');
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduledMatch[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [s, r, res, u] = await Promise.all([
        api.getStandings(),
        api.getTournamentRatings(),
        api.getResults(),
        api.getUpcomingMatches(),
      ]);
      setStandings(s);
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

  // Build ratings lookup for standings cross-reference
  const ratingsByPlayer: Record<string, PlayerRating> = {};
  ratings.forEach((r) => { ratingsByPlayer[r.player] = r; });

  const resultsByRound: Record<number, CompletedMatch[]> = {};
  results.forEach((m) => {
    if (!resultsByRound[m.round]) resultsByRound[m.round] = [];
    resultsByRound[m.round].push(m);
  });
  const sortedResultRounds = Object.keys(resultsByRound).map(Number).sort((a, b) => b - a);

  const upcomingByRound: Record<number, ScheduledMatch[]> = {};
  upcoming.forEach((m) => {
    if (!upcomingByRound[m.round]) upcomingByRound[m.round] = [];
    upcomingByRound[m.round].push(m);
  });
  const sortedUpcomingRounds = Object.keys(upcomingByRound).map(Number).sort((a, b) => a - b);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'standings', label: t('tournament.standings') },
    { key: 'results', label: t('tournament.results'), count: results.length },
    { key: 'upcoming', label: t('tournament.upcoming'), count: upcoming.length },
    { key: 'ratings', label: t('tournament.eloRatings') },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{t('tournament.title')}</h1>
        <p className="text-dark-400 mb-6">
          {results.length} {t('tournament.matchesPlayed')} &middot; {upcoming.length} {t('tournament.remaining')}
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
            {activeTab === 'standings' && (
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">{t('tournament.roundRobin')}</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                      <th className="pb-3 w-12">#</th>
                      <th className="pb-3">{t('tournament.player')}</th>
                      <th className="pb-3 text-center">P</th>
                      <th className="pb-3 text-center">W</th>
                      <th className="pb-3 text-center">L</th>
                      <th className="pb-3 text-center">D</th>
                      <th className="pb-3 text-center hidden sm:table-cell">LF</th>
                      <th className="pb-3 text-center hidden sm:table-cell">LA</th>
                      <th className="pb-3 text-center">+/-</th>
                      <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.winRate')}</th>
                      <th className="pb-3 text-center hidden md:table-cell">{t('tournament.elo')}</th>
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
                              <FormDots player={s.player} results={results} />
                            </div>
                          </td>
                          <td className="py-3 text-center text-dark-300">{s.played}</td>
                          <td className="py-3 text-center text-green-400 font-semibold">{s.wins}</td>
                          <td className="py-3 text-center text-red-400">{s.losses}</td>
                          <td className="py-3 text-center text-yellow-400">{s.draws}</td>
                          <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_for}</td>
                          <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_against}</td>
                          <td className={`py-3 text-center font-semibold ${
                            s.leg_diff > 0 ? 'text-green-400' : s.leg_diff < 0 ? 'text-red-400' : 'text-dark-400'
                          }`}>{s.leg_diff > 0 ? '+' : ''}{s.leg_diff}</td>
                          <td className="py-3 text-center hidden sm:table-cell">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              Number(winPct) >= 60 ? 'bg-green-500/20 text-green-400' : Number(winPct) >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                            }`}>{winPct}%</span>
                          </td>
                          <td className="py-3 text-center hidden md:table-cell">
                            <span className={`font-bold text-sm ${
                              Number(elo) >= 1600 ? 'text-yellow-400' : Number(elo) >= 1500 ? 'text-green-400' : Number(elo) >= 1400 ? 'text-dark-300' : 'text-red-400'
                            }`}>{elo}</span>
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

            {activeTab === 'results' && (
              <div className="space-y-6">
                {sortedResultRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3">{t('tournament.round')} {round}</h3>
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
                            {m.is_draw && (
                              <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded shrink-0">{t('tournament.draw')}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="card text-center py-12"><p className="text-dark-400">{t('tournament.noResults')}</p></div>
                )}
              </div>
            )}

            {activeTab === 'upcoming' && (
              <div className="space-y-6">
                {sortedUpcomingRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3">
                      {t('tournament.round')} {round}
                      <span className="ml-2 text-xs text-dark-500">({upcomingByRound[round].length} {t('tournament.matches')})</span>
                    </h3>
                    <div className="space-y-2">
                      {upcomingByRound[round].map((m) => (
                        <div key={m.match_id} className="flex items-center justify-between py-3 px-3 rounded-lg bg-dark-800/50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs text-dark-500 w-8 shrink-0">M{m.match_id}</span>
                            <span className="font-medium truncate">{shortName(m.player1)}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 shrink-0">
                            <span className="text-dark-500 text-sm">vs</span>
                            <span className="text-xs text-dark-500 italic">{t('tournament.scheduleTbd')}</span>
                          </div>
                          <div className="flex items-center flex-1 min-w-0 justify-end">
                            <span className="font-medium truncate text-right">{shortName(m.player2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {upcoming.length === 0 && (
                  <div className="card text-center py-12"><p className="text-dark-400">{t('tournament.allPlayed')}</p></div>
                )}
              </div>
            )}

            {activeTab === 'ratings' && (
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">{t('tournament.eloRatings')}</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                      <th className="pb-3 w-12">#</th>
                      <th className="pb-3">{t('tournament.player')}</th>
                      <th className="pb-3 text-right">Elo</th>
                      <th className="pb-3 text-center">GP</th>
                      <th className="pb-3 text-center">W</th>
                      <th className="pb-3 text-center">L</th>
                      <th className="pb-3 text-center">D</th>
                      <th className="pb-3 text-right hidden sm:table-cell">Win%</th>
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
                          <td className="py-3 text-center text-yellow-400">{r.draws}</td>
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
                <p className="text-xs text-dark-500 mt-3">{t('tournament.eloSystem')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
