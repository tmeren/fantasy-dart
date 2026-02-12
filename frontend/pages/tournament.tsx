import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { api, StandingEntry, PlayerRating, CompletedMatch, ScheduledMatch } from '@/lib/api';
import Link from 'next/link';

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary-400">
          Fantasy Darts
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-dark-300 hover:text-white">Markets</Link>
          <Link href="/leaderboard" className="text-dark-300 hover:text-white">Leaderboard</Link>
          <Link href="/tournament" className="text-white font-medium">Tournament</Link>
          <Link href="/activity" className="text-dark-300 hover:text-white">Live Feed</Link>
          {user?.is_admin && <Link href="/admin" className="text-yellow-400">Admin</Link>}
          <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
            <div className="text-right">
              <div className="text-sm text-dark-400">{user?.name}</div>
              <div className="text-primary-400 font-bold">{user?.balance.toFixed(0)} tokens</div>
            </div>
            <button onClick={logout} className="text-dark-400 hover:text-red-400">Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

type Tab = 'standings' | 'results' | 'upcoming' | 'ratings';

export default function Tournament() {
  const { user, loading } = useAuth();
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

  // Group results by round
  const resultsByRound: Record<number, CompletedMatch[]> = {};
  results.forEach((m) => {
    if (!resultsByRound[m.round]) resultsByRound[m.round] = [];
    resultsByRound[m.round].push(m);
  });
  const sortedResultRounds = Object.keys(resultsByRound)
    .map(Number)
    .sort((a, b) => b - a);

  // Group upcoming by round
  const upcomingByRound: Record<number, ScheduledMatch[]> = {};
  upcoming.forEach((m) => {
    if (!upcomingByRound[m.round]) upcomingByRound[m.round] = [];
    upcomingByRound[m.round].push(m);
  });
  const sortedUpcomingRounds = Object.keys(upcomingByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'standings', label: 'Standings' },
    { key: 'results', label: 'Results', count: results.length },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'ratings', label: 'Elo Ratings' },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Tournament</h1>
        <p className="text-dark-400 mb-6">
          {results.length} matches played &middot; {upcoming.length} remaining
        </p>

        {/* Tabs */}
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
            {/* Standings Tab */}
            {activeTab === 'standings' && (
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">Round-Robin Standings</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                      <th className="pb-3 w-12">#</th>
                      <th className="pb-3">Player</th>
                      <th className="pb-3 text-center">P</th>
                      <th className="pb-3 text-center">W</th>
                      <th className="pb-3 text-center">L</th>
                      <th className="pb-3 text-center">D</th>
                      <th className="pb-3 text-center hidden sm:table-cell">LF</th>
                      <th className="pb-3 text-center hidden sm:table-cell">LA</th>
                      <th className="pb-3 text-center">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr
                        key={s.player}
                        className={`border-b border-dark-800 last:border-0 ${
                          s.rank <= 8 ? 'bg-green-900/10' : ''
                        }`}
                      >
                        <td className="py-3">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            s.rank <= 8
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-dark-700 text-dark-400'
                          }`}>
                            {s.rank}
                          </span>
                        </td>
                        <td className="py-3 font-medium">{s.player}</td>
                        <td className="py-3 text-center text-dark-300">{s.played}</td>
                        <td className="py-3 text-center text-green-400 font-semibold">{s.wins}</td>
                        <td className="py-3 text-center text-red-400">{s.losses}</td>
                        <td className="py-3 text-center text-yellow-400">{s.draws}</td>
                        <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_for}</td>
                        <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_against}</td>
                        <td className={`py-3 text-center font-semibold ${
                          s.leg_diff > 0 ? 'text-green-400' : s.leg_diff < 0 ? 'text-red-400' : 'text-dark-400'
                        }`}>
                          {s.leg_diff > 0 ? '+' : ''}{s.leg_diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {standings.length > 0 && (
                  <p className="text-xs text-dark-500 mt-3">
                    Top 8 (highlighted) qualify for knockout quarterfinals
                  </p>
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {sortedResultRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3">
                      Round {round}
                    </h3>
                    <div className="space-y-2">
                      {resultsByRound[round].map((m) => (
                        <div
                          key={m.match_id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-800/50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs text-dark-500 w-8 shrink-0">M{m.match_id}</span>
                            <span className={`font-medium truncate ${
                              m.winner === m.player1 ? 'text-green-400' : 'text-dark-300'
                            }`}>
                              {m.player1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 shrink-0">
                            <span className={`text-lg font-bold ${
                              m.winner === m.player1 ? 'text-green-400' : 'text-dark-400'
                            }`}>
                              {m.score1}
                            </span>
                            <span className="text-dark-600">-</span>
                            <span className={`text-lg font-bold ${
                              m.winner === m.player2 ? 'text-green-400' : 'text-dark-400'
                            }`}>
                              {m.score2}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                            <span className={`font-medium truncate text-right ${
                              m.winner === m.player2 ? 'text-green-400' : 'text-dark-300'
                            }`}>
                              {m.player2}
                            </span>
                          </div>
                          {m.is_draw && (
                            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded shrink-0">
                              Draw
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="card text-center py-12">
                    <p className="text-dark-400">No results yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Upcoming Tab */}
            {activeTab === 'upcoming' && (
              <div className="space-y-6">
                {sortedUpcomingRounds.map((round) => (
                  <div key={round} className="card">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3">
                      Round {round}
                      <span className="ml-2 text-xs text-dark-500">
                        ({upcomingByRound[round].length} matches)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {upcomingByRound[round].map((m) => (
                        <div
                          key={m.match_id}
                          className="flex items-center justify-between py-3 px-3 rounded-lg bg-dark-800/50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs text-dark-500 w-8 shrink-0">M{m.match_id}</span>
                            <span className="font-medium truncate">{m.player1}</span>
                          </div>
                          <span className="text-dark-500 text-sm px-3 shrink-0">vs</span>
                          <div className="flex items-center flex-1 min-w-0 justify-end">
                            <span className="font-medium truncate text-right">{m.player2}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {upcoming.length === 0 && (
                  <div className="card text-center py-12">
                    <p className="text-dark-400">All matches have been played!</p>
                  </div>
                )}
              </div>
            )}

            {/* Elo Ratings Tab */}
            {activeTab === 'ratings' && (
              <div className="card overflow-x-auto">
                <h2 className="text-lg font-semibold mb-4">Elo Ratings</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                      <th className="pb-3 w-12">#</th>
                      <th className="pb-3">Player</th>
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
                      const winPct = r.games_played > 0
                        ? ((r.wins / r.games_played) * 100).toFixed(0)
                        : '0';
                      return (
                        <tr
                          key={r.player}
                          className={`border-b border-dark-800 last:border-0 ${
                            r.rank <= 8 ? 'bg-green-900/10' : ''
                          }`}
                        >
                          <td className="py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              r.rank <= 3
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : r.rank <= 8
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-dark-700 text-dark-400'
                            }`}>
                              {r.rank}
                            </span>
                          </td>
                          <td className="py-3 font-medium">{r.player}</td>
                          <td className="py-3 text-right">
                            <span className={`font-bold ${
                              r.elo >= 1600 ? 'text-yellow-400' :
                              r.elo >= 1500 ? 'text-green-400' :
                              r.elo >= 1400 ? 'text-dark-300' :
                              'text-red-400'
                            }`}>
                              {r.elo.toFixed(0)}
                            </span>
                          </td>
                          <td className="py-3 text-center text-dark-300">{r.games_played}</td>
                          <td className="py-3 text-center text-green-400">{r.wins}</td>
                          <td className="py-3 text-center text-red-400">{r.losses}</td>
                          <td className="py-3 text-center text-yellow-400">{r.draws}</td>
                          <td className="py-3 text-right hidden sm:table-cell">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              Number(winPct) >= 60 ? 'bg-green-500/20 text-green-400' :
                              Number(winPct) >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {winPct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-dark-500 mt-3">
                  Elo system: K=32 base with games-played decay, phase weighting, and margin-of-victory adjustments
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
