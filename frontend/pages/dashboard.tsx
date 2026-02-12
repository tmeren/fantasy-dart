import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { api, Market, Bet, Activity } from '@/lib/api';
import Link from 'next/link';

function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary-400">
          {t('nav.brand')}
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-dark-300 hover:text-white transition-colors">
            {t('nav.markets')}
          </Link>
          <Link href="/leaderboard" className="text-dark-300 hover:text-white transition-colors">
            {t('nav.leaderboard')}
          </Link>
          <Link href="/tournament" className="text-dark-300 hover:text-white transition-colors">
            {t('nav.tournament')}
          </Link>
          <Link href="/activity" className="text-dark-300 hover:text-white transition-colors">
            {t('nav.liveFeed')}
          </Link>
          {user?.is_admin && (
            <Link href="/admin" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              {t('nav.admin')}
            </Link>
          )}
          <LanguageToggle />
          <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
            <div className="text-right">
              <div className="text-sm text-dark-400">{user?.name}</div>
              <div className="text-primary-400 font-bold">{user?.balance.toFixed(0)} {t('nav.tokens')}</div>
            </div>
            <button onClick={logout} className="text-dark-400 hover:text-red-400 transition-colors">
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Dashboard() {
  const { user, loading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
      connectWebSocket();
    }
    return () => {
      ws?.close();
    };
  }, [user]);

  const loadData = async () => {
    try {
      const [marketsData, betsData, activitiesData] = await Promise.all([
        api.getMarkets('open'),
        api.getMyBets(),
        api.getActivities(10),
      ]);
      setMarkets(marketsData);
      setMyBets(betsData);
      setActivities(activitiesData);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(t('dashboard.connectionError'));
    }
  };

  const connectWebSocket = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    let wsUrl: string;
    if (apiUrl) {
      wsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host.replace(':3000', ':8000')}/ws`;
    }

    const websocket = new WebSocket(wsUrl);
    websocket.onmessage = () => {
      loadData();
      refreshUser();
    };
    websocket.onerror = () => console.log('WebSocket error');
    websocket.onclose = () => setTimeout(connectWebSocket, 5000);

    setWs(websocket);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const activeBets = myBets.filter(b => b.status === 'active');
  const totalAtRisk = activeBets.reduce((sum, b) => sum + b.stake, 0);
  const potentialWin = activeBets.reduce((sum, b) => sum + b.potential_win, 0);

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-between">
            <span className="text-red-400">{error}</span>
            <button onClick={loadData} className="px-4 py-1.5 bg-red-500/30 text-red-300 rounded hover:bg-red-500/40 text-sm">
              {t('dashboard.retry')}
            </button>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('dashboard.welcome')} {user.name}</h1>
          <p className="text-dark-400">{t('dashboard.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-dark-400 text-sm">{t('dashboard.balance')}</div>
            <div className="text-3xl font-bold text-primary-400">{user.balance.toFixed(0)}</div>
            <div className="text-dark-500 text-xs">{t('nav.tokens')}</div>
          </div>
          <div className="card">
            <div className="text-dark-400 text-sm">{t('dashboard.activeBets')}</div>
            <div className="text-3xl font-bold">{activeBets.length}</div>
            <div className="text-dark-500 text-xs">{t('dashboard.openPositions')}</div>
          </div>
          <div className="card">
            <div className="text-dark-400 text-sm">{t('dashboard.atRisk')}</div>
            <div className="text-3xl font-bold text-yellow-400">{totalAtRisk.toFixed(0)}</div>
            <div className="text-dark-500 text-xs">{t('dashboard.tokensStaked')}</div>
          </div>
          <div className="card">
            <div className="text-dark-400 text-sm">{t('dashboard.potentialWin')}</div>
            <div className="text-3xl font-bold text-green-400">{potentialWin.toFixed(0)}</div>
            <div className="text-dark-500 text-xs">{t('dashboard.ifAllWin')}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('dashboard.openMarkets')}</h2>
              <Link href="/markets" className="text-primary-400 hover:underline text-sm">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            <div className="space-y-4">
              {markets.slice(0, 4).map((market) => (
                <Link key={market.id} href={`/markets/${market.id}`}>
                  <div className="card hover:border-primary-500/50 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{market.name}</h3>
                      <span className="px-2 py-1 rounded text-xs status-open">
                        {t('dashboard.open')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {market.selections.slice(0, 4).map((sel) => (
                        <div key={sel.id} className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-1">
                          <span className="text-sm text-dark-300">{sel.name}</span>
                          <span className="odds-badge">{sel.odds.toFixed(2)}</span>
                        </div>
                      ))}
                      {market.selections.length > 4 && (
                        <span className="text-dark-400 text-sm self-center">
                          +{market.selections.length - 4} {t('dashboard.more')}
                        </span>
                      )}
                    </div>
                    <div className="text-dark-500 text-xs mt-2">
                      {market.total_staked.toFixed(0)} {t('dashboard.tokensStaked')}
                    </div>
                  </div>
                </Link>
              ))}
              {markets.length === 0 && (
                <div className="card text-center text-dark-400">
                  {t('dashboard.noOpenMarkets')}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t('dashboard.liveActivity')}</h2>
              <Link href="/activity" className="text-primary-400 hover:underline text-sm">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            <div className="card">
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-dark-700 last:border-0">
                    <div className="text-lg">
                      {activity.activity_type === 'bet_placed' && '🎯'}
                      {activity.activity_type === 'user_joined' && '👋'}
                      {activity.activity_type === 'market_settled' && '🏆'}
                      {activity.activity_type === 'market_created' && '📢'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-dark-500">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-dark-400 text-center text-sm">{t('dashboard.noActivity')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {activeBets.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">{t('dashboard.myActiveBets')}</h2>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                    <th className="pb-3">{t('dashboard.market')}</th>
                    <th className="pb-3">{t('dashboard.selection')}</th>
                    <th className="pb-3">{t('dashboard.stake')}</th>
                    <th className="pb-3">{t('dashboard.odds')}</th>
                    <th className="pb-3">{t('dashboard.potentialWin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBets.map((bet) => (
                    <tr key={bet.id} className="border-b border-dark-800 last:border-0">
                      <td className="py-3 text-dark-300">{bet.market_name}</td>
                      <td className="py-3 font-medium">{bet.selection_name}</td>
                      <td className="py-3">{bet.stake.toFixed(0)}</td>
                      <td className="py-3">
                        <span className="odds-badge">{bet.odds_at_time.toFixed(2)}</span>
                      </td>
                      <td className="py-3 text-green-400 font-semibold">
                        {bet.potential_win.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
