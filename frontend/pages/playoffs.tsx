import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { shortName } from '@/lib/i18n';
import { eloBgClass, winPctBgClass, FormBoxes, getPlayerForm, computeAllInsights } from '@/lib/tournament-utils';
import { useBetslip } from '@/lib/BetslipContext';
import { api, PlayoffBracketResponse, StandingEntry, Market, CompletedMatch, PlayerRating } from '@/lib/api';

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return <span title={text} className="cursor-help">{children}</span>;
}

function FormTrend({ player, results }: { player: string; results: CompletedMatch[] }) {
  const form = getPlayerForm(player, results);
  if (form.length === 0) return <span className="text-dark-600">—</span>;
  const wins = form.filter(r => r === 'W').length;
  if (wins >= 4) return <span className="text-green-400 font-bold">▲</span>;
  if (wins >= 3) return <span className="text-dark-400 font-bold">▶</span>;
  return <span className="text-red-400 font-bold">▼</span>;
}
import Navbar from '@/components/Navbar';


export default function Playoffs() {
  const { user, loading } = useAuth();
  const { t, locale } = useLanguage();
  const { addSelection, isSelected } = useBetslip();
  const router = useRouter();
  const [bracket, setBracket] = useState<PlayoffBracketResponse | null>(null);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [results, setResults] = useState<CompletedMatch[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [outrightMarket, setOutrightMarket] = useState<Market | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadBracket();
  }, [user]);

  // WebSocket: live auto-refresh when results are entered (exponential backoff)
  useEffect(() => {
    if (!user) return;
    let delay = 5000;
    const maxDelay = 30000;
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
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => { delay = 5000; };
        ws.onmessage = () => { loadBracketSilent(); };
        ws.onerror = () => {};
        ws.onclose = () => {
          setTimeout(connectWebSocket, delay);
          delay = Math.min(delay * 2, maxDelay);
        };
        return ws;
      } catch { return null; }
    };
    const ws = connectWebSocket();
    return () => { ws?.close(); };
  }, [user]);

  const loadBracket = async () => {
    setLoadingData(true);
    try {
      const [data, standingsData, marketsData, resultsData, ratingsData] = await Promise.all([
        api.getPlayoffBracket(),
        api.getStandings(),
        api.getMarkets(),
        api.getResults(),
        api.getTournamentRatings(),
      ]);
      setBracket(data);
      setStandings(standingsData);
      setResults(resultsData);
      setRatings(ratingsData);
      const outright = marketsData.find(m => m.market_type === 'outright');
      if (outright) setOutrightMarket(outright);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const loadBracketSilent = async () => {
    try {
      const data = await api.getPlayoffBracket();
      setBracket(data);
    } catch (err) { console.error(err); }
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
      <div className="w-full px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-extrabold mb-2">{t('playoffs.title')}</h1>
        <p className="text-dark-300 text-sm sm:text-lg mb-8">{t('playoffs.subtitle')}</p>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : bracket ? (
          <>
            {/* ── Bracket Visualization (Horizontal) ── */}
            {bracket.quarterfinals.length > 0 && (() => {
              const finalistNames = bracket.top8.map(p => p.player);
              const allInsights = computeAllInsights(finalistNames, results, locale as 'en' | 'tr');
              const qfs = bracket.quarterfinals;

              const QFCardH = ({ qf, idx }: { qf: typeof qfs[0]; idx: number }) => {
                const ins1 = allInsights[qf.higher_seed] || { tag: '', strength: '', weakness: '' };
                const ins2 = allInsights[qf.lower_seed] || { tag: '', strength: '', weakness: '' };
                const mktId = -(9000 + idx);
                const sel1Id = -(9000 + idx * 10 + 1);
                const sel2Id = -(9000 + idx * 10 + 2);
                return (
                  <div className="bg-dark-800 border border-dark-700 rounded-lg p-2">
                    <div className="text-[10px] text-dark-500 font-bold mb-1.5">{t('playoffs.quarterfinal')} {idx + 1}</div>
                    <div className="flex items-stretch gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white text-xs truncate">{shortName(qf.higher_seed)}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-1 py-0.5 rounded text-[10px] font-bold leading-none ${eloBgClass(qf.elo_higher)}`}>{qf.elo_higher.toFixed(0)}</span>
                            <button onClick={() => addSelection({ marketId: mktId, selectionId: sel1Id, name: shortName(qf.higher_seed), odds: qf.odds_higher, marketName: `QF${idx+1}`, marketType: 'match' })} className={`font-bold px-1.5 py-0.5 rounded text-[10px] leading-none cursor-pointer transition-colors ${isSelected(sel1Id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'}`}>{qf.odds_higher.toFixed(2)}</button>
                          </div>
                        </div>
                        <div className="text-[10px] text-orange-400 font-bold italic truncate">{ins1.tag}</div>
                        <div className="flex items-start gap-1"><span className="text-green-400 text-[10px] shrink-0">▲</span><span className="text-[10px] text-dark-300 leading-tight">{ins1.strength}</span></div>
                        <div className="flex items-start gap-1"><span className="text-red-400 text-[10px] shrink-0">▼</span><span className="text-[10px] text-dark-400 leading-tight">{ins1.weakness}</span></div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] text-dark-500 font-bold leading-none">VS</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-dark-200 text-xs truncate">{shortName(qf.lower_seed)}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-1 py-0.5 rounded text-[10px] font-bold leading-none ${eloBgClass(qf.elo_lower)}`}>{qf.elo_lower.toFixed(0)}</span>
                            <button onClick={() => addSelection({ marketId: mktId, selectionId: sel2Id, name: shortName(qf.lower_seed), odds: qf.odds_lower, marketName: `QF${idx+1}`, marketType: 'match' })} className={`font-bold px-1.5 py-0.5 rounded text-[10px] leading-none cursor-pointer transition-colors ${isSelected(sel2Id) ? 'bg-white text-blue-900 ring-2 ring-primary-400' : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'}`}>{qf.odds_lower.toFixed(2)}</button>
                          </div>
                        </div>
                        <div className="text-[10px] text-orange-400 font-bold italic truncate">{ins2.tag}</div>
                        <div className="flex items-start gap-1"><span className="text-green-400 text-[10px] shrink-0">▲</span><span className="text-[10px] text-dark-300 leading-tight">{ins2.strength}</span></div>
                        <div className="flex items-start gap-1"><span className="text-red-400 text-[10px] shrink-0">▼</span><span className="text-[10px] text-dark-400 leading-tight">{ins2.weakness}</span></div>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                {/* Mobile: vertical bracket flow */}
                <div className="md:hidden card mb-8 space-y-4">
                  <div className="text-center text-xs text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.quarterfinals')}</div>
                  <div className="space-y-3">
                    <QFCardH qf={qfs[0]} idx={0} />
                    <QFCardH qf={qfs[1]} idx={1} />
                    <QFCardH qf={qfs[2]} idx={2} />
                    <QFCardH qf={qfs[3]} idx={3} />
                  </div>
                  <div className="flex justify-center"><div className="w-px h-6 bg-dark-600" /></div>
                  <div className="text-center text-xs text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.semifinals')}</div>
                  <div className="space-y-3">
                    <div className="bg-dark-800/60 border border-dark-700 border-dashed rounded-lg p-3 text-center">
                      <div className="text-xs text-dark-500 font-bold mb-1">SF1</div>
                      <div className="text-sm text-dark-400 italic">{shortName(qfs[0]?.higher_seed)} / {shortName(qfs[0]?.lower_seed)}</div>
                      <div className="text-xs text-dark-500 font-bold my-1">VS</div>
                      <div className="text-sm text-dark-400 italic">{shortName(qfs[1]?.higher_seed)} / {shortName(qfs[1]?.lower_seed)}</div>
                    </div>
                    <div className="bg-dark-800/60 border border-dark-700 border-dashed rounded-lg p-3 text-center">
                      <div className="text-xs text-dark-500 font-bold mb-1">SF2</div>
                      <div className="text-sm text-dark-400 italic">{shortName(qfs[2]?.higher_seed)} / {shortName(qfs[2]?.lower_seed)}</div>
                      <div className="text-xs text-dark-500 font-bold my-1">VS</div>
                      <div className="text-sm text-dark-400 italic">{shortName(qfs[3]?.higher_seed)} / {shortName(qfs[3]?.lower_seed)}</div>
                    </div>
                  </div>
                  <div className="flex justify-center"><div className="w-px h-6 bg-dark-600" /></div>
                  <div className="text-center text-xs text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.final')}</div>
                  <div className="bg-dark-800/60 border border-yellow-600/30 border-dashed rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-xs text-yellow-500 font-bold mb-1">{t('playoffs.final')}</div>
                    <div className="text-sm text-dark-400 italic">SF1 {t('playoffs.winner')}</div>
                    <div className="text-xs text-dark-500 font-bold my-1">VS</div>
                    <div className="text-sm text-dark-400 italic">SF2 {t('playoffs.winner')}</div>
                  </div>
                  <p className="text-xs text-dark-500 mt-4 text-center">{t('playoffs.liveOdds')}</p>
                </div>
                {/* Desktop: horizontal bracket */}
                <div className="hidden md:block card mb-8 overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[1fr_1.5rem_auto_1.5rem_auto_1.5rem_auto_1.5rem_1fr] items-center gap-y-3">
                      {/* Header row */}
                      <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.quarterfinals')}</div>
                      <div />
                      <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.semifinals')}</div>
                      <div />
                      <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.final')}</div>
                      <div />
                      <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.semifinals')}</div>
                      <div />
                      <div className="text-center text-[10px] text-dark-400 font-bold uppercase tracking-wide">{t('playoffs.quarterfinals')}</div>

                      {/* Row 1: QF1 — bracket — SF1 — line — Final — line — SF2 — bracket — QF3 */}
                      <QFCardH qf={qfs[0]} idx={0} />
                      {/* Left bracket connector */}
                      <div className="row-span-2 self-stretch relative" style={{ width: '1.5rem' }}>
                        <div className="absolute left-0 h-px bg-dark-600" style={{ top: '25%', right: '50%' }} />
                        <div className="absolute left-0 h-px bg-dark-600" style={{ top: '75%', right: '50%' }} />
                        <div className="absolute w-px bg-dark-600" style={{ left: '50%', top: '25%', bottom: '25%' }} />
                        <div className="absolute right-0 h-px bg-dark-600" style={{ top: '50%', left: '50%' }} />
                      </div>
                      {/* SF1 */}
                      <div className="row-span-2 flex items-center">
                        <div className="bg-dark-800/60 border border-dark-700 border-dashed rounded-lg px-2 py-1.5 whitespace-nowrap text-center">
                          <div className="text-[10px] text-dark-500 font-bold mb-0.5">SF1</div>
                          <div className="text-[11px] text-dark-400 italic">{shortName(qfs[0]?.higher_seed)} / {shortName(qfs[0]?.lower_seed)}</div>
                          <div className="text-[10px] text-dark-500 font-bold my-0.5 text-center">VS</div>
                          <div className="text-[11px] text-dark-400 italic">{shortName(qfs[1]?.higher_seed)} / {shortName(qfs[1]?.lower_seed)}</div>
                        </div>
                      </div>
                      <div className="row-span-2 flex items-center justify-center"><div className="w-full h-0.5 bg-dark-600" /></div>
                      {/* Final */}
                      <div className="row-span-2 flex items-center">
                        <div className="bg-dark-800/60 border border-yellow-600/30 border-dashed rounded-lg px-3 py-1.5 whitespace-nowrap text-center">
                          <div className="text-2xl mb-0.5">🏆</div>
                          <div className="text-[10px] text-yellow-500 font-bold mb-0.5">{t('playoffs.final')}</div>
                          <div className="text-[11px] text-dark-400 italic">SF1 {t('playoffs.winner')}</div>
                          <div className="text-[10px] text-dark-500 font-bold my-0.5">VS</div>
                          <div className="text-[11px] text-dark-400 italic">SF2 {t('playoffs.winner')}</div>
                        </div>
                      </div>
                      <div className="row-span-2 flex items-center justify-center"><div className="w-full h-0.5 bg-dark-600" /></div>
                      {/* SF2 */}
                      <div className="row-span-2 flex items-center">
                        <div className="bg-dark-800/60 border border-dark-700 border-dashed rounded-lg px-2 py-1.5 whitespace-nowrap text-center">
                          <div className="text-[10px] text-dark-500 font-bold mb-0.5">SF2</div>
                          <div className="text-[11px] text-dark-400 italic">{shortName(qfs[2]?.higher_seed)} / {shortName(qfs[2]?.lower_seed)}</div>
                          <div className="text-[10px] text-dark-500 font-bold my-0.5 text-center">VS</div>
                          <div className="text-[11px] text-dark-400 italic">{shortName(qfs[3]?.higher_seed)} / {shortName(qfs[3]?.lower_seed)}</div>
                        </div>
                      </div>
                      {/* Right bracket connector (mirrored) */}
                      <div className="row-span-2 self-stretch relative" style={{ width: '1.5rem' }}>
                        <div className="absolute right-0 h-px bg-dark-600" style={{ top: '25%', left: '50%' }} />
                        <div className="absolute right-0 h-px bg-dark-600" style={{ top: '75%', left: '50%' }} />
                        <div className="absolute w-px bg-dark-600" style={{ left: '50%', top: '25%', bottom: '25%' }} />
                        <div className="absolute left-0 h-px bg-dark-600" style={{ top: '50%', right: '50%' }} />
                      </div>
                      <QFCardH qf={qfs[2]} idx={2} />

                      {/* Row 2: QF2 and QF4 */}
                      <QFCardH qf={qfs[1]} idx={1} />
                      <QFCardH qf={qfs[3]} idx={3} />
                    </div>
                  </div>
                  <p className="text-xs text-dark-500 mt-4 text-center">{t('playoffs.liveOdds')}</p>
                </div>
                </>
              );
            })()}

            {/* ── Championship Odds (MC + Parimutuel) ── */}
            <h2 className="text-xl font-bold mb-4">{t('playoffs.outrightOdds')}</h2>
            {/* Mobile: transposed — 5-column grid layout */}
            <div className="sm:hidden card mb-8">
              {/* Column headers */}
              <div className="grid grid-cols-5 gap-2 px-2 pb-1 items-end">
                <div />
                <span className="text-[9px] text-yellow-500 font-bold text-center">{locale === 'tr' ? 'Piyasa' : 'Mkt'}</span>
                <span className="text-[9px] text-green-400 font-bold text-center">Model</span>
                <span className="text-[9px] text-fuchsia-400 font-bold text-center">Pool</span>
                <span className="text-[9px] text-blue-400 font-bold text-center">{locale === 'tr' ? 'Thm' : 'Pred'}</span>
              </div>
              <div className="space-y-1">
              {(() => {
                const marketSels = outrightMarket?.selections || [];
                return bracket.outright_odds
                  .filter(o => bracket.top8.some(p => p.player === o.player))
                  .sort((a, b) => a.odds - b.odds)
                  .map((o) => {
                    const marketSel = marketSels.find(s => s.name.includes(o.player) || o.player.includes(s.name));
                    const pariOdds = marketSel && outrightMarket?.betting_type === 'parimutuel'
                      ? marketSel.dynamic_odds : marketSel?.odds;
                    const pct = marketSel?.pool_percentage || 0;
                    const cx = 15, cy = 15, r2 = 13;
                    const angle = (pct / 100) * 360;
                    const rad = (angle - 90) * Math.PI / 180;
                    const dx = cx + r2 * Math.cos(rad);
                    const dy = cy + r2 * Math.sin(rad);
                    const largeArc = angle > 180 ? 1 : 0;
                    const piePath = pct >= 100 ? '' : pct > 0 ? `M${cx},${cy} L${cx},${cy - r2} A${r2},${r2} 0 ${largeArc},1 ${dx},${dy} Z` : '';
                    const totalBettors = outrightMarket?.total_unique_bettors || 0;
                    const selBettors = marketSel?.unique_bettors || 0;
                    const predPct = totalBettors > 0 ? Math.round((selBettors / totalBettors) * 10) : 0;
                    const filledBars = Math.min(predPct, 10);
                    return (
                      <div key={o.player} className="grid grid-cols-5 gap-2 px-2 py-1.5 rounded-lg bg-dark-800/40 items-center">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate">{shortName(o.player)}</div>
                        </div>
                        {/* Market odds */}
                        {outrightMarket && marketSel && pariOdds && outrightMarket.status === 'open' ? (
                          <button
                            onClick={() => {
                              addSelection({
                                marketId: outrightMarket.id,
                                selectionId: marketSel.id,
                                name: shortName(marketSel.name),
                                odds: pariOdds,
                                marketName: outrightMarket.name,
                                marketType: outrightMarket.market_type,
                              });
                            }}
                            className={`font-bold py-0.5 rounded text-[11px] text-center transition-colors ${
                              isSelected(marketSel.id)
                                ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                            }`}
                          >
                            {pariOdds.toFixed(2)}
                          </button>
                        ) : (
                          <span className="font-bold py-0.5 rounded text-[11px] bg-dark-700 text-dark-500 text-center">—</span>
                        )}
                        {/* Model odds */}
                        <span className="font-bold py-0.5 rounded text-[11px] bg-green-500/20 text-green-400 text-center">
                          {o.odds.toFixed(2)}
                        </span>
                        {/* Pool donut */}
                        <div className="flex flex-col items-center">
                          <svg width="22" height="22" viewBox="0 0 30 30">
                            <circle cx={cx} cy={cy} r={r2} className="fill-dark-600" />
                            {pct >= 100
                              ? <circle cx={cx} cy={cy} r={r2} className="fill-fuchsia-500" />
                              : piePath && <path d={piePath} className="fill-fuchsia-500" />
                            }
                          </svg>
                          <span className="text-[8px] text-fuchsia-400 font-bold leading-none">{pct.toFixed(0)}%</span>
                        </div>
                        {/* Predictor bars */}
                        <div className="flex items-end gap-[1px] h-[0.875rem] mx-auto w-full max-w-[2.5rem]">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className={`flex-1 rounded-[1px] ${i < filledBars ? 'bg-blue-500' : 'bg-dark-600'}`} style={{ height: '100%' }} />
                          ))}
                        </div>
                      </div>
                    );
                  });
              })()}
              </div>
            </div>
            {/* Desktop: table view */}
            <div className="hidden sm:block card mb-8 overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-dark-400 text-sm font-semibold border-b border-dark-700 uppercase tracking-wide">
                    <th className="pb-3">{t('tournament.player')}</th>
                    <th className="pb-3 text-center">{t('tournament.elo')}</th>
                    <th className="pb-3 text-center">{t('playoffs.winPct')}</th>
                    {outrightMarket && (
                      <th className="pb-3 text-center">{t('playoffs.marketOdds')}</th>
                    )}
                    <th className="pb-3 text-center">{t('playoffs.mcOdds')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const marketSels = outrightMarket?.selections || [];
                    return bracket.outright_odds
                      .filter(o => bracket.top8.some(p => p.player === o.player))
                      .sort((a, b) => a.odds - b.odds)
                      .map((o) => {
                        const top8Player = bracket.top8.find(p => p.player === o.player);
                        const marketSel = marketSels.find(s => s.name.includes(o.player) || o.player.includes(s.name));
                        const pariOdds = marketSel && outrightMarket?.betting_type === 'parimutuel'
                          ? marketSel.dynamic_odds : marketSel?.odds;
                        return (
                          <tr key={o.player} className="border-b border-dark-800 last:border-0 bg-green-900/10">
                            <td className="py-3 font-bold">{shortName(o.player)}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-sm font-bold ${eloBgClass(top8Player?.elo || 1500)}`}>
                                {(top8Player?.elo || 1500).toFixed(0)}
                              </span>
                            </td>
                            <td className="py-3 text-center text-dark-300">{(o.true_probability * 100).toFixed(1)}%</td>
                            {outrightMarket && (
                              <td className="py-3 text-center">
                                {marketSel && pariOdds && outrightMarket.status === 'open' ? (
                                  <button
                                    onClick={() => {
                                      addSelection({
                                        marketId: outrightMarket.id,
                                        selectionId: marketSel.id,
                                        name: shortName(marketSel.name),
                                        odds: pariOdds,
                                        marketName: outrightMarket.name,
                                        marketType: outrightMarket.market_type,
                                      });
                                    }}
                                    className={`font-bold px-3 py-1 rounded-lg text-sm cursor-pointer transition-colors ${
                                      isSelected(marketSel.id)
                                        ? 'bg-white text-blue-900 ring-2 ring-primary-400'
                                        : 'bg-white text-blue-900 hover:ring-2 hover:ring-primary-400/50'
                                    }`}
                                  >
                                    {pariOdds.toFixed(2)}
                                  </button>
                                ) : (
                                  <span className="font-bold px-3 py-1 rounded-lg bg-dark-700 text-dark-500 text-sm">—</span>
                                )}
                              </td>
                            )}
                            <td className="py-3 text-center">
                              <span className="font-bold px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm">
                                {o.odds.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>

            {/* ── Final Top 8 Standings ── */}
            <h2 className="text-xl font-bold mb-4">{t('markets.top8Race')}</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-dark-400 text-sm font-semibold border-b border-dark-700 uppercase tracking-wide">
                    <th className="pb-3 w-12">#</th>
                    <th className="pb-3">{t('tournament.player')}</th>
                    <th className="pb-3 text-center">{t('tournament.last5')}</th>
                    <th className="pb-3 text-center"><Tip text={t('tournament.trendTooltip')}>{t('tournament.trend')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center">{t('tournament.played')}</th>
                    <th className="pb-3 text-center">{t('tournament.won')}</th>
                    <th className="pb-3 text-center">{t('tournament.lost')}</th>
                    <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsFor')}</th>
                    <th className="pb-3 text-center hidden sm:table-cell">{t('tournament.legsAgainst')}</th>
                    <th className="pb-3 text-center">{t('tournament.diff')}</th>
                    <th className="pb-3 text-center"><Tip text={t('tournament.scoreTooltip')}>{t('tournament.score')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.tiebreakerTooltip')}>{t('tournament.tiebreakerCol')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.remainingTooltip')}>{t('tournament.remainingCol')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.winPctTooltip')}>{t('tournament.winRate')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                    <th className="pb-3 text-center hidden sm:table-cell"><Tip text={t('tournament.eloTooltip')}>{t('tournament.elo')} <span className="text-dark-500 text-xs">ⓘ</span></Tip></th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 8).map((s) => {
                    const winPct = s.played > 0 ? ((s.wins / s.played) * 100).toFixed(0) : '0';
                    const playerRating = ratings.find(r => r.player === s.player);
                    const elo = playerRating ? playerRating.elo.toFixed(0) : '—';
                    return (
                      <tr key={s.player} className="border-b border-dark-800 last:border-0 bg-green-900/10">
                        <td className="py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-green-500/20 text-green-400">
                            {s.rank}
                          </span>
                        </td>
                        <td className="py-3 font-bold">{shortName(s.player)}</td>
                        <td className="py-3">
                          <div className="flex justify-center">
                            <FormBoxes player={s.player} results={results} />
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <FormTrend player={s.player} results={results} />
                        </td>
                        <td className="py-3 text-center text-dark-300 font-semibold">{s.played}</td>
                        <td className="py-3 text-center text-green-400 font-semibold">{s.wins}</td>
                        <td className="py-3 text-center text-red-400 font-semibold">{s.losses}</td>
                        <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_for}</td>
                        <td className="py-3 text-center text-dark-300 hidden sm:table-cell">{s.legs_against}</td>
                        <td className="py-3 text-center">
                          <span className={`font-semibold ${s.leg_diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {s.leg_diff >= 0 ? '+' : ''}{s.leg_diff}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2.5 py-1 rounded-md text-sm font-semibold bg-primary-600/20 text-primary-400">{s.score}</span>
                        </td>
                        <td className="py-3 text-center text-dark-300 font-semibold hidden sm:table-cell">{s.tiebreaks ?? 0}</td>
                        <td className="py-3 text-center text-dark-400 font-semibold hidden sm:table-cell">{s.remaining ?? 0}</td>
                        <td className="py-3 text-center hidden sm:table-cell">
                          <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${winPctBgClass(Number(winPct))}`}>{winPct}%</span>
                        </td>
                        <td className="py-3 text-center hidden sm:table-cell">
                          <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${eloBgClass(Number(elo))}`}>{elo}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}
