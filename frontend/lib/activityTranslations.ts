import { ReactNode, createElement } from 'react';
import { Activity } from './api';
import { Locale } from './i18n';

/**
 * Translate activity messages based on activity_type and structured data.
 * Returns Turkish translation when locale is 'tr', English otherwise.
 * Structured types (bet_voided_refund, season_cleanup) always get rich formatting
 * regardless of locale — plain-text backend messages are replaced with bullet layouts.
 */
export function translateActivity(activity: Activity, locale: Locale): ReactNode {
  const d = activity.data ? (() => { try { return JSON.parse(activity.data!); } catch { return null; } })() : null;
  const isTr = locale === 'tr';

  // --- Structured types: always format with rich layout (both EN and TR) ---

  if (activity.activity_type === 'bet_voided_refund' && d) {
    const bullets = (d.details || []).map(
      (r: { stake: number; selection: string; market: string; round: number }, i: number) =>
        createElement('li', { key: i, className: 'ml-4' },
          isTr
            ? `${r.stake.toFixed(0)} RTB '${r.selection}' üzerine (${r.market}, Tur ${r.round})`
            : `${r.stake.toFixed(0)} RTB on '${r.selection}' (${r.market}, Round ${r.round})`
        )
    );
    return createElement('div', null,
      createElement('span', null,
        isTr
          ? `İade: ${d.user_name} ${d.refunded_total.toFixed(0)} RTB geri aldı.`
          : `Refund: ${d.user_name} received ${d.refunded_total.toFixed(0)} RTB back.`
      ),
      createElement('div', { className: 'mt-1 font-medium' },
        isTr ? 'İptal edilen bahisler:' : 'Voided bets:'
      ),
      createElement('ul', { className: 'list-disc mt-1 mb-2 text-sm text-dark-300' }, ...bullets),
      createElement('div', { className: 'text-sm text-dark-400 italic' },
        isTr
          ? 'Bunlar açık kalmaması gereken geçmiş maçlardı (Tur 1-35). Tüm bahisler iade edildi.'
          : 'These were past matches (Rounds 1-35) that should not have been open. Full stakes refunded.'
      )
    );
  }

  if (activity.activity_type === 'season_cleanup' && d) {
    return isTr
      ? `Sezon temizliği tamamlandı: Tur 1-35 için ${d.voided_count} bahis iptal edildi, ` +
        `${d.markets_closed} market kapatıldı. Toplam ${d.refunded_total.toFixed(0)} RTB ` +
        `${d.users_affected} oyuncuya iade edildi. Turnuva şampiyonu bahisleri etkilenmedi.`
      : `Season cleanup complete: ${d.voided_count} bets voided for Rounds 1-35, ` +
        `${d.markets_closed} markets closed. ${d.refunded_total.toFixed(0)} RTB refunded ` +
        `to ${d.users_affected} players. Tournament champion bets unaffected.`;
  }

  // --- Simple types: English returns raw message, Turkish translates ---

  if (!isTr) return activity.message;

  switch (activity.activity_type) {
    case 'user_joined':
      return d?.user_name
        ? `${d.user_name} oyuna katıldı!`
        : activity.message.replace('joined the game!', 'oyuna katıldı!');

    case 'bet_placed':
      if (d) {
        return `${d.user_name} ${d.selection} için ${d.stake.toFixed(0)} RTB tahmin yaptı @ tahmini ${d.odds.toFixed(2)}`;
      }
      return activity.message;

    case 'match_result':
      if (d) {
        return `Maç M${d.match_id} sonucu: ${d.winner} kazandı (${d.score})`;
      }
      return activity.message;

    case 'match_correction':
      if (d) {
        return `Maç M${d.match_id} düzeltildi: ${d.winner} kazandı (${d.score})`;
      }
      return activity.message;

    case 'batch_correction':
      return activity.message.replace('Batch corrected', 'Toplu düzeltme:').replace('matches', 'maç');

    case 'bet_won':
      if (d) {
        return `${d.user_name} kazandı! ${d.payout?.toFixed(0) || ''} RTB ödeme — ${d.selection || ''} (${d.market || ''})`;
      }
      return activity.message;

    case 'bet_lost':
      if (d) {
        return `${d.user_name} kaybetti — ${d.stake?.toFixed(0) || ''} RTB ${d.selection || ''} (${d.market || ''})`;
      }
      return activity.message;

    case 'all_markets_closed':
      return activity.message.replace('All markets closed', 'Tüm marketler kapatıldı');

    default:
      return activity.message;
  }
}

/** Icon for activity type */
export function getActivityIcon(type: string): string {
  switch (type) {
    case 'bet_placed': return '🎯';
    case 'user_joined': return '👋';
    case 'market_settled': return '🏆';
    case 'market_created': return '📢';
    case 'market_closed': return '🔒';
    case 'bet_voided_refund': return '💰';
    case 'season_cleanup': return '🧹';
    case 'bet_won': return '✅';
    case 'bet_lost': return '❌';
    default: return '📌';
  }
}
