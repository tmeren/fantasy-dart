import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { useLanguage } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, Market, Bet, PlayerRating, CompletedMatch, StandingEntry, OutrightOdds } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import { eloBgClass, winPctBgClass, FormBoxes } from '@/lib/tournament-utils';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

/** Elo bar component for match-type market selections */
function EloBar({ playerName, ratings }: { playerName: string; ratings: PlayerRating[] }) {
  const rating = ratings.find((r) => playerName.includes(r.player) || r.player.includes(playerName));
  if (!rating) return null;
  const elo = rating.elo;
  const minElo = 1200;
  const maxElo = 1800;
  const pct = Math.max(0, Math.min(100, ((elo - minElo) / (maxElo - minElo)) * 100));
  const color = elo >= 1600 ? 'bg-yellow-400' : elo >= 1500 ? 'bg-green-400' : elo >= 1400 ? 'bg-blue-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs text-dark-500 w-8">Elo</span>
      <div className="flex-1 bg-dark-700 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${elo >= 1600 ? 'text-yellow-400' : elo >= 1500 ? 'text-green-400' : elo >= 1400 ? 'text-dark-300' : 'text-red-400'}`}>
        {elo.toFixed(0)}
      </span>
    </div>
  );
}

export default function MarketDetail() {
  const { user, loading } = useAuth();
  const { t, tDb } = useLanguage();
  const router = useRouter();
  const { id } = router.query;
  const { addSelection, isSelected } = useBetslip();

  const [market, setMarket] = useState<Market | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [outrightOdds, setOutrightOdds] = useState<OutrightOdds[]>([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const [marketData, betsData, ratingsData, resultsData, standingsData, bracketData] = await Promise.all([
        api.getMarket(Number(id)),
        api.getAllBets(),
        api.getTournamentRatings(),
        api.getResults(),
        api.getStandings(),
        api.getPlayoffBracket(),
      ]);
      setMarket(marketData);
      setRatings(ratingsData);
      setResults(resultsData);
      setStandings(standingsData);
      setOutrightOdds(bracketData.outright_odds || []);
      setAllBets(betsData.filter(b =>
        marketData.selections.some(s => s.id === b.selection_id)
      ));
    } catch (err) {
      console.error(err);
    }
  };

  // For outright markets: only show top 8 qualified players, sorted by odds
  const top8Names = standings.slice(0, 8).map(s => s.player);

  if (loading || !user || !market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const isParimutuel = market.betting_type === 'parimutuel';
  const isMatch = market.market_type === 'match';

  const handleAddToBetslip = (sel: typeof market.selections[0]) => {
    const odds = isParimutuel ? sel.dynamic_odds : sel.odds;
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
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="w-full px-4 py-6 max-w-4xl mx-auto">
        <Link href="/markets" className="text-primary-400 hover:underline mb-4 inline-block">
          {t('marketDetail.backToMarkets')}
        </Link>

        {/* Match Hero Card — visual head-to-head for match markets */}
        {isMatch && market.selections.length >= 2 ? (() => {
          const sel1 = market.selections[0];
          const sel2 = market.selections[1];
          const p1Rating = ratings.find(r => r.player === sel1.name);
          const p2Rating = ratings.find(r => r.player === sel2.name);
          const p1Elo = p1Rating ? p1Rating.elo : 1500;
          const p2Elo = p2Rating ? p2Rating.elo : 1500;
          const p1WinPct = p1Rating && p1Rating.games_played > 0 ? Math.round((p1Rating.wins / p1Rating.games_played) * 100) : 0;
          const p2WinPct = p2Rating && p2Rating.games_played > 0 ? Math.round((p2Rating.wins / p2Rating.games_played) * 100) : 0;
          const odds1 = isParimutuel ? sel1.dynamic_odds : sel1.odds;
          const odds2 = isParimutuel ? sel2.dynamic_odds : sel2.odds;

          return (
            <div className="card mb-6">
              {/* Tags row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">{t('marketType.label.match' as any)}</span>
                  {isParimutuel && (
                    <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">pool</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  market.status === 'open' ? 'status-open' : market.status === 'closed' ? 'status-closed' : 'status-settled'
                }`}>{t(`markets.${market.status}` as any)}</span>
              </div>

              {/* Head-to-head grid */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-6 gap-y-2 sm:gap-y-3 overflow-hidden">
                {/* Row 1: Player names + VS */}
                <div className="text-right min-w-0">
                  <div className="font-bold text-lg sm:text-2xl text-white truncate">{shortName(sel1.name)}</div>
                  {sel1.is_winner && <span className="text-green-400 text-sm">🏆</span>}
                </div>
                <div className="text-dark-500 text-xs sm:text-sm font-bold text-center">VS</div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-lg sm:text-2xl text-white truncate">{shortName(sel2.name)}</div>
                  {sel2.is_winner && <span className="text-green-400 text-sm">🏆</span>}
                </div>

                {/* Row 2: Stats + Odds */}
                <div className="flex items-center justify-end gap-1 min-w-0">
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p1WinPct)}`}>{p1WinPct}%</span>
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(p1Elo)}`}>{p1Elo.toFixed(0)}</span>
                </div>
                <div className="flex gap-1.5 sm:gap-2 justify-center">
                  <button
                    onClick={() => handleAddToBetslip(sel1)}
                    className={`font-bold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-lg min-w-[2.75rem] sm:min-w-[4rem] text-center transition-all ${
                      isSelected(sel1.id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                    }`}
                  >
                    {odds1 > 0 ? odds1.toFixed(2) : '—'}
                  </button>
                  <button
                    onClick={() => handleAddToBetslip(sel2)}
                    className={`font-bold px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-lg min-w-[2.75rem] sm:min-w-[4rem] text-center transition-all ${
                      isSelected(sel2.id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                    }`}
                  >
                    {odds2 > 0 ? odds2.toFixed(2) : '—'}
                  </button>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${eloBgClass(p2Elo)}`}>{p2Elo.toFixed(0)}</span>
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold shrink-0 ${winPctBgClass(p2WinPct)}`}>{p2WinPct}%</span>
                </div>

                {/* Row 3: Elo bars */}
                <div className="col-span-3 grid grid-cols-2 gap-2 sm:gap-4 mt-2">
                  <EloBar playerName={sel1.name} ratings={ratings} />
                  <EloBar playerName={sel2.name} ratings={ratings} />
                </div>

                {/* Row 4: Last 5 form */}
                <div className="flex justify-end min-w-0">
                  <FormBoxes player={sel1.name} results={results} />
                </div>
                <div className="text-dark-500 text-xs text-center self-center">form</div>
                <div className="flex justify-start min-w-0">
                  <FormBoxes player={sel2.name} results={results} />
                </div>
              </div>

              {/* Pool stats */}
              <div className="flex flex-wrap gap-4 text-sm mt-5 pt-4 border-t border-dark-700 text-dark-400">
                <span>{t('marketDetail.totalPool')} <span className="text-white">{market.total_staked.toFixed(0)} {t('marketDetail.tokens')}</span></span>
                {isParimutuel && (
                  <>
                    <span>{t('marketDetail.houseCut')} <span className="text-white">{(market.house_cut * 100).toFixed(0)}%</span></span>
                    <span>{t('marketDetail.payoutPool')} <span className="text-green-400">{market.pool_after_cut.toFixed(0)} {t('marketDetail.tokens')}</span></span>
                  </>
                )}
              </div>

              {isParimutuel && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <span className="font-bold">{t('marketDetail.poolBetting')}</span> {t('marketDetail.poolBettingDesc')}
                  </p>
                </div>
              )}

              <div className="mt-3">
                <button
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <span className={`transition-transform ${showHowItWorks ? 'rotate-90' : ''}`}>▶</span>
                  {t('marketDetail.howItWorks')}
                </button>
                {showHowItWorks && (
                  <div className="mt-2 p-3 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 leading-relaxed">
                    {isParimutuel ? t('marketDetail.howItWorksPool') : t('marketDetail.howItWorksFixed')}
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          /* Non-match market (outright / prop) */
          <>
            <div className="card mb-6">
              <h1 className="text-3xl font-bold mb-2">{tDb(market.name)}</h1>
              {market.description && <p className="text-dark-400">{tDb(market.description)}</p>}
              <div className="flex flex-wrap gap-4 text-sm mt-4 text-dark-400">
                <span>{t('marketDetail.totalPool')} <span className="text-white">{market.total_staked.toFixed(0)} {t('marketDetail.tokens')}</span></span>
                {isParimutuel && (
                  <>
                    <span>{t('marketDetail.houseCut')} <span className="text-white">{(market.house_cut * 100).toFixed(0)}%</span></span>
                    <span>{t('marketDetail.payoutPool')} <span className="text-green-400">{market.pool_after_cut.toFixed(0)} {t('marketDetail.tokens')}</span></span>
                  </>
                )}
              </div>
              {isParimutuel && (
                <div className="mt-3 p-3 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 leading-relaxed">
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
              )}
            </div>

            {/* Selections — non-match only */}
            <div className="card overflow-x-auto">
              <h2 className="text-xl font-bold mb-4">{t('marketDetail.selections')}</h2>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-dark-400 text-sm font-semibold border-b border-dark-700 uppercase tracking-wide">
                    <th className="pb-3">{t('tournament.player')}</th>
                    {market.market_type === 'outright' && (
                      <th className="pb-3 text-center">{t('playoffs.mcOdds')}</th>
                    )}
                    <th className="pb-3 text-center">{t('playoffs.marketOdds')}</th>
                    {isParimutuel && market.total_staked > 0 && (
                      <th className="pb-3 text-center hidden sm:table-cell">{t('marketDetail.poolDistTitle')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(market.market_type === 'outright' && top8Names.length > 0
                    ? [...market.selections]
                        .filter(s => top8Names.some(n => s.name.includes(n) || n.includes(s.name)))
                        .sort((a, b) => {
                          // Sort by MC model odds (lowest first)
                          const mcA = outrightOdds.find(o => a.name.includes(o.player) || o.player.includes(a.name));
                          const mcB = outrightOdds.find(o => b.name.includes(o.player) || o.player.includes(b.name));
                          return (mcA?.odds ?? 999) - (mcB?.odds ?? 999);
                        })
                    : market.selections
                  ).map((sel) => {
                    const displayOdds = isParimutuel ? sel.dynamic_odds : sel.odds;
                    const mcEntry = outrightOdds.find(o => sel.name.includes(o.player) || o.player.includes(sel.name));
                    return (
                      <tr key={sel.id} className="border-b border-dark-800 last:border-0 bg-green-900/10">
                        <td className="py-3 font-bold">
                          <div className="flex items-center gap-2">
                            {sel.is_winner && <span className="text-green-400">🏆</span>}
                            {shortName(sel.name)}
                          </div>
                        </td>
                        {market.market_type === 'outright' && (
                          <td className="py-3 text-center">
                            <span className="font-bold px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm">
                              {mcEntry ? mcEntry.odds.toFixed(2) : '—'}
                            </span>
                          </td>
                        )}
                        <td className="py-3 text-center">
                          {market.status === 'open' && displayOdds > 0 ? (
                            <button
                              onClick={() => handleAddToBetslip(sel)}
                              className={`font-bold px-3 py-1 rounded-lg text-sm cursor-pointer transition-colors ${
                                isSelected(sel.id)
                                  ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                  : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                              }`}
                            >
                              {displayOdds.toFixed(2)}
                            </button>
                          ) : (
                            <span className="font-bold px-3 py-1 rounded-lg bg-dark-700 text-dark-500 text-sm">
                              {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                            </span>
                          )}
                        </td>
                        {isParimutuel && market.total_staked > 0 && (
                          <td className="py-3 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                                <div className="bg-fuchsia-500 h-full transition-all" style={{ width: `${sel.pool_percentage}%` }} />
                              </div>
                              <span className="text-dark-400 text-sm min-w-[60px] text-right">
                                {sel.pool_total.toFixed(0)} ({sel.pool_percentage.toFixed(0)}%)
                              </span>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Predictions on this market */}
        {allBets.length > 0 && (
          <div className="card mt-6">
            <h2 className="text-xl font-bold mb-4">{t('marketDetail.betsPlaced')}</h2>
            <div className="space-y-2">
              {allBets.map((bet) => (
                <div key={bet.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                  <div>
                    <span className="font-medium">{shortName(bet.user_name)}</span>
                    <span className="text-dark-400 mx-2">→</span>
                    <span className="text-primary-400">{shortName(bet.selection_name)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-dark-300">{bet.stake.toFixed(0)} {t('marketDetail.tokens')}</span>
                    <span className="text-dark-500 mx-2">@</span>
                    <span className="odds-badge">{bet.odds_at_time.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
