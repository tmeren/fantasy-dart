import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { api, Market, Bet } from '@/lib/api';
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
          <Link href="/tournament" className="text-dark-300 hover:text-white">Tournament</Link>
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

export default function MarketDetail() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [market, setMarket] = useState<Market | null>(null);
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [selectedSelection, setSelectedSelection] = useState<number | null>(null);
  const [stake, setStake] = useState<string>('10');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const [marketData, betsData] = await Promise.all([
        api.getMarket(Number(id)),
        api.getAllBets(),
      ]);
      setMarket(marketData);
      // Filter bets for this market
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
      setSuccess('Bet placed successfully!');
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
  // Use dynamic odds for parimutuel, fixed odds otherwise
  const selectedOdds = selectedSel ? (isParimutuel ? selectedSel.dynamic_odds : selectedSel.odds) : 0;
  const potentialWin = parseFloat(stake || '0') * selectedOdds;

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link href="/markets" className="text-primary-400 hover:underline mb-4 inline-block">
          ← Back to Markets
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Market Info & Selections */}
          <div className="lg:col-span-2">
            <div className="card mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-2 py-1 rounded ${
                  market.market_type === 'outright' ? 'bg-purple-500/20 text-purple-400' :
                  market.market_type === 'match' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {market.market_type}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  market.status === 'open' ? 'status-open' :
                  market.status === 'closed' ? 'status-closed' : 'status-settled'
                }`}>
                  {market.status}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{market.name}</h1>
              {market.description && (
                <p className="text-dark-400">{market.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm mt-4 text-dark-400">
                <span>Total pool: <span className="text-white">{market.total_staked.toFixed(0)} tokens</span></span>
                {isParimutuel && (
                  <>
                    <span>House cut: <span className="text-white">{(market.house_cut * 100).toFixed(0)}%</span></span>
                    <span>Payout pool: <span className="text-green-400">{market.pool_after_cut.toFixed(0)} tokens</span></span>
                  </>
                )}
              </div>
              {isParimutuel && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <span className="font-bold">Pool Betting:</span> Odds change dynamically based on how others bet.
                    Your final payout depends on the pool at market close.
                  </p>
                </div>
              )}
            </div>

            {/* Selections */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Selections</h2>
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
                          {sel.is_winner && (
                            <span className="text-green-400 text-xl">🏆</span>
                          )}
                          <span className="font-medium text-lg">{sel.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="odds-badge text-lg px-4 py-2">
                            {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                          </span>
                          {isParimutuel && displayOdds > 0 && (
                            <span className="text-xs text-dark-500 ml-1">est.</span>
                          )}
                        </div>
                      </div>
                      {isParimutuel && market.total_staked > 0 && (
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary-500 h-full transition-all"
                              style={{ width: `${sel.pool_percentage}%` }}
                            />
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

            {/* Bets on this market */}
            {allBets.length > 0 && (
              <div className="card mt-6">
                <h2 className="text-xl font-bold mb-4">Bets Placed</h2>
                <div className="space-y-2">
                  {allBets.map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                      <div>
                        <span className="font-medium">{bet.user_name}</span>
                        <span className="text-dark-400 mx-2">→</span>
                        <span className="text-primary-400">{bet.selection_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-dark-300">{bet.stake.toFixed(0)} tokens</span>
                        <span className="text-dark-500 mx-2">@</span>
                        <span className="odds-badge">{bet.odds_at_time.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bet Slip */}
          <div>
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold mb-4">Place Bet</h2>

              {market.status !== 'open' ? (
                <div className="text-center py-8">
                  <p className="text-dark-400">This market is {market.status}</p>
                  <p className="text-dark-500 text-sm mt-2">Betting is no longer available</p>
                </div>
              ) : (
                <>
                  {selectedSelection ? (
                    <div className="mb-4 p-3 bg-dark-700 rounded-lg">
                      <div className="text-sm text-dark-400">Selected:</div>
                      <div className="font-semibold">
                        {market.selections.find(s => s.id === selectedSelection)?.name}
                      </div>
                      <div className="text-primary-400">
                        @ {selectedOdds > 0 ? selectedOdds.toFixed(2) : '—'}
                        {isParimutuel && <span className="text-xs text-dark-500 ml-1">(current)</span>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark-400 mb-4">Select a player above to place a bet</p>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm text-dark-400 mb-2">Stake</label>
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
                        tokens
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

                  {selectedSelection && parseFloat(stake) > 0 && (
                    <div className="mb-4 p-3 bg-dark-700 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-dark-400">Stake</span>
                        <span>{parseFloat(stake).toFixed(0)} tokens</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-dark-400">
                          {isParimutuel ? 'Current Odds' : 'Odds'}
                        </span>
                        <span>{selectedOdds > 0 ? selectedOdds.toFixed(2) : '—'}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t border-dark-600 pt-2 mt-2">
                        <span className="text-dark-300">
                          {isParimutuel ? 'Est. Win' : 'Potential Win'}
                        </span>
                        <span className="text-green-400">
                          {potentialWin > 0 ? `${potentialWin.toFixed(0)} tokens` : '—'}
                        </span>
                      </div>
                      {isParimutuel && (
                        <p className="text-xs text-dark-500 mt-2">
                          Final payout depends on pool at close
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
                    disabled={!selectedSelection || !stake || parseFloat(stake) <= 0 || placing}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {placing ? 'Placing...' : 'Place Bet'}
                  </button>

                  <p className="text-dark-500 text-xs text-center mt-4">
                    Your balance: {user.balance.toFixed(0)} tokens
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
