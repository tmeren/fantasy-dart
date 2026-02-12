import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api, Market, PlayerRating, CompletedMatch, Selection } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import { shortName } from '@/lib/i18n';
import { eloBgClass, winPctBgClass, FormBoxes } from '@/lib/tournament-utils';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

/** Clickable odds in market cards — adds to betslip (S3+S12) */
function MarketsOddsList({ market }: { market: Market }) {
  const { addSelection, isSelected } = useBetslip();
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {market.selections.slice(0, 3).map((sel) => {
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
      {market.selections.length > 3 && (
        <span className="text-dark-400 text-sm self-center">+{market.selections.length - 3} {t('dashboard.more')}</span>
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
            <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">match</span>
            {market.betting_type === 'parimutuel' && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">pool</span>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded ${
            market.status === 'open' ? 'status-open' : market.status === 'closed' ? 'status-closed' : 'status-settled'
          }`}>{market.status}</span>
        </div>

        {/* Grid layout: 3 columns, 2 rows — ensures horizontal alignment */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-3">
          {/* Row 1: Player names + VS */}
          <div className="text-right font-bold text-lg text-white">{shortName(sel1.name)}</div>
          <div className="text-dark-500 text-sm font-bold text-center px-1">VS</div>
          <div className="text-left font-bold text-lg text-white">{shortName(sel2.name)}</div>

          {/* Row 2: Stats + Odds */}
          <div className="flex items-center justify-end gap-2">
            <span className={`px-2 py-0.5 rounded text-sm font-bold ${winPctBgClass(p1WinPct)}`}>{p1WinPct}%</span>
            <span className={`px-2 py-0.5 rounded text-sm font-bold ${eloBgClass(p1Elo)}`}>{p1Elo.toFixed(0)}</span>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={(e) => handleClick(e, sel1)}
              className={`font-bold px-3 py-1.5 rounded-lg text-base min-w-[3.5rem] text-center transition-all ${
                isSelected(sel1.id)
                  ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                  : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
              }`}
            >
              {displayOdds(sel1) > 0 ? displayOdds(sel1).toFixed(2) : '—'}
            </button>
            <button
              onClick={(e) => handleClick(e, sel2)}
              className={`font-bold px-3 py-1.5 rounded-lg text-base min-w-[3.5rem] text-center transition-all ${
                isSelected(sel2.id)
                  ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                  : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
              }`}
            >
              {displayOdds(sel2) > 0 ? displayOdds(sel2).toFixed(2) : '—'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-sm font-bold ${eloBgClass(p2Elo)}`}>{p2Elo.toFixed(0)}</span>
            <span className={`px-2 py-0.5 rounded text-sm font-bold ${winPctBgClass(p2WinPct)}`}>{p2WinPct}%</span>
          </div>

          {/* Row 3: Last 5 form */}
          <div className="flex justify-end">
            <FormBoxes player={sel1.name} results={results} />
          </div>
          <div />
          <div className="flex justify-start">
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

export default function Markets() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const filterLabels: Record<string, string> = {
    all: t('markets.all'),
    open: t('markets.open'),
    closed: t('markets.closed'),
    settled: t('markets.settled'),
  };

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadMarkets();
  }, [user, filter]);

  useEffect(() => {
    if (user) {
      api.getTournamentRatings().then(setRatings).catch(console.error);
      api.getResults().then(setResults).catch(console.error);
    }
  }, [user]);

  const loadMarkets = async () => {
    try {
      const data = await api.getMarkets(filter === 'all' ? undefined : filter);
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

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="w-full px-4 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('markets.title')}</h1>
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'closed', 'settled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {markets.map((market) =>
            market.market_type === 'match' && market.selections.length >= 2 ? (
              <MatchCard key={market.id} market={market} ratings={ratings} results={results} />
            ) : (
              <Link key={market.id} href={`/markets/${market.id}`}>
                <div className="card hover:border-primary-500/50 cursor-pointer transition-all h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        market.market_type === 'outright' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>{market.market_type}</span>
                      {market.betting_type === 'parimutuel' && (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">pool</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      market.status === 'open' ? 'status-open' : market.status === 'closed' ? 'status-closed' : 'status-settled'
                    }`}>{market.status}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{market.name}</h3>
                  {market.description && <p className="text-dark-400 text-sm mb-4">{market.description}</p>}
                  <MarketsOddsList market={market} />
                  <div className="text-dark-500 text-xs">{market.total_staked.toFixed(0)} {t('markets.tokensStaked')}</div>
                </div>
              </Link>
            )
          )}
        </div>

        {markets.length === 0 && (
          <div className="card text-center py-12"><p className="text-dark-400">{t('markets.noMarkets')}</p></div>
        )}
      </div>
    </div>
  );
}
