/**
 * Shared tournament utility functions and components.
 * Used by both tournament.tsx and markets/index.tsx.
 */
import { CompletedMatch, StandingEntry } from './api';

/** Compute full standings from match results (includes tiebreaks + remaining). */
export function computeStandings(filteredResults: CompletedMatch[]): StandingEntry[] {
  const playerSet = new Set<string>();
  filteredResults.forEach((m) => { playerSet.add(m.player1); playerSet.add(m.player2); });

  const records: Record<string, { played: number; wins: number; losses: number; draws: number; legs_for: number; legs_against: number; tiebreaks: number }> = {};
  playerSet.forEach((p) => { records[p] = { played: 0, wins: 0, losses: 0, draws: 0, legs_for: 0, legs_against: 0, tiebreaks: 0 }; });

  filteredResults.forEach((m) => {
    const r1 = records[m.player1];
    const r2 = records[m.player2];
    if (r1) {
      r1.played++; r1.legs_for += m.score1; r1.legs_against += m.score2;
      if (m.is_draw) { r1.draws++; }
      else if (m.winner === m.player1) { r1.wins++; if (m.score1 === 3 && m.score2 === 2) r1.tiebreaks++; }
      else r1.losses++;
    }
    if (r2) {
      r2.played++; r2.legs_for += m.score2; r2.legs_against += m.score1;
      if (m.is_draw) { r2.draws++; }
      else if (m.winner === m.player2) { r2.wins++; if (m.score2 === 3 && m.score1 === 2) r2.tiebreaks++; }
      else r2.losses++;
    }
  });

  const list: StandingEntry[] = Object.entries(records).map(([player, s]) => ({
    rank: 0, player, played: s.played, wins: s.wins, losses: s.losses, draws: s.draws,
    legs_for: s.legs_for, legs_against: s.legs_against, leg_diff: s.legs_for - s.legs_against,
    remaining: 38 - s.played, score: s.wins * 3, tiebreaks: s.tiebreaks,
  }));
  list.sort((a, b) =>
    (b.score ?? 0) - (a.score ?? 0) ||
    b.leg_diff - a.leg_diff ||
    b.legs_for - a.legs_for ||
    (b.tiebreaks ?? 0) - (a.tiebreaks ?? 0)
  );
  list.forEach((r, i) => { r.rank = i + 1; });
  return list;
}

export function eloToOdds(elo1: number, elo2: number): [string, string] {
  const e1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  return [(1 / e1).toFixed(2), (1 / (1 - e1)).toFixed(2)];
}

export function eloColorClass(elo: number): string {
  if (elo >= 1600) return 'text-yellow-400';
  if (elo >= 1500) return 'text-green-400';
  if (elo >= 1400) return 'text-blue-400';
  return 'text-red-400';
}

export function eloBgClass(elo: number): string {
  if (elo >= 1600) return 'bg-yellow-500/90 text-gray-900';
  if (elo >= 1500) return 'bg-green-600/90 text-white';
  if (elo >= 1400) return 'bg-blue-600/80 text-white';
  return 'bg-red-600/80 text-white';
}

