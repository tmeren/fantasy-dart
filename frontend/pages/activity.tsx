import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { api, Activity, Bet } from '@/lib/api';
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
          <Link href="/activity" className="text-white font-medium">Live Feed</Link>
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

export default function ActivityFeed() {
  const { user, loading } = useAuth();
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
    return () => {
      ws?.close();
    };
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
    // Use env var for WebSocket URL in production, or derive from current host in dev
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST;
    if (wsHost) {
      // Production: use configured WebSocket host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${wsHost}/ws`;
      try {
        const websocket = new WebSocket(wsUrl);
        websocket.onmessage = () => loadData();
        websocket.onerror = () => {
          console.log('WebSocket error, falling back to polling');
          setInterval(loadData, 10000); // Poll every 10s as fallback
        };
        websocket.onclose = () => setTimeout(connectWebSocket, 5000);
        setWs(websocket);
      } catch {
        // WebSocket not available, use polling
        setInterval(loadData, 10000);
      }
    } else {
      // Development: connect to local backend
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <h1 className="text-3xl font-bold">Live Activity</h1>
        </div>
        <p className="text-dark-400 mb-8">Real-time updates on what everyone's betting</p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Activity Feed</h2>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 p-4 bg-dark-800 rounded-lg border-l-4 ${getActivityColor(activity.activity_type)}`}
                  >
                    <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                    <div className="flex-1">
                      <p className="text-lg">{activity.message}</p>
                      <p className="text-sm text-dark-400 mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-dark-400 text-center py-8">No activity yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Bets Sidebar */}
          <div>
            <div className="card sticky top-24">
              <h2 className="text-xl font-bold mb-4">Recent Bets</h2>
              <div className="space-y-3">
                {recentBets.slice(0, 15).map((bet) => (
                  <div key={bet.id} className="p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{bet.user_name}</span>
                      <span className="text-dark-400 text-sm">
                        {new Date(bet.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-dark-300 mb-2">
                      {bet.market_name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-400">{bet.selection_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-dark-300">{bet.stake.toFixed(0)}</span>
                        <span className="odds-badge">{bet.odds_at_time.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-green-400 mt-1">
                      To win: {bet.potential_win.toFixed(0)} tokens
                    </div>
                  </div>
                ))}
                {recentBets.length === 0 && (
                  <p className="text-dark-400 text-center py-4">No bets yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
