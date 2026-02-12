/**
 * Global Betslip State — Acca Builder (S10)
 *
 * Manages prediction selections across all pages.
 * Supports accumulator (multi-selection) with combined odds.
 * Includes Kelly Criterion staking advisor (S8).
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface BetslipSelection {
  marketId: number;
  selectionId: number;
  name: string;
  odds: number;
  marketName: string;
  marketType: string;
}

interface BetslipContextType {
  selections: BetslipSelection[];
  addSelection: (sel: BetslipSelection) => { ok: boolean; warning?: string };
  removeSelection: (selectionId: number) => void;
  clearSlip: () => void;
  stake: number;
  setStake: (amount: number) => void;
  totalOdds: number;
  potentialReturn: number;
  isSelected: (selectionId: number) => boolean;
  hasMarket: (marketId: number) => boolean;
  kellyStake: (balance: number, perceivedProb: number, odds: number) => number;
}

const BetslipContext = createContext<BetslipContextType | null>(null);

export function useBetslip() {
  const context = useContext(BetslipContext);
  if (!context) throw new Error('useBetslip must be used within BetslipProvider');
  return context;
}

export function BetslipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetslipSelection[]>([]);
  const [stake, setStakeState] = useState<number>(10);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('betslip');
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data.selections)) setSelections(data.selections);
        if (typeof data.stake === 'number') setStakeState(data.stake);
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('betslip', JSON.stringify({ selections, stake }));
  }, [selections, stake]);

  const addSelection = useCallback((sel: BetslipSelection): { ok: boolean; warning?: string } => {
    // Toggle off if already selected
    const alreadySelected = selections.find(s => s.selectionId === sel.selectionId);
    if (alreadySelected) {
      setSelections(prev => prev.filter(s => s.selectionId !== sel.selectionId));
      return { ok: true };
    }

    // Block: max 1 selection per market
    const sameMarket = selections.find(s => s.marketId === sel.marketId);
    if (sameMarket) {
      return { ok: false, warning: 'sameMarket' };
    }

    setSelections(prev => [...prev, sel]);
    return { ok: true };
  }, [selections]);

  const removeSelection = useCallback((selectionId: number) => {
    setSelections(prev => prev.filter(s => s.selectionId !== selectionId));
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setStakeState(10);
  }, []);

  const setStake = useCallback((amount: number) => {
    setStakeState(Math.max(0, amount));
  }, []);

  const isSelected = useCallback((selectionId: number) => {
    return selections.some(s => s.selectionId === selectionId);
  }, [selections]);

  const hasMarket = useCallback((marketId: number) => {
    return selections.some(s => s.marketId === marketId);
  }, [selections]);

  // Accumulator: multiply all odds
  const totalOdds = selections.length > 0
    ? selections.reduce((acc, s) => acc * s.odds, 1)
    : 0;
  const potentialReturn = stake * totalOdds;

  /**
   * Kelly Criterion staking advisor (S8)
   * f* = (p × b - 1) / (b - 1), capped at 25% (fractional Kelly)
   * Returns recommended stake in RTB
   */
  const kellyStake = useCallback((balance: number, perceivedProb: number, odds: number): number => {
    if (odds <= 1 || perceivedProb <= 0 || perceivedProb >= 1 || balance <= 0) return 0;
    const f = (perceivedProb * odds - 1) / (odds - 1);
    const fraction = Math.max(0, Math.min(0.25, f)); // Cap at 25%
    return Math.round(balance * fraction);
  }, []);

  return (
    <BetslipContext.Provider value={{
      selections, addSelection, removeSelection, clearSlip,
      stake, setStake, totalOdds, potentialReturn,
      isSelected, hasMarket, kellyStake,
    }}>
      {children}
    </BetslipContext.Provider>
  );
}
