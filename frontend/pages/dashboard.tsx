import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api, Market, Bet, Activity, CompletedMatch, QuarterfinalMatchup, OutrightOdds, PlayoffPlayerEntry } from '@/lib/api';
import { translateActivity, getActivityIcon } from '@/lib/activityTranslations';
import { useBetslip } from '@/lib/BetslipContext';
import { shortName } from '@/lib/i18n';
import { eloBgClass, computeAllInsights } from '@/lib/tournament-utils';
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
  const { t, locale } = useLanguage();
  const { addSelection, isSelected } = useBetslip();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [quarterfinals, setQuarterfinals] = useState<QuarterfinalMatchup[]>([]);
  const [outrightOdds, setOutrightOdds] = useState<OutrightOdds[]>([]);
  const [top8, setTop8] = useState<PlayoffPlayerEntry[]>([]);
  const [completedResults, setCompletedResults] = useState<CompletedMatch[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [leftColHeight, setLeftColHeight] = useState<number | undefined>(undefined);
  const leftColRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLeftColHeight(entry.contentRect.height + entry.target.clientTop * 2);
      }
    });
    ro.observe(node);
    setLeftColHeight(node.offsetHeight);
    return () => ro.disconnect();
  }, []);

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
      const [marketsData, betsData, activitiesData, resultsData, bracketData] = await Promise.all([
        api.getMarkets('open'),
        api.getMyBets(),
        api.getActivities(50),
        api.getResults(),
        api.getPlayoffBracket().catch(() => null),
      ]);
      // Filter out match markets whose match has already been completed
      const filtered = marketsData.filter(market => {
        if (market.market_type !== 'match') return true;
        const sel1 = market.selections[0];
        const sel2 = market.selections[1];
        if (!sel1 || !sel2) return true;
        return !resultsData.some(r =>
          (r.player1 === sel1.name && r.player2 === sel2.name) ||
          (r.player1 === sel2.name && r.player2 === sel1.name)
        );
      });
      setMarkets(filtered);
      setMyBets(betsData);
      setActivities(activitiesData);
      setCompletedResults(resultsData);
      if (bracketData) {
        setQuarterfinals(bracketData.quarterfinals || []);
        setOutrightOdds(bracketData.outright_odds || []);
        setTop8(bracketData.top8 || []);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(t('dashboard.connectionError'));
    }
  };

  let wsDelay = 5000;
  const wsMaxDelay = 30000;
  const connectWebSocket = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    let wsUrl: string;
    if (apiUrl) {
      // Strip /api path — WS endpoint is at /ws on the backend root
      const baseUrl = apiUrl.replace(/\/api\/?$/, '');
      wsUrl = baseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host.replace(':3000', ':8000')}/ws`;
    }

    const websocket = new WebSocket(wsUrl);
    websocket.onopen = () => { wsDelay = 5000; };
    websocket.onmessage = () => {
      loadData();
      refreshUser();
    };
    websocket.onerror = () => {};
    websocket.onclose = () => {
      setTimeout(connectWebSocket, wsDelay);
      wsDelay = Math.min(wsDelay * 2, wsMaxDelay);
    };

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
    <div className="min-h-screen bg-dark-950 overflow-x-hidden">
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('dashboard.welcome')} {user.name}</h1>
          <p className="text-base text-dark-400">{t('dashboard.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="card">
            <div className="text-dark-400 text-base md:text-sm">{t('dashboard.balance')}</div>
            <div className="text-2xl sm:text-3xl font-bold text-primary-400">{user.balance.toFixed(0)}</div>
            <div className="text-dark-500 text-sm md:text-xs">{t('nav.tokens')}</div>
          </div>
          <div className="card">
            <div className="text-dark-400 text-base md:text-sm">{t('dashboard.activeBets')}</div>
            <div className="text-2xl sm:text-3xl font-bold">{activeBets.length}</div>
            <div className="text-dark-500 text-sm md:text-xs">{t('dashboard.openPositions')}</div>
          </div>
          <div className="card">
            <div className="text-dark-400 text-base md:text-sm">{t('dashboard.atRisk')}</div>
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{totalAtRisk.toFixed(0)}</div>
            <div className="text-dark-500 text-sm md:text-xs">{t('dashboard.tokensStaked')}</div>
          </div>
          <div className="card">
            <div className="text-dark-400 text-base md:text-sm">{t('dashboard.potentialWin')}</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{potentialWin.toFixed(0)}</div>
            <div className="text-dark-500 text-sm md:text-xs">{t('dashboard.ifAllWin')}</div>
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

        <div className="grid lg:grid-cols-3 gap-8 items-start overflow-hidden">
          <div className="lg:col-span-2 min-w-0" ref={leftColRef}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold">{t('dashboard.openMarkets')}</h2>
              <Link href="/markets" className="text-primary-400 hover:underline text-sm">
                {t('dashboard.viewAll')}
              </Link>
            </div>

            {/* Projected Quarterfinal matchups — dynamic from playoff bracket */}
            {quarterfinals.length > 0 && (() => {
              const qfTop8Players = top8.map(p => p.player);
              const qfInsights = qfTop8Players.length > 0 ? computeAllInsights(qfTop8Players, completedResults, locale as 'en' | 'tr') : {};
              return (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-dark-400 mb-3 uppercase tracking-wide">{t('markets.projectedQF')}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {quarterfinals.map((qf, qfIdx) => {
                    const pseudoMarketId = -(9000 + qfIdx);
                    const sel1Id = -(9000 + qfIdx * 10 + 1);
                    const sel2Id = -(9000 + qfIdx * 10 + 2);
                    const tag1 = qfInsights[qf.higher_seed]?.tag || '';
                    const tag2 = qfInsights[qf.lower_seed]?.tag || '';
                    return (
                      <Link key={qf.label} href="/markets?tab=playoffs">
                        <div className="card !py-3 hover:border-primary-500/50 cursor-pointer transition-colors overflow-hidden">
                          <div className="text-center mb-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">{t('playoffs.quarterfinal')} {qfIdx + 1}</span>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center min-w-0">
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <div className="min-w-0">
                                <span className="font-bold text-sm text-white truncate block">{shortName(qf.higher_seed)}</span>
                                {tag1 && <span className="text-xs text-orange-400 italic truncate block">{tag1}</span>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold leading-none ${eloBgClass(qf.elo_higher)}`}>{qf.elo_higher.toFixed(0)}</span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addSelection({
                                      marketId: pseudoMarketId,
                                      selectionId: sel1Id,
                                      name: shortName(qf.higher_seed),
                                      odds: qf.odds_higher,
                                      marketName: qf.label,
                                      marketType: 'match',
                                    });
                                  }}
                                  className={`font-bold px-2 py-0.5 rounded-lg text-xs min-w-[2.5rem] text-center transition-all leading-none ${
                                    isSelected(sel1Id)
                                      ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                      : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                                  }`}
                                >
                                  {qf.odds_higher.toFixed(2)}
                                </button>
                              </div>
                            </div>
                            <span className="text-dark-500 text-xs font-bold text-center px-1 sm:px-2">VS</span>
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addSelection({
                                      marketId: pseudoMarketId,
                                      selectionId: sel2Id,
                                      name: shortName(qf.lower_seed),
                                      odds: qf.odds_lower,
                                      marketName: qf.label,
                                      marketType: 'match',
                                    });
                                  }}
                                  className={`font-bold px-2 py-0.5 rounded-lg text-xs min-w-[2.5rem] text-center transition-all leading-none ${
                                    isSelected(sel2Id)
                                      ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                      : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                                  }`}
                                >
                                  {qf.odds_lower.toFixed(2)}
                                </button>
                                <span className={`hidden sm:inline px-1.5 py-0.5 rounded text-xs font-bold leading-none ${eloBgClass(qf.elo_lower)}`}>{qf.elo_lower.toFixed(0)}</span>
                              </div>
                              <div className="min-w-0 text-right">
                                <span className="font-bold text-sm text-dark-200 truncate block">{shortName(qf.lower_seed)}</span>
                                {tag2 && <span className="text-xs text-orange-400 italic truncate block">{tag2}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              );
            })()}

            {/* Outright tournament champion — rich grid (dynamic from bracket + market) */}
            {(() => {
              const outrightMarkets = markets.filter(m => m.market_type === 'outright');
              const top8Players = top8.map(p => p.player);
              if (outrightMarkets.length === 0 || top8Players.length === 0) return null;
              const insights = computeAllInsights(top8Players, completedResults, locale as 'en' | 'tr');
              return outrightMarkets.map((market) => {
                const sorted = [...market.selections]
                  .filter(s => top8Players.some(n => s.name.includes(n) || n.includes(s.name)))
                  .sort((a, b) => {
                    const mcA = outrightOdds.find(o => a.name.includes(o.player) || o.player.includes(a.name));
                    const mcB = outrightOdds.find(o => b.name.includes(o.player) || o.player.includes(b.name));
                    return (mcA?.odds ?? 999) - (mcB?.odds ?? 999);
                  });
                if (sorted.length === 0) return null;
                return (
                  <div key={market.id}>
                    <h3 className="text-sm font-semibold text-dark-400 mb-3 uppercase tracking-wide">{t('markets.outrightWinner')}</h3>
                    <Link href={`/markets/${market.id}`}>
                      <div className="card hover:border-primary-500/50 cursor-pointer transition-all overflow-hidden">
                        {/* Desktop: horizontal grid */}
                        <div className="hidden sm:block overflow-x-auto pb-2">
                          <div className="grid gap-2" style={{ gridTemplateColumns: `5rem repeat(${sorted.length}, minmax(3.5rem, 1fr))` }}>
                            {/* Player names */}
                            <div />
                            {sorted.map((sel) => (
                              <div key={sel.id} className="text-xs text-dark-300 truncate text-center font-semibold leading-tight">
                                {shortName(sel.name)}
                              </div>
                            ))}
                            {/* Nickname tags */}
                            <div />
                            {sorted.map((sel) => {
                              const playerName = top8Players.find(n => sel.name.includes(n) || n.includes(sel.name)) || '';
                              const tag = insights[playerName]?.tag || '';
                              return (
                                <div key={`tag-${sel.id}`} className="text-xs text-orange-400 truncate text-center font-semibold italic leading-tight">
                                  {tag}
                                </div>
                              );
                            })}
                            {/* Market odds row */}
                            <div className="text-xs text-yellow-500 font-semibold flex flex-col justify-center items-end text-right leading-tight">{locale === 'tr' ? <><div>Piyasa</div><div>Oranı</div></> : <><div>Market</div><div>Odds</div></>}</div>
                            {sorted.map((sel) => {
                              const displayOdds = market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;
                              return (
                                <div key={sel.id} className="flex justify-center">
                                  <span className="font-bold px-2 py-1 rounded-lg text-sm bg-white text-blue-900 w-full text-center">
                                    {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                                  </span>
                                </div>
                              );
                            })}
                            {/* Model odds row */}
                            <div className="text-xs text-green-400 font-semibold flex flex-col justify-center items-end text-right leading-tight">{locale === 'tr' ? <><div>Model</div><div>Oran</div></> : <><div>Model</div><div>Odds</div></>}</div>
                            {sorted.map((sel) => {
                              const mcEntry = outrightOdds.find(o => sel.name.includes(o.player) || o.player.includes(sel.name));
                              return (
                                <div key={sel.id} className="flex justify-center">
                                  <span className="font-bold px-2 py-1 rounded-lg text-sm bg-green-500/20 text-green-400 w-full text-center">
                                    {mcEntry ? mcEntry.odds.toFixed(2) : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Mobile: transposed — players as rows */}
                        <div className="sm:hidden space-y-1">
                          <div className="flex items-center gap-2 px-2 pb-1">
                            <div className="flex-1" />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-yellow-500 font-semibold min-w-[3rem] text-center">{locale === 'tr' ? 'Piyasa' : 'Market'}</span>
                              <span className="text-[10px] text-green-400 font-semibold min-w-[3rem] text-center">{locale === 'tr' ? 'Model' : 'Model'}</span>
                            </div>
                          </div>
                          {sorted.map((sel) => {
                            const displayOdds = market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;
                            const mcEntry = outrightOdds.find(o => sel.name.includes(o.player) || o.player.includes(sel.name));
                            const playerName = top8Players.find(n => sel.name.includes(n) || n.includes(sel.name)) || '';
                            const tag = insights[playerName]?.tag || '';
                            return (
                              <div key={sel.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-dark-800/40">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm text-white truncate">{shortName(sel.name)}</div>
                                  {tag && <div className="text-xs text-orange-400 italic truncate">{tag}</div>}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-bold px-2 py-1 rounded-lg text-xs bg-white text-blue-900 min-w-[3rem] text-center">
                                    {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                                  </span>
                                  <span className="font-bold px-2 py-1 rounded-lg text-xs bg-green-500/20 text-green-400 min-w-[3rem] text-center">
                                    {mcEntry ? mcEntry.odds.toFixed(2) : '—'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              });
            })()}

          </div>

          <div className="flex flex-col min-h-0 min-w-0 max-h-[70vh] lg:max-h-none" style={leftColHeight ? { height: leftColHeight } : undefined}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold">{t('dashboard.liveActivity')}</h2>
              <Link href="/activity" className="text-primary-400 hover:underline text-sm">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mr-2 pr-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-dark-700 last:border-0">
                      <div className="text-lg">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{translateActivity(activity, locale)}</p>
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
        </div>

        {activeBets.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg sm:text-xl font-bold mb-4">{t('dashboard.myActiveBets')}</h2>
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
