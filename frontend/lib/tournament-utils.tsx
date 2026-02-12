/**
 * Shared tournament utility functions and components.
 * Used by both tournament.tsx and markets/index.tsx.
 */
import { CompletedMatch } from './api';

export function eloToOdds(elo1: number, elo2: number): [string, string] {
  const e1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  return [(1 / e1).toFixed(2), (1 / (1 - e1)).toFixed(2)];
}

export function eloColorClass(elo: number): string {
  if (elo >= 1600) return 'text-yellow-400';
  if (elo >= 1500) return 'text-green-400';
  if (elo >= 1400) return 'text-dark-300';
  return 'text-red-400';
}

export function eloBgClass(elo: number): string {
  if (elo >= 1600) return 'bg-yellow-500 text-gray-900';
  if (elo >= 1500) return 'bg-green-600 text-white';
  if (elo >= 1400) return 'bg-dark-600 text-white';
  return 'bg-red-600 text-white';
}

export function winPctBgClass(pct: number): string {
  if (pct >= 60) return 'bg-green-600 text-white';
  if (pct >= 40) return 'bg-yellow-500 text-gray-900';
  return 'bg-red-600 text-white';
}

export function getPlayerForm(player: string, results: CompletedMatch[]): ('W' | 'L')[] {
  const form: ('W' | 'L')[] = [];
  for (let i = 0; i < results.length && form.length < 5; i++) {
    const m = results[i];
    if (m.is_draw) continue;
    if (m.player1 === player || m.player2 === player) {
      form.push(m.winner === player ? 'W' : 'L');
    }
  }
  return form.reverse();
}

export function FormBoxes({ player, results }: { player: string; results: CompletedMatch[] }) {
  const form = getPlayerForm(player, results);
  if (form.length === 0) return <span className="text-dark-600 text-sm">—</span>;
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`w-7 h-7 rounded flex items-center justify-center text-sm font-extrabold text-white ${
            r === 'W' ? 'bg-green-700' : 'bg-rose-700'
          }`}
        >{r}</span>
      ))}
    </div>
  );
}
