import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, Activity, Bet } from '@/lib/api';
import { translateActivity, getActivityIcon } from '@/lib/activityTranslations';
import Navbar from '@/components/Navbar';

interface BetslipGroup {
  id: string;
  bets: Bet[];
  userName: string;
  totalStake: number;
  totalOdds: number;
  potentialWin: number;
  isAcca: boolean;
  placedAt: string;
}

function groupBetsIntoBetslips(bets: Bet[]): BetslipGroup[] {
  const groups: Record<string, Bet[]> = {};
  for (const bet of bets) {
    const key = bet.betslip_id || `single-${bet.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(bet);
  }

  return Object.entries(groups).map(([id, legs]) => {
    const totalStake = legs.reduce((sum, b) => sum + b.stake, 0);
    const totalOdds = legs.reduce((acc, b) => acc * b.odds_at_time, 1);
    const potentialWin = totalStake * totalOdds;
    return {
      id,
      bets: legs.sort((a, b) => a.id - b.id),
      userName: legs[0].user_name,
      totalStake,
      totalOdds,
      potentialWin,
      isAcca: legs.length > 1,
      placedAt: legs[0].created_at,
    };
  }).sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

export default function ActivityFeed() {
  const { user, loading } = useAuth();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadData();
      connectWebSocket();
    }
    return () => { ws?.close(); };
  }, [user]);

  const loadData = async () => {
    try {
      const [activitiesData, betsData] = await Promise.all([
        api.getActivities(50),
        api.getAllBets(),
      ]);
      setActivities(activitiesData);
      setRecentBets(betsData);
    } catch (err) {
      console.error(err);
    }
  };

  let wsDelay = 5000;
  const wsMaxDelay = 30000;
  const connectWebSocket = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    let wsUrl: string;
    if (apiUrl) {
      const baseUrl = apiUrl.replace(/\/api\/?$/, '');
      wsUrl = baseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host.replace(':3000', ':8000')}/ws`;
    }
    try {
      const websocket = new WebSocket(wsUrl);
      websocket.onopen = () => { wsDelay = 5000; };
      websocket.onmessage = () => loadData();
      websocket.onerror = () => {};
      websocket.onclose = () => {
        setTimeout(connectWebSocket, wsDelay);
        wsDelay = Math.min(wsDelay * 2, wsMaxDelay);
      };
      setWs(websocket);
    } catch {
      setTimeout(connectWebSocket, wsDelay);
      wsDelay = Math.min(wsDelay * 2, wsMaxDelay);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'bet_placed': return 'border-l-primary-500';
      case 'user_joined': return 'border-l-blue-500';
      case 'market_settled': return 'border-l-yellow-500';
      case 'market_created': return 'border-l-green-500';
      case 'market_closed': return 'border-l-orange-500';
      case 'bet_voided_refund': return 'border-l-amber-500';
      case 'season_cleanup': return 'border-l-purple-500';
      case 'bet_won': return 'border-l-green-500';
      case 'bet_lost': return 'border-l-red-500';
      default: return 'border-l-dark-500';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-dark-950 overflow-hidden">
      <Navbar />
      <div className="flex-1 min-h-0 flex flex-col w-full px-4 py-4 max-w-7xl mx-auto">
        {/* Header — fixed height */}
        <div className="shrink-0 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <h1 className="text-3xl font-bold">{t('activity.title')}</h1>
          </div>
          <p className="text-dark-400">{t('activity.subtitle')}</p>
        </div>

        {/* Grid — fills remaining viewport */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-8">
          {/* Activity feed — scrollable */}
          <div className="lg:col-span-2 min-h-0 flex flex-col">
            <div className="card flex-1 min-h-0 flex flex-col">
              <h2 className="text-xl font-bold mb-4 shrink-0">{t('activity.feedTitle')}</h2>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mr-2 pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className={`flex items-start gap-4 p-4 bg-dark-800 rounded-lg border-l-4 ${getActivityColor(activity.activity_type)}`}>
                      <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                      <div className="flex-1">
                        <p className="text-lg">{translateActivity(activity, locale)}</p>
                        <p className="text-sm text-dark-400 mt-1">{new Date(activity.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-dark-400 text-center py-8">{t('activity.noActivity')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent bets — grouped by betslip */}
          <div className="min-h-0 flex flex-col">
            <div className="card flex-1 min-h-0 flex flex-col">
              <h2 className="text-xl font-bold mb-4 shrink-0">{t('activity.recentBets')}</h2>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mr-2 pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-3">
                  {groupBetsIntoBetslips(recentBets).slice(0, 15).map((slip) => (
                    <div key={slip.id} className="p-3 bg-dark-800 rounded-lg">
                      {/* Header: user + type + time */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{shortName(slip.userName)}</span>
                          {slip.isAcca ? (
                            <span className="bg-primary-600/20 text-primary-400 text-xs font-bold px-1.5 py-0.5 rounded">
                              {slip.bets.length}{t('activity.fold')}
                            </span>
                          ) : (
                            <span className="bg-dark-700 text-dark-300 text-xs font-bold px-1.5 py-0.5 rounded">
                              {t('predictions.single')}
                            </span>
                          )}
                        </div>
                        <span className="text-dark-400 text-xs">{new Date(slip.placedAt).toLocaleTimeString()}</span>
                      </div>

                      {/* Selection legs */}
                      <div className="space-y-1 mb-2">
                        {slip.bets.map((bet) => (
                          <div key={bet.id} className="flex items-center gap-2 text-sm">
                            <span className="text-blue-400 text-xs">&#9679;</span>
                            <span className="text-dark-300 truncate flex-1">{shortName(bet.selection_name)}</span>
                            <span className="text-dark-500 text-xs">{bet.odds_at_time.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Summary: stake, total odds, potential win */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-dark-700">
                        <div className="flex items-center gap-3">
                          <span className="text-dark-400">{t('activity.totalStake')}: <span className="text-white font-bold">{slip.totalStake.toFixed(0)}</span></span>
                          {slip.isAcca && (
                            <span className="text-dark-400">{t('activity.totalOdds')}: <span className="text-white font-bold">{slip.totalOdds.toFixed(2)}</span></span>
                          )}
                        </div>
                        <span className="text-green-400 font-bold">{slip.potentialWin.toFixed(0)} RTB</span>
                      </div>
                    </div>
                  ))}
                  {recentBets.length === 0 && (
                    <p className="text-dark-400 text-center py-4">{t('activity.noBets')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
