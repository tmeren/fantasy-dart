import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api, Market, ScheduledMatch, PlayerRating, OutrightOdds, WhatsAppLog } from '@/lib/api';
import { shortName } from '@/lib/i18n';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

type AdminTab = 'tournament' | 'markets' | 'whatsapp';

export default function Admin() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('tournament');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [settleModal, setSettleModal] = useState<Market | null>(null);

  // Tournament state
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [outrightOdds, setOutrightOdds] = useState<OutrightOdds[]>([]);
  const [resultModal, setResultModal] = useState<ScheduledMatch | null>(null);
  const [resultScore, setResultScore] = useState({ score1: '', score2: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingTournament, setLoadingTournament] = useState(false);

  // WhatsApp state
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);
  const [waSending, setWaSending] = useState('');

  // Create market form
  const [newMarket, setNewMarket] = useState({
    name: '',
    description: '',
    market_type: 'match',
    betting_type: 'parimutuel' as 'fixed' | 'parimutuel',
    house_cut: '10',
    selections: [{ name: '', odds: '' }],
  });

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) router.push('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.is_admin) {
      loadMarkets();
      loadTournamentData();
    }
  }, [user]);

  const loadMarkets = async () => {
    try {
      const data = await api.getMarkets();
      setMarkets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTournamentData = async () => {
    setLoadingTournament(true);
    try {
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), ms)
      );
      const [sched, rats, odds] = await Promise.all([
        Promise.race([api.getScheduledMatches(), timeout(15000)]) as Promise<ScheduledMatch[]>,
        Promise.race([api.getCurrentRatings(), timeout(15000)]) as Promise<PlayerRating[]>,
        Promise.race([api.getCurrentOdds(), timeout(30000)]) as Promise<OutrightOdds[]>,
      ]);
      setScheduledMatches(sched);
      setRatings(rats);
      setOutrightOdds(odds);
    } catch (err) {
      console.error('Failed to load tournament data:', err);
    } finally {
      setLoadingTournament(false);
    }
  };

  const handleEnterResult = async () => {
    if (!resultModal) return;
    const s1 = parseInt(resultScore.score1);
    const s2 = parseInt(resultScore.score2);

    if (isNaN(s1) || isNaN(s2)) {
      alert(t('admin.validScores'));
      return;
    }

    // Determine winner
    let winner: string;
    if (s1 === 3 && s2 >= 0 && s2 <= 2) {
      winner = resultModal.player1;
    } else if (s2 === 3 && s1 >= 0 && s1 <= 2) {
      winner = resultModal.player2;
    } else {
      alert(t('admin.invalidScoreAlert'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.enterResult(resultModal.match_id, s1, s2, winner);
      setResultModal(null);
      setResultScore({ score1: '', score2: '' });
      setSuccessMsg(`M${result.match_id}: ${result.winner} wins ${result.score}`);

      // Update state with fresh data from response
      setRatings(result.updated_ratings);
      setOutrightOdds(result.updated_outright_odds);

      // Refresh scheduled matches (one less now)
      const sched = await api.getScheduledMatches();
      setScheduledMatches(sched);

      // Also refresh markets (odds may have updated)
      loadMarkets();

      // Clear success message after 5s
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to enter result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMarket({
        name: newMarket.name,
        description: newMarket.description || undefined,
        market_type: newMarket.market_type,
        betting_type: newMarket.betting_type,
        house_cut: parseFloat(newMarket.house_cut) / 100,
        selections: newMarket.selections.map(s => ({
          name: s.name,
          odds: parseFloat(s.odds),
        })),
      });
      setShowCreate(false);
      setNewMarket({
        name: '',
        description: '',
        market_type: 'match',
        betting_type: 'parimutuel',
        house_cut: '10',
        selections: [{ name: '', odds: '' }],
      });
      loadMarkets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseMarket = async (marketId: number) => {
    if (!confirm(t('admin.closeConfirm'))) return;
    try {
      await api.closeMarket(marketId);
      loadMarkets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettleMarket = async (marketId: number, winningSelectionId: number) => {
    if (!confirm(t('admin.settleConfirm'))) return;
    try {
      await api.settleMarket(marketId, winningSelectionId);
      setSettleModal(null);
      loadMarkets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const addSelection = () => {
    setNewMarket({
      ...newMarket,
      selections: [...newMarket.selections, { name: '', odds: '' }],
    });
  };

  const updateSelection = (index: number, field: 'name' | 'odds', value: string) => {
    const updated = [...newMarket.selections];
    updated[index][field] = value;
    setNewMarket({ ...newMarket, selections: updated });
  };

  const removeSelection = (index: number) => {
    if (newMarket.selections.length <= 1) return;
    setNewMarket({
      ...newMarket,
      selections: newMarket.selections.filter((_, i) => i !== index),
    });
  };

  if (loading || !user?.is_admin) {
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
            <p className="text-dark-400">{t('admin.subtitle')}</p>
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
            {t('admin.resultEntered')} {successMsg} {t('admin.ratingsUpdated')}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-dark-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('tournament')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tournament'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('admin.tournament')}
          </button>
          <button
            onClick={() => setActiveTab('markets')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'markets'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('admin.markets')}
          </button>
          <button
            onClick={() => { setActiveTab('whatsapp'); api.getWhatsAppLogs().then(setWaLogs).catch(console.error); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'whatsapp'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('admin.whatsapp')}
          </button>
        </div>

        {/* ========== TOURNAMENT TAB ========== */}
        {activeTab === 'tournament' && (
          <div className="space-y-6">
            {/* Scheduled Matches */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{t('admin.scheduledMatches')} ({scheduledMatches.length})</h2>
                <button
                  onClick={loadTournamentData}
                  className="btn-secondary text-sm"
                  disabled={loadingTournament}
                >
                  {loadingTournament ? t('admin.loading') : t('admin.refresh')}
                </button>
              </div>

              {loadingTournament && scheduledMatches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                </div>
              ) : scheduledMatches.length === 0 ? (
                <p className="text-dark-400 text-center py-4">{t('admin.allPlayed')}</p>
              ) : (
                <div className="grid gap-3">
                  {scheduledMatches.slice(0, 20).map((match) => (
                    <div
                      key={match.match_id}
                      className="flex items-center justify-between p-4 bg-dark-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-dark-500 w-16">
                          R{match.round} M{match.match_id}
                        </span>
                        <span className="font-medium">{match.player1}</span>
                        <span className="text-dark-500">vs</span>
                        <span className="font-medium">{match.player2}</span>
                      </div>
                      <button
                        onClick={() => {
                          setResultModal(match);
                          setResultScore({ score1: '', score2: '' });
                        }}
                        className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-md text-sm hover:bg-primary-500/30 transition-colors"
                      >
                        {t('admin.enterResult')}
                      </button>
                    </div>
                  ))}
                  {scheduledMatches.length > 20 && (
                    <p className="text-dark-500 text-sm text-center">
                      +{scheduledMatches.length - 20} {t('admin.moreMatches')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Elo Ratings */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('admin.currentElo')}</h2>
              {ratings.length === 0 ? (
                <p className="text-dark-400 text-center py-4">{t('admin.loadingRatings')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                        <th className="pb-2 w-12">#</th>
                        <th className="pb-2">{t('admin.player')}</th>
                        <th className="pb-2 text-right">{t('admin.elo')}</th>
                        <th className="pb-2 text-right">{t('admin.winsShort')}</th>
                        <th className="pb-2 text-right">{t('admin.lossesShort')}</th>
                        <th className="pb-2 text-right">{t('admin.gamesPlayed')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratings.map((r) => (
                        <tr key={r.player} className="border-b border-dark-800/50 last:border-0">
                          <td className="py-2 text-dark-500">{r.rank}</td>
                          <td className="py-2 font-medium">{r.player}</td>
                          <td className="py-2 text-right">
                            <span className={`font-mono ${
                              r.elo >= 1600 ? 'text-green-400' :
                              r.elo >= 1500 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {r.elo.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2 text-right text-green-400">{r.wins}</td>
                          <td className="py-2 text-right text-red-400">{r.losses}</td>
                          <td className="py-2 text-right text-dark-400">{r.games_played}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Outright Odds */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('admin.winnerOdds')}</h2>
              {outrightOdds.length === 0 ? (
                <p className="text-dark-400 text-center py-4">{t('admin.loadingOdds')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                        <th className="pb-2">{t('admin.player')}</th>
                        <th className="pb-2 text-right">{t('admin.winPct')}</th>
                        <th className="pb-2 text-right">{t('admin.top8Pct')}</th>
                        <th className="pb-2 text-right">{t('admin.odds')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outrightOdds.map((o) => (
                        <tr key={o.player} className="border-b border-dark-800/50 last:border-0">
                          <td className="py-2 font-medium">{o.player}</td>
                          <td className="py-2 text-right">
                            {(o.true_probability * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 text-right text-dark-400">
                            {o.top8_pct.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right">
                            <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-sm font-mono">
                              {o.odds.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== MARKETS TAB ========== */}
        {activeTab === 'markets' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                {t('admin.createMarket')}
              </button>
            </div>

            {/* Markets Table */}
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                    <th className="pb-3">{t('admin.tableMarket')}</th>
                    <th className="pb-3">{t('admin.tableType')}</th>
                    <th className="pb-3">{t('admin.tableStatus')}</th>
                    <th className="pb-3 text-right">{t('admin.tableStaked')}</th>
                    <th className="pb-3 text-right">{t('admin.tableSelections')}</th>
                    <th className="pb-3 text-right">{t('admin.tableActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((market) => (
                    <tr key={market.id} className="border-b border-dark-800 last:border-0">
                      <td className="py-4">
                        <div className="font-medium">{market.name}</div>
                        {market.description && (
                          <div className="text-sm text-dark-400">{market.description}</div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            market.market_type === 'outright' ? 'bg-purple-500/20 text-purple-400' :
                            market.market_type === 'match' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {market.market_type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            market.betting_type === 'parimutuel'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {market.betting_type === 'parimutuel' ? t('admin.pool') : t('admin.fixedLabel')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          market.status === 'open' ? 'status-open' :
                          market.status === 'closed' ? 'status-closed' : 'status-settled'
                        }`}>
                          {market.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {market.total_staked.toFixed(0)} {t('admin.tokensLabel')}
                      </td>
                      <td className="py-4 text-right">
                        {market.selections.length}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {market.status === 'open' && (
                            <button
                              onClick={() => handleCloseMarket(market.id)}
                              className="text-yellow-400 hover:text-yellow-300 text-sm"
                            >
                              {t('admin.close')}
                            </button>
                          )}
                          {market.status === 'closed' && (
                            <button
                              onClick={() => setSettleModal(market)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              {t('admin.settle')}
                            </button>
                          )}
                          {market.status === 'settled' && (
                            <span className="text-dark-500 text-sm">
                              {t('admin.winner')} {shortName(market.selections.find(s => s.is_winner)?.name || '')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {markets.length === 0 && (
              <div className="card text-center py-12">
                <p className="text-dark-400">{t('admin.noMarkets')}</p>
              </div>
            )}
          </div>
        )}

        {/* ========== WHATSAPP TAB ========== */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {/* Send Templates */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('admin.waSendTitle')}</h2>
              <p className="text-dark-400 text-sm mb-4">{t('admin.waSendDesc')}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: 'match-day', label: t('admin.waMatchDay'), icon: '📅' },
                  { key: 'results', label: t('admin.waResults'), icon: '🏆' },
                  { key: 'leaderboard', label: t('admin.waLeaderboard'), icon: '📊' },
                  { key: 'quiz', label: t('admin.waQuiz'), icon: '🧠' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.key}
                    onClick={async () => {
                      if (!confirm(`Send "${tmpl.label}" to all opted-in users?`)) return;
                      setWaSending(tmpl.key);
                      try {
                        const result = await api.sendWhatsApp(tmpl.key);
                        setSuccessMsg(`${tmpl.label}: ${result.sent} sent, ${result.failed} failed`);
                        api.getWhatsAppLogs().then(setWaLogs).catch(console.error);
                        setTimeout(() => setSuccessMsg(''), 5000);
                      } catch (err: any) {
                        alert(err.message);
                      } finally {
                        setWaSending('');
                      }
                    }}
                    disabled={waSending === tmpl.key}
                    className="flex items-center gap-3 p-4 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors text-left"
                  >
                    <span className="text-2xl">{tmpl.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{tmpl.label}</div>
                      {waSending === tmpl.key && <div className="text-xs text-primary-400">{t('admin.waSending')}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Logs */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{t('admin.waLogsTitle')}</h2>
                <button
                  onClick={() => api.getWhatsAppLogs().then(setWaLogs).catch(console.error)}
                  className="btn-secondary text-sm"
                >
                  {t('admin.refresh')}
                </button>
              </div>
              {waLogs.length === 0 ? (
                <p className="text-dark-400 text-center py-4">{t('admin.waNoLogs')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                        <th className="pb-2">{t('admin.waType')}</th>
                        <th className="pb-2">{t('admin.waTemplate')}</th>
                        <th className="pb-2">{t('admin.waStatus')}</th>
                        <th className="pb-2">{t('admin.waTime')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waLogs.slice(0, 20).map((log) => (
                        <tr key={log.id} className="border-b border-dark-800/50 last:border-0">
                          <td className="py-2 text-sm">{log.message_type}</td>
                          <td className="py-2 text-sm text-dark-300">{log.template_name}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.status === 'read' ? 'bg-green-500/20 text-green-400' :
                              log.status === 'delivered' ? 'bg-blue-500/20 text-blue-400' :
                              log.status === 'sent' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-dark-500">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== MODALS ========== */}

        {/* Enter Result Modal */}
        {resultModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full">
              <h2 className="text-2xl font-bold mb-2">{t('admin.enterMatchResult')}</h2>
              <p className="text-dark-400 mb-6">
                R{resultModal.round} M{resultModal.match_id}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-dark-400 mb-1">
                      {resultModal.player1}
                    </label>
                    <input
                      type="number"
                      value={resultScore.score1}
                      onChange={(e) => setResultScore({ ...resultScore, score1: e.target.value })}
                      className="input w-full text-center text-2xl"
                      min="0"
                      max="3"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-dark-500 text-xl mt-6">-</span>
                  <div className="flex-1">
                    <label className="block text-sm text-dark-400 mb-1">
                      {resultModal.player2}
                    </label>
                    <input
                      type="number"
                      value={resultScore.score2}
                      onChange={(e) => setResultScore({ ...resultScore, score2: e.target.value })}
                      className="input w-full text-center text-2xl"
                      min="0"
                      max="3"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Quick score buttons */}
                <div className="flex gap-2 justify-center">
                  {['3-0', '3-1', '3-2', '0-3', '1-3', '2-3'].map((score) => {
                    const [s1, s2] = score.split('-');
                    return (
                      <button
                        key={score}
                        onClick={() => setResultScore({ score1: s1, score2: s2 })}
                        className="px-3 py-1.5 bg-dark-700 rounded text-sm hover:bg-dark-600 transition-colors"
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>

                {/* Winner preview */}
                {resultScore.score1 && resultScore.score2 && (
                  <div className="text-center text-sm">
                    {parseInt(resultScore.score1) === 3 ? (
                      <span className="text-green-400">{t('admin.winnerPreview')} {resultModal.player1}</span>
                    ) : parseInt(resultScore.score2) === 3 ? (
                      <span className="text-green-400">{t('admin.winnerPreview')} {resultModal.player2}</span>
                    ) : (
                      <span className="text-red-400">{t('admin.invalidScore')}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleEnterResult}
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? t('admin.saving') : t('admin.confirmResult')}
                </button>
                <button
                  onClick={() => setResultModal(null)}
                  className="btn-secondary flex-1"
                >
                  {t('admin.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Market Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">{t('admin.createNewMarket')}</h2>
              <form onSubmit={handleCreateMarket}>
                <div className="mb-4">
                  <label className="block text-sm text-dark-400 mb-2">{t('admin.marketName')}</label>
                  <input
                    type="text"
                    value={newMarket.name}
                    onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })}
                    className="input"
                    placeholder={t('admin.namePlaceholder')}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-dark-400 mb-2">{t('admin.description')}</label>
                  <textarea
                    value={newMarket.description}
                    onChange={(e) => setNewMarket({ ...newMarket, description: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder={t('admin.additionalDetails')}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-dark-400 mb-2">{t('admin.marketType')}</label>
                  <select
                    value={newMarket.market_type}
                    onChange={(e) => setNewMarket({ ...newMarket, market_type: e.target.value })}
                    className="input"
                  >
                    <option value="match">{t('marketType.match')}</option>
                    <option value="outright">{t('marketType.outright')}</option>
                    <option value="prop">{t('marketType.prop')}</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-dark-400 mb-2">{t('admin.bettingType')}</label>
                  <select
                    value={newMarket.betting_type}
                    onChange={(e) => setNewMarket({ ...newMarket, betting_type: e.target.value as 'fixed' | 'parimutuel' })}
                    className="input"
                  >
                    <option value="parimutuel">{t('bettingType.parimutuel')}</option>
                    <option value="fixed">{t('bettingType.fixed')}</option>
                  </select>
                  {newMarket.betting_type === 'parimutuel' && (
                    <p className="text-xs text-dark-500 mt-1">
                      {t('admin.poolDesc')}
                    </p>
                  )}
                </div>

                {newMarket.betting_type === 'parimutuel' && (
                  <div className="mb-4">
                    <label className="block text-sm text-dark-400 mb-2">{t('admin.houseCut')}</label>
                    <input
                      type="number"
                      value={newMarket.house_cut}
                      onChange={(e) => setNewMarket({ ...newMarket, house_cut: e.target.value })}
                      className="input w-32"
                      min="0"
                      max="50"
                      step="1"
                    />
                    <p className="text-xs text-dark-500 mt-1">
                      {t('admin.houseCutDesc')}
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm text-dark-400 mb-2">
                    {t('admin.selections')} & {newMarket.betting_type === 'fixed' ? t('admin.fixedOdds') : t('admin.initialOdds')}
                  </label>
                  <div className="space-y-2">
                    {newMarket.selections.map((sel, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={sel.name}
                          onChange={(e) => updateSelection(index, 'name', e.target.value)}
                          className="input flex-1"
                          placeholder={t('admin.selectionName')}
                          required
                        />
                        <input
                          type="number"
                          value={sel.odds}
                          onChange={(e) => updateSelection(index, 'odds', e.target.value)}
                          className="input w-24"
                          placeholder={t('admin.odds')}
                          step="0.01"
                          min="1.01"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeSelection(index)}
                          className="btn-secondary px-3"
                          disabled={newMarket.selections.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addSelection} className="btn-secondary mt-2">
                    {t('admin.addSelection')}
                  </button>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="submit" className="btn-primary flex-1">
                    {t('admin.createMarket')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-secondary flex-1"
                  >
                    {t('admin.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Settle Modal */}
        {settleModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full">
              <h2 className="text-2xl font-bold mb-2">{t('admin.settleMarket')}</h2>
              <p className="text-dark-400 mb-6">{settleModal.name}</p>
              <p className="text-sm text-dark-300 mb-4">{t('admin.selectWinner')}</p>
              <div className="space-y-2">
                {settleModal.selections.map((sel) => (
                  <button
                    key={sel.id}
                    onClick={() => handleSettleMarket(settleModal.id, sel.id)}
                    className="w-full flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    <span className="font-medium">{shortName(sel.name)}</span>
                    <span className="odds-badge">{sel.odds.toFixed(2)}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSettleModal(null)}
                className="btn-secondary w-full mt-4"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
