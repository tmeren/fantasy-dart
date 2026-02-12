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
  'dashboard.market': { en: 'Market', tr: 'Piyasa' },
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
  'tournament.upcoming': { en: 'Upcoming', tr: 'Yaklaşan' },
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
  'markets.title': { en: 'Prediction Markets', tr: 'Tahmin Piyasası' },
  'markets.all': { en: 'all', tr: 'tümü' },
  'markets.open': { en: 'open', tr: 'açık' },
  'markets.closed': { en: 'closed', tr: 'kapalı' },
  'markets.settled': { en: 'settled', tr: 'sonuçlandı' },
  'markets.noMarkets': { en: 'No predictions found', tr: 'Tahmin bulunamadı' },
  'markets.tokensStaked': { en: 'RTB committed', tr: 'RTB taahhüt' },

  // ── Market Detail ──
  'marketDetail.backToMarkets': { en: '← Back to Markets', tr: '← Piyasalara Dön' },
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
  'marketDetail.marketIs': { en: 'This market is', tr: 'Bu piyasa' },
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
  'admin.subtitle': { en: 'Tournament management, markets, predictions', tr: 'Turnuva yönetimi, piyasalar, tahminler' },
  'admin.tournament': { en: 'Tournament', tr: 'Turnuva' },
  'admin.markets': { en: 'Markets', tr: 'Piyasalar' },
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
  'admin.createMarket': { en: '+ Create Market', tr: '+ Piyasa Oluştur' },
  'admin.close': { en: 'Close', tr: 'Kapat' },
  'admin.settle': { en: 'Settle', tr: 'Sonuçlandır' },
  'admin.winner': { en: 'Winner:', tr: 'Kazanan:' },
  'admin.noMarkets': { en: 'No markets yet. Create your first!', tr: 'Henüz piyasa yok. İlkini oluştur!' },
  'admin.enterMatchResult': { en: 'Enter Match Result', tr: 'Maç Sonucu Gir' },
  'admin.winnerPreview': { en: 'Winner:', tr: 'Kazanan:' },
  'admin.invalidScore': { en: 'Invalid: one player must score 3', tr: 'Geçersiz: bir oyuncunun skoru 3 olmalı' },
  'admin.confirmResult': { en: 'Confirm Result', tr: 'Sonucu Onayla' },
  'admin.saving': { en: 'Saving...', tr: 'Kaydediliyor...' },
  'admin.cancel': { en: 'Cancel', tr: 'İptal' },
  'admin.createNewMarket': { en: 'Create New Market', tr: 'Yeni Piyasa Oluştur' },
  'admin.marketName': { en: 'Market Name', tr: 'Piyasa Adı' },
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
  'admin.tableMarket': { en: 'Market', tr: 'Piyasa' },
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
  'admin.closeConfirm': { en: 'Close this market? No more predictions will be allowed.', tr: 'Bu piyasayı kapat? Artık tahmin kabul edilmeyecek.' },
  'admin.settleConfirm': { en: 'Settle this market? Winners will be paid out.', tr: 'Bu piyasayı sonuçlandır? Kazananlara ödeme yapılacak.' },
  'admin.validScores': { en: 'Please enter valid scores', tr: 'Lütfen geçerli skorlar girin' },
  'admin.invalidScoreAlert': { en: 'Invalid score: one player must have 3, other must have 0-2', tr: 'Geçersiz skor: bir oyuncu 3, diğeri 0-2 olmalı' },
  'admin.namePlaceholder': { en: 'e.g., QF1: Berkay vs Ece', tr: 'örn., ÇF1: Berkay vs Ece' },
  'admin.additionalDetails': { en: 'Additional details...', tr: 'Ek detaylar...' },
  'admin.tokensLabel': { en: 'RTB', tr: 'RTB' },

  // ── Market Detail extras ──
  'marketDetail.est': { en: 'est.', tr: 'thm.' },
  'marketDetail.current': { en: '(current)', tr: '(güncel)' },
  'marketDetail.tokens': { en: 'RTB', tr: 'RTB' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}
