/**
 * My Predictions page — shows betslips grouped by betslip_id
 * Singles (no betslip_id) shown as individual cards
 * Accas grouped by shared betslip_id with expandable legs
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api, Bet } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BetslipBar from '@/components/BetslipBar';

interface Betslip {
  id: string; // betslip_id or `single-${bet.id}`
  bets: Bet[];
  totalStake: number;
  totalOdds: number;
  potentialReturn: number;
  actualPayout: number | null;
  status: 'active' | 'won' | 'lost' | 'mixed' | 'void';
  placedAt: string;
  isAcca: boolean;
}

type TabFilter = 'active' | 'settled' | 'all';

function groupIntoBetslips(bets: Bet[]): Betslip[] {
  const groups: Record<string, Bet[]> = {};

  for (const bet of bets) {
    const key = bet.betslip_id || `single-${bet.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(bet);
  }

  return Object.entries(groups).map(([id, legs]) => {
    const totalStake = legs.reduce((sum, b) => sum + b.stake, 0);
    const totalOdds = legs.reduce((acc, b) => acc * b.odds_at_time, 1);
    const potentialReturn = totalStake * totalOdds;

    // Determine overall status
    const statuses = legs.map(b => b.status);
    let status: Betslip['status'];
    if (statuses.every(s => s === 'active')) {
      status = 'active';
    } else if (statuses.every(s => s === 'won')) {
      status = 'won';
    } else if (statuses.some(s => s === 'lost')) {
      status = 'lost';
    } else if (statuses.every(s => s === 'void')) {
      status = 'void';
    } else {
      status = 'mixed'; // some settled, some active
    }

    const actualPayout = statuses.every(s => s === 'won')
      ? legs.reduce((sum, b) => sum + (b.actual_payout || b.potential_win), 0)
      : statuses.some(s => s === 'lost')
        ? 0
        : null;

    return {
      id,
      bets: legs.sort((a, b) => a.id - b.id),
      totalStake,
      totalOdds,
      potentialReturn,
      actualPayout,
      status,
      placedAt: legs[0].created_at,
      isAcca: legs.length > 1,
    };
  }).sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: t('predictions.pending') },
    won: { bg: 'bg-green-500/20', text: 'text-green-400', label: t('predictions.won') },
    lost: { bg: 'bg-red-500/20', text: 'text-red-400', label: t('predictions.lost') },
    void: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: t('predictions.void') },
    mixed: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Partial' },
  };
  const c = config[status] || config.active;
  return (
    <span className={`${c.bg} ${c.text} text-xs font-semibold px-2 py-0.5 rounded-full`}>
      {c.label}
    </span>
  );
}

function BetslipCard({ slip }: { slip: Betslip }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(slip.status === 'active');

  const date = new Date(slip.placedAt);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-750 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            {slip.isAcca ? (
              <span className="bg-primary-600/20 text-primary-400 text-xs font-bold px-2 py-1 rounded">
                {slip.bets.length}x {t('predictions.acca')}
              </span>
            ) : (
              <span className="bg-dark-700 text-dark-300 text-xs font-bold px-2 py-1 rounded">
                {t('predictions.single')}
              </span>
            )}
          </div>
          <StatusBadge status={slip.status} />
          <span className="text-xs text-dark-500 hidden sm:inline">{dateStr}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs text-dark-500">{t('predictions.totalStake')}</div>
            <div className="text-sm font-bold">{slip.totalStake.toFixed(0)} RTB</div>
          </div>
          <div className="text-right">
            {slip.status === 'won' && slip.actualPayout != null ? (
              <>
                <div className="text-xs text-green-500">{t('predictions.actualPayout')}</div>
                <div className="text-sm font-bold text-green-400">{slip.actualPayout.toFixed(0)} RTB</div>
              </>
            ) : slip.status === 'lost' ? (
              <>
                <div className="text-xs text-red-500">{t('predictions.actualPayout')}</div>
                <div className="text-sm font-bold text-red-400">0 RTB</div>
              </>
            ) : (
              <>
                <div className="text-xs text-dark-500">{t('predictions.potentialReturn')}</div>
                <div className="text-sm font-bold text-primary-400">{slip.potentialReturn.toFixed(0)} RTB</div>
              </>
            )}
          </div>
          <span className="text-dark-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Legs — expanded */}
      {expanded && (
        <div className="border-t border-dark-700">
          {slip.bets.map((bet) => (
            <div key={bet.id} className="px-4 py-2.5 flex items-center justify-between border-b border-dark-700/50 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Leg status icon */}
                <span className="shrink-0 w-5 text-center">
                  {bet.status === 'won' ? (
                    <span className="text-green-400 text-sm">&#10003;</span>
                  ) : bet.status === 'lost' ? (
                    <span className="text-red-400 text-sm">&#10007;</span>
                  ) : bet.status === 'void' ? (
                    <span className="text-gray-500 text-sm">&#8722;</span>
                  ) : (
                    <span className="text-blue-400 text-sm">&#9679;</span>
                  )}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{bet.selection_name}</div>
                  <div className="text-xs text-dark-500 truncate">{bet.market_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="bg-dark-700 text-white font-bold text-xs px-2 py-0.5 rounded">
                  {bet.odds_at_time.toFixed(2)}
                </span>
                <span className="text-xs text-dark-400 w-14 text-right">{bet.stake.toFixed(0)} RTB</span>
              </div>
            </div>
          ))}
          {/* Acca summary footer */}
          {slip.isAcca && (
            <div className="px-4 py-2 bg-dark-850 flex items-center justify-between text-xs">
              <span className="text-dark-500">{t('predictions.totalOdds')}: <span className="text-white font-bold">{slip.totalOdds.toFixed(2)}</span></span>
              <span className="text-dark-500 sm:hidden">{dateStr}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [tab, setTab] = useState<TabFilter>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    loadBets();
  }, [user]);

  const loadBets = async () => {
    try {
      const data = await api.getMyBets();
      setBets(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const betslips = groupIntoBetslips(bets);

  const filtered = betslips.filter(slip => {
    if (tab === 'active') return slip.status === 'active' || slip.status === 'mixed';
    if (tab === 'settled') return slip.status === 'won' || slip.status === 'lost' || slip.status === 'void';
    return true;
  });

  const counts = {
    active: betslips.filter(s => s.status === 'active' || s.status === 'mixed').length,
    settled: betslips.filter(s => s.status === 'won' || s.status === 'lost' || s.status === 'void').length,
    all: betslips.length,
  };

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{t('predictions.title')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['active', 'settled', 'all'] as TabFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setTab(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {t(`predictions.${f}`)} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Betslip cards */}
        {loading ? (
          <div className="text-center text-dark-400 py-12">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-dark-400 py-12">
            {t('predictions.noPredictions')}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(slip => (
              <BetslipCard key={slip.id} slip={slip} />
            ))}
          </div>
        )}
      </div>
      <BetslipBar />
    </div>
  );
}
