/**
 * Floating Betslip Bar (S11) — sticky bottom bar for accumulator builder
 *
 * Collapsed: shows selection count + total odds
 * Expanded: full selection list, stake input, place button, Kelly suggestions
 */
import { useState } from 'react';
import { useBetslip } from '@/lib/BetslipContext';
import { useAuth } from '@/pages/_app';
import { useLanguage } from '@/lib/LanguageContext';
import { api } from '@/lib/api';

export default function BetslipBar() {
  const { selections, removeSelection, clearSlip, stake, setStake, totalOdds, potentialReturn, kellyStake } = useBetslip();
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  if (selections.length === 0 || !user) return null;

  const handlePlaceAll = async () => {
    if (!user || placing || stake <= 0) return;
    setPlacing(true);
    let success = 0;
    let failed = 0;

    // Split stake equally across selections for accumulator
    const stakePerBet = selections.length === 1
      ? stake
      : Math.max(1, Math.floor(stake / selections.length));

    for (const sel of selections) {
      try {
        await api.placeBet(sel.selectionId, stakePerBet);
        success++;
      } catch {
        failed++;
      }
    }

    setResult({ success, failed });
    if (success > 0) {
      clearSlip();
      refreshUser();
    }
    setPlacing(false);
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <>
    {/* Spacer to prevent page content hiding behind the fixed bar */}
    <div className="h-14" />
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Collapsed bar — always visible when selections exist */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 flex items-center justify-between transition-colors shadow-lg shadow-primary-900/30"
      >
        <div className="flex items-center gap-3">
          <span className="bg-white text-primary-600 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
            {selections.length}
          </span>
          <span className="font-semibold">{t('betslip.title')}</span>
        </div>
        <div className="flex items-center gap-4">
          {selections.length > 1 && (
            <span className="text-sm opacity-90">
              {t('betslip.acca')}: <span className="font-bold">{totalOdds.toFixed(2)}</span>
            </span>
          )}
          <span className="text-sm">{expanded ? '▼' : '▲'}</span>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-dark-900 border-t border-dark-700 max-h-[60vh] overflow-y-auto shadow-2xl">
          <div className="w-full px-4 py-4 max-w-7xl mx-auto">
            {/* Selection list */}
            <div className="space-y-2 mb-4">
              {selections.map((sel) => {
                // Kelly suggestion: assume 10% edge over implied probability
                const impliedProb = 1 / sel.odds;
                const perceivedProb = Math.min(0.95, impliedProb * 1.10);
                const kelly = kellyStake(user.balance, perceivedProb, sel.odds);

                return (
                  <div key={sel.selectionId} className="flex items-center justify-between bg-dark-800 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-dark-500 truncate">{sel.marketName}</div>
                      <div className="font-medium text-sm">{sel.name}</div>
                      {kelly > 0 && (
                        <div className="text-xs text-primary-400 mt-0.5">
                          {t('betslip.kelly')}: {kelly} RTB ({((kelly / user.balance) * 100).toFixed(0)}%)
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="bg-white text-blue-900 font-bold px-3 py-1 rounded-lg text-sm">
                        {sel.odds.toFixed(2)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSelection(sel.selectionId); }}
                        className="text-dark-500 hover:text-red-400 transition-colors text-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stake input + quick buttons */}
            <div className="mb-4">
              <label className="block text-xs text-dark-400 mb-1.5">{t('betslip.stake')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(Math.max(0, parseInt(e.target.value) || 0))}
                  className="input w-28 text-center"
                  min="1"
                  max={user.balance}
                />
                <span className="text-dark-400 text-sm">RTB</span>
                <div className="flex gap-1 ml-auto">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setStake(Math.min(amt, Math.floor(user.balance)))}
                      className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded text-sm transition-colors"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between mb-4 p-3 bg-dark-800 rounded-lg">
              <div>
                <div className="text-xs text-dark-400">
                  {selections.length > 1
                    ? `${t('betslip.acca')} (${selections.length} ${t('betslip.selections')})`
                    : t('betslip.single')}
                </div>
                <div className="text-sm text-dark-300">
                  {t('betslip.totalOdds')}: <span className="text-white font-bold">{totalOdds.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-dark-400">{t('betslip.potentialReturn')}</div>
                <div className="text-green-400 font-bold text-lg">{potentialReturn.toFixed(0)} RTB</div>
              </div>
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                result.failed === 0 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
              }`}>
                {result.success > 0 && `${result.success} ${t('betslip.successCount')}`}
                {result.failed > 0 && ` ${result.failed} failed.`}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePlaceAll}
                disabled={placing || stake <= 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placing ? t('betslip.placing') : t('betslip.placeAll')}
              </button>
              <button onClick={clearSlip} className="btn-secondary px-4">
                {t('betslip.clear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
