/**
 * Internationalization (i18n) — English / Turkish translations
 * RTB (Right to Brag) rebrand — egalitarian prediction platform
 */

export type Locale = 'en' | 'tr';

/**
 * Shorten a full name: 2-part names → first name only, 3+ parts → first two.
 * "Berkay Alpagot" → "Berkay", "Ata Kemal Yukselen" → "Ata Kemal"
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  if (parts.length === 2) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

export const translations = {
  // ── Navbar ──
  'nav.brand': { en: 'Fantasy Darts', tr: 'Fantazi Dart' },
  'nav.markets': { en: 'Predictions', tr: 'Tahminler' },
  'nav.leaderboard': { en: 'Rankings', tr: 'Sıralama' },
  'nav.tournament': { en: 'Tournament', tr: 'Turnuva' },
  'nav.liveFeed': { en: 'Live Feed', tr: 'Canlı Akış' },
  'nav.admin': { en: 'Admin', tr: 'Yönetim' },
  'nav.tokens': { en: 'RTB', tr: 'RTB' },
  'nav.logout': { en: 'Logout', tr: 'Çıkış' },

  // ── Landing / Auth ──
  'landing.title1': { en: 'Fantasy', tr: 'Fantazi' },
  'landing.title2': { en: 'Darts Predictions', tr: 'Dart Tahminleri' },
  'landing.subtitle': {
    en: 'Predict your friends\' match outcomes with RTB points. No real money. Just bragging rights.',
    tr: 'Arkadaşlarının maç sonuçlarını RTB puanlarıyla tahmin et. Gerçek para yok. Sadece övünme hakkı.',
  },
  'landing.getStarted': { en: 'Get Started - It\'s Free', tr: 'Başla - Ücretsiz' },
  'landing.haveAccount': { en: 'I Have an Account', tr: 'Hesabım Var' },
  'landing.welcomeBack': { en: 'Welcome Back', tr: 'Tekrar Hoşgeldin' },
  'landing.yourEmail': { en: 'Your email', tr: 'E-posta adresin' },
  'landing.login': { en: 'Login', tr: 'Giriş Yap' },
  'landing.noAccount': { en: "Don't have an account?", tr: 'Hesabın yok mu?' },
  'landing.register': { en: 'Register', tr: 'Kayıt Ol' },
  'landing.joinFun': { en: 'Join the Fun', tr: 'Eğlenceye Katıl' },
  'landing.yourName': { en: 'Your name', tr: 'İsmin' },
  'landing.ageConfirm': {
    en: 'I confirm I am 18+ years old and understand this is a fantasy game with no real money involved.',
    tr: '18 yaşından büyük olduğumu ve bunun gerçek para içermeyen bir fantazi oyunu olduğunu onaylıyorum.',
  },
  'landing.createAccount': { en: 'Create Account & Get 1000 RTB', tr: 'Hesap Oluştur ve 1000 RTB Al' },
  'landing.alreadyHave': { en: 'Already have an account?', tr: 'Zaten hesabın var mı?' },
  'landing.back': { en: 'Back', tr: 'Geri' },
  'landing.joinDesc': { en: 'Get 1,000 RTB to start predicting', tr: '1.000 RTB ile tahmin yapmaya başla' },
  'landing.tagline': { en: 'Season 1 — Live Now', tr: 'Sezon 1 — Şimdi Canlı' },
  'landing.statPlayers': { en: 'Players', tr: 'Oyuncular' },
  'landing.statMatches': { en: 'Matches', tr: 'Maçlar' },
  'landing.statPropTypes': { en: 'Prop Market Types', tr: 'Prop Piyasa Türleri' },
  'landing.statStarting': { en: 'Starting RTB', tr: 'Başlangıç RTB' },
  'landing.howItWorks': { en: 'How It Works', tr: 'Nasıl Çalışır' },
  'landing.howItWorksDesc': {
    en: 'Predict match outcomes, track Elo ratings, and climb the leaderboard.',
    tr: 'Maç sonuçlarını tahmin et, Elo reytinglerini takip et, sıralamada yüksel.',
  },

  // Features
  'feature.placeBets': { en: 'Make Predictions', tr: 'Tahmin Yap' },
  'feature.placeBetsDesc': {
    en: 'Use your 1000 starting RTB to predict tournament outcomes.',
    tr: 'Başlangıç 1000 RTB puanınla turnuva sonuçlarını tahmin et.',
  },
  'feature.trackLive': { en: 'Track Live', tr: 'Canlı Takip' },
  'feature.trackLiveDesc': {
    en: "See what everyone's predicting in real-time.",
    tr: 'Herkesin neyi tahmin ettiğini canlı gör.',
  },
  'feature.climbLeaderboard': { en: 'Climb Rankings', tr: 'Sıralamada Yüksel' },
  'feature.climbLeaderboardDesc': {
    en: 'Compete with friends to earn the most bragging rights.',
    tr: 'Arkadaşlarınla yarışarak en çok övünme hakkını kazan.',
  },
  'feature.propMarkets': { en: 'Prop Markets', tr: 'Prop Piyasaları' },
  'feature.propMarketsDesc': {
    en: 'Predict 180s, exact scores, first leg winners, and more. 9 unique prop markets per match.',
    tr: '180\'ler, kesin skorlar, ilk leg kazananları ve dahası. Maç başına 9 benzersiz prop piyasası.',
  },
  'feature.accaBuilder': { en: 'Acca Builder', tr: 'Kombine Oluşturucu' },
  'feature.accaBuilderDesc': {
    en: 'Build accumulators across multiple markets. Kelly Criterion advisor helps you stake smart.',
    tr: 'Birden fazla piyasada kombine oluştur. Kelly Kriteri danışmanı akıllı bahis yapmana yardımcı olur.',
  },

  // Disclaimer
  'disclaimer.title': { en: 'Important Notice', tr: 'Önemli Uyarı' },
  'disclaimer.1': {
    en: 'This is a FANTASY game - RTB points have NO cash value',
    tr: 'Bu bir FANTAZİ oyunudur - RTB puanlarının nakit değeri YOKTUR',
  },
  'disclaimer.2': {
    en: 'No real money is exchanged or can be won',
    tr: 'Gerçek para alışverişi yapılmaz ve kazanılamaz',
  },
  'disclaimer.3': {
    en: 'For entertainment purposes only among friends',
    tr: 'Sadece arkadaşlar arasında eğlence amaçlıdır',
  },
  'disclaimer.4': {
    en: 'This is NOT gambling and should not be treated as such',
    tr: 'Bu kumar DEĞİLDİR ve öyle değerlendirilmemelidir',
  },
  'disclaimer.5': {
    en: 'Participants must be 18+ years old',
    tr: 'Katılımcılar 18 yaşından büyük olmalıdır',
  },

  // ── Dashboard ──
  'dashboard.welcome': { en: 'Welcome,', tr: 'Hoşgeldin,' },
  'dashboard.subtitle': { en: "Here's your prediction dashboard", tr: 'İşte tahmin panelin' },
  'dashboard.balance': { en: 'Balance', tr: 'Bakiye' },
  'dashboard.activeBets': { en: 'Active Predictions', tr: 'Aktif Tahminler' },
  'dashboard.openPositions': { en: 'open positions', tr: 'açık pozisyon' },
  'dashboard.atRisk': { en: 'Committed', tr: 'Taahhüt' },
  'dashboard.tokensStaked': { en: 'RTB committed', tr: 'RTB taahhüt' },
  'dashboard.potentialWin': { en: 'Potential Win', tr: 'Potansiyel Kazanç' },
  'dashboard.ifAllWin': { en: 'if all win', tr: 'hepsi kazanırsa' },
  'dashboard.openMarkets': { en: 'Open Predictions', tr: 'Açık Tahminler' },
  'dashboard.viewAll': { en: 'View All →', tr: 'Tümünü Gör →' },
  'dashboard.open': { en: 'Open', tr: 'Açık' },
  'dashboard.more': { en: 'more', tr: 'daha' },
  'dashboard.noOpenMarkets': { en: 'No open predictions right now', tr: 'Şu anda açık tahmin yok' },
  'dashboard.liveActivity': { en: 'Live Activity', tr: 'Canlı Aktivite' },
  'dashboard.noActivity': { en: 'No activity yet', tr: 'Henüz aktivite yok' },
  'dashboard.myActiveBets': { en: 'My Active Predictions', tr: 'Aktif Tahminlerim' },
  'dashboard.market': { en: 'Prediction', tr: 'Tahmin' },
  'dashboard.selection': { en: 'Selection', tr: 'Seçim' },
  'dashboard.stake': { en: 'Committed', tr: 'Taahhüt' },
  'dashboard.odds': { en: 'Odds', tr: 'Oran' },
  'dashboard.retry': { en: 'Retry', tr: 'Tekrar Dene' },
  'dashboard.connectionError': {
    en: 'Unable to connect to server. Please try again.',
    tr: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.',
  },

  // ── Tournament ──
  'tournament.title': { en: 'Tournament', tr: 'Turnuva' },
  'tournament.matchesPlayed': { en: 'matches played', tr: 'maç oynandı' },
  'tournament.remaining': { en: 'remaining', tr: 'kalan' },
  'tournament.standings': { en: 'Standings', tr: 'Puan Durumu' },
  'tournament.results': { en: 'Results', tr: 'Sonuçlar' },
  'tournament.upcoming': { en: 'Upcoming Matches', tr: 'Gelecek Maçlar' },
  'tournament.eloRatings': { en: 'Elo Ratings', tr: 'Elo Puanları' },
  'tournament.roundRobin': { en: 'Round-Robin Standings', tr: 'Lig Puan Durumu' },
  'tournament.player': { en: 'Player', tr: 'Oyuncu' },
  'tournament.round': { en: 'Round', tr: 'Tur' },
  'tournament.matches': { en: 'matches', tr: 'maç' },
  'tournament.draw': { en: 'Draw', tr: 'Berabere' },
  'tournament.noResults': { en: 'No results yet.', tr: 'Henüz sonuç yok.' },
  'tournament.allPlayed': { en: 'All matches have been played!', tr: 'Tüm maçlar oynandı!' },
  'tournament.top8': {
    en: 'Top 8 (highlighted) qualify for knockout quarterfinals',
    tr: 'İlk 8 (vurgulanan) çeyrek finale kalır',
  },
  'tournament.eloSystem': {
    en: 'Elo system: K=32 base with games-played decay, phase weighting, and margin-of-victory adjustments',
    tr: 'Elo sistemi: K=32 taban, oynanan maç azalması, faz ağırlıklandırma ve skor farkı ayarlamaları',
  },
  'tournament.winRate': { en: 'Win%', tr: 'Kazanma%' },
  'tournament.elo': { en: 'Elo', tr: 'Elo' },
  'tournament.scheduleTbd': { en: 'Schedule TBD', tr: 'Tarih belirlenecek' },
  'tournament.played': { en: 'Played', tr: 'Oynanan' },
  'tournament.won': { en: 'Won', tr: 'Galibiyet' },
  'tournament.lost': { en: 'Lost', tr: 'Mağlubiyet' },
  'tournament.legsFor': { en: 'Legs For', tr: 'Alınan Leg' },
  'tournament.legsAgainst': { en: 'Legs Against', tr: 'Verilen Leg' },
  'tournament.legDiff': { en: 'Diff', tr: 'Fark' },
  'tournament.gameNight': { en: 'Game Night', tr: 'Oyun Gecesi' },
  'tournament.throughRound': { en: 'through Round', tr: 'Tur' },

  // ── Leaderboard ──
  'leaderboard.title': { en: 'Bragging Rights', tr: 'Övgü Liderliği' },
  'leaderboard.subtitle': { en: 'Who has the best predictions?', tr: 'En iyi tahminci kim?' },
  'leaderboard.profit': { en: 'profit', tr: 'kar' },
  'leaderboard.rank': { en: 'Rank', tr: 'Sıra' },
  'leaderboard.player': { en: 'Player', tr: 'Oyuncu' },
  'leaderboard.balance': { en: 'Balance', tr: 'Bakiye' },
  'leaderboard.profitLoss': { en: 'Profit/Loss', tr: 'Kar/Zarar' },
  'leaderboard.staked': { en: 'Committed', tr: 'Taahhüt' },
  'leaderboard.bets': { en: 'Predictions', tr: 'Tahminler' },
  'leaderboard.winRate': { en: 'Win Rate', tr: 'Kazanma %' },
  'leaderboard.streak': { en: 'Streak', tr: 'Seri' },
  'leaderboard.badges': { en: 'Badges', tr: 'Rozetler' },
  'leaderboard.you': { en: '(You)', tr: '(Sen)' },
  'leaderboard.achievementBadges': { en: 'Achievement Badges', tr: 'Başarı Rozetleri' },
  'leaderboard.noPlayers': { en: 'No players yet. Be the first!', tr: 'Henüz oyuncu yok. İlk sen ol!' },
  'leaderboard.recentPredictions': { en: 'Recent Predictions', tr: 'Son Tahminler' },
  'leaderboard.comingSoon': { en: 'Coming soon...', tr: 'Yakında...' },
  'leaderboard.badgeDetails': { en: 'Badge Details', tr: 'Rozet Detayları' },

  // Badge names (kept as-is — they're fun)
  'badge.firstBlood': { en: 'First Blood', tr: 'İlk Kan' },
  'badge.highRoller': { en: 'High Roller', tr: 'Büyük Oyuncu' },
  'badge.luckyStreak': { en: 'Lucky Streak', tr: 'Şanslı Seri' },
  'badge.whale': { en: 'Whale', tr: 'Balina' },
  'badge.sharp': { en: 'Sharp', tr: 'Keskin' },

  // Badge descriptions (for expandable leaderboard)
  'badge.firstBlood.desc': { en: 'First prediction placed', tr: 'İlk tahmin yapıldı' },
  'badge.highRoller.desc': { en: 'Committed 500+ RTB in a single prediction', tr: 'Tek tahminde 500+ RTB taahhüt' },
  'badge.luckyStreak.desc': { en: '3+ consecutive wins', tr: '3+ ardışık kazanç' },
  'badge.whale.desc': { en: 'Total committed over 1000 RTB', tr: 'Toplam 1000+ RTB taahhüt' },
  'badge.sharp.desc': { en: 'Win rate above 60%', tr: '%60 üzeri kazanma oranı' },

  // ── Markets ──
  'markets.title': { en: 'Prediction Corner', tr: 'Tahmin Köşesi' },
  'markets.all': { en: 'all', tr: 'tümü' },
  'markets.open': { en: 'open', tr: 'açık' },
  'markets.closed': { en: 'closed', tr: 'kapalı' },
  'markets.settled': { en: 'settled', tr: 'sonuçlandı' },
  'markets.noMarkets': { en: 'No predictions found', tr: 'Tahmin bulunamadı' },
  'markets.tokensStaked': { en: 'RTB committed', tr: 'RTB taahhüt' },

  // ── Market Detail ──
  'marketDetail.backToMarkets': { en: '← Back to Predictions', tr: '← Tahminlere Dön' },
  'marketDetail.totalPool': { en: 'Total pool:', tr: 'Toplam havuz:' },
  'marketDetail.houseCut': { en: 'Platform fee:', tr: 'Platform payı:' },
  'marketDetail.payoutPool': { en: 'Payout pool:', tr: 'Ödeme havuzu:' },
  'marketDetail.poolBetting': { en: 'Pool System:', tr: 'Havuz Sistemi:' },
  'marketDetail.poolBettingDesc': {
    en: 'Odds change dynamically based on how others predict. Your final payout depends on the pool at market close.',
    tr: 'Oranlar diğerlerinin tahminlerine göre dinamik olarak değişir. Son ödemeniz piyasa kapanışındaki havuza bağlıdır.',
  },
  'marketDetail.selections': { en: 'Selections', tr: 'Seçenekler' },
  'marketDetail.betsPlaced': { en: 'Predictions Placed', tr: 'Yapılan Tahminler' },
  'marketDetail.placeBet': { en: 'Make Prediction', tr: 'Tahmin Yap' },
  'marketDetail.marketIs': { en: 'This prediction is', tr: 'Bu tahmin' },
  'marketDetail.bettingNotAvailable': { en: 'Predictions are no longer available', tr: 'Tahmin artık mevcut değil' },
  'marketDetail.selected': { en: 'Selected:', tr: 'Seçilen:' },
  'marketDetail.selectPlayer': { en: 'Select a player above to make a prediction', tr: 'Tahmin yapmak için yukarıdan oyuncu seç' },
  'marketDetail.stakeLabel': { en: 'Commit RTB', tr: 'RTB Taahhüt' },
  'marketDetail.currentOdds': { en: 'Current Odds', tr: 'Mevcut Oran' },
  'marketDetail.estWin': { en: 'Est. Win', tr: 'Tahmini Kazanç' },
  'marketDetail.potentialWin': { en: 'Potential Win', tr: 'Potansiyel Kazanç' },
  'marketDetail.finalPayoutNote': { en: 'Final payout depends on pool at close', tr: 'Son ödeme kapanıştaki havuza bağlıdır' },
  'marketDetail.placing': { en: 'Placing...', tr: 'Yapılıyor...' },
  'marketDetail.betPlaced': { en: 'Prediction placed successfully!', tr: 'Tahmin başarıyla yapıldı!' },
  'marketDetail.yourBalance': { en: 'Your balance:', tr: 'Bakiyen:' },
  'marketDetail.returnPct': { en: 'Return', tr: 'Getiri' },
  'marketDetail.howItWorks': { en: 'How does this work?', tr: 'Bu nasıl çalışır?' },
  'marketDetail.howItWorksPool': {
    en: 'Pool System: Everyone\'s RTB goes into a shared pool. When the market closes, the pool (minus a small platform fee) is split among those who predicted correctly — proportional to how much they committed. The earlier you predict, the better odds you lock in. Odds shift as more predictions come in.',
    tr: 'Havuz Sistemi: Herkesin RTB puanları ortak bir havuza girer. Piyasa kapandığında, havuz (küçük bir platform payı düşüldükten sonra) doğru tahminde bulunanlara — taahhüt ettikleri miktarla orantılı olarak — paylaştırılır. Ne kadar erken tahmin yaparsan, o kadar iyi oran yakalarsin. Yeni tahminler geldikçe oranlar değişir.',
  },
  'marketDetail.howItWorksFixed': {
    en: 'Fixed Odds: The odds are set when the market opens and don\'t change. Your potential return is locked in the moment you make your prediction. Simple and predictable — you know exactly what you\'ll win.',
    tr: 'Sabit Oran: Oranlar piyasa açıldığında belirlenir ve değişmez. Potansiyel getirin tahmin yaptığın anda kesinleşir. Basit ve öngörülebilir — tam olarak ne kazanacağını bilirsin.',
  },
  'marketDetail.eloRating': { en: 'Elo', tr: 'Elo' },

  // ── Activity Feed ──
  'activity.title': { en: 'Live Activity', tr: 'Canlı Aktivite' },
  'activity.subtitle': { en: "Real-time updates on everyone's predictions", tr: 'Herkesin tahminleri hakkında anlık güncellemeler' },
  'activity.feedTitle': { en: 'Activity Feed', tr: 'Aktivite Akışı' },
  'activity.noActivity': { en: 'No activity yet', tr: 'Henüz aktivite yok' },
  'activity.recentBets': { en: 'Recent Predictions', tr: 'Son Tahminler' },
  'activity.noBets': { en: 'No predictions yet', tr: 'Henüz tahmin yok' },
  'activity.toWin': { en: 'To win:', tr: 'Kazanç:' },

  // ── Admin ──
  'admin.title': { en: 'Rightsmaker Admin', tr: 'Rightsmaker Yönetim' },
  'admin.subtitle': { en: 'Tournament management and predictions', tr: 'Turnuva yönetimi ve tahminler' },
  'admin.tournament': { en: 'Tournament', tr: 'Turnuva' },
  'admin.markets': { en: 'Predictions', tr: 'Tahminler' },
  'admin.scheduledMatches': { en: 'Scheduled Matches', tr: 'Planlanmış Maçlar' },
  'admin.refresh': { en: 'Refresh', tr: 'Yenile' },
  'admin.loading': { en: 'Loading...', tr: 'Yükleniyor...' },
  'admin.allPlayed': { en: 'All matches have been played!', tr: 'Tüm maçlar oynandı!' },
  'admin.enterResult': { en: 'Enter Result', tr: 'Sonuç Gir' },
  'admin.moreMatches': { en: 'more matches', tr: 'daha fazla maç' },
  'admin.currentElo': { en: 'Current Elo Ratings', tr: 'Güncel Elo Puanları' },
  'admin.loadingRatings': { en: 'Loading ratings...', tr: 'Puanlar yükleniyor...' },
  'admin.winnerOdds': { en: 'Tournament Winner Odds', tr: 'Turnuva Şampiyon Oranları' },
  'admin.loadingOdds': { en: 'Loading odds...', tr: 'Oranlar yükleniyor...' },
  'admin.createMarket': { en: '+ Create Prediction', tr: '+ Tahmin Oluştur' },
  'admin.close': { en: 'Close', tr: 'Kapat' },
  'admin.settle': { en: 'Settle', tr: 'Sonuçlandır' },
  'admin.winner': { en: 'Winner:', tr: 'Kazanan:' },
  'admin.noMarkets': { en: 'No predictions yet. Create your first!', tr: 'Henüz tahmin yok. İlkini oluştur!' },
  'admin.enterMatchResult': { en: 'Enter Match Result', tr: 'Maç Sonucu Gir' },
  'admin.winnerPreview': { en: 'Winner:', tr: 'Kazanan:' },
  'admin.invalidScore': { en: 'Invalid: one player must score 3', tr: 'Geçersiz: bir oyuncunun skoru 3 olmalı' },
  'admin.confirmResult': { en: 'Confirm Result', tr: 'Sonucu Onayla' },
  'admin.saving': { en: 'Saving...', tr: 'Kaydediliyor...' },
  'admin.cancel': { en: 'Cancel', tr: 'İptal' },
  'admin.createNewMarket': { en: 'Create New Prediction', tr: 'Yeni Tahmin Oluştur' },
  'admin.marketName': { en: 'Prediction Name', tr: 'Tahmin Adı' },
  'admin.description': { en: 'Description (optional)', tr: 'Açıklama (isteğe bağlı)' },
  'admin.marketType': { en: 'Market Type', tr: 'Piyasa Türü' },
  'admin.bettingType': { en: 'System Type', tr: 'Sistem Türü' },
  'admin.houseCut': { en: 'Platform Fee (%)', tr: 'Platform Payı (%)' },
  'admin.selections': { en: 'Selections', tr: 'Seçenekler' },
  'admin.addSelection': { en: '+ Add Selection', tr: '+ Seçenek Ekle' },
  'admin.settleMarket': { en: 'Settle Market', tr: 'Piyasayı Sonuçlandır' },
  'admin.selectWinner': { en: 'Select the winning selection:', tr: 'Kazanan seçeneği seç:' },
  'admin.resultEntered': { en: 'Result entered:', tr: 'Sonuç girildi:' },
  'admin.ratingsUpdated': { en: '— Elo ratings and odds updated.', tr: '— Elo puanları ve oranlar güncellendi.' },
  'admin.poolDesc': {
    en: 'Pool system: All committed RTB goes into a pool. Winners split the pool proportionally.',
    tr: 'Havuz sistemi: Tüm taahhüt edilen RTB havuza girer. Kazananlar havuzu orantılı paylaşır.',
  },
  'admin.houseCutDesc': {
    en: 'Percentage taken from pool before distribution (default: 10%)',
    tr: 'Dağıtım öncesi havuzdan alınan yüzde (varsayılan: %10)',
  },

  // ── Market types ──
  'marketType.match': { en: 'Match (head-to-head)', tr: 'Maç (kafa kafaya)' },
  'marketType.outright': { en: 'Outright (tournament winner)', tr: 'Genel (turnuva şampiyonu)' },
  'marketType.prop': { en: 'Prop (yes/no or multiple)', tr: 'Özel (evet/hayır veya çoklu)' },
  'bettingType.parimutuel': { en: 'Pool (Parimutuel) - Odds change with predictions', tr: 'Havuz (Parimütüel) - Oranlar tahminlere göre değişir' },
  'bettingType.fixed': { en: 'Fixed Odds - Traditional', tr: 'Sabit Oran - Geleneksel' },

  // ── Admin table headers ──
  'admin.tableMarket': { en: 'Prediction', tr: 'Tahmin' },
  'admin.tableType': { en: 'Type', tr: 'Tür' },
  'admin.tableStatus': { en: 'Status', tr: 'Durum' },
  'admin.tableStaked': { en: 'Committed', tr: 'Taahhüt' },
  'admin.tableSelections': { en: 'Selections', tr: 'Seçenekler' },
  'admin.tableActions': { en: 'Actions', tr: 'İşlemler' },
  'admin.player': { en: 'Player', tr: 'Oyuncu' },
  'admin.elo': { en: 'Elo', tr: 'Elo' },
  'admin.winsShort': { en: 'W', tr: 'G' },
  'admin.lossesShort': { en: 'L', tr: 'M' },
  'admin.gamesPlayed': { en: 'GP', tr: 'OM' },
  'admin.winPct': { en: 'Win %', tr: 'Kazanma %' },
  'admin.top8Pct': { en: 'Top 8 %', tr: 'İlk 8 %' },
  'admin.odds': { en: 'Odds', tr: 'Oran' },
  'admin.pool': { en: 'pool', tr: 'havuz' },
  'admin.fixedLabel': { en: 'fixed', tr: 'sabit' },
  'admin.initialOdds': { en: 'Initial Odds', tr: 'Başlangıç Oranları' },
  'admin.fixedOdds': { en: 'Fixed Odds', tr: 'Sabit Oranlar' },
  'admin.selectionName': { en: 'Selection name', tr: 'Seçenek adı' },
  'admin.closeConfirm': { en: 'Close this prediction? No more entries will be allowed.', tr: 'Bu tahmini kapat? Artık giriş kabul edilmeyecek.' },
  'admin.settleConfirm': { en: 'Settle this prediction? Winners will be paid out.', tr: 'Bu tahmini sonuçlandır? Kazananlara ödeme yapılacak.' },
  'admin.validScores': { en: 'Please enter valid scores', tr: 'Lütfen geçerli skorlar girin' },
  'admin.invalidScoreAlert': { en: 'Invalid score: one player must have 3, other must have 0-2', tr: 'Geçersiz skor: bir oyuncu 3, diğeri 0-2 olmalı' },
  'admin.namePlaceholder': { en: 'e.g., QF1: Berkay vs Ece', tr: 'örn., ÇF1: Berkay vs Ece' },
  'admin.additionalDetails': { en: 'Additional details...', tr: 'Ek detaylar...' },
  'admin.tokensLabel': { en: 'RTB', tr: 'RTB' },

  // ── Market Detail extras ──
  'marketDetail.est': { en: 'est.', tr: 'thm.' },
  'marketDetail.current': { en: '(current)', tr: '(güncel)' },
  'marketDetail.tokens': { en: 'RTB', tr: 'RTB' },

  // ── Tournament subtitle (structured) ──
  'tournament.totalMatches': { en: 'Total Matches', tr: 'Toplam Maç' },
  'tournament.completedMatches': { en: 'Completed Matches', tr: 'Tamamlanan Maç' },
  'tournament.remainingMatches': { en: 'Remaining Matches', tr: 'Kalan Maç' },

  // ── Elo explanation ──
  'tournament.eloExplainTitle': { en: 'How Elo Ratings Work', tr: 'Elo Puanları Nasıl Çalışır' },
  'tournament.eloExplainIntro': {
    en: 'The Elo rating system measures relative player strength. Every player starts at 1500. After each match, ratings are updated based on the result, opponent strength, and margin of victory.',
    tr: 'Elo puanlama sistemi oyuncuların göreceli gücünü ölçer. Her oyuncu 1500 puanla başlar. Her maçtan sonra puanlar, sonuca, rakip gücüne ve skor farkına göre güncellenir.',
  },
  'tournament.eloFormula': {
    en: 'Expected Score: E = 1 / (1 + 10^((Elo_opponent − Elo_player) / 400))',
    tr: 'Beklenen Skor: E = 1 / (1 + 10^((Elo_rakip − Elo_oyuncu) / 400))',
  },
  'tournament.eloKFactor': {
    en: 'Effective K-Factor: K_eff = 32 × games_decay × phase_weight',
    tr: 'Etkin K-Faktör: K_eff = 32 × maç_azalması × faz_ağırlığı',
  },
  'tournament.eloDecay': {
    en: 'Games-Played Decay: K multiplier starts at 1.5× (volatile early) and linearly decreases to 0.75× over 30 games (stabilizes ratings).',
    tr: 'Oynanan Maç Azalması: K çarpanı 1.5× (başlangıçta değişken) ile başlar ve 30 maç boyunca lineer olarak 0.75×\'e düşer (puanları stabilize eder).',
  },
  'tournament.eloPhase': {
    en: 'Phase Weighting: Early rounds (1–10) = 1.1×, Mid rounds (11–20) = 1.0×, Late rounds (21–38) = 0.9×',
    tr: 'Faz Ağırlıklandırma: Erken turlar (1–10) = 1.1×, Orta turlar (11–20) = 1.0×, Geç turlar (21–38) = 0.9×',
  },
  'tournament.eloMov': {
    en: 'Margin of Victory: 3-0 win = 1.30×, 3-1 win = 1.10×, 3-2 win = 0.85×',
    tr: 'Skor Farkı Çarpanı: 3-0 galibiyet = 1.30×, 3-1 galibiyet = 1.10×, 3-2 galibiyet = 0.85×',
  },
  'tournament.eloChange': {
    en: 'Rating Change: ΔR = K_eff × MOV × (Actual − Expected)',
    tr: 'Puan Değişimi: ΔR = K_eff × MOV × (Gerçek − Beklenen)',
  },
  'tournament.initialElo': { en: 'Initial Rating: 1500', tr: 'Başlangıç Puanı: 1500' },
  'tournament.kBase': { en: 'Base K-Factor: 32', tr: 'Taban K-Faktör: 32' },
  'tournament.eloTooltip': {
    en: 'Elo measures relative player strength. Starts at 1500. Higher = stronger. Updated after every match based on result, opponent strength, and margin of victory. K=32 base with games-played decay (1.5× → 0.75× over 30 games) and phase weighting (early 1.1×, mid 1.0×, late 0.9×).',
    tr: 'Elo göreceli oyuncu gücünü ölçer. 1500\'den başlar. Yüksek = güçlü. Her maçtan sonra sonuca, rakip gücüne ve skor farkına göre güncellenir. K=32 taban, maç azalması (1.5× → 0.75× / 30 maç) ve faz ağırlıklandırma (erken 1.1×, orta 1.0×, geç 0.9×).',
  },
  'tournament.positionChart': { en: 'Position Chart', tr: 'Sıralama Grafiği' },
  'tournament.selectPlayers': { en: 'Select up to 8 players to compare', tr: 'Karşılaştırmak için en fazla 8 oyuncu seç' },
  'tournament.position': { en: 'Position', tr: 'Sıra' },
  'tournament.last5': { en: 'Last 5', tr: 'Son 5 Maç' },
  'tournament.trend': { en: 'Form', tr: 'Form Durumu' },
  'tournament.trendTooltip': {
    en: 'Shows position change since the previous game night. ▲ = moved up in standings, ▼ = dropped in standings.',
    tr: 'Önceki oyun gecesinden beri sıralama değişimini gösterir. ▲ = yükseldi, ▼ = düştü.',
  },
  'tournament.winPctTooltip': {
    en: 'Win% = (Wins / Matches Played) × 100. Calculated from completed rounds only (excludes auto-wins from forfeits in future rounds).',
    tr: 'Kazanma% = (Galibiyetler / Oynanan Maçlar) × 100. Sadece tamamlanan turlardan hesaplanır (gelecek turlardaki hükmen galibiyetler hariç).',
  },

  // ── Standings enrichment (S5) ──
  'tournament.drawsCol': { en: 'T', tr: 'B' },
  'tournament.wlt': { en: 'W-L-T', tr: 'G-M-B' },
  'tournament.score': { en: 'Pts', tr: 'Puan' },
  'tournament.tiebreakerCol': { en: 'TB', tr: 'TB' },
  'tournament.remainingCol': { en: 'Rem', tr: 'Kal' },
  'tournament.scoreTooltip': {
    en: 'Score = Wins × 3 points. Draws = 0 points.',
    tr: 'Puan = Galibiyet × 3 puan. Beraberlik = 0 puan.',
  },
  'tournament.tiebreakerTooltip': {
    en: 'Tiebreaker: count of deciding-leg (3-2) wins',
    tr: 'Tiebreaker: beşinci leg (3-2) galibiyet sayısı',
  },
  'tournament.remainingTooltip': {
    en: 'Remaining matches out of 38 total',
    tr: 'Toplam 38 maçtan kalan',
  },

  // ── Betslip / Acca Builder (S10, S11, S8) ──
  'betslip.title': { en: 'Betslip', tr: 'Tahmin Kuponu' },
  'betslip.acca': { en: 'Acca', tr: 'Kombine' },
  'betslip.single': { en: 'Single', tr: 'Tekli' },
  'betslip.totalOdds': { en: 'Total odds', tr: 'Toplam oran' },
  'betslip.potentialReturn': { en: 'Potential return', tr: 'Potansiyel kazanç' },
  'betslip.placeAll': { en: 'Place Predictions', tr: 'Tahminleri Yap' },
  'betslip.placing': { en: 'Placing...', tr: 'Yapılıyor...' },
  'betslip.clear': { en: 'Clear', tr: 'Temizle' },
  'betslip.sameMarketWarning': { en: 'You already picked from this prediction', tr: 'Bu tahminden zaten seçim yaptın' },
  'betslip.successCount': { en: 'prediction(s) placed!', tr: 'tahmin yapıldı!' },
  'betslip.selections': { en: 'selections', tr: 'seçim' },
  'betslip.stake': { en: 'Stake', tr: 'Miktar' },
  'betslip.kelly': { en: 'Kelly suggests', tr: 'Kelly önerisi' },

  // ── Welcome / Onboarding (S14) ──
  'welcome.title': { en: "Welcome to the Oracle's Arena", tr: "Oracle'ın Arenasına Hoş Geldin" },
  'welcome.subtitle': {
    en: 'Your journey to bragging rights begins now. Here\'s how it works:',
    tr: 'Övünme hakkı yolculuğun şimdi başlıyor. İşte nasıl çalışır:',
  },
  'welcome.step1.title': { en: 'Browse Markets', tr: 'Piyasaları Keşfet' },
  'welcome.step1.desc': {
    en: 'Explore match predictions and prop markets for every game night.',
    tr: 'Her oyun gecesi için maç tahminlerini ve prop piyasalarını keşfet.',
  },
  'welcome.step2.title': { en: 'Place Predictions', tr: 'Tahmin Yap' },
  'welcome.step2.desc': {
    en: 'Use your 1,000 RTB to back your instincts. Singles or accumulators — your call.',
    tr: '1.000 RTB puanınla içgüdülerinin peşinden git. Tekli veya kombine — senin kararın.',
  },
  'welcome.step3.title': { en: 'Track Live', tr: 'Canlı Takip Et' },
  'welcome.step3.desc': {
    en: 'Watch odds shift in real-time as other oracles make their moves.',
    tr: 'Diğer kahinler hamle yaptıkça oranların anlık değişimini izle.',
  },
  'welcome.step4.title': { en: 'Climb Rankings', tr: 'Sıralamada Yüksel' },
  'welcome.step4.desc': {
    en: 'Earn badges, build streaks, and prove you\'re the sharpest oracle in the arena.',
    tr: 'Rozet kazan, seri oluştur ve arenadaki en keskin kahin olduğunu kanıtla.',
  },
  'welcome.cta': { en: 'Your Quest Begins', tr: 'Görevin Başlıyor' },
  'welcome.skip': { en: 'Skip to Dashboard', tr: 'Panele Geç' },

  // ── Nav: Academy (S16) ──
  'nav.academy': { en: 'Academy', tr: 'Akademi' },

  // ── Academy Page (S16 + S17) ──
  'academy.title': { en: 'Oracle Academy', tr: 'Kahin Akademisi' },
  'academy.subtitle': {
    en: 'Master the art of prediction. From basics to advanced strategy.',
    tr: 'Tahmin sanatında ustalaş. Temelden ileri stratejiye.',
  },
  'academy.progress': { en: 'topics explored', tr: 'konu incelendi' },
  'academy.expandAll': { en: 'Expand All', tr: 'Tümünü Aç' },
  'academy.collapseAll': { en: 'Collapse All', tr: 'Tümünü Kapat' },

  // Level 1: Rookie Oracle
  'academy.level1.title': { en: 'Rookie Oracle', tr: 'Çaylak Kahin' },
  'academy.level1.desc': { en: 'Start here — learn the fundamentals of Fantasy Darts.', tr: 'Buradan başla — Fantazi Dart temellerini öğren.' },

  // T1: What is Fantasy Darts?
  'academy.t1.title': { en: 'What is Fantasy Darts?', tr: 'Fantazi Dart Nedir?' },
  'academy.t1.desc': { en: 'Platform overview, RTB points, and the rules of the game.', tr: 'Platform tanıtımı, RTB puanları ve oyun kuralları.' },
  'academy.t1.content': {
    en: 'Fantasy Darts is a prediction platform where you compete with friends using RTB (Right to Brag) points — virtual tokens with zero real-money value. Every player starts with 1,000 RTB and uses them to predict match outcomes in a round-robin darts tournament.\n\nThe platform tracks a real tournament among 20 players across 190 matches. You can predict head-to-head match winners, prop markets (180s, checkouts, exact scores), and build accumulators combining multiple predictions.\n\nThis is NOT gambling. RTB points cannot be exchanged for money. The only thing at stake is bragging rights — and a spot at the top of the leaderboard. Think of it as a fantasy sports league for your darts night.',
    tr: 'Fantazi Dart, arkadaşlarınla RTB (Right to Brag — Övünme Hakkı) puanları kullanarak yarıştığın bir tahmin platformudur. RTB puanlarının gerçek para değeri yoktur. Her oyuncu 1.000 RTB ile başlar ve bunları round-robin dart turnuvasındaki maç sonuçlarını tahmin etmek için kullanır.\n\nPlatform, 20 oyuncu arasındaki 190 maçlık gerçek bir turnuvayı takip eder. Birebir maç kazananlarını, prop piyasalarını (180\'ler, checkout\'lar, kesin skorlar) tahmin edebilir ve birden fazla tahmini birleştiren kombineler oluşturabilirsin.\n\nBu kumar DEĞİLDİR. RTB puanları paraya çevrilemez. Tehlikede olan tek şey övünme hakkı — ve sıralamanın tepesindeki bir yer. Bunu dart geceniz için bir fantazi spor ligi gibi düşün.',
  },

  // T2: Understanding Odds
  'academy.t2.title': { en: 'Understanding Odds', tr: 'Oranları Anlamak' },
  'academy.t2.desc': { en: 'Decimal odds, implied probability, and what the numbers mean.', tr: 'Ondalık oranlar, zımni olasılık ve sayıların anlamı.' },
  'academy.t2.content': {
    en: 'Odds represent how likely something is to happen — and how much you\'d win if it does. Fantasy Darts uses decimal odds, which are the simplest format.\n\nA decimal odd of 2.50 means: for every 1 RTB you commit, you get 2.50 back if you\'re right (your 1 RTB stake plus 1.50 profit). Lower odds = more likely outcome but less reward. Higher odds = less likely but bigger payout.\n\nTo convert odds to implied probability: divide 1 by the decimal odd. So 2.50 odds = 1/2.50 = 40% implied chance. Odds of 1.50 = 66.7% chance. If you believe the true probability is higher than the implied one, you\'ve found value — that\'s the key to smart prediction.',
    tr: 'Oranlar bir şeyin gerçekleşme olasılığını ve doğru tahmin ettiğinde ne kadar kazanacağını gösterir. Fantazi Dart ondalık oran formatını kullanır — en basit format.\n\nOndalık oran 2.50 şu anlama gelir: taahhüt ettiğin her 1 RTB için, doğru tahmin edersen 2.50 RTB geri alırsın (1 RTB taahhütün artı 1.50 kâr). Düşük oran = daha olası sonuç ama daha az kazanç. Yüksek oran = daha az olası ama daha büyük ödeme.\n\nOranları olasılığa çevirmek için: 1\'i ondalık orana böl. Yani 2.50 oran = 1/2.50 = %40 zımni olasılık. 1.50 oran = %66.7 olasılık. Gerçek olasılığın zımni olasılıktan yüksek olduğunu düşünüyorsan, değer buldun demektir — akıllı tahminin anahtarı budur.',
  },

  // T3: Your First Prediction
  'academy.t3.title': { en: 'Your First Prediction', tr: 'İlk Tahminin' },
  'academy.t3.desc': { en: 'Step-by-step guide to browsing markets and placing a bet.', tr: 'Piyasalara göz atma ve tahmin yapma rehberi.' },
  'academy.t3.content': {
    en: 'Ready to make your first prediction? Here\'s how:\n\n1. Go to "Predictions" in the navbar. You\'ll see all open markets — match winners, prop markets, and more. Each shows the current odds for every selection.\n2. Click on any odds badge to add it to your betslip (the floating bar at the bottom). You can pick one selection per market.\n3. Enter your stake (how much RTB to commit). The betslip shows your potential return. Click "Place Predictions" to confirm.\n\nTip: Start small! Try 50-100 RTB on your first few predictions to get a feel for how odds move and how the pool system works. You can always increase your stakes as you get more confident.',
    tr: 'İlk tahminini yapmaya hazır mısın? İşte adımlar:\n\n1. Menüdeki "Tahminler"e git. Tüm açık piyasaları göreceksin — maç kazananları, prop piyasaları ve dahası. Her birinde tüm seçeneklerin güncel oranları gösterilir.\n2. Herhangi bir oran rozetine tıklayarak onu kuponuna (alttaki kayan çubuk) ekle. Her piyasadan bir seçim yapabilirsin.\n3. Taahhüt miktarını (ne kadar RTB yatıracağını) gir. Kupon potansiyel kazancını gösterir. Onaylamak için "Tahminleri Yap"a tıkla.\n\nİpucu: Küçük başla! İlk birkaç tahmininde 50-100 RTB dene, oranların nasıl hareket ettiğini ve havuz sisteminin nasıl çalıştığını anla. Özgüvenin arttıkça miktarını yükseltebilirsin.',
  },

  // Level 2: Seasoned Seer
  'academy.level2.title': { en: 'Seasoned Seer', tr: 'Deneyimli Kahin' },
  'academy.level2.desc': { en: 'Deepen your knowledge — ratings, market types, and form analysis.', tr: 'Bilgini derinleştir — reytingler, piyasa türleri ve form analizi.' },

  // T4: Elo Ratings Explained
  'academy.t4.title': { en: 'Elo Ratings Explained', tr: 'Elo Puanları Açıklaması' },
  'academy.t4.desc': { en: 'How player ratings work and what rating changes mean.', tr: 'Oyuncu reytingleri nasıl çalışır ve puan değişimleri ne anlama gelir.' },
  'academy.t4.content': {
    en: 'Every player starts the tournament with an Elo rating of 1500. After each match, ratings update based on: who won, how strong the opponent was, and the margin of victory (3-0 vs 3-2).\n\nThe system uses a K-factor of 32 — this controls how much ratings swing after each match. Early in the tournament (rounds 1-10), ratings are more volatile (1.1x multiplier) to quickly find true skill levels. Late rounds (21-38) use a 0.9x multiplier for stability.\n\nA 3-0 win earns a 1.30x rating boost (dominant victory), while a 3-2 win only gets 0.85x (close match). Beating a higher-rated opponent gives more points than beating a lower-rated one. Use Elo ratings to identify form players and spot value in the odds — a player whose Elo is rising fast may be undervalued by the market.',
    tr: 'Her oyuncu turnuvaya 1500 Elo puanıyla başlar. Her maçtan sonra puanlar güncellenir: kim kazandı, rakip ne kadar güçlüydü ve skor farkı (3-0 vs 3-2) dikkate alınır.\n\nSistem K-faktör 32 kullanır — bu, her maçtan sonra puanların ne kadar değişeceğini kontrol eder. Turnuvanın başında (tur 1-10), gerçek seviyeyi hızla bulmak için puanlar daha değişkendir (1.1x çarpan). Son turlar (21-38) stabilite için 0.9x çarpan kullanır.\n\n3-0 galibiyet 1.30x puan artışı sağlar (baskın zafer), 3-2 galibiyet ise sadece 0.85x alır (yakın maç). Daha yüksek puanlı bir rakibi yenmek, düşük puanlı birini yenmekten daha fazla puan kazandırır. Elo puanlarını formdaki oyuncuları tespit etmek ve oranlarda değer bulmak için kullan — Elo\'su hızla yükselen bir oyuncu piyasa tarafından düşük değerlenmiş olabilir.',
  },

  // T5: Pool vs Fixed Odds
  'academy.t5.title': { en: 'Pool vs Fixed Odds', tr: 'Havuz vs Sabit Oranlar' },
  'academy.t5.desc': { en: 'How parimutuel pools work and the early-bird advantage.', tr: 'Parimütüel havuz sistemi ve erken tahmin avantajı.' },
  'academy.t5.content': {
    en: 'Fantasy Darts has two odds systems. Pool (Parimutuel): Everyone\'s RTB goes into a shared pool. Odds change dynamically as more predictions come in. When the market closes, the pool (minus a platform fee) is split among correct predictors proportional to their stake. Early bets lock in better odds.\n\nFixed Odds: The odds are set when the market opens and don\'t change. Your potential return is locked the moment you predict. Simple and predictable.\n\nThe early-bird advantage in pool markets is real: if you predict correctly before others pile in, your locked-in odds will be higher than the final odds. But beware — if the pool shifts heavily against your pick, the payout could be smaller than expected. Fixed odds remove this uncertainty but may offer lower value.',
    tr: 'Fantazi Dart\'ta iki oran sistemi var. Havuz (Parimütüel): Herkesin RTB\'si ortak bir havuza girer. Yeni tahminler geldikçe oranlar dinamik olarak değişir. Piyasa kapandığında, havuz (platform payı düşüldükten sonra) doğru tahmin edenlere taahhütleriyle orantılı olarak paylaştırılır. Erken tahminler daha iyi oranları kilitler.\n\nSabit Oran: Oranlar piyasa açıldığında belirlenir ve değişmez. Potansiyel kazancın tahmin yaptığın anda kesinleşir. Basit ve öngörülebilir.\n\nHavuz piyasalarındaki erken tahmin avantajı gerçektir: diğerleri yığılmadan önce doğru tahmin edersen, kilitlediğin oranlar son oranlardan yüksek olur. Ama dikkat — havuz seçiminin aleyhine ağır şekilde kayarsa, ödeme beklenenden küçük olabilir. Sabit oranlar bu belirsizliği ortadan kaldırır ama daha düşük değer sunabilir.',
  },

  // T6: Reading the Form Guide
  'academy.t6.title': { en: 'Reading the Form Guide', tr: 'Form Rehberini Okumak' },
  'academy.t6.desc': { en: 'W-L-T records, leg differential, streaks, and last 5 results.', tr: 'G-M-B kayıtları, leg farkı, seriler ve son 5 maç.' },
  'academy.t6.content': {
    en: 'The Tournament page shows detailed form data for every player. Here\'s what to look for:\n\nW-L-T (Win-Loss-Tie): Basic record. A player going 8-2-0 is clearly dominant, but context matters — who did they beat? Check the Elo column for opponent quality.\n\nLeg Differential: Total legs won minus lost. A player with +15 leg diff is winning matches convincingly. Negative diff with a decent win record? They\'re grinding out close 3-2 wins — check the TB (tiebreaker) column.\n\nLast 5 & Streak: Recent form often predicts near-future performance better than overall record. A W-W-W-L-W player on a hot streak is momentum pick. An L-L-L player might be tilting. Combine form with Elo movement for the sharpest predictions.',
    tr: 'Turnuva sayfası her oyuncu için detaylı form verisi gösterir. Nelere bakmalısın:\n\nG-M-B (Galibiyet-Mağlubiyet-Beraberlik): Temel kayıt. 8-2-0 giden bir oyuncu açıkça baskın, ama bağlam önemli — kimleri yendi? Rakip kalitesi için Elo sütununa bak.\n\nLeg Farkı: Kazanılan leglerden kaybedilenlerin çıkarılması. +15 leg farkı olan bir oyuncu maçları ikna edici şekilde kazanıyor. İyi galibiyet kaydına rağmen negatif fark mı? Yakın 3-2 galibiyetler kazanıyor demektir — TB (tiebreaker) sütununa bak.\n\nSon 5 & Seri: Yakın form genellikle yakın geleceği genel kayıttan daha iyi tahmin eder. G-G-G-M-G serisindeki bir oyuncu momentum seçimi. M-M-M olan bir oyuncu bozulmuş olabilir. En keskin tahminler için formu Elo hareketi ile birleştir.',
  },

  // T7: Prop Markets Deep Dive
  'academy.t7.title': { en: 'Prop Markets Deep Dive', tr: 'Prop Piyasaları Detaylı İnceleme' },
  'academy.t7.desc': { en: 'All 9 prop market types and how to approach them.', tr: '9 prop piyasa türünün tamamı ve nasıl yaklaşılacağı.' },
  'academy.t7.content': {
    en: 'Each match generates 9 unique prop markets based on the players\' Elo ratings:\n\n1. Total 180s Over/Under 2.5 — Will there be 3+ maximum scores?\n2. Total Legs Over/Under 4.5 — Short match (3-0, 3-1) or long one (3-2)?\n3. Highest Checkout Over/Under 80.5 — Will someone hit a big finish?\n4-5. Player 1/2 Hits 180 (Yes/No) — Individual 180 predictions per player.\n6. First Leg Winner — Who takes the opening leg?\n7. Exact Score — Predict the precise scoreline (6 options).\n8-9. Player 1/2 100+ Checkout (Yes/No) — Century-plus finish predictions.\n\nProp markets are priced using Elo ratings, so a higher-rated player\'s 180 "Yes" will have lower odds. Look for value where you disagree with the Elo assessment — maybe a lower-rated player has been hitting tons of 180s recently.',
    tr: 'Her maç, oyuncuların Elo puanlarına göre 9 benzersiz prop piyasası oluşturur:\n\n1. Toplam 180 Üst/Alt 2.5 — 3 veya daha fazla maksimum skor olacak mı?\n2. Toplam Leg Üst/Alt 4.5 — Kısa maç (3-0, 3-1) mi yoksa uzun mu (3-2)?\n3. En Yüksek Checkout Üst/Alt 80.5 — Birisi büyük bir finiş yapacak mı?\n4-5. Oyuncu 1/2 180 Atar (Evet/Hayır) — Oyuncu bazında 180 tahminleri.\n6. İlk Leg Kazananı — Açılış legini kim alır?\n7. Kesin Skor — Tam skoru tahmin et (6 seçenek).\n8-9. Oyuncu 1/2 100+ Checkout (Evet/Hayır) — Yüzlük üzeri finiş tahminleri.\n\nProp piyasaları Elo puanları kullanılarak fiyatlandırılır, bu yüzden daha yüksek puanlı oyuncunun 180 "Evet"i daha düşük oranlara sahip olur. Elo değerlendirmesiyle aynı fikirde olmadığın yerlerde değer ara — belki düşük puanlı bir oyuncu son zamanlarda çok sayıda 180 atıyordur.',
  },

  // Level 3: Grand Oracle
  'academy.level3.title': { en: 'Grand Oracle', tr: 'Büyük Kahin' },
  'academy.level3.desc': { en: 'Advanced strategy — staking, accumulators, and the meta-game.', tr: 'İleri strateji — bahis boyutlandırma, kombineler ve meta-oyun.' },

  // T8: Kelly Criterion Staking
  'academy.t8.title': { en: 'Kelly Criterion Staking', tr: 'Kelly Kriteri ile Bahis Boyutlandırma' },
  'academy.t8.desc': { en: 'Optimal bet sizing, edge calculation, and bankroll management.', tr: 'Optimum bahis boyutu, avantaj hesaplama ve bakiye yönetimi.' },
  'academy.t8.content': {
    en: 'The Kelly Criterion is a mathematical formula that tells you the optimal percentage of your bankroll to stake on a prediction. The formula: Kelly % = (bp - q) / b, where b = decimal odds - 1, p = your estimated true probability, q = 1 - p.\n\nExample: Odds are 3.00 (b=2), you think the true chance is 40% (p=0.4, q=0.6). Kelly % = (2×0.4 - 0.6) / 2 = 10%. So stake 10% of your balance.\n\nIn practice, most sharp predictors use "fractional Kelly" — half or quarter of the suggested amount. Full Kelly is mathematically optimal but assumes your probability estimates are perfect (they\'re not). Quarter Kelly gives slower growth but much less risk of going bust. The betslip shows Kelly suggestions — use them as a guide, not gospel.',
    tr: 'Kelly Kriteri, bakiyenin yüzde kaçını bir tahmine yatırman gerektiğini söyleyen matematiksel bir formüldür. Formül: Kelly % = (bp - q) / b, burada b = ondalık oran - 1, p = gerçek olasılık tahminin, q = 1 - p.\n\nÖrnek: Oran 3.00 (b=2), gerçek şansın %40 olduğunu düşünüyorsun (p=0.4, q=0.6). Kelly % = (2×0.4 - 0.6) / 2 = %10. Yani bakiyenin %10\'unu yatır.\n\nPratikte, çoğu keskin tahminci "kesirli Kelly" kullanır — önerilen miktarın yarısı veya çeyreği. Tam Kelly matematiksel olarak optimaldir ama olasılık tahminlerinin mükemmel olduğunu varsayar (değildir). Çeyrek Kelly daha yavaş büyüme sağlar ama iflas riski çok daha azdır. Kupon Kelly önerilerini gösterir — rehber olarak kullan, mutlak doğru olarak değil.',
  },

  // T9: Accumulator Strategy
  'academy.t9.title': { en: 'Accumulator Strategy', tr: 'Kombine Stratejisi' },
  'academy.t9.desc': { en: 'Building accas, correlation risk, and expected value.', tr: 'Kombine oluşturma, korelasyon riski ve beklenen değer.' },
  'academy.t9.content': {
    en: 'An accumulator (acca) combines multiple selections into a single prediction. The odds multiply: two picks at 2.00 each = 4.00 combined. Higher potential return, but ALL picks must win — one loss and the entire acca fails.\n\nCorrelation matters: picking Player A to win AND "Total Legs Over 4.5" in the same match aren\'t independent events. If Player A is the underdog, both their win AND a long match become more likely together. Smart accas use correlated picks within matches and uncorrelated picks across matches.\n\nExpected Value (EV): If your acca has combined odds of 8.00, it needs to hit more than 12.5% of the time to be profitable. Be honest with yourself — 4-leg accas sound exciting but the hit rate is brutal. Consider mixing: a 2-leg acca with strong conviction picks often beats a 5-leg lottery ticket.',
    tr: 'Kombine (acca), birden fazla seçimi tek bir tahminde birleştirir. Oranlar çarpılır: her biri 2.00 olan iki seçim = 4.00 kombine oran. Daha yüksek potansiyel kazanç, ama TÜM seçimler kazanmalı — bir kayıp ve tüm kombine batar.\n\nKorelasyon önemlidir: aynı maçta Oyuncu A\'nın kazanması VE "Toplam Leg Üst 4.5" bağımsız olaylar değildir. Oyuncu A zayıf tarafsa, hem galibiyeti HEM de uzun maç birlikte daha olası hale gelir. Akıllı kombineler maç içinde korelasyonlu, maçlar arası korelasyonsuz seçimler kullanır.\n\nBeklenen Değer (BV): Kombinen 8.00 orana sahipse, kârlı olması için %12.5\'ten fazla tutturman gerekir. Kendinle dürüst ol — 4 ayaklı kombineler heyecanlı görünür ama tutma oranı acımasızdır. Karışık düşün: güçlü kanaat seçimleriyle 2 ayaklı bir kombine, genellikle 5 ayaklı bir piyango kuponunu yener.',
  },

  // T10: The Meta-Game
  'academy.t10.title': { en: 'The Meta-Game', tr: 'Meta-Oyun' },
  'academy.t10.desc': { en: 'Leaderboard psychology, badge hunting, and risk-reward.', tr: 'Sıralama psikolojisi, rozet avcılığı ve risk-ödül dengesi.' },
  'academy.t10.content': {
    en: 'Fantasy Darts isn\'t just about individual predictions — it\'s about climbing the leaderboard. This creates a meta-game: your strategy should adapt based on your position.\n\nLeading the board? Play conservative. Small stakes on high-probability picks protect your lead. The worst thing a leader can do is make big bets and hand the advantage to chasers.\n\nChasing the leader? You need variance. Bigger stakes on higher odds to close the gap. Accumulators become your friend — high risk, but you need the swings.\n\nBadges add another dimension: "First Blood" (first prediction), "High Roller" (500+ RTB single bet), "Lucky Streak" (3+ consecutive wins), "Whale" (1000+ total committed), and "Sharp" (60%+ win rate). Some badges reward boldness, others reward discipline. Collect them all for ultimate bragging rights.',
    tr: 'Fantazi Dart sadece bireysel tahminlerle ilgili değil — sıralamada yükselmekle ilgili. Bu bir meta-oyun yaratır: stratejin pozisyonuna göre adapte olmalı.\n\nSıralamada lidersin? Muhafazakâr oyna. Yüksek olasılıklı seçimlere küçük miktarlar liderliğini korur. Bir liderin yapabileceği en kötü şey büyük bahisler yapıp avantajı kovalayanlara vermektir.\n\nLideri kovalıyorsun? Varyansa ihtiyacın var. Farkı kapatmak için yüksek oranlara büyük miktarlar. Kombineler dostun olur — yüksek risk ama salınımlara ihtiyacın var.\n\nRozetler başka bir boyut ekler: "İlk Kan" (ilk tahmin), "Büyük Oyuncu" (500+ RTB tek bahis), "Şanslı Seri" (3+ ardışık galibiyet), "Balina" (1000+ toplam taahhüt) ve "Keskin" (%60+ kazanma oranı). Bazı rozetler cesareti, diğerleri disiplini ödüllendirir. Nihai övünme hakkı için hepsini topla.',
  },

  // ── Phone / WhatsApp (S19/S20) ──
  'phone.addTitle': { en: 'Add Your Phone Number', tr: 'Telefon Numaranı Ekle' },
  'phone.addDesc': {
    en: 'Get WhatsApp updates for match days, results, and leaderboard standings.',
    tr: 'Maç günleri, sonuçlar ve sıralama güncellemeleri için WhatsApp bildirimleri al.',
  },
  'phone.placeholder': { en: '+90 5XX XXX XXXX', tr: '+90 5XX XXX XXXX' },
  'phone.save': { en: 'Save', tr: 'Kaydet' },
  'phone.yourPhone': { en: 'Your phone', tr: 'Telefonun' },
  'phone.whatsappUpdates': { en: 'WhatsApp updates', tr: 'WhatsApp bildirimleri' },
  'phone.removeConfirm': { en: 'Remove your phone number?', tr: 'Telefon numaranı kaldır?' },
  'phone.remove': { en: 'Remove', tr: 'Kaldır' },

  // ── Admin: WhatsApp (S19/S20) ──
  'admin.whatsapp': { en: 'WhatsApp', tr: 'WhatsApp' },
  'admin.waSendTitle': { en: 'Send Notifications', tr: 'Bildirim Gönder' },
  'admin.waSendDesc': {
    en: 'Send WhatsApp messages to all opted-in users.',
    tr: 'Tüm onay veren kullanıcılara WhatsApp mesajı gönder.',
  },
  'admin.waMatchDay': { en: 'Match Day Reminder', tr: 'Maç Günü Hatırlatması' },
  'admin.waResults': { en: 'Results Announcement', tr: 'Sonuç Duyurusu' },
  'admin.waLeaderboard': { en: 'Weekly Leaderboard', tr: 'Haftalık Sıralama' },
  'admin.waQuiz': { en: 'Pub Quiz Poll', tr: 'Pub Quiz Anketi' },
  'admin.waSending': { en: 'Sending...', tr: 'Gönderiliyor...' },
  'admin.waLogsTitle': { en: 'Recent Logs', tr: 'Son Kayıtlar' },
  'admin.waNoLogs': { en: 'No WhatsApp logs yet.', tr: 'Henüz WhatsApp kaydı yok.' },
  'admin.waType': { en: 'Type', tr: 'Tür' },
  'admin.waTemplate': { en: 'Template', tr: 'Şablon' },
  'admin.waStatus': { en: 'Status', tr: 'Durum' },
  'admin.waTime': { en: 'Time', tr: 'Zaman' },

  // ── Privacy Policy Page ──
  'privacy.title': { en: 'Privacy Policy', tr: 'Gizlilik Politikası' },
  'privacy.lastUpdated': { en: 'Last updated: February 2026', tr: 'Son güncelleme: Şubat 2026' },
  'privacy.backHome': { en: '← Back to Home', tr: '← Ana Sayfaya Dön' },

  'privacy.s1.title': { en: '1. Data Controller', tr: '1. Veri Sorumlusu' },
  'privacy.s1.content': {
    en: 'Fantasy Darts is a private, non-commercial fantasy prediction platform operated for a friend group. The platform operator ("we", "us") acts as the data controller under GDPR (EU 2016/679) and KVKK (Turkish Law No. 6698). For contact details, see Section 9 below.',
    tr: 'Fantazi Dart, bir arkadaş grubu için işletilen özel, ticari olmayan bir fantazi tahmin platformudur. Platform operatörü ("biz") GDPR (AB 2016/679) ve KVKK (6698 sayılı Kanun) kapsamında veri sorumlusu olarak hareket eder. İletişim bilgileri için aşağıdaki Bölüm 9\'a bakın.',
  },

  'privacy.s2.title': { en: '2. Data We Collect', tr: '2. Topladığımız Veriler' },
  'privacy.s2.content': {
    en: 'We collect and process the following personal data:\n\n• Name — to identify you on the leaderboard and in predictions\n• Email address — for authentication (login)\n• Phone number (optional) — if you opt in to WhatsApp notifications\n• Prediction activity — your RTB stakes, selections, and results\n• Technical data — browser type, IP address (server logs only, not stored long-term)',
    tr: 'Aşağıdaki kişisel verileri topluyoruz ve işliyoruz:\n\n• İsim — sıralamada ve tahminlerde sizi tanımlamak için\n• E-posta adresi — kimlik doğrulama (giriş) için\n• Telefon numarası (isteğe bağlı) — WhatsApp bildirimlerine onay verirseniz\n• Tahmin aktivitesi — RTB taahhütleriniz, seçimleriniz ve sonuçlarınız\n• Teknik veriler — tarayıcı türü, IP adresi (sadece sunucu logları, uzun süreli saklanmaz)',
  },

  'privacy.s3.title': { en: '3. Purpose & Legal Basis', tr: '3. Amaç ve Hukuki Dayanak' },
  'privacy.s3.content': {
    en: 'We process your data for these purposes:\n\n• Platform operation — to run the prediction game, track scores, and display leaderboards (legal basis: legitimate interest / KVKK Art. 5(2)(f))\n• Authentication — to let you log in securely (legal basis: contract performance / KVKK Art. 5(2)(c))\n• WhatsApp notifications — match reminders, results, leaderboard updates (legal basis: your explicit consent / KVKK Art. 5(1))\n• Platform improvement — aggregate, anonymized usage analytics (legal basis: legitimate interest)',
    tr: 'Verilerinizi şu amaçlarla işliyoruz:\n\n• Platform işletimi — tahmin oyununu yürütmek, puanları takip etmek ve sıralamayı göstermek için (hukuki dayanak: meşru menfaat / KVKK m. 5(2)(f))\n• Kimlik doğrulama — güvenli giriş yapmanız için (hukuki dayanak: sözleşmenin ifası / KVKK m. 5(2)(c))\n• WhatsApp bildirimleri — maç hatırlatmaları, sonuçlar, sıralama güncellemeleri (hukuki dayanak: açık rızanız / KVKK m. 5(1))\n• Platform iyileştirme — toplu, anonimleştirilmiş kullanım analitiği (hukuki dayanak: meşru menfaat)',
  },

  'privacy.s4.title': { en: '4. Data Retention', tr: '4. Veri Saklama Süresi' },
  'privacy.s4.content': {
    en: 'Your personal data is retained for the duration of the tournament season. After the season ends, account data is retained for up to 12 months to allow returning players to see historical results. You may request deletion at any time (see Section 5). Server logs containing IP addresses are automatically purged after 30 days.',
    tr: 'Kişisel verileriniz turnuva sezonu süresince saklanır. Sezon sona erdikten sonra, geri dönen oyuncuların geçmiş sonuçları görmesine izin vermek için hesap verileri 12 aya kadar tutulur. İstediğiniz zaman silme talep edebilirsiniz (Bölüm 5\'e bakın). IP adresi içeren sunucu logları 30 gün sonra otomatik olarak silinir.',
  },

  'privacy.s5.title': { en: '5. Your Rights', tr: '5. Haklarınız' },
  'privacy.s5.content': {
    en: 'Under GDPR and KVKK, you have the right to:\n\n• Access — request a copy of your personal data (GDPR Art. 15 / KVKK Art. 11(b))\n• Rectification — correct inaccurate data (GDPR Art. 16 / KVKK Art. 11(c))\n• Erasure — request deletion of your data (GDPR Art. 17 / KVKK Art. 11(e))\n• Data portability — receive your data in a machine-readable format (GDPR Art. 20)\n• Withdraw consent — revoke WhatsApp notification consent at any time (GDPR Art. 7(3) / KVKK Art. 11(a))\n• Object — object to processing based on legitimate interest (GDPR Art. 21 / KVKK Art. 11(d))\n• Lodge a complaint — with the Turkish KVKK Board (kvkk.gov.tr) or your local EU Data Protection Authority\n\nTo exercise any right, contact us at the email in Section 9.',
    tr: 'GDPR ve KVKK kapsamında şu haklara sahipsiniz:\n\n• Erişim — kişisel verilerinizin bir kopyasını talep etme (GDPR m. 15 / KVKK m. 11(b))\n• Düzeltme — yanlış verileri düzeltme (GDPR m. 16 / KVKK m. 11(c))\n• Silme — verilerinizin silinmesini talep etme (GDPR m. 17 / KVKK m. 11(e))\n• Taşınabilirlik — verilerinizi makine okunabilir formatta alma (GDPR m. 20)\n• Rızayı geri çekme — WhatsApp bildirim onayını istediğiniz zaman geri çekme (GDPR m. 7(3) / KVKK m. 11(a))\n• İtiraz — meşru menfaate dayalı işlemeye itiraz etme (GDPR m. 21 / KVKK m. 11(d))\n• Şikayet — Kişisel Verileri Koruma Kurulu\'na (kvkk.gov.tr) veya yerel AB Veri Koruma Otoritenize başvurma\n\nHerhangi bir hakkınızı kullanmak için Bölüm 9\'daki e-posta ile iletişime geçin.',
  },

  'privacy.s6.title': { en: '6. Cookies & Local Storage', tr: '6. Çerezler ve Yerel Depolama' },
  'privacy.s6.content': {
    en: 'We use browser local storage to store your authentication token and language preference. We do not use third-party tracking cookies, analytics scripts, or advertising trackers. No data is shared with ad networks.',
    tr: 'Kimlik doğrulama tokeninizi ve dil tercihinizi saklamak için tarayıcı yerel depolamasını kullanıyoruz. Üçüncü taraf takip çerezleri, analitik komut dosyaları veya reklam izleyicileri kullanmıyoruz. Reklam ağlarıyla veri paylaşılmaz.',
  },

  'privacy.s7.title': { en: '7. Cross-Border Data Transfers', tr: '7. Sınır Ötesi Veri Aktarımları' },
  'privacy.s7.content': {
    en: 'The platform is hosted on Railway (servers in the US/EU). If you opt in to WhatsApp notifications, your phone number is transmitted to WhatsApp (Meta Platforms, Inc.) which processes data in the US and other countries under Standard Contractual Clauses. By consenting to WhatsApp notifications, you acknowledge this cross-border transfer.',
    tr: 'Platform Railway üzerinde barındırılmaktadır (ABD/AB sunucuları). WhatsApp bildirimlerine onay verirseniz, telefon numaranız Standart Sözleşme Hükümleri kapsamında ABD ve diğer ülkelerde veri işleyen WhatsApp\'a (Meta Platforms, Inc.) iletilir. WhatsApp bildirimlerine onay vererek bu sınır ötesi aktarımı kabul etmiş olursunuz.',
  },

  'privacy.s8.title': { en: '8. Changes to This Policy', tr: '8. Bu Politikadaki Değişiklikler' },
  'privacy.s8.content': {
    en: 'We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the platform after changes constitutes acceptance.',
    tr: 'Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Değişiklikler bu sayfada güncellenmiş "Son güncelleme" tarihi ile yayınlanacaktır. Değişikliklerden sonra platformu kullanmaya devam etmek kabul anlamına gelir.',
  },

  'privacy.s9.title': { en: '9. Contact', tr: '9. İletişim' },
  'privacy.s9.content': {
    en: 'For privacy-related inquiries, data access requests, or to exercise your rights, please contact the platform administrator through the group chat or via email at the address provided during registration.',
    tr: 'Gizlilikle ilgili sorularınız, veri erişim talepleri veya haklarınızı kullanmak için lütfen grup sohbeti üzerinden veya kayıt sırasında verilen e-posta adresi ile platform yöneticisine ulaşın.',
  },

  // ── Terms of Service Page ──
  'terms.title': { en: 'Terms of Service', tr: 'Kullanım Koşulları' },
  'terms.lastUpdated': { en: 'Last updated: February 2026', tr: 'Son güncelleme: Şubat 2026' },

  'terms.s1.title': { en: '1. Acceptance of Terms', tr: '1. Koşulların Kabulü' },
  'terms.s1.content': {
    en: 'By creating an account and using Fantasy Darts ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.',
    tr: 'Fantazi Dart\'ta ("Platform") hesap oluşturarak ve kullanarak bu Kullanım Koşullarına bağlı olmayı kabul edersiniz. Kabul etmiyorsanız Platformu kullanmayın.',
  },

  'terms.s2.title': { en: '2. Description of Service', tr: '2. Hizmet Tanımı' },
  'terms.s2.content': {
    en: 'Fantasy Darts is a private, non-commercial fantasy prediction platform for a friend group. Users predict darts match outcomes using virtual RTB (Right to Brag) points. The Platform tracks a real darts tournament among friends and provides prediction markets, leaderboards, and statistics.',
    tr: 'Fantazi Dart, bir arkadaş grubu için özel, ticari olmayan bir fantazi tahmin platformudur. Kullanıcılar sanal RTB (Right to Brag — Övünme Hakkı) puanları kullanarak dart maç sonuçlarını tahmin eder. Platform, arkadaşlar arasındaki gerçek bir dart turnuvasını takip eder ve tahmin piyasaları, sıralamalar ve istatistikler sunar.',
  },

  'terms.s3.title': { en: '3. Eligibility', tr: '3. Katılım Şartları' },
  'terms.s3.content': {
    en: 'You must be at least 18 years old to use this Platform. By creating an account, you confirm that you meet this age requirement. This Platform is intended for invited participants only.',
    tr: 'Bu Platformu kullanabilmek için en az 18 yaşında olmalısınız. Hesap oluşturarak bu yaş şartını karşıladığınızı onaylarsınız. Bu Platform yalnızca davet edilen katılımcılar içindir.',
  },

  'terms.s4.title': { en: '4. No Real Money — Fantasy Only', tr: '4. Gerçek Para Yok — Sadece Fantazi' },
  'terms.s4.content': {
    en: 'THIS IS NOT A GAMBLING PLATFORM. RTB (Right to Brag) points are virtual tokens with absolutely NO real-money value. RTB points:\n\n• Cannot be purchased with real money\n• Cannot be exchanged, redeemed, or converted to cash\n• Cannot be transferred to other platforms\n• Have no monetary value whatsoever\n\nThis Platform is for entertainment and bragging rights only. If you believe you have a gambling problem, please contact a professional helpline in your country.',
    tr: 'BU BİR KUMAR PLATFORMU DEĞİLDİR. RTB (Right to Brag — Övünme Hakkı) puanları kesinlikle gerçek para değeri OLMAYAN sanal jetonlardır. RTB puanları:\n\n• Gerçek parayla satın alınamaz\n• Nakde çevrilemez, bozdurulamaz veya dönüştürülemez\n• Diğer platformlara aktarılamaz\n• Hiçbir parasal değeri yoktur\n\nBu Platform yalnızca eğlence ve övünme hakkı içindir. Kumar sorununuz olduğunu düşünüyorsanız, lütfen ülkenizdeki profesyonel yardım hattına başvurun.',
  },

  'terms.s5.title': { en: '5. User Conduct', tr: '5. Kullanıcı Davranışı' },
  'terms.s5.content': {
    en: 'You agree to:\n\n• Use only one account per person\n• Not attempt to manipulate markets, exploit bugs, or gain unfair advantage\n• Treat other players with respect\n• Not share your account credentials with others\n• Not use the Platform for any illegal purpose',
    tr: 'Şunları kabul edersiniz:\n\n• Kişi başına yalnızca bir hesap kullanmak\n• Piyasaları manipüle etmeye, hataları istismar etmeye veya haksız avantaj elde etmeye çalışmamak\n• Diğer oyunculara saygılı davranmak\n• Hesap bilgilerinizi başkalarıyla paylaşmamak\n• Platformu yasadışı amaçlarla kullanmamak',
  },

  'terms.s6.title': { en: '6. Privacy', tr: '6. Gizlilik' },
  'terms.s6.content': {
    en: 'Your use of the Platform is also governed by our Privacy Policy. By using the Platform, you consent to the collection and use of data as described in our Privacy Policy.',
    tr: 'Platform kullanımınız ayrıca Gizlilik Politikamız tarafından yönetilir. Platformu kullanarak, Gizlilik Politikamızda açıklanan şekilde veri toplanmasını ve kullanılmasını kabul edersiniz.',
  },

  'terms.s7.title': { en: '7. Account Termination', tr: '7. Hesap Sonlandırma' },
  'terms.s7.content': {
    en: 'You may delete your account at any time by contacting the platform administrator. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your personal data will be handled according to our Privacy Policy.',
    tr: 'Platform yöneticisi ile iletişime geçerek hesabınızı istediğiniz zaman silebilirsiniz. Bu koşulları ihlal eden hesapları askıya alma veya sonlandırma hakkımız saklıdır. Sonlandırma üzerine kişisel verileriniz Gizlilik Politikamıza göre işlenecektir.',
  },

  'terms.s8.title': { en: '8. Disclaimer of Warranties', tr: '8. Garanti Reddi' },
  'terms.s8.content': {
    en: 'The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of statistics, or availability. The Platform is a hobby project built for fun — not a commercial service.',
    tr: 'Platform herhangi bir garanti olmaksızın "olduğu gibi" sunulmaktadır. Kesintisiz hizmet, istatistiklerin doğruluğu veya erişilebilirlik garanti edilmez. Platform eğlence için yapılmış bir hobi projesidir — ticari bir hizmet değildir.',
  },

  'terms.s9.title': { en: '9. Changes to Terms', tr: '9. Koşullardaki Değişiklikler' },
  'terms.s9.content': {
    en: 'We may update these terms from time to time. Changes will be posted on this page. Continued use of the Platform after changes constitutes acceptance of the new terms.',
    tr: 'Bu koşulları zaman zaman güncelleyebiliriz. Değişiklikler bu sayfada yayınlanacaktır. Değişikliklerden sonra Platformu kullanmaya devam etmek yeni koşulların kabulü anlamına gelir.',
  },

  'terms.s10.title': { en: '10. Contact', tr: '10. İletişim' },
  'terms.s10.content': {
    en: 'For questions about these terms, please contact the platform administrator through the group chat or via the email address provided during registration.',
    tr: 'Bu koşullar hakkında sorularınız için lütfen grup sohbeti üzerinden veya kayıt sırasında verilen e-posta adresi ile platform yöneticisine ulaşın.',
  },

  // ── Consent / Registration ──
  'landing.agreePrivacy': {
    en: 'I agree to the <link>Privacy Policy</link>',
    tr: '<link>Gizlilik Politikasını</link> kabul ediyorum',
  },
  'landing.agreeTerms': {
    en: 'I agree to the <link>Terms of Service</link>',
    tr: '<link>Kullanım Koşullarını</link> kabul ediyorum',
  },
  'landing.agreeWhatsapp': {
    en: 'I consent to receiving WhatsApp notifications and acknowledge my phone number may be processed outside Turkey/EU by Meta Platforms, Inc. (optional)',
    tr: 'WhatsApp bildirimleri almayı ve telefon numaramın Meta Platforms, Inc. tarafından Türkiye/AB dışında işlenebileceğini kabul ediyorum (isteğe bağlı)',
  },
  'landing.ageRequired': {
    en: 'You must confirm you are 18+ to continue',
    tr: 'Devam etmek için 18 yaşından büyük olduğunuzu onaylamalısınız',
  },
  'landing.consentRequired': {
    en: 'You must agree to the Privacy Policy and Terms of Service',
    tr: 'Gizlilik Politikası ve Kullanım Koşullarını kabul etmelisiniz',
  },

  // ── Footer ──
  'footer.privacy': { en: 'Privacy Policy', tr: 'Gizlilik Politikası' },
  'footer.terms': { en: 'Terms of Service', tr: 'Kullanım Koşulları' },
  'footer.copyright': { en: '© 2026 Fantasy Darts. For entertainment only.', tr: '© 2026 Fantazi Dart. Sadece eğlence amaçlıdır.' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}
