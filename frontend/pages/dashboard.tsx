import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api, Market, Bet, Activity } from '@/lib/api';
import { useBetslip } from '@/lib/BetslipContext';
import { shortName } from '@/lib/i18n';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

/** Clickable odds for dashboard market cards (S3+S12) */
function DashboardOdds({ market }: { market: Market }) {
  const { addSelection, isSelected } = useBetslip();
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-2">
      {market.selections.slice(0, 4).map((sel) => {
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
            className="flex items-center gap-2 bg-dark-700 rounded-lg px-3 py-1 hover:bg-dark-600 transition-colors"
          >
            <span className="text-sm text-dark-300">{shortName(sel.name)}</span>
            <span className={selected ? 'odds-badge-selected' : 'odds-badge'}>
              {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
            </span>
          </button>
        );
      })}
      {market.selections.length > 4 && (
        <span className="text-dark-400 text-sm self-center">
          +{market.selections.length - 4} {t('dashboard.more')}
        </span>
      )}
    </div>
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
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);

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

      <div className="w-full px-4 py-6 max-w-7xl mx-auto">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
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

        {/* Phone / WhatsApp Card */}
        {!user.phone_number && (
          <div className="mb-8 card border border-primary-500/30 bg-primary-500/5">
            <div className="flex items-start gap-4">
              <div className="text-2xl">📱</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t('phone.addTitle')}</h3>
                <p className="text-dark-400 text-sm mb-3">{t('phone.addDesc')}</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder={t('phone.placeholder')}
                    className="input flex-1 max-w-xs"
                  />
                  <button
                    onClick={async () => {
                      if (!phoneInput.trim()) return;
                      setPhoneSaving(true);
                      try {
                        await api.updatePhone(phoneInput.trim());
                        await refreshUser();
                        setPhoneInput('');
                      } catch (err: any) {
                        alert(err.message);
                      } finally {
                        setPhoneSaving(false);
                      }
                    }}
                    disabled={phoneSaving || !phoneInput.trim()}
                    className="btn-primary text-sm"
                  >
                    {phoneSaving ? '...' : t('phone.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {user.phone_number && (
          <div className="mb-8 card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">📱</span>
                <div>
                  <div className="text-sm text-dark-400">{t('phone.yourPhone')}</div>
                  <div className="font-medium">{user.phone_number}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.whatsapp_opted_in}
                    onChange={async (e) => {
                      try {
                        await api.setWhatsAppOptIn(e.target.checked);
                        await refreshUser();
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">{t('phone.whatsappUpdates')}</span>
                </label>
                <button
                  onClick={async () => {
                    if (!confirm(t('phone.removeConfirm'))) return;
                    try {
                      await api.removePhone();
                      await refreshUser();
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  {t('phone.remove')}
                </button>
              </div>
            </div>
          </div>
        )}

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
                    <DashboardOdds market={market} />
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
