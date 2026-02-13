import { eloToOdds, eloColorClass, eloBgClass, winPctBgClass, getPlayerForm } from '../lib/tournament-utils';
import { CompletedMatch } from '../lib/api';

describe('tournament-utils', () => {
  describe('eloToOdds', () => {
    it('returns equal odds for equal Elo ratings', () => {
      const [odds1, odds2] = eloToOdds(1500, 1500);
      expect(odds1).toBe('2.00');
      expect(odds2).toBe('2.00');
    });

    it('gives lower odds (higher probability) to higher-rated player', () => {
      const [odds1, odds2] = eloToOdds(1600, 1400);
      expect(parseFloat(odds1)).toBeLessThan(2);
      expect(parseFloat(odds2)).toBeGreaterThan(2);
    });

    it('gives lower odds to player2 when player2 has higher Elo', () => {
      const [odds1, odds2] = eloToOdds(1400, 1600);
      expect(parseFloat(odds1)).toBeGreaterThan(2);
      expect(parseFloat(odds2)).toBeLessThan(2);
    });

    it('handles large Elo differences', () => {
      const [odds1, odds2] = eloToOdds(2000, 1000);
      expect(parseFloat(odds1)).toBeLessThan(1.1);
      expect(parseFloat(odds2)).toBeGreaterThan(10);
    });

    it('returns symmetric odds for swapped ratings', () => {
      const [a1, a2] = eloToOdds(1600, 1400);
      const [b1, b2] = eloToOdds(1400, 1600);
      expect(a1).toBe(b2);
      expect(a2).toBe(b1);
    });
  });

  describe('eloColorClass', () => {
    it('returns yellow for elite players (1600+)', () => {
      expect(eloColorClass(1600)).toBe('text-yellow-400');
      expect(eloColorClass(1800)).toBe('text-yellow-400');
    });

    it('returns green for strong players (1500-1599)', () => {
      expect(eloColorClass(1500)).toBe('text-green-400');
      expect(eloColorClass(1599)).toBe('text-green-400');
    });

    it('returns blue for average players (1400-1499)', () => {
      expect(eloColorClass(1400)).toBe('text-blue-400');
      expect(eloColorClass(1499)).toBe('text-blue-400');
    });

    it('returns red for below-average players (<1400)', () => {
      expect(eloColorClass(1399)).toBe('text-red-400');
      expect(eloColorClass(1000)).toBe('text-red-400');
    });
  });

  describe('eloBgClass', () => {
    it('returns yellow bg for 1600+', () => {
      expect(eloBgClass(1600)).toBe('bg-yellow-500/90 text-gray-900');
    });

    it('returns green bg for 1500-1599', () => {
      expect(eloBgClass(1550)).toBe('bg-green-600/90 text-white');
    });

    it('returns blue bg for 1400-1499', () => {
      expect(eloBgClass(1450)).toBe('bg-blue-600/80 text-white');
    });

    it('returns red bg for <1400', () => {
      expect(eloBgClass(1300)).toBe('bg-red-600/80 text-white');
    });
  });

  describe('winPctBgClass', () => {
    it('returns green for 65%+', () => {
      expect(winPctBgClass(65)).toBe('bg-green-600/90 text-white');
      expect(winPctBgClass(80)).toBe('bg-green-600/90 text-white');
    });

    it('returns yellow for 50-64%', () => {
      expect(winPctBgClass(50)).toBe('bg-yellow-500/90 text-gray-900');
      expect(winPctBgClass(64)).toBe('bg-yellow-500/90 text-gray-900');
    });

    it('returns orange for 35-49%', () => {
      expect(winPctBgClass(35)).toBe('bg-orange-500/80 text-white');
      expect(winPctBgClass(49)).toBe('bg-orange-500/80 text-white');
    });

    it('returns red for <35%', () => {
      expect(winPctBgClass(34)).toBe('bg-red-600/80 text-white');
      expect(winPctBgClass(0)).toBe('bg-red-600/80 text-white');
    });
  });

  describe('getPlayerForm', () => {
    const makeMatch = (
      player1: string, player2: string,
      score1: number, score2: number,
      winner: string | null, isDraw = false
    ): CompletedMatch => ({
      round: 1,
      match_id: Math.random(),
      player1,
      player2,
      score1,
      score2,
      winner,
      is_draw: isDraw,
    });

    it('returns empty array for no matches', () => {
      expect(getPlayerForm('Alice', [])).toEqual([]);
    });

    it('returns empty array when player has no matches', () => {
      const results = [makeMatch('Bob', 'Charlie', 3, 1, 'Bob')];
      expect(getPlayerForm('Alice', results)).toEqual([]);
    });

    it('returns W for wins and L for losses (chronological: oldest first)', () => {
      // Input is most-recent first: Alice won (recent), then lost (older)
      const results = [
        makeMatch('Alice', 'Bob', 3, 1, 'Alice'),      // most recent: W
        makeMatch('Charlie', 'Alice', 3, 2, 'Charlie'), // older: L
      ];
      const form = getPlayerForm('Alice', results);
      // Output is reversed to chronological: oldest first
      expect(form).toEqual(['L', 'W']);
    });

    it('skips draws', () => {
      const results = [
        makeMatch('Alice', 'Bob', 2, 2, null, true),
        makeMatch('Alice', 'Charlie', 3, 1, 'Alice'),
      ];
      const form = getPlayerForm('Alice', results);
      expect(form).toEqual(['W']);
    });

    it('returns at most 5 results', () => {
      const results = Array.from({ length: 10 }, (_, i) =>
        makeMatch('Alice', `Opponent${i}`, 3, 1, 'Alice')
      );
      const form = getPlayerForm('Alice', results);
      expect(form).toHaveLength(5);
    });

    it('returns form in chronological order (reversed from input)', () => {
      const results = [
        makeMatch('Alice', 'Bob', 3, 1, 'Alice'),     // most recent = W
        makeMatch('Charlie', 'Alice', 3, 0, 'Charlie'), // older = L
        makeMatch('Alice', 'Dave', 3, 2, 'Alice'),      // oldest = W
      ];
      // Input is most-recent-first, getPlayerForm collects then reverses
      const form = getPlayerForm('Alice', results);
      expect(form).toEqual(['W', 'L', 'W']);
    });

    it('works when player is player2', () => {
      const results = [
        makeMatch('Bob', 'Alice', 1, 3, 'Alice'),
      ];
      expect(getPlayerForm('Alice', results)).toEqual(['W']);
    });
  });
});