export function winPctBgClass(pct: number): string {
  if (pct >= 65) return 'bg-green-600/90 text-white';
  if (pct >= 50) return 'bg-yellow-500/90 text-gray-900';
  if (pct >= 35) return 'bg-orange-500/80 text-white';
  return 'bg-red-600/80 text-white';
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

export interface PlayerInsight {
  strength: string;
  weakness: string;
  tag: string;
}

/** Raw stats for a single player, used by the draft-pick tag system */
interface PlayerStats {
  player: string;
  wins: number; losses: number; played: number;
  legsFor: number; legsAgainst: number;
  sweeps30: number; wins31: number; clutch32: number; lost32: number;
  winPct: number; domPct: number; sweepPct: number;
  currentStreak: number; maxWs: number; last5w: number;
  h2hDom: string[]; h2hWeak: string[];
}

/** Compute raw stats for one player against the full result set */
function computeRawStats(player: string, results: CompletedMatch[], finalists: string[]): PlayerStats {
  let wins = 0, losses = 0, legsFor = 0, legsAgainst = 0;
  let sweeps30 = 0, wins31 = 0, clutch32 = 0, lost32 = 0;
  const resultSeq: ('W' | 'L')[] = [];
  const h2h: Record<string, { w: number; l: number }> = {};
  finalists.forEach(f => { if (f !== player) h2h[f] = { w: 0, l: 0 }; });

  for (const m of results) {
    if (m.is_draw || !m.winner) continue;
    const isP1 = m.player1 === player;
    const isP2 = m.player2 === player;
    if (!isP1 && !isP2) continue;
    const my = isP1 ? m.score1 : m.score2;
    const opp = isP1 ? m.score2 : m.score1;
    const opponent = isP1 ? m.player2 : m.player1;
    legsFor += my; legsAgainst += opp;
    if (m.winner === player) {
      wins++; resultSeq.push('W');
      if (my === 3 && opp === 0) sweeps30++;
      else if (my === 3 && opp === 1) wins31++;
      else if (my === 3 && opp === 2) clutch32++;
    } else {
      losses++; resultSeq.push('L');
      if (opp === 3 && my === 2) lost32++;
    }
    if (h2h[opponent]) { if (m.winner === player) h2h[opponent].w++; else h2h[opponent].l++; }
  }

  const played = wins + losses;
  const winPct = played > 0 ? Math.round((wins / played) * 100) : 0;
  const domPct = wins > 0 ? Math.round(((sweeps30 + wins31) / wins) * 100) : 0;
  const sweepPct = wins > 0 ? Math.round((sweeps30 / wins) * 100) : 0;

  let streakCount = 0, streakType: 'W' | 'L' | null = null;
  for (let i = resultSeq.length - 1; i >= 0; i--) {
    if (streakType === null) { streakType = resultSeq[i]; streakCount = 1; }
    else if (resultSeq[i] === streakType) streakCount++;
    else break;
  }
  const currentStreak = streakType === 'W' ? streakCount : -streakCount;

  let maxWs = 0, ws = 0;
  for (const r of resultSeq) { if (r === 'W') { ws++; maxWs = Math.max(maxWs, ws); } else ws = 0; }

  const last5w = resultSeq.slice(-5).filter(r => r === 'W').length;

  const h2hDom: string[] = [];
  const h2hWeak: string[] = [];
  for (const [opp, rec] of Object.entries(h2h)) {
    if (rec.w + rec.l === 0) continue;
    const name = opp.split(' ')[0];
    if (rec.w > 0 && rec.l === 0) h2hDom.push(`${rec.w}-0 vs ${name}`);
    if (rec.l > 0 && rec.w === 0) h2hWeak.push(`0-${rec.l} vs ${name}`);
  }

  return { player, wins, losses, played, legsFor, legsAgainst,
    sweeps30, wins31, clutch32, lost32, winPct, domPct, sweepPct,
    currentStreak, maxWs, last5w, h2hDom, h2hWeak };
}

/** Build strength + weakness text for a player given their stats and assigned tag */
function buildInsightText(s: PlayerStats, tag: string, locale: 'en' | 'tr'): { strength: string; weakness: string } {
  const tr = locale === 'tr';
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Primary strength — tied to the assigned tag
  const tagStrengthMap: Record<string, () => string> = {
    'Dominatör': () => tr ? `%${s.winPct} galibiyet, %${s.domPct} dominant` : `${s.winPct}% wins, ${s.domPct}% dominant`,
    'Kapatıcı': () => tr ? `${s.clutch32} kritik set galibiyeti (3-2)` : `${s.clutch32} clutch 3-2 wins`,
    'Yıkıcı': () => tr ? `Galibiyetlerin %${s.domPct}'i yıkıcı (3-0/3-1)` : `${s.domPct}% demolishing wins (3-0/3-1)`,
    'Fırtına': () => tr ? `Galibiyetlerin %${s.sweepPct}'i 3-0 süpürme` : `${s.sweepPct}% of wins are 3-0 sweeps`,
    'Gizli Koz': () => tr ? `${s.played} maç, ${s.wins31} kontrollü galibiyet` : `${s.played} games, ${s.wins31} controlled wins`,
    'Yükselen': () => tr ? `Son 5'te ${s.last5w} galibiyet, yükselişte` : `${s.last5w}/5 recent wins, on the rise`,
    'Savaşçı': () => tr ? `${s.clutch32} kritik set galibiyeti` : `${s.clutch32} clutch wins, fights hard`,
    'Dengeli': () => tr ? `${s.wins} galibiyet, +${s.legsFor - s.legsAgainst} leg farkı` : `${s.wins}W, +${s.legsFor - s.legsAgainst} leg diff`,
    // English variants
    'The Dominator': () => `${s.winPct}% wins, ${s.domPct}% dominant`,
    'The Closer': () => `${s.clutch32} clutch 3-2 wins`,
    'The Demolisher': () => `${s.domPct}% demolishing wins (3-0/3-1)`,
    'The Storm': () => `${s.sweepPct}% of wins are 3-0 sweeps`,
    'Hidden Ace': () => `${s.played} games, ${s.wins31} controlled wins`,
    'The Rising': () => `${s.last5w}/5 recent wins, on the rise`,
    'The Fighter': () => `${s.clutch32} clutch wins, fights hard`,
    'Steady Hand': () => `${s.wins}W, +${s.legsFor - s.legsAgainst} leg diff`,
  };

  const tagFn = tagStrengthMap[tag];
  if (tagFn) strengths.push(tagFn());

  // Secondary strengths
  if (strengths.length === 0 || s.last5w >= 4) { if (strengths.length < 2 && s.last5w >= 4) strengths.push(tr ? `Son 5'te ${s.last5w} galibiyet` : `${s.last5w}/5 recent wins`); }
  if (s.maxWs >= 9 && strengths.length < 2) strengths.push(tr ? `En uzun seri: ${s.maxWs} galibiyet` : `Best run: ${s.maxWs}W streak`);
  if (s.winPct >= 70 && strengths.length < 2) strengths.push(tr ? `%${s.winPct} kazanma oranı` : `${s.winPct}% win rate`);
  if (strengths.length === 0) strengths.push(tr ? `${s.wins} galibiyet` : `${s.wins} wins`);

  // Weaknesses
  if (s.lost32 >= 4) weaknesses.push(tr ? `${s.lost32} son set mağlubiyeti (3-2)` : `${s.lost32} deciding-leg losses`);
  else if (s.currentStreak <= -3) weaknesses.push(tr ? `${-s.currentStreak} maç mağlubiyet serisi` : `${-s.currentStreak}L losing streak`);
  else if (s.last5w <= 1) weaknesses.push(tr ? `Son 5'te sadece ${s.last5w} galibiyet` : `Only ${s.last5w}/5 recent wins`);
  else if (s.clutch32 <= 2 && s.played >= 20) weaknesses.push(tr ? `Sadece ${s.clutch32} kritik set galibiyeti` : `Only ${s.clutch32} clutch (3-2) wins`);
  if (s.h2hWeak.length > 0 && weaknesses.length < 2) weaknesses.push(s.h2hWeak[0]);
  if (s.winPct <= 55 && s.played >= 20 && weaknesses.length === 0) weaknesses.push(tr ? `%${s.winPct} kazanma oranı` : `${s.winPct}% win rate`);
  if (weaknesses.length === 0) weaknesses.push(tr ? `${s.losses} mağlubiyet` : `${s.losses} losses`);

  return { strength: strengths[0], weakness: weaknesses[0] };
}

/**
 * Compute insights for ALL finalists at once using a draft-pick system.
 * Each tag is assigned to the single best-fitting player, guaranteeing 8 distinct tags.
 */
export function computeAllInsights(
  finalists: string[],
  results: CompletedMatch[],
  locale: 'en' | 'tr' = 'en',
): Record<string, PlayerInsight> {
  const tr = locale === 'tr';
  const allStats = finalists.map(p => computeRawStats(p, results, finalists));
  const assigned = new Set<string>();
  const tagMap: Record<string, string> = {}; // player → tag

  // Draft-pick rounds: each round finds the best untagged player for that tag.
  // Rounds 1-4 have min thresholds (strong identity tags).
  // Rounds 5-7 are threshold-free (always score >= 0) so every remaining player qualifies.
  // This prevents 2+ players falling through to the generic "Dengeli" fallback.
  const rounds: { tagTr: string; tagEn: string; score: (s: PlayerStats) => number }[] = [
    // Threshold tags — only genuinely fitting players
    { tagTr: 'Dominatör', tagEn: 'The Dominator', score: (s) => s.winPct >= 65 ? s.winPct + s.domPct / 2 : -1 },
    { tagTr: 'Yıkıcı', tagEn: 'The Demolisher', score: (s) => s.domPct >= 60 ? s.domPct * 2 + s.winPct : -1 },
    { tagTr: 'Fırtına', tagEn: 'The Storm', score: (s) => s.sweepPct >= 30 ? s.sweepPct * 2 + s.sweeps30 : -1 },
    { tagTr: 'Kapatıcı', tagEn: 'The Closer', score: (s) => s.clutch32 >= 3 ? s.clutch32 * 10 + s.winPct : -1 },
    // Threshold-free tags — every remaining player qualifies, best score wins
    { tagTr: 'Yükselen', tagEn: 'The Rising', score: (s) => s.last5w * 10 + (s.currentStreak > 0 ? s.currentStreak * 8 : 0) + (100 - s.winPct) },
    { tagTr: 'Savaşçı', tagEn: 'The Fighter', score: (s) => (s.clutch32 + s.wins31) * 5 + s.played },
    { tagTr: 'Gizli Koz', tagEn: 'Hidden Ace', score: (s) => s.played + s.wins31 * 3 + s.lost32 * 2 },
    { tagTr: 'Dengeli', tagEn: 'Steady Hand', score: (s) => s.played - Math.abs(50 - s.winPct) * 2 },
  ];

  for (const round of rounds) {
    let bestPlayer = '';
    let bestScore = -Infinity;
    for (const s of allStats) {
      if (assigned.has(s.player)) continue;
      const sc = round.score(s);
      if (sc > bestScore) { bestScore = sc; bestPlayer = s.player; }
    }
    if (bestPlayer && bestScore > -Infinity) {
      const tag = tr ? round.tagTr : round.tagEn;
      tagMap[bestPlayer] = tag;
      assigned.add(bestPlayer);
    }
  }

  // Build final insight objects with strength/weakness text
  const result: Record<string, PlayerInsight> = {};
  for (const s of allStats) {
    const tag = tagMap[s.player];
    const { strength, weakness } = buildInsightText(s, tag, locale);
    result[s.player] = { tag, strength, weakness };
  }
  return result;
}

/** Legacy single-player wrapper — delegates to computeAllInsights */
export function computePlayerInsights(
  player: string,
  results: CompletedMatch[],
  finalists: string[],
  locale: 'en' | 'tr' = 'en',
): PlayerInsight {
  const all = computeAllInsights(finalists, results, locale);
  return all[player] || { tag: locale === 'tr' ? 'Dengeli' : 'Steady Hand', strength: '', weakness: '' };
}

export function FormBoxes({ player, results }: { player: string; results: CompletedMatch[] }) {
  const form = getPlayerForm(player, results);
  if (form.length === 0) return <span className="text-dark-600 text-sm">—</span>;
  return (
    <div className="flex gap-0.5 sm:gap-1 shrink-0">
      {form.map((r, i) => (
        <span
          key={i}
          className={`w-4 h-4 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[9px] sm:text-sm font-extrabold text-white ${
            r === 'W' ? 'bg-green-700' : 'bg-rose-700'
          }`}
        >{r}</span>
      ))}
    </div>
  );
}
