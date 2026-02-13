import { renderHook, act } from '@testing-library/react';
import { BetslipProvider, useBetslip, BetslipSelection } from '../lib/BetslipContext';
import { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }: { children: ReactNode }) => (
  <BetslipProvider>{children}</BetslipProvider>
);

const makeSel = (overrides: Partial<BetslipSelection> = {}): BetslipSelection => ({
  marketId: 1,
  selectionId: 100,
  name: 'Player A',
  odds: 2.5,
  marketName: 'Match Winner',
  marketType: 'outright',
  ...overrides,
});

describe('BetslipContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('useBetslip outside provider', () => {
    it('throws when used outside BetslipProvider', () => {
      // Suppress console.error for expected error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useBetslip());
      }).toThrow('useBetslip must be used within BetslipProvider');
      spy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('starts with empty selections and default stake', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      expect(result.current.selections).toEqual([]);
      expect(result.current.stake).toBe(10);
      expect(result.current.totalOdds).toBe(0);
      expect(result.current.potentialReturn).toBe(0);
    });
  });

  describe('addSelection', () => {
    it('adds a selection', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => {
        result.current.addSelection(makeSel());
      });
      expect(result.current.selections).toHaveLength(1);
      expect(result.current.selections[0].name).toBe('Player A');
    });

    it('toggles off when same selection is added again', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      const sel = makeSel();
      act(() => { result.current.addSelection(sel); });
      expect(result.current.selections).toHaveLength(1);
      act(() => { result.current.addSelection(sel); });
      expect(result.current.selections).toHaveLength(0);
    });

    it('blocks adding second selection from same market', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ selectionId: 100 })); });
      let addResult: { ok: boolean; warning?: string };
      act(() => {
        addResult = result.current.addSelection(makeSel({ selectionId: 200 }));
      });
      expect(addResult!.ok).toBe(false);
      expect(addResult!.warning).toBe('sameMarket');
      expect(result.current.selections).toHaveLength(1);
    });

    it('allows selections from different markets', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ marketId: 1, selectionId: 100 })); });
      act(() => { result.current.addSelection(makeSel({ marketId: 2, selectionId: 200 })); });
      expect(result.current.selections).toHaveLength(2);
    });
  });

  describe('removeSelection', () => {
    it('removes a selection by ID', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ selectionId: 100 })); });
      act(() => { result.current.addSelection(makeSel({ marketId: 2, selectionId: 200 })); });
      act(() => { result.current.removeSelection(100); });
      expect(result.current.selections).toHaveLength(1);
      expect(result.current.selections[0].selectionId).toBe(200);
    });
  });

  describe('clearSlip', () => {
    it('clears all selections and resets stake', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel()); });
      act(() => { result.current.setStake(50); });
      act(() => { result.current.clearSlip(); });
      expect(result.current.selections).toEqual([]);
      expect(result.current.stake).toBe(10);
    });
  });

  describe('stake management', () => {
    it('setStake updates the stake', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.setStake(100); });
      expect(result.current.stake).toBe(100);
    });

    it('setStake clamps to 0 minimum', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.setStake(-50); });
      expect(result.current.stake).toBe(0);
    });
  });

  describe('odds calculations', () => {
    it('calculates totalOdds as product of all selection odds', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ marketId: 1, selectionId: 1, odds: 2.0 })); });
      act(() => { result.current.addSelection(makeSel({ marketId: 2, selectionId: 2, odds: 3.0 })); });
      expect(result.current.totalOdds).toBe(6.0);
    });

    it('calculates potentialReturn as stake * totalOdds', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ marketId: 1, selectionId: 1, odds: 2.0 })); });
      act(() => { result.current.setStake(50); });
      expect(result.current.potentialReturn).toBe(100);
    });
  });

  describe('isSelected / hasMarket', () => {
    it('isSelected returns true for selected items', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ selectionId: 42 })); });
      expect(result.current.isSelected(42)).toBe(true);
      expect(result.current.isSelected(99)).toBe(false);
    });

    it('hasMarket returns true for markets with selections', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      act(() => { result.current.addSelection(makeSel({ marketId: 7 })); });
      expect(result.current.hasMarket(7)).toBe(true);
      expect(result.current.hasMarket(99)).toBe(false);
    });
  });

  describe('kellyStake', () => {
    it('returns 0 for invalid inputs', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      expect(result.current.kellyStake(0, 0.5, 2.0)).toBe(0);      // zero balance
      expect(result.current.kellyStake(100, 0, 2.0)).toBe(0);       // zero prob
      expect(result.current.kellyStake(100, 1, 2.0)).toBe(0);       // prob >= 1
      expect(result.current.kellyStake(100, 0.5, 1)).toBe(0);       // odds <= 1
      expect(result.current.kellyStake(-100, 0.5, 2.0)).toBe(0);    // negative balance
    });

    it('returns 0 when edge is negative (bad bet)', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      // prob=0.3, odds=2.0: f = (0.3*2 - 1)/(2-1) = -0.4 → clamped to 0
      expect(result.current.kellyStake(1000, 0.3, 2.0)).toBe(0);
    });

    it('calculates correct Kelly stake for positive edge', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      // prob=0.6, odds=2.5: f = (0.6*2.5 - 1)/(2.5-1) = 0.5/1.5 = 0.333
      // Capped at 0.25: stake = 1000 * 0.25 = 250
      expect(result.current.kellyStake(1000, 0.6, 2.5)).toBe(250);
    });

    it('caps at 25% of balance (fractional Kelly)', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      // prob=0.9, odds=5.0: f = (0.9*5 - 1)/(5-1) = 3.5/4 = 0.875
      // Capped at 0.25: stake = 1000 * 0.25 = 250
      expect(result.current.kellyStake(1000, 0.9, 5.0)).toBe(250);
    });

    it('returns rounded integer', () => {
      const { result } = renderHook(() => useBetslip(), { wrapper });
      // prob=0.55, odds=2.0: f = (0.55*2 - 1)/(2-1) = 0.1
      // stake = 1000 * 0.1 = 100
      expect(result.current.kellyStake(1000, 0.55, 2.0)).toBe(100);
    });
  });
});
