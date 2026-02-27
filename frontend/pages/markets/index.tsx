import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api, Market, PlayerRating, CompletedMatch, Selection, PlayoffBracketResponse, RemainingMatchOdds, StandingEntry } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import { shortName } from '@/lib/i18n';
import { eloBgClass, winPctBgClass, FormBoxes, getPlayerForm, computeAllInsights, computeStandings } from '@/lib/tournament-utils';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

/** Simple tooltip for column header icons */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return <span title={text} className="cursor-help">{children}</span>;
}

/** Simplified form trend indicator based on last 5 results */
function FormTrend({ player, results }: { player: string; results: CompletedMatch[] }) {
  const form = getPlayerForm(player, results);
  if (form.length === 0) return <span className="text-dark-600">—</span>;
  const wins = form.filter(r => r === 'W').length;
  if (wins >= 4) return <span className="text-green-400 font-bold">▲</span>;
  if (wins >= 3) return <span className="text-dark-400 font-bold">▶</span>;
  return <span className="text-red-400 font-bold">▼</span>;
}

type MainTab = 'league' | 'playoffs';

/** Clickable odds in market cards — adds to betslip (S3+S12) */
function MarketsOddsList({ market, top8Players }: { market: Market; top8Players?: string[] }) {
  const { addSelection, isSelected } = useBetslip();
  const { t } = useLanguage();

  // For outright markets: filter to top 8 only, sorted by odds asc
  const selections = market.market_type === 'outright' && top8Players && top8Players.length > 0
    ? [...market.selections]
        .filter(s => top8Players.some(n => s.name.includes(n) || n.includes(s.name)))
        .sort((a, b) => {
          const oddsA = market.betting_type === 'parimutuel' ? a.dynamic_odds : a.odds;
          const oddsB = market.betting_type === 'parimutuel' ? b.dynamic_odds : b.odds;
          return oddsA - oddsB;
        })
    : market.selections;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {selections.slice(0, 3).map((sel) => {
        const displayOdds = market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;
        const selected = isSelected(sel.id);
        return (
          <button
            key={sel.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (market.status === 'open' && displayOdds > 0) {
                addSelection({
                  marketId: market.id,
                  selectionId: sel.id,
                  name: shortName(sel.name),
                  odds: displayOdds,
                  marketName: market.name,
                  marketType: market.market_type,
                });
              }
            }}
            className="flex items-center gap-2 bg-dark-700 rounded px-2 py-1 hover:bg-dark-600 transition-colors"
          >
            <span className="text-sm">{shortName(sel.name)}</span>
            <span className={selected ? 'odds-badge-selected text-xs' : 'odds-badge text-xs'}>
              {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
            </span>
            {sel.is_winner && <span className="text-green-400 text-xs">✓</span>}
          </button>
        );
      })}
      {selections.length > 3 && (
        <span className="text-dark-400 text-sm self-center">+{selections.length - 3} {t('dashboard.more')}</span>
      )}
    </div>
  );
}

