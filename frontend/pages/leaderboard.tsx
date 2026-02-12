import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage, LanguageToggle } from '@/lib/LanguageContext';
import { api, LeaderboardEntry } from '@/lib/api';
import Link from 'next/link';

function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  return (
    <nav className="bg-dark-900/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-primary-400">{t('nav.brand')}</Link>
        <div className="flex items-center gap-6">
          <Link href="/markets" className="text-dark-300 hover:text-white">{t('nav.markets')}</Link>
          <Link href="/leaderboard" className="text-white font-medium">{t('nav.leaderboard')}</Link>
          <Link href="/tournament" className="text-dark-300 hover:text-white">{t('nav.tournament')}</Link>
          <Link href="/activity" className="text-dark-300 hover:text-white">{t('nav.liveFeed')}</Link>
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

function StreakBadge({ streak }: { streak: string }) {
  if (!streak) return null;
  const isWin = streak.startsWith('W');
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
      isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
    }`}>
      {isWin ? '🔥' : '❄️'} {streak}
    </span>
  );
}

function BadgeList({ badges }: { badges: string[] }) {
  const { t } = useLanguage();

  const BADGE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    first_blood: { label: t('badge.firstBlood'), icon: '🎯', color: 'bg-blue-500/20 text-blue-400' },
    high_roller: { label: t('badge.highRoller'), icon: '💎', color: 'bg-purple-500/20 text-purple-400' },
    lucky_streak: { label: t('badge.luckyStreak'), icon: '🔥', color: 'bg-orange-500/20 text-orange-400' },
    whale: { label: t('badge.whale'), icon: '🐋', color: 'bg-cyan-500/20 text-cyan-400' },
    sharp: { label: t('badge.sharp'), icon: '🧠', color: 'bg-green-500/20 text-green-400' },
  };

  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge];
        if (!config) return null;
        return (
          <span key={badge} title={config.label} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${config.color}`}>
            {config.icon}
            <span className="hidden sm:inline ml-1">{config.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadLeaderboard();
  }, [user]);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
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
        <h1 className="text-3xl font-bold mb-2">{t('leaderboard.title')}</h1>
        <p className="text-dark-400 mb-8">{t('leaderboard.subtitle')}</p>

        {/* Top 3 Podium */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <div
              key={entry.user.id}
              className={`card text-center ${
                index === 0 ? 'md:order-2 bg-yellow-900/20 border-yellow-500/30' :
                index === 1 ? 'md:order-1 bg-gray-600/20 border-gray-500/30' :
                'md:order-3 bg-orange-900/20 border-orange-500/30'
              }`}
            >
              <div className="text-4xl mb-2">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
              <div className="text-2xl font-bold mb-1">{entry.user.name}</div>
              {entry.streak && <div className="mb-2"><StreakBadge streak={entry.streak} /></div>}
              <div className={`text-3xl font-bold ${entry.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(0)}
              </div>
              <div className="text-dark-400 text-sm">{t('leaderboard.profit')}</div>
              <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-dark-400">{t('leaderboard.balance')}</div>
                  <div className="font-semibold">{entry.user.balance.toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-dark-400">{t('leaderboard.winRate')}</div>
                  <div className="font-semibold">{entry.win_rate.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-dark-400">ROI</div>
                  <div className={`font-semibold ${entry.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.roi_pct >= 0 ? '+' : ''}{entry.roi_pct.toFixed(0)}%
                  </div>
                </div>
              </div>
              {entry.badges && entry.badges.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dark-700 flex justify-center">
                  <BadgeList badges={entry.badges} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Full Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                <th className="pb-3 w-16">{t('leaderboard.rank')}</th>
                <th className="pb-3">{t('leaderboard.player')}</th>
                <th className="pb-3 text-right">{t('leaderboard.balance')}</th>
                <th className="pb-3 text-right">{t('leaderboard.profitLoss')}</th>
                <th className="pb-3 text-right hidden sm:table-cell">ROI%</th>
                <th className="pb-3 text-right hidden md:table-cell">{t('leaderboard.staked')}</th>
                <th className="pb-3 text-right">{t('leaderboard.bets')}</th>
                <th className="pb-3 text-right">{t('leaderboard.winRate')}</th>
                <th className="pb-3 text-center hidden sm:table-cell">{t('leaderboard.streak')}</th>
                <th className="pb-3 hidden lg:table-cell">{t('leaderboard.badges')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.user.id} className={`border-b border-dark-800 last:border-0 ${entry.user.id === user.id ? 'bg-primary-900/20' : ''}`}>
                  <td className="py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      entry.rank === 1 ? 'bg-yellow-500 text-black' :
                      entry.rank === 2 ? 'bg-gray-400 text-black' :
                      entry.rank === 3 ? 'bg-orange-500 text-black' :
                      'bg-dark-700 text-dark-300'
                    }`}>{entry.rank}</span>
                  </td>
                  <td className="py-4">
                    <span className="font-medium">{entry.user.name}</span>
                    {entry.user.id === user.id && <span className="ml-2 text-xs text-primary-400">{t('leaderboard.you')}</span>}
                  </td>
                  <td className="py-4 text-right font-semibold">{entry.user.balance.toFixed(0)}</td>
                  <td className={`py-4 text-right font-semibold ${entry.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(0)}
                  </td>
                  <td className={`py-4 text-right hidden sm:table-cell ${entry.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.roi_pct >= 0 ? '+' : ''}{entry.roi_pct.toFixed(0)}%
                  </td>
                  <td className="py-4 text-right text-dark-300 hidden md:table-cell">{entry.total_staked.toFixed(0)}</td>
                  <td className="py-4 text-right text-dark-300">{entry.total_bets}</td>
                  <td className="py-4 text-right">
                    <span className={`px-2 py-1 rounded text-sm ${
                      entry.win_rate >= 60 ? 'bg-green-500/20 text-green-400' :
                      entry.win_rate >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{entry.win_rate.toFixed(0)}%</span>
                  </td>
                  <td className="py-4 text-center hidden sm:table-cell"><StreakBadge streak={entry.streak} /></td>
                  <td className="py-4 hidden lg:table-cell"><BadgeList badges={entry.badges} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Badge Legend */}
        {leaderboard.some(e => e.badges && e.badges.length > 0) && (
          <div className="card mt-4">
            <h3 className="text-sm font-semibold text-dark-400 mb-3">{t('leaderboard.achievementBadges')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <BadgeList badges={['first_blood', 'high_roller', 'lucky_streak', 'whale', 'sharp']} />
            </div>
          </div>
        )}

        {leaderboard.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-dark-400">{t('leaderboard.noPlayers')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
