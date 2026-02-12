import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { useLanguage } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, Market, Bet, PlayerRating, CompletedMatch } from '@/lib/api';
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
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = router.query;
  const { addSelection, isSelected } = useBetslip();

  const [market, setMarket] = useState<Market | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const [marketData, betsData, ratingsData, resultsData] = await Promise.all([
        api.getMarket(Number(id)),
        api.getAllBets(),
        api.getTournamentRatings(),
        api.getResults(),
      ]);
      setMarket(marketData);
      setRatings(ratingsData);
      setResults(resultsData);
      setAllBets(betsData.filter(b =>
        marketData.selections.some(s => s.id === b.selection_id)
      ));
    } catch (err) {
      console.error(err);
    }
  };

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
                  <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">match</span>
                  {isParimutuel && (
                    <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">pool</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  market.status === 'open' ? 'status-open' : market.status === 'closed' ? 'status-closed' : 'status-settled'
                }`}>{market.status}</span>
              </div>

              {/* Head-to-head grid */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 gap-y-3">
                {/* Row 1: Player names + VS */}
                <div className="text-right">
                  <div className="font-bold text-2xl text-white">{shortName(sel1.name)}</div>
                  {sel1.is_winner && <span className="text-green-400 text-sm">🏆</span>}
                </div>
                <div className="text-dark-500 text-sm font-bold text-center px-2">VS</div>
                <div className="text-left">
                  <div className="font-bold text-2xl text-white">{shortName(sel2.name)}</div>
                  {sel2.is_winner && <span className="text-green-400 text-sm">🏆</span>}
                </div>

                {/* Row 2: Stats + Odds */}
                <div className="flex items-center justify-end gap-2">
                  <span className={`px-2 py-0.5 rounded text-sm font-bold ${winPctBgClass(p1WinPct)}`}>{p1WinPct}%</span>
                  <span className={`px-2 py-0.5 rounded text-sm font-bold ${eloBgClass(p1Elo)}`}>{p1Elo.toFixed(0)}</span>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => handleAddToBetslip(sel1)}
                    className={`font-bold px-4 py-2 rounded-lg text-lg min-w-[4rem] text-center transition-all ${
                      isSelected(sel1.id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                    }`}
                  >
                    {odds1 > 0 ? odds1.toFixed(2) : '—'}
                  </button>
                  <button
                    onClick={() => handleAddToBetslip(sel2)}
                    className={`font-bold px-4 py-2 rounded-lg text-lg min-w-[4rem] text-center transition-all ${
                      isSelected(sel2.id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                    }`}
                  >
                    {odds2 > 0 ? odds2.toFixed(2) : '—'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-sm font-bold ${eloBgClass(p2Elo)}`}>{p2Elo.toFixed(0)}</span>
                  <span className={`px-2 py-0.5 rounded text-sm font-bold ${winPctBgClass(p2WinPct)}`}>{p2WinPct}%</span>
                </div>

                {/* Row 3: Elo bars */}
                <div className="col-span-3 grid grid-cols-2 gap-4 mt-2">
                  <EloBar playerName={sel1.name} ratings={ratings} />
                  <EloBar playerName={sel2.name} ratings={ratings} />
                </div>

                {/* Row 4: Last 5 form */}
                <div className="flex justify-end">
                  <FormBoxes player={sel1.name} results={results} />
                </div>
                <div className="text-dark-500 text-xs text-center self-center">form</div>
                <div className="flex justify-start">
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
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-2 py-1 rounded ${
                  market.market_type === 'outright' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'
                }`}>{market.market_type}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  market.status === 'open' ? 'status-open' : market.status === 'closed' ? 'status-closed' : 'status-settled'
                }`}>{market.status}</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{market.name}</h1>
              {market.description && <p className="text-dark-400">{market.description}</p>}
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

            {/* Selections — non-match only */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('marketDetail.selections')}</h2>
              <div className="space-y-3">
                {market.selections.map((sel) => {
                  const displayOdds = isParimutuel ? sel.dynamic_odds : sel.odds;
                  return (
                    <div
                      key={sel.id}
                      className={`p-4 rounded-lg border transition-all ${
                        market.status !== 'open'
                          ? 'bg-dark-800 border-dark-700 opacity-60'
                          : 'bg-dark-800 border-dark-700 hover:border-dark-500'
                      } ${sel.is_winner ? 'ring-2 ring-green-500' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {sel.is_winner && <span className="text-green-400 text-xl">🏆</span>}
                          <span className="font-medium text-lg">{shortName(sel.name)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAddToBetslip(sel)}
                            className={`${isSelected(sel.id) ? 'odds-badge-selected' : 'odds-badge'} text-lg px-4 py-2 cursor-pointer`}
                          >
                            {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                          </button>
                          {isParimutuel && displayOdds > 0 && (
                            <span className="text-xs text-dark-500">{t('marketDetail.est')}</span>
                          )}
                        </div>
                      </div>
                      {isMatch && <EloBar playerName={sel.name} ratings={ratings} />}
                      {isParimutuel && market.total_staked > 0 && (
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-primary-500 h-full transition-all" style={{ width: `${sel.pool_percentage}%` }} />
                          </div>
                          <span className="text-dark-400 min-w-[80px] text-right">
                            {sel.pool_total.toFixed(0)} ({sel.pool_percentage.toFixed(0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
