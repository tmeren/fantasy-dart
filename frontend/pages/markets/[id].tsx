import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, Market, Bet, PlayerRating } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import { eloBgClass, winPctBgClass } from '@/lib/tournament-utils';
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
          <Link href="/tournament" className="text-dark-300 hover:text-white">{t('nav.tournament')}</Link>
          <Link href="/activity" className="text-dark-300 hover:text-white">{t('nav.liveFeed')}</Link>
          <Link href="/academy" className="text-dark-300 hover:text-white">{t('nav.academy')}</Link>
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
  const { user, loading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = router.query;
  const { addSelection, isSelected, kellyStake } = useBetslip();

  const [market, setMarket] = useState<Market | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [selectedSelection, setSelectedSelection] = useState<number | null>(null);
  const [stake, setStake] = useState<string>('10');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const [marketData, betsData, ratingsData] = await Promise.all([
        api.getMarket(Number(id)),
        api.getAllBets(),
        api.getTournamentRatings(),
      ]);
      setMarket(marketData);
      setRatings(ratingsData);
      setAllBets(betsData.filter(b =>
        marketData.selections.some(s => s.id === b.selection_id)
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedSelection || !stake) return;
    setError('');
    setSuccess('');
    setPlacing(true);

    try {
      await api.placeBet(selectedSelection, parseFloat(stake));
      setSuccess(t('marketDetail.betPlaced'));
      setSelectedSelection(null);
      setStake('10');
      loadData();
      refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (loading || !user || !market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const selectedSel = market.selections.find(s => s.id === selectedSelection);
  const isParimutuel = market.betting_type === 'parimutuel';
  const isMatch = market.market_type === 'match';
  const selectedOdds = selectedSel ? (isParimutuel ? selectedSel.dynamic_odds : selectedSel.odds) : 0;
  const stakeNum = parseFloat(stake || '0');
  const potentialWin = stakeNum * selectedOdds;
  const returnPct = stakeNum > 0 && selectedOdds > 0 ? ((potentialWin / stakeNum) - 1) * 100 : 0;

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link href="/markets" className="text-primary-400 hover:underline mb-4 inline-block">
          {t('marketDetail.backToMarkets')}
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Market Info & Selections */}
          <div className="lg:col-span-2">
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

                  {/* Head-to-head grid — matches MatchCard design */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-6 gap-y-3">
                    {/* Row 1: Player names + VS */}
                    <div
                      onClick={() => market.status === 'open' && setSelectedSelection(sel1.id)}
                      className={`text-right cursor-pointer rounded-lg p-2 transition-all ${
                        selectedSelection === sel1.id ? 'bg-primary-900/30 ring-1 ring-primary-500' : 'hover:bg-dark-700/50'
                      }`}
                    >
                      <div className="font-bold text-2xl text-white">{shortName(sel1.name)}</div>
                      {sel1.is_winner && <span className="text-green-400 text-sm">🏆</span>}
                    </div>
                    <div className="text-dark-500 text-sm font-bold text-center px-2">VS</div>
                    <div
                      onClick={() => market.status === 'open' && setSelectedSelection(sel2.id)}
                      className={`text-left cursor-pointer rounded-lg p-2 transition-all ${
                        selectedSelection === sel2.id ? 'bg-primary-900/30 ring-1 ring-primary-500' : 'hover:bg-dark-700/50'
                      }`}
                    >
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
                        onClick={() => {
                          if (market.status === 'open' && odds1 > 0) {
                            setSelectedSelection(sel1.id);
                            addSelection({ marketId: market.id, selectionId: sel1.id, name: shortName(sel1.name), odds: odds1, marketName: market.name, marketType: market.market_type });
                          }
                        }}
                        className={`font-bold px-4 py-2 rounded-lg text-lg min-w-[4rem] text-center transition-all ${
                          isSelected(sel1.id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                        }`}
                      >
                        {odds1 > 0 ? odds1.toFixed(2) : '—'}
                      </button>
                      <button
                        onClick={() => {
                          if (market.status === 'open' && odds2 > 0) {
                            setSelectedSelection(sel2.id);
                            addSelection({ marketId: market.id, selectionId: sel2.id, name: shortName(sel2.name), odds: odds2, marketName: market.name, marketType: market.market_type });
                          }
                        }}
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

                    {/* Row 3: Elo bars spanning full width */}
                    <div className="col-span-3 grid grid-cols-2 gap-4 mt-2">
                      <EloBar playerName={sel1.name} ratings={ratings} />
                      <EloBar playerName={sel2.name} ratings={ratings} />
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

                  {/* Pool betting info */}
                  {isParimutuel && (
                    <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        <span className="font-bold">{t('marketDetail.poolBetting')}</span> {t('marketDetail.poolBettingDesc')}
                      </p>
                    </div>
                  )}

                  {/* How it works — collapsible */}
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
              /* Non-match market — original layout */
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
                          onClick={() => market.status === 'open' && setSelectedSelection(sel.id)}
                          className={`p-4 rounded-lg border transition-all ${
                            market.status !== 'open'
                              ? 'bg-dark-800 border-dark-700 cursor-not-allowed opacity-60'
                              : selectedSelection === sel.id
                              ? 'bg-primary-900/30 border-primary-500 cursor-pointer'
                              : 'bg-dark-800 border-dark-700 hover:border-dark-500 cursor-pointer'
                          } ${sel.is_winner ? 'ring-2 ring-green-500' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {sel.is_winner && <span className="text-green-400 text-xl">🏆</span>}
                              <span className="font-medium text-lg">{shortName(sel.name)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (market.status === 'open' && displayOdds > 0) {
                                    addSelection({ marketId: market.id, selectionId: sel.id, name: shortName(sel.name), odds: displayOdds, marketName: market.name, marketType: market.market_type });
                                  }
                                }}
                                className={`${isSelected(sel.id) ? 'odds-badge-selected' : 'odds-badge'} text-lg px-4 py-2 cursor-pointer`}
                              >
                                {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                              </button>
                              {isParimutuel && displayOdds > 0 && (
                                <span className="text-xs text-dark-500">{t('marketDetail.est')}</span>
                              )}
                            </div>
                          </div>
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

          {/* Prediction Slip */}
          <div>
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold mb-4">{t('marketDetail.placeBet')}</h2>

              {market.status !== 'open' ? (
                <div className="text-center py-8">
                  <p className="text-dark-400">{t('marketDetail.marketIs')} {market.status}</p>
                  <p className="text-dark-500 text-sm mt-2">{t('marketDetail.bettingNotAvailable')}</p>
                </div>
              ) : (
                <>
                  {selectedSelection ? (
                    <div className="mb-4 p-3 bg-dark-700 rounded-lg">
                      <div className="text-sm text-dark-400">{t('marketDetail.selected')}</div>
                      <div className="font-semibold">
                        {shortName(market.selections.find(s => s.id === selectedSelection)?.name || '')}
                      </div>
                      <div className="text-primary-400">
                        @ {selectedOdds > 0 ? selectedOdds.toFixed(2) : '—'}
                        {isParimutuel && <span className="text-xs text-dark-500 ml-1">{t('marketDetail.current')}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark-400 mb-4">{t('marketDetail.selectPlayer')}</p>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm text-dark-400 mb-2">{t('marketDetail.stakeLabel')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        className="input pr-16"
                        min="1"
                        max={user.balance}
                        disabled={!selectedSelection}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">
                        {t('marketDetail.tokens')}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[10, 25, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setStake(String(Math.min(amount, user.balance)))}
                          className="btn-secondary text-sm py-1 px-3"
                          disabled={!selectedSelection}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSelection && stakeNum > 0 && (
                    <div className="mb-4 p-3 bg-dark-700 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-dark-400">{t('marketDetail.stakeLabel')}</span>
                        <span>{stakeNum.toFixed(0)} {t('marketDetail.tokens')}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-dark-400">
                          {isParimutuel ? t('marketDetail.currentOdds') : t('dashboard.odds')}
                        </span>
                        <span>{selectedOdds > 0 ? selectedOdds.toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t border-dark-600 pt-2 mt-2">
                        <span className="text-dark-300">
                          {isParimutuel ? t('marketDetail.estWin') : t('marketDetail.potentialWin')}
                        </span>
                        <span className="text-green-400">
                          {potentialWin > 0 ? `${potentialWin.toFixed(0)} ${t('marketDetail.tokens')}` : '—'}
                        </span>
                      </div>
                      {/* Return percentage */}
                      {returnPct > 0 && (
                        <div className="flex justify-between mt-1">
                          <span className="text-dark-400 text-sm">{t('marketDetail.returnPct')}</span>
                          <span className="text-green-400 text-sm font-semibold">+{returnPct.toFixed(0)}%</span>
                        </div>
                      )}
                      {/* Kelly Criterion suggestion (S8) */}
                      {selectedOdds > 1 && user.balance > 0 && (() => {
                        const impliedProb = 1 / selectedOdds;
                        const perceivedProb = Math.min(0.95, impliedProb * 1.10);
                        const kelly = kellyStake(user.balance, perceivedProb, selectedOdds);
                        return kelly > 0 ? (
                          <div className="flex justify-between mt-1 pt-1 border-t border-dark-600">
                            <span className="text-dark-400 text-sm">{t('betslip.kelly')}</span>
                            <button
                              onClick={() => setStake(String(kelly))}
                              className="text-primary-400 text-sm font-semibold hover:text-primary-300 cursor-pointer"
                            >
                              {kelly} {t('marketDetail.tokens')}
                            </button>
                          </div>
                        ) : null;
                      })()}
                      {isParimutuel && (
                        <p className="text-xs text-dark-500 mt-2">
                          {t('marketDetail.finalPayoutNote')}
                        </p>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm">
                      {success}
                    </div>
                  )}

                  <button
                    onClick={handlePlaceBet}
                    disabled={!selectedSelection || !stake || stakeNum <= 0 || placing}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {placing ? t('marketDetail.placing') : t('marketDetail.placeBet')}
                  </button>

                  <p className="text-dark-500 text-xs text-center mt-4">
                    {t('marketDetail.yourBalance')} {user.balance.toFixed(0)} {t('marketDetail.tokens')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
