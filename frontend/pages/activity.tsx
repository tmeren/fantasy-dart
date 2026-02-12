import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { api, Activity, Bet } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function ActivityFeed() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
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

  const connectWebSocket = () => {
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST;
    if (wsHost) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${wsHost}/ws`;
      try {
        const websocket = new WebSocket(wsUrl);
        websocket.onmessage = () => loadData();
        websocket.onerror = () => { setInterval(loadData, 10000); };
        websocket.onclose = () => setTimeout(connectWebSocket, 5000);
        setWs(websocket);
      } catch {
        setInterval(loadData, 10000);
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host.replace(':3000', ':8000')}/ws`;
      const websocket = new WebSocket(wsUrl);
      websocket.onmessage = () => loadData();
      websocket.onerror = () => console.log('WebSocket error');
      websocket.onclose = () => setTimeout(connectWebSocket, 5000);
      setWs(websocket);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bet_placed': return '🎯';
      case 'user_joined': return '👋';
      case 'market_settled': return '🏆';
      case 'market_created': return '📢';
      case 'market_closed': return '🔒';
      default: return '📌';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'bet_placed': return 'border-l-primary-500';
      case 'user_joined': return 'border-l-blue-500';
      case 'market_settled': return 'border-l-yellow-500';
      case 'market_created': return 'border-l-green-500';
      case 'market_closed': return 'border-l-orange-500';
      default: return 'border-l-dark-500';
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="w-full px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <h1 className="text-3xl font-bold">{t('activity.title')}</h1>
        </div>
        <p className="text-dark-400 mb-8">{t('activity.subtitle')}</p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('activity.feedTitle')}</h2>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className={`flex items-start gap-4 p-4 bg-dark-800 rounded-lg border-l-4 ${getActivityColor(activity.activity_type)}`}>
                    <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                    <div className="flex-1">
                      <p className="text-lg">{activity.message}</p>
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

          <div>
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold mb-4">{t('activity.recentBets')}</h2>
              <div className="space-y-3">
                {recentBets.slice(0, 15).map((bet) => (
                  <div key={bet.id} className="p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{shortName(bet.user_name)}</span>
                      <span className="text-dark-400 text-sm">{new Date(bet.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-dark-300 mb-2">{bet.market_name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-400">{shortName(bet.selection_name)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-dark-300">{bet.stake.toFixed(0)}</span>
                        <span className="odds-badge">{bet.odds_at_time.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-green-400 mt-1">
                      {t('activity.toWin')} {bet.potential_win.toFixed(0)} {t('nav.tokens')}
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
  );
}