/** Head-to-head match card with Elo + Win% badges + Form */
function MatchCard({ market, ratings, results }: { market: Market; ratings: PlayerRating[]; results: CompletedMatch[] }) {
  const { addSelection, isSelected } = useBetslip();
  const { t } = useLanguage();

  const sel1 = market.selections[0];
  const sel2 = market.selections[1];
  if (!sel1 || !sel2) return null;

  const p1Rating = ratings.find(r => r.player === sel1.name);
  const p2Rating = ratings.find(r => r.player === sel2.name);
  const p1Elo = p1Rating ? p1Rating.elo : 1500;
  const p2Elo = p2Rating ? p2Rating.elo : 1500;
  const p1WinPct = p1Rating && p1Rating.games_played > 0 ? Math.round((p1Rating.wins / p1Rating.games_played) * 100) : 0;
  const p2WinPct = p2Rating && p2Rating.games_played > 0 ? Math.round((p2Rating.wins / p2Rating.games_played) * 100) : 0;

  const displayOdds = (sel: Selection) => market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;

  const handleClick = (e: React.MouseEvent, sel: Selection) => {
    e.preventDefault();
    e.stopPropagation();
    const odds = displayOdds(sel);
    if (market.status === 'open' && odds > 0) {
      addSelection({
        marketId: market.id,
        selectionId: sel.id,
        name: shortName(sel.name),
        odds,
        marketName: market.name,
        marketType: market.market_type,
      });
    }
  };

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="card hover:border-primary-500/50 cursor-pointer transition-all h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {(() => {
              const rm = market.name.match(/R(\d+)\s*M(\d+)/);
              return rm
                ? <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">R{rm[1]} · M{rm[2]}</span>
                : <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">{t('marketType.label.match' as any)}</span>;
            })()}
            {market.betting_type === 'parimutuel' && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">pool</span>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded ${
            market.status === 'open' ? 'status-open' : market.status === 'closed' ? 'status-closed' : 'status-settled'
          }`}>{t(`markets.${market.status}` as any)}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4 gap-y-2 sm:gap-y-3 overflow-hidden">
          <div className="text-right font-bold text-base sm:text-lg text-white truncate min-w-0">{shortName(sel1.name)}</div>
          <div className="text-dark-500 text-xs sm:text-sm font-bold text-center">VS</div>
          <div className="text-left font-bold text-base sm:text-lg text-white truncate min-w-0">{shortName(sel2.name)}</div>

          <div className="flex items-center justify-end gap-1 min-w-0">
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p1WinPct)}`}>{p1WinPct}%</span>
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(p1Elo)}`}>{p1Elo.toFixed(0)}</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2 justify-center">
            <button
              onClick={(e) => handleClick(e, sel1)}
              className={`font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-sm sm:text-base min-w-[2.75rem] sm:min-w-[3.5rem] text-center transition-all ${
                isSelected(sel1.id)
                  ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                  : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
              }`}
            >
              {displayOdds(sel1) > 0 ? displayOdds(sel1).toFixed(2) : '—'}
            </button>
            <button
              onClick={(e) => handleClick(e, sel2)}
              className={`font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-sm sm:text-base min-w-[2.75rem] sm:min-w-[3.5rem] text-center transition-all ${
                isSelected(sel2.id)
                  ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                  : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
              }`}
            >
              {displayOdds(sel2) > 0 ? displayOdds(sel2).toFixed(2) : '—'}
            </button>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(p2Elo)}`}>{p2Elo.toFixed(0)}</span>
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p2WinPct)}`}>{p2WinPct}%</span>
          </div>

          <div className="flex justify-end min-w-0 overflow-hidden">
            <FormBoxes player={sel1.name} results={results} />
          </div>
          <div />
          <div className="flex justify-start min-w-0 overflow-hidden">
            <FormBoxes player={sel2.name} results={results} />
          </div>
        </div>

        <div className="mt-4 text-dark-500 text-xs text-center">
          {market.total_staked.toFixed(0)} {t('markets.tokensStaked')}
        </div>
      </div>
    </Link>
  );
}

/** Remaining match odds card (from Elo, no DB market yet) */
function RemainingMatchCard({ match, results }: { match: RemainingMatchOdds; results: CompletedMatch[] }) {
  const { addSelection, isSelected } = useBetslip();

  const pseudoMarketId = -match.match_id;
  const sel1Id = -(match.match_id * 1000 + 1);
  const sel2Id = -(match.match_id * 1000 + 2);

  const handleClick = (player: string, odds: number, selId: number) => {
    if (odds > 0) {
      addSelection({
        marketId: pseudoMarketId,
        selectionId: selId,
        name: shortName(player),
        odds,
        marketName: `M${match.match_id}`,
        marketType: 'match',
      });
    }
  };

  const p1WinPct = Math.round((1 / match.odds1) * 100);
  const p2WinPct = Math.round((1 / match.odds2) * 100);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">R{match.round} · M{match.match_id}</span>
        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">pool</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4 gap-y-2 sm:gap-y-3 overflow-hidden">
        <div className="text-right font-bold text-base sm:text-lg text-white truncate min-w-0">{shortName(match.player1)}</div>
        <div className="text-dark-500 text-xs sm:text-sm font-bold text-center">VS</div>
        <div className="text-left font-bold text-base sm:text-lg text-white truncate min-w-0">{shortName(match.player2)}</div>

        <div className="flex items-center justify-end gap-1 min-w-0">
          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p1WinPct)}`}>{p1WinPct}%</span>
          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(match.elo1)}`}>{match.elo1.toFixed(0)}</span>
        </div>
        <div className="flex gap-1.5 sm:gap-2 justify-center">
          <button
            onClick={() => handleClick(match.player1, match.odds1, sel1Id)}
            className={`font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-sm sm:text-base min-w-[2.75rem] sm:min-w-[3.5rem] text-center transition-all ${
              isSelected(sel1Id)
                ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
            }`}
          >
            {match.odds1.toFixed(2)}
          </button>
          <button
            onClick={() => handleClick(match.player2, match.odds2, sel2Id)}
            className={`font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-sm sm:text-base min-w-[2.75rem] sm:min-w-[3.5rem] text-center transition-all ${
              isSelected(sel2Id)
                ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
            }`}
          >
            {match.odds2.toFixed(2)}
          </button>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(match.elo2)}`}>{match.elo2.toFixed(0)}</span>
          <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p2WinPct)}`}>{p2WinPct}%</span>
        </div>

        <div className="flex justify-end min-w-0 overflow-hidden">
          <FormBoxes player={match.player1} results={results} />
        </div>
        <div />
        <div className="flex justify-start min-w-0 overflow-hidden">
          <FormBoxes player={match.player2} results={results} />
        </div>
      </div>
    </div>
  );
}

export default function Markets() {
  const { user, loading } = useAuth();
  const { t, tDb, locale } = useLanguage();
  const { addSelection, isSelected } = useBetslip();
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>('playoffs');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [remainingMatches, setRemainingMatches] = useState<RemainingMatchOdds[]>([]);
  const [bracket, setBracket] = useState<PlayoffBracketResponse | null>(null);
  const [standings, setStandings] = useState<StandingEntry[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadMarkets();
  }, [user]);

  useEffect(() => {
    if (user) {
      api.getTournamentRatings().then(setRatings).catch(console.error);
      api.getResults().then(setResults).catch(console.error);
      api.getRemainingMatches().then(setRemainingMatches).catch(console.error);
    }
  }, [user]);

  // Lazy-load bracket when user switches to playoffs tab; compute standings from results
  useEffect(() => {
    if (user && mainTab === 'playoffs' && !bracket) {
      api.getPlayoffBracket().then(setBracket).catch(console.error);
    }
  }, [user, mainTab]);

  // Compute standings client-side from results (includes tiebreaks + remaining)
  useEffect(() => {
    if (results.length > 0) {
      setStandings(computeStandings(results));
    }
  }, [results]);

  const loadMarkets = async () => {
    try {
      const data = await api.getMarkets();
      setMarkets(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Split DB markets
  const outrightMarkets = markets.filter(m => m.market_type === 'outright');
  const matchMarkets = markets.filter(m => m.market_type === 'match' && m.status === 'open');

  // Group match markets by round (parsed from description "Round X — Match Y")
  const matchMarketsByRound: Record<number, Market[]> = {};
  matchMarkets.forEach(m => {
    const roundMatch = m.description?.match(/Round\s+(\d+)/i) || m.name?.match(/R(\d+)\s/);
    const round = roundMatch ? parseInt(roundMatch[1], 10) : 0;
    if (!matchMarketsByRound[round]) matchMarketsByRound[round] = [];
    matchMarketsByRound[round].push(m);
  });
  const sortedMatchRounds = Object.keys(matchMarketsByRound).map(Number).sort((a, b) => a - b);

  // Fallback: remaining matches without DB markets
  const matchMarketPlayerPairs = new Set(matchMarkets.map(m => {
    const names = m.selections.map(s => s.name).sort();
    return names.join('|');
  }));
  const unmatchedRemainingMatches = remainingMatches.filter(m => {
    const pair = [m.player1, m.player2].sort().join('|');
    return !matchMarketPlayerPairs.has(pair);
  });
  const unmatchedByRound: Record<number, RemainingMatchOdds[]> = {};
  unmatchedRemainingMatches.forEach(m => {
    if (!unmatchedByRound[m.round]) unmatchedByRound[m.round] = [];
    unmatchedByRound[m.round].push(m);
  });
  const unmatchedRounds = Object.keys(unmatchedByRound).map(Number).sort((a, b) => a - b);

  const tabs: { key: MainTab; label: string }[] = [
    { key: 'league', label: t('markets.tabLeague') },
    { key: 'playoffs', label: t('markets.tabPlayoffs') },
  ];

  return (
    <div className="min-h-screen bg-dark-950 overflow-x-hidden">
      <Navbar />
      <div className="w-full px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">{t('markets.title')}</h1>

        {/* Main tabs: League Games / Playoffs */}
        <div className="grid grid-cols-2 gap-1 mb-6 bg-dark-900 rounded-xl p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`py-2.5 rounded-lg text-sm sm:text-base font-semibold text-center transition-colors ${
                mainTab === tab.key ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── League Matches Tab ── */}
        {mainTab === 'league' && (
          <>
            {matchMarkets.length > 0 || unmatchedRemainingMatches.length > 0 ? (
              <>
                <h2 className="text-xl font-bold mb-4 text-dark-200">{t('markets.remainingMatches')} ({matchMarkets.length + unmatchedRemainingMatches.length})</h2>
                {/* DB-backed match markets (real bets) */}
                {sortedMatchRounds.map(round => (
                  <div key={`db-${round}`} className="mb-6">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3 uppercase tracking-wide">{t('tournament.round')} {round}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {matchMarketsByRound[round].map(market => (
                        <MatchCard key={market.id} market={market} ratings={ratings} results={results} />
                      ))}
                    </div>
                  </div>
                ))}
                {/* Fallback: remaining matches without DB markets yet */}
                {unmatchedRounds.map(round => (
                  <div key={`rem-${round}`} className="mb-6">
                    <h3 className="text-sm font-semibold text-dark-400 mb-3 uppercase tracking-wide">{t('tournament.round')} {round}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {unmatchedByRound[round].map(match => (
                        <RemainingMatchCard key={match.match_id} match={match} results={results} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="card text-center py-12"><p className="text-dark-400">{t('markets.noMarkets')}</p></div>
            )}
          </>
        )}

        {/* ── Playoffs Tab ── */}
        {mainTab === 'playoffs' && bracket && (
          <>
            {/* Outright tournament winner markets */}
            {outrightMarkets.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">{t('markets.outrightWinner')}</h2>
                {(() => {
                  const top8Players = bracket.top8.map(p => p.player);
                  const outrightInsights = computeAllInsights(top8Players, results, locale as 'en' | 'tr');
                  return outrightMarkets.map((market) => {
                  // Sort by model odds ascending
                  const sorted = [...market.selections]
                    .filter(s => top8Players.some(n => s.name.includes(n) || n.includes(s.name)))
                    .sort((a, b) => {
                      const mcA = bracket.outright_odds.find(o => a.name.includes(o.player) || o.player.includes(a.name));
                      const mcB = bracket.outright_odds.find(o => b.name.includes(o.player) || o.player.includes(b.name));
                      return (mcA?.odds ?? 999) - (mcB?.odds ?? 999);
                    });
                  return (
                    <Link key={market.id} href={`/markets/${market.id}`}>
                      <div className="card hover:border-primary-500/50 cursor-pointer transition-all mb-4 overflow-hidden">
                        {/* Desktop: horizontal grid */}
                        <div className="hidden sm:block overflow-x-auto pb-2">
                        <div className="grid gap-2" style={{ gridTemplateColumns: `5rem repeat(${sorted.length}, minmax(3.5rem, 1fr))` }}>
                          <div />
                          {sorted.map((sel) => (
                            <div key={sel.id} className="text-xs text-dark-300 truncate text-center font-semibold leading-tight">
                              {shortName(sel.name)}
                            </div>
                          ))}
                          {/* Nickname tags row */}
                          <div />
                          {sorted.map((sel) => {
                            const playerName = top8Players.find(n => sel.name.includes(n) || n.includes(sel.name)) || '';
                            const tag = outrightInsights[playerName]?.tag || '';
                            return (
                              <div key={`tag-${sel.id}`} className="text-xs text-orange-400 truncate text-center font-semibold italic leading-tight">
                                {tag}
                              </div>
                            );
                          })}
                          {/* Market odds row */}
                          <div className="text-xs text-yellow-500 font-semibold flex flex-col justify-center items-end text-right leading-tight">{locale === 'tr' ? <><div>Piyasa</div><div>Oranı</div></> : <><div>Market</div><div>Odds</div></>}</div>
                          {sorted.map((sel) => {
                            const displayOdds = market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;
                            return (
                              <div key={sel.id} className="flex justify-center">
                                <span className="font-bold px-2 py-1 rounded-lg text-sm bg-white text-blue-900 w-full text-center">
                                  {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                                </span>
                              </div>
                            );
                          })}
                          {/* Model odds row */}
                          <div className="text-xs text-green-400 font-semibold flex flex-col justify-center items-end text-right leading-tight">{locale === 'tr' ? <><div>Model</div><div>Oran</div></> : <><div>Model</div><div>Odds</div></>}</div>
                          {sorted.map((sel) => {
                            const mcEntry = bracket.outright_odds.find(o => sel.name.includes(o.player) || o.player.includes(sel.name));
                            return (
                              <div key={sel.id} className="flex justify-center">
                                <span className="font-bold px-2 py-1 rounded-lg text-sm bg-green-500/20 text-green-400 w-full text-center">
                                  {mcEntry ? mcEntry.odds.toFixed(2) : '—'}
                                </span>
                              </div>
                            );
                          })}
                          {/* Pool share row — donut charts with % / RTB */}
                          {market.betting_type === 'parimutuel' && market.total_staked > 0 && (
                            <>
                              <div className="text-xs text-fuchsia-400 font-semibold flex flex-col justify-center items-end text-right leading-tight">{locale === 'tr' ? <><div>Havuzdan</div><div>Payı</div><div className="text-[9px] text-fuchsia-400">(% / RTB)</div></> : <><div>Pool</div><div>Share</div><div className="text-[9px] text-fuchsia-400">(% / RTB)</div></>}</div>
                              {sorted.map((sel) => {
                                const pct = sel.pool_percentage;
                                const cx = 15, cy = 15, r = 13;
                                const angle = (pct / 100) * 360;
                                const rad = (angle - 90) * Math.PI / 180;
                                const x = cx + r * Math.cos(rad);
                                const y = cy + r * Math.sin(rad);
                                const largeArc = angle > 180 ? 1 : 0;
                                const piePath = pct >= 100
                                  ? '' // full circle handled by filled circle
                                  : pct > 0
                                    ? `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${x},${y} Z`
                                    : '';
                                return (
                                  <div key={sel.id} className="flex flex-col items-center gap-0.5 py-1">
                                    <svg width="30" height="30" viewBox="0 0 30 30">
                                      <circle cx={cx} cy={cy} r={r} className="fill-dark-600" />
                                      {pct >= 100
                                        ? <circle cx={cx} cy={cy} r={r} className="fill-fuchsia-500" />
                                        : piePath && <path d={piePath} className="fill-fuchsia-500" />
                                      }
                                    </svg>
                                    <span className="text-[10px] text-fuchsia-400 font-bold leading-none">{pct.toFixed(0)}% / {sel.pool_total.toFixed(0)}</span>
                                  </div>
                                );
                              })}
                              {/* Predictor share row — segmented vertical bars */}
                              <div className="text-xs text-blue-400 font-semibold flex flex-col justify-center items-end text-right leading-tight">{locale === 'tr' ? <><div>Tahminciden</div><div>Payı</div></> : <><div>Predictor</div><div>Share</div></>}</div>
                              {sorted.map((sel) => {
                                const total = market.total_unique_bettors || 0;
                                const selBettors = sel.unique_bettors || 0;
                                const pct = selBettors > 0 ? Math.round(total / selBettors) : 0;
                                const filledBars = Math.min(pct, 20);
                                return (
                                  <div key={sel.id} className="flex items-end gap-[1px] px-1 h-[1.75rem]">
                                    {Array.from({ length: 20 }, (_, i) => (
                                      <div key={i} className={`flex-1 rounded-[1px] ${i < filledBars ? 'bg-blue-500' : 'bg-dark-600'}`} style={{ height: '100%' }} />
                                    ))}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                        </div>
                        {/* Mobile: transposed — players as rows */}
                        <div className="sm:hidden space-y-1">
                          {sorted.map((sel) => {
                            const displayOdds = market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;
                            const mcEntry = bracket.outright_odds.find(o => sel.name.includes(o.player) || o.player.includes(sel.name));
                            const playerName = top8Players.find(n => sel.name.includes(n) || n.includes(sel.name)) || '';
                            const tag = outrightInsights[playerName]?.tag || '';
                            const pct = sel.pool_percentage;
                            return (
                              <div key={sel.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-dark-800/40">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm text-white truncate">{shortName(sel.name)}</div>
                                  {tag && <div className="text-xs text-orange-400 italic truncate">{tag}</div>}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-bold px-2 py-1 rounded-lg text-xs bg-white text-blue-900 min-w-[3rem] text-center">
                                    {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                                  </span>
                                  <span className="font-bold px-2 py-1 rounded-lg text-xs bg-green-500/20 text-green-400 min-w-[3rem] text-center">
                                    {mcEntry ? mcEntry.odds.toFixed(2) : '—'}
                                  </span>
                                  {market.betting_type === 'parimutuel' && market.total_staked > 0 && (
                                    <span className="text-xs text-fuchsia-400 font-bold min-w-[2.5rem] text-right">{pct.toFixed(0)}%</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {market.betting_type === 'parimutuel' && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3 text-dark-400">
                            <span>{t('marketDetail.totalPool')} <span className="text-fuchsia-400 font-semibold">{market.total_staked.toFixed(0)} RTB</span></span>
                            <span>{t('marketDetail.houseCut')} <span className="text-white font-semibold">{(market.house_cut * 100).toFixed(0)}%</span></span>
                            <span>{t('marketDetail.payoutPool')} <span className="text-green-400 font-semibold">{market.pool_after_cut.toFixed(0)} RTB</span></span>
                          </div>
                        )}
                        {!(market.betting_type === 'parimutuel') && (
                          <div className="text-dark-500 text-xs mt-3">{market.total_staked.toFixed(0)} {t('markets.tokensStaked')}</div>
                        )}

                        {market.betting_type === 'parimutuel' && (
                          <div className="mt-3" onClick={(e) => e.preventDefault()}>
                            <div className="p-3 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 leading-relaxed">
                              <span className="font-bold text-white">{t('marketDetail.howItWorks')}</span>
                              <ul className="mt-2 space-y-1.5 list-disc list-inside">
                                <li><span className="font-semibold text-yellow-500">{t('marketDetail.marketOddsTitle')}:</span> {t('marketDetail.marketOddsDesc')}</li>
                                <li><span className="font-semibold text-green-400">{t('marketDetail.modelOddsTitle')}:</span> {t('marketDetail.modelOddsDesc')}</li>
                                <li><span className="font-semibold text-fuchsia-400">{t('marketDetail.poolShareTitle')}:</span> {t('marketDetail.poolShareDesc')}</li>
                                <li><span className="font-semibold text-blue-400">{t('marketDetail.predictorShareTitle')}:</span> {t('marketDetail.predictorShareDesc')}</li>
                                <li><span className="font-semibold text-dark-200">{t('markets.poolSystem')}:</span> {t('marketDetail.howItWorksPool')}</li>
                                <li><span className="font-semibold text-dark-200">{t('marketDetail.houseCut')}</span> {t('markets.houseCutDisclaimer')}</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                });
                })()}
              </div>
            )}

            {/* Projected QF matchups with player insights */}
            <h2 className="text-xl font-bold mb-4">{t('markets.projectedQF')}</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {(() => {
                const finalistNames = bracket.top8.map(p => p.player);
                const allInsights = computeAllInsights(finalistNames, results, locale as 'en' | 'tr');
                return bracket.quarterfinals.map((qf, qfIdx) => {
                const pseudoMarketId = -(9000 + qfIdx);
                const sel1Id = -(9000 + qfIdx * 10 + 1);
                const sel2Id = -(9000 + qfIdx * 10 + 2);
                const ins1 = allInsights[qf.higher_seed] || { tag: '', strength: '', weakness: '' };
                const ins2 = allInsights[qf.lower_seed] || { tag: '', strength: '', weakness: '' };
                return (
                  <div key={qf.label} className="card !pt-2">
                    {/* QF title — above grid, tight to card top */}
                    <div className="text-center mb-2">
                      <span className="text-xs px-3 py-1 rounded bg-green-500/20 text-green-400 font-bold">{t('playoffs.quarterfinal')} {qfIdx + 1}</span>
                    </div>
                    {/* Grid layout: left | center (VS) | right — VS always at center */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                      {/* Row 1: Name + Elo + Odds | VS | Odds + Elo + Name */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-sm text-white truncate">{shortName(qf.higher_seed)}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-sm font-bold leading-none ${eloBgClass(qf.elo_higher)}`}>{qf.elo_higher.toFixed(0)}</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addSelection({
                                marketId: pseudoMarketId,
                                selectionId: sel1Id,
                                name: shortName(qf.higher_seed),
                                odds: qf.odds_higher,
                                marketName: qf.label,
                                marketType: 'match',
                              });
                            }}
                            className={`font-bold px-2.5 py-0.5 rounded-lg text-sm min-w-[3rem] text-center transition-all leading-none ${
                              isSelected(sel1Id)
                                ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                            }`}
                          >
                            {qf.odds_higher.toFixed(2)}
                          </button>
                        </div>
                      </div>
                      <span className="text-dark-500 text-xs font-bold text-center px-3">VS</span>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addSelection({
                                marketId: pseudoMarketId,
                                selectionId: sel2Id,
                                name: shortName(qf.lower_seed),
                                odds: qf.odds_lower,
                                marketName: qf.label,
                                marketType: 'match',
                              });
                            }}
                            className={`font-bold px-2.5 py-0.5 rounded-lg text-sm min-w-[3rem] text-center transition-all leading-none ${
                              isSelected(sel2Id)
                                ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                            }`}
                          >
                            {qf.odds_lower.toFixed(2)}
                          </button>
                          <span className={`px-1.5 py-0.5 rounded text-sm font-bold leading-none ${eloBgClass(qf.elo_lower)}`}>{qf.elo_lower.toFixed(0)}</span>
                        </div>
                        <span className="font-bold text-sm text-dark-200 truncate text-right">{shortName(qf.lower_seed)}</span>
                      </div>

                      {/* Row 2: Insights section — same grid, divider aligned with VS */}
                      {/* Insights header */}
                      <div className="col-span-3 mt-3 pt-3 border-t border-dark-700" />
                      {/* Higher seed insights — left */}
                      <div className="space-y-1 mt-2">
                        <div className="text-xs font-bold text-primary-400">{ins1.tag}</div>
                        <div className="flex items-start gap-1">
                          <span className="text-green-400 text-xs shrink-0">▲</span>
                          <span className="text-xs text-dark-300">{ins1.strength}</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="text-red-400 text-xs shrink-0">▼</span>
                          <span className="text-xs text-dark-400">{ins1.weakness}</span>
                        </div>
                      </div>
                      {/* Vertical divider — aligned with VS center */}
                      <div className="w-px bg-dark-700 justify-self-center mt-2 self-stretch" />
                      {/* Lower seed insights — right */}
                      <div className="space-y-1 flex flex-col items-end mt-2">
                        <div className="text-xs font-bold text-primary-400">{ins2.tag}</div>
                        <div className="flex items-start gap-1">
                          <span className="text-xs text-dark-300 text-right">{ins2.strength}</span>
                          <span className="text-green-400 text-xs shrink-0">▲</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="text-xs text-dark-400 text-right">{ins2.weakness}</span>
                          <span className="text-red-400 text-xs shrink-0">▼</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
              })()}
            </div>

            {/* Final Top 8 standings */}
            <h2 className="text-xl font-bold mb-4">{t('markets.top8Race')}</h2>
            <div className="card mb-8 overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-dark-400 text-sm font-semibold border-b border-dark-700 uppercase tracking-wide">
                    <th className="pb-3 w-12">#</th>
                    <th className="pb-3">{t('tournament.player')}</th>
                    <th className="pb-3 text-center">{t('tournament.last5')}</th>
                    <th className="pb-3 text-center"><Tip text={t('tournament.trendTooltip')}>{t('tournament.trend')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center">{t('tournament.played')}</th>
                    <th className="pb-3 text-center">{t('tournament.won')}</th>
                    <th className="pb-3 text-center">{t('tournament.lost')}</th>
                    <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsFor')}</th>
                    <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsAgainst')}</th>
                    <th className="pb-3 text-center">{t('tournament.diff')}</th>
                    <th className="pb-3 text-center"><Tip text={t('tournament.scoreTooltip')}>{t('tournament.score')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.tiebreakerTooltip')}>{t('tournament.tiebreakerCol')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.remainingTooltip')}>{t('tournament.remainingCol')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.winPctTooltip')}>{t('tournament.winRate')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.eloTooltip')}>{t('tournament.elo')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 8).map((s) => {
                    const winPct = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(0) : '0';
                    const playerRating = ratings.find(r => r.player === s.player);
                    const elo = playerRating ? playerRating.elo.toFixed(0) : '—';
                    return (
                      <tr key={s.player} className="border-b border-dark-800 last:border-0 bg-green-900/10">
                        <td className="py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-green-500/20 text-green-400">
                            {s.rank}
                          </span>
                        </td>
                        <td className="py-3 font-bold">{shortName(s.player)}</td>
                        <td className="py-3">
                          <div className="flex justify-center">
                            <FormBoxes player={s.player} results={results} />
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <FormTrend player={s.player} results={results} />
                        </td>
                        <td className="py-3 text-center text-dark-300 font-semibold">{s.played}</td>
                        <td className="py-3 text-center text-green-400 font-semibold">{s.wins}</td>
                        <td className="py-3 text-center text-red-400 font-semibold">{s.losses}</td>
                        <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_for}</td>
                        <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_against}</td>
                        <td className="py-3 text-center">
                          <span className={`font-semibold ${s.leg_diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {s.leg_diff >= 0 ? '+' : ''}{s.leg_diff}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2.5 py-1 rounded-md text-sm font-semibold bg-primary-600/20 text-primary-400">{s.score}</span>
                        </td>
                        <td className="py-3 text-center text-dark-300 font-semibold hidden sm:table-cell">{s.tiebreaks ?? 0}</td>
                        <td className="py-3 text-center text-dark-400 font-semibold hidden sm:table-cell">{s.remaining ?? 0}</td>
                        <td className="py-3 text-center hidden sm:table-cell">
                          <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${winPctBgClass(Number(winPct))}`}>{winPct}%</span>
                        </td>
                        <td className="py-3 text-center hidden sm:table-cell">
                          <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${eloBgClass(Number(elo))}`}>{elo}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rest of league (9th+) */}
            {standings.length > 8 && (
              <>
                <h2 className="text-xl font-bold mb-4">{t('markets.contenders')}</h2>
                <div className="card overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-left text-dark-400 text-sm font-semibold border-b border-dark-700 uppercase tracking-wide">
                        <th className="pb-3 w-12">#</th>
                        <th className="pb-3">{t('tournament.player')}</th>
                        <th className="pb-3 text-center">{t('tournament.last5')}</th>
                        <th className="pb-3 text-center">{t('tournament.trend')}</th>
                        <th className="pb-3 text-center">{t('tournament.played')}</th>
                        <th className="pb-3 text-center">{t('tournament.won')}</th>
                        <th className="pb-3 text-center">{t('tournament.lost')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsFor')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsAgainst')}</th>
                        <th className="pb-3 text-center">{t('tournament.diff')}</th>
                        <th className="pb-3 text-center">{t('tournament.score')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.tiebreakerCol')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.remainingCol')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.winRate')}</th>
                        <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.elo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.slice(8).map((s) => {
                        const winPct = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(0) : '0';
                        const playerRating = ratings.find(r => r.player === s.player);
                        const elo = playerRating ? playerRating.elo.toFixed(0) : '—';
                        return (
                          <tr key={s.player} className="border-b border-dark-800 last:border-0">
                            <td className="py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-dark-700 text-dark-400">
                                {s.rank}
                              </span>
                            </td>
                            <td className="py-3 font-bold text-dark-300">{shortName(s.player)}</td>
                            <td className="py-3">
                              <div className="flex justify-center">
                                <FormBoxes player={s.player} results={results} />
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <FormTrend player={s.player} results={results} />
                            </td>
                            <td className="py-3 text-center text-dark-400 font-semibold">{s.played}</td>
                            <td className="py-3 text-center text-dark-400">{s.wins}</td>
                            <td className="py-3 text-center text-dark-400">{s.losses}</td>
                            <td className="py-3 text-center text-dark-400 hidden sm:table-cell">{s.legs_for}</td>
                            <td className="py-3 text-center text-dark-400 hidden sm:table-cell">{s.legs_against}</td>
                            <td className="py-3 text-center">
                              <span className={`font-semibold ${s.leg_diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {s.leg_diff >= 0 ? '+' : ''}{s.leg_diff}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-2.5 py-1 rounded-md text-sm font-semibold bg-dark-700 text-dark-300">{s.score}</span>
                            </td>
                            <td className="py-3 text-center text-dark-400 font-semibold hidden sm:table-cell">{s.tiebreaks ?? 0}</td>
                            <td className="py-3 text-center text-dark-400 font-semibold hidden sm:table-cell">{s.remaining ?? 0}</td>
                            <td className="py-3 text-center hidden sm:table-cell">
                              <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${winPctBgClass(Number(winPct))}`}>{winPct}%</span>
                            </td>
                            <td className="py-3 text-center hidden sm:table-cell">
                              <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${eloBgClass(Number(elo))}`}>{elo}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {mainTab === 'playoffs' && !bracket && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}
