import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { api, Market } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import { shortName } from '@/lib/i18n';
import Link from 'next/link';

function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary-400">{t('nav.brand')}</Link>
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-white font-medium">{t('nav.markets')}</Link>
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

export default function Markets() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t('markets.title')}</h1>
          <div className="flex gap-2">
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
          {markets.map((market) => (
            <Link key={market.id} href={`/markets/${market.id}`}>
              <div className="card hover:border-primary-500/50 cursor-pointer transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      market.market_type === 'outright' ? 'bg-purple-500/20 text-purple-400' :
                      market.market_type === 'match' ? 'bg-blue-500/20 text-blue-400' :
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
          ))}
        </div>

        {markets.length === 0 && (
          <div className="card text-center py-12"><p className="text-dark-400">{t('markets.noMarkets')}</p></div>
        )}
      </div>
    </div>
  );
}
