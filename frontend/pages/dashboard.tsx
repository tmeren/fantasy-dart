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
      // Filter out round-robin match markets whose match has already been completed
      // Skip QF markets (name starts with "QF") — QF players also met in round-robin
      const filtered = marketsData.filter(market => {
        if (market.market_type !== 'match') return true;
        if (market.name?.startsWith('QF')) return true;
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

        {/* Phone / WhatsApp Card — hidden for now */}
        {!user.phone_number && (
          <div className="hidden mb-8 card border border-primary-500/30 bg-primary-500/5">
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
          <div className="hidden mb-8 card">
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
                    // Find real market for this QF matchup by matching player names
                    const realMarket = markets.find(m => m.market_type === 'match' && (() => {
                      const names = m.selections.map(s => s.name);
                      return names.some(n => n.includes(qf.higher_seed) || qf.higher_seed.includes(n))
                          && names.some(n => n.includes(qf.lower_seed) || qf.lower_seed.includes(n));
                    })());
                    const realSel1 = realMarket?.selections.find(s => s.name.includes(qf.higher_seed) || qf.higher_seed.includes(s.name));
                    const realSel2 = realMarket?.selections.find(s => s.name.includes(qf.lower_seed) || qf.lower_seed.includes(s.name));
                    const mktId = realMarket?.id ?? -(9000 + qfIdx);
                    const sel1Id = realSel1?.id ?? -(9000 + qfIdx * 10 + 1);
                    const sel2Id = realSel2?.id ?? -(9000 + qfIdx * 10 + 2);
                    const odds1 = realSel1 && realMarket?.betting_type === 'parimutuel' ? realSel1.dynamic_odds : qf.odds_higher;
                    const odds2 = realSel2 && realMarket?.betting_type === 'parimutuel' ? realSel2.dynamic_odds : qf.odds_lower;
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
                                      marketId: mktId,
                                      selectionId: sel1Id,
                                      name: shortName(qf.higher_seed),
                                      odds: odds1,
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
                                  {odds1.toFixed(2)}
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
                                      marketId: mktId,
                                      selectionId: sel2Id,
                                      name: shortName(qf.lower_seed),
                                      odds: odds2,
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
                                  {odds2.toFixed(2)}
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
                        {/* Mobile: transposed — grid with tight Pool column */}
                        <div className="sm:hidden">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3rem 3rem 1.75rem 1fr', gap: '0.25rem' }} className="px-2 pb-1 items-end">
                            <div />
                            <span className="text-[9px] text-yellow-500 font-bold text-center">{locale === 'tr' ? 'Piyasa' : 'Mkt'}</span>
                            <span className="text-[9px] text-green-400 font-bold text-center">Model</span>
                            <span className="text-[9px] text-fuchsia-400 font-bold text-center">Pool</span>
                            <span className="text-[9px] text-blue-400 font-bold text-center">{locale === 'tr' ? 'Thm' : 'Pred'}</span>
                          </div>
                          <div className="space-y-1">
                          {sorted.map((sel) => {
                            const displayOdds = market.betting_type === 'parimutuel' ? sel.dynamic_odds : sel.odds;
                            const mcEntry = outrightOdds.find(o => sel.name.includes(o.player) || o.player.includes(sel.name));
                            const playerName = top8Players.find(n => sel.name.includes(n) || n.includes(sel.name)) || '';
                            const tag = insights[playerName]?.tag || '';
                            const pct = sel.pool_percentage;
                            const cx = 15, cy = 15, r = 13;
                            const angle = (pct / 100) * 360;
                            const rad = (angle - 90) * Math.PI / 180;
                            const dx = cx + r * Math.cos(rad);
                            const dy = cy + r * Math.sin(rad);
                            const largeArc = angle > 180 ? 1 : 0;
                            const piePath = pct >= 100 ? '' : pct > 0 ? `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${dx},${dy} Z` : '';
                            const totalBettors = market.total_unique_bettors || 0;
                            const selBettors = sel.unique_bettors || 0;
                            const predRatio = selBettors > 0 ? Math.round(totalBettors / selBettors) : 0;
                            const filledBars = Math.min(Math.round(predRatio / 2), 10);
                            return (
                              <div key={sel.id} style={{ display: 'grid', gridTemplateColumns: '1fr 3rem 3rem 1.75rem 1fr', gap: '0.25rem' }} className="px-2 py-1.5 rounded-lg bg-dark-800/40 items-center">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-white truncate">{shortName(sel.name)}</div>
                                  {tag && <div className="text-[10px] text-orange-400 italic truncate">{tag}</div>}
                                </div>
                                <span className="font-bold py-0.5 rounded text-[11px] bg-white text-blue-900 text-center">
                                  {displayOdds > 0 ? displayOdds.toFixed(2) : '—'}
                                </span>
                                <span className="font-bold py-0.5 rounded text-[11px] bg-green-500/20 text-green-400 text-center">
                                  {mcEntry ? mcEntry.odds.toFixed(2) : '—'}
                                </span>
                                <div className="flex flex-col items-center">
                                  <svg width="18" height="18" viewBox="0 0 30 30">
                                    <circle cx={cx} cy={cy} r={r} className="fill-dark-600" />
                                    {pct >= 100
                                      ? <circle cx={cx} cy={cy} r={r} className="fill-fuchsia-500" />
                                      : piePath && <path d={piePath} className="fill-fuchsia-500" />
                                    }
                                  </svg>
                                  <span className="text-[7px] text-fuchsia-400 font-bold leading-none">{pct.toFixed(0)}%</span>
                                </div>
                                <div className="flex items-end gap-[1px] h-[0.875rem]">
                                  {Array.from({ length: 10 }, (_, i) => (
                                    <div key={i} className={`flex-1 rounded-[1px] ${i < filledBars ? 'bg-blue-500' : 'bg-dark-600'}`} style={{ height: '100%' }} />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          </div>
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

        {activeBets.length > 0 && (() => {
          // Group active bets into betslips
          const groups: Record<string, Bet[]> = {};
          for (const bet of activeBets) {
            const key = bet.betslip_id || `single-${bet.id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(bet);
          }
          const betslips = Object.entries(groups).map(([id, legs]) => ({
            id,
            bets: legs.sort((a, b) => a.id - b.id),
            totalStake: legs.reduce((sum, b) => sum + b.stake, 0),
            totalOdds: legs.reduce((acc, b) => acc * b.odds_at_time, 1),
            potentialReturn: legs.reduce((sum, b) => sum + b.stake, 0) * legs.reduce((acc, b) => acc * b.odds_at_time, 1),
            isAcca: legs.length > 1,
          }));

          return (
            <div className="mt-8">
              <h2 className="text-lg sm:text-xl font-bold mb-4">{t('dashboard.myActiveBets')}</h2>
              <div className="space-y-3">
                {betslips.map((slip) => (
                  <div key={slip.id} className="card">
                    {/* Betslip header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {slip.isAcca ? (
                          <span className="bg-primary-600/20 text-primary-400 text-xs font-bold px-2 py-1 rounded">
                            {slip.bets.length}-fold {t('predictions.acca')}
                          </span>
                        ) : (
                          <span className="bg-dark-700 text-dark-300 text-xs font-bold px-2 py-1 rounded">
                            {t('predictions.single')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-dark-400">{t('predictions.totalStake')}: <span className="text-white font-bold">{slip.totalStake.toFixed(0)} RTB</span></span>
                        {slip.isAcca && (
                          <span className="text-dark-400">{t('predictions.totalOdds')}: <span className="text-white font-bold">{slip.totalOdds.toFixed(2)}</span></span>
                        )}
                        <span className="text-green-400 font-bold">{t('predictions.potentialReturn')}: {slip.potentialReturn.toFixed(0)} RTB</span>
                      </div>
                    </div>
                    {/* Legs */}
                    <div className="space-y-1">
                      {slip.bets.map((bet) => (
                        <div key={bet.id} className="flex items-center justify-between py-1.5 border-b border-dark-800/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 text-xs">&#9679;</span>
                            <span className="text-dark-300 text-sm">{bet.market_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{bet.selection_name}</span>
                            <span className="odds-badge text-xs">{bet.odds_at_time.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
