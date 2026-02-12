/**
 * Internationalization (i18n) — English / Turkish translations
 */

export type Locale = 'en' | 'tr';

export const translations = {
  // ── Navbar ──
  'nav.brand': { en: 'Fantasy Darts', tr: 'Fantazi Dart' },
  'nav.markets': { en: 'Markets', tr: 'Bahisler' },
  'nav.leaderboard': { en: 'Leaderboard', tr: 'Sıralama' },
  'nav.tournament': { en: 'Tournament', tr: 'Turnuva' },
  'nav.liveFeed': { en: 'Live Feed', tr: 'Canlı Akış' },
  'nav.admin': { en: 'Admin', tr: 'Yönetim' },
  'nav.tokens': { en: 'tokens', tr: 'jeton' },
  'nav.logout': { en: 'Logout', tr: 'Çıkış' },

  // ── Landing / Auth ──
  'landing.title1': { en: 'Fantasy', tr: 'Fantazi' },
  'landing.title2': { en: 'Darts Betting', tr: 'Dart Bahisleri' },
  'landing.subtitle': {
    en: 'Bet on your friends with fantasy tokens. No real money. Just bragging rights.',
    tr: 'Arkadaşlarınla fantazi jetonlarla bahis yap. Gerçek para yok. Sadece övünme hakkı.',
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
  'landing.createAccount': { en: 'Create Account & Get 100 Tokens', tr: 'Hesap Oluştur ve 100 Jeton Al' },
  'landing.alreadyHave': { en: 'Already have an account?', tr: 'Zaten hesabın var mı?' },

  // Features
  'feature.placeBets': { en: 'Place Bets', tr: 'Bahis Yap' },
  'feature.placeBetsDesc': {
    en: 'Use your 100 starting tokens to bet on tournament outcomes.',
    tr: 'Başlangıç 100 jetonunla turnuva sonuçlarına bahis yap.',
  },
  'feature.trackLive': { en: 'Track Live', tr: 'Canlı Takip' },
  'feature.trackLiveDesc': {
    en: "See what everyone's betting on in real-time.",
    tr: 'Herkesin neye bahis oynadığını canlı gör.',
  },
  'feature.climbLeaderboard': { en: 'Climb Leaderboard', tr: 'Sıralamada Yüksel' },
  'feature.climbLeaderboardDesc': {
    en: 'Compete with friends to become the top bettor.',
    tr: 'Arkadaşlarınla yarışarak en iyi bahisçi ol.',
  },

  // Disclaimer
  'disclaimer.title': { en: 'Important Notice', tr: 'Önemli Uyarı' },
  'disclaimer.1': {
    en: 'This is a FANTASY game - tokens have NO cash value',
    tr: 'Bu bir FANTAZİ oyunudur - jetonların nakit değeri YOKTUR',
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
  'dashboard.subtitle': { en: "Here's your betting dashboard", tr: 'İşte bahis panelin' },
  'dashboard.balance': { en: 'Balance', tr: 'Bakiye' },
  'dashboard.activeBets': { en: 'Active Bets', tr: 'Aktif Bahisler' },
  'dashboard.openPositions': { en: 'open positions', tr: 'açık pozisyon' },
  'dashboard.atRisk': { en: 'At Risk', tr: 'Risk Altında' },
  'dashboard.tokensStaked': { en: 'tokens staked', tr: 'jeton yatırıldı' },
  'dashboard.potentialWin': { en: 'Potential Win', tr: 'Potansiyel Kazanç' },
  'dashboard.ifAllWin': { en: 'if all win', tr: 'hepsi kazanırsa' },
  'dashboard.openMarkets': { en: 'Open Markets', tr: 'Açık Bahisler' },
  'dashboard.viewAll': { en: 'View All →', tr: 'Tümünü Gör →' },
  'dashboard.open': { en: 'Open', tr: 'Açık' },
  'dashboard.more': { en: 'more', tr: 'daha' },
  'dashboard.noOpenMarkets': { en: 'No open markets right now', tr: 'Şu anda açık bahis yok' },
  'dashboard.liveActivity': { en: 'Live Activity', tr: 'Canlı Aktivite' },
  'dashboard.noActivity': { en: 'No activity yet', tr: 'Henüz aktivite yok' },
  'dashboard.myActiveBets': { en: 'My Active Bets', tr: 'Aktif Bahislerim' },
  'dashboard.market': { en: 'Market', tr: 'Bahis' },
  'dashboard.selection': { en: 'Selection', tr: 'Seçim' },
  'dashboard.stake': { en: 'Stake', tr: 'Yatırılan' },
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

  // ── Leaderboard ──
  'leaderboard.title': { en: 'Leaderboard', tr: 'Sıralama Tablosu' },
  'leaderboard.subtitle': { en: "Who's the best fantasy bettor?", tr: 'En iyi fantazi bahisçi kim?' },
  'leaderboard.profit': { en: 'profit', tr: 'kar' },
  'leaderboard.rank': { en: 'Rank', tr: 'Sıra' },
  'leaderboard.player': { en: 'Player', tr: 'Oyuncu' },
  'leaderboard.balance': { en: 'Balance', tr: 'Bakiye' },
  'leaderboard.profitLoss': { en: 'Profit/Loss', tr: 'Kar/Zarar' },
  'leaderboard.staked': { en: 'Staked', tr: 'Yatırılan' },
  'leaderboard.bets': { en: 'Bets', tr: 'Bahisler' },
  'leaderboard.winRate': { en: 'Win Rate', tr: 'Kazanma %' },
  'leaderboard.streak': { en: 'Streak', tr: 'Seri' },
  'leaderboard.badges': { en: 'Badges', tr: 'Rozetler' },
  'leaderboard.you': { en: '(You)', tr: '(Sen)' },
  'leaderboard.achievementBadges': { en: 'Achievement Badges', tr: 'Başarı Rozetleri' },
  'leaderboard.noPlayers': { en: 'No players yet. Be the first!', tr: 'Henüz oyuncu yok. İlk sen ol!' },

  // Badge names
  'badge.firstBlood': { en: 'First Blood', tr: 'İlk Kan' },
  'badge.highRoller': { en: 'High Roller', tr: 'Büyük Oyuncu' },
  'badge.luckyStreak': { en: 'Lucky Streak', tr: 'Şanslı Seri' },
  'badge.whale': { en: 'Whale', tr: 'Balina' },
  'badge.sharp': { en: 'Sharp', tr: 'Keskin' },

  // ── Markets ──
  'markets.title': { en: 'Betting Markets', tr: 'Bahis Piyasaları' },
  'markets.all': { en: 'all', tr: 'tümü' },
  'markets.open': { en: 'open', tr: 'açık' },
  'markets.closed': { en: 'closed', tr: 'kapalı' },
  'markets.settled': { en: 'settled', tr: 'sonuçlandı' },
  'markets.noMarkets': { en: 'No markets found', tr: 'Bahis bulunamadı' },
  'markets.tokensStaked': { en: 'tokens staked', tr: 'jeton yatırıldı' },

  // ── Market Detail ──
  'marketDetail.backToMarkets': { en: '← Back to Markets', tr: '← Bahislere Dön' },
  'marketDetail.totalPool': { en: 'Total pool:', tr: 'Toplam havuz:' },
  'marketDetail.houseCut': { en: 'House cut:', tr: 'Kasa payı:' },
  'marketDetail.payoutPool': { en: 'Payout pool:', tr: 'Ödeme havuzu:' },
  'marketDetail.poolBetting': { en: 'Pool Betting:', tr: 'Havuz Bahisi:' },
  'marketDetail.poolBettingDesc': {
    en: 'Odds change dynamically based on how others bet. Your final payout depends on the pool at market close.',
    tr: 'Oranlar diğerlerinin bahislerine göre dinamik olarak değişir. Son ödemeniz piyasa kapanışındaki havuza bağlıdır.',
  },
  'marketDetail.selections': { en: 'Selections', tr: 'Seçenekler' },
  'marketDetail.betsPlaced': { en: 'Bets Placed', tr: 'Yapılan Bahisler' },
  'marketDetail.placeBet': { en: 'Place Bet', tr: 'Bahis Yap' },
  'marketDetail.marketIs': { en: 'This market is', tr: 'Bu piyasa' },
  'marketDetail.bettingNotAvailable': { en: 'Betting is no longer available', tr: 'Bahis artık mevcut değil' },
  'marketDetail.selected': { en: 'Selected:', tr: 'Seçilen:' },
  'marketDetail.selectPlayer': { en: 'Select a player above to place a bet', tr: 'Bahis yapmak için yukarıdan oyuncu seç' },
  'marketDetail.stakeLabel': { en: 'Stake', tr: 'Yatırılacak' },
  'marketDetail.currentOdds': { en: 'Current Odds', tr: 'Mevcut Oran' },
  'marketDetail.estWin': { en: 'Est. Win', tr: 'Tahmini Kazanç' },
  'marketDetail.potentialWin': { en: 'Potential Win', tr: 'Potansiyel Kazanç' },
  'marketDetail.finalPayoutNote': { en: 'Final payout depends on pool at close', tr: 'Son ödeme kapanıştaki havuza bağlıdır' },
  'marketDetail.placing': { en: 'Placing...', tr: 'Yapılıyor...' },
  'marketDetail.betPlaced': { en: 'Bet placed successfully!', tr: 'Bahis başarıyla yapıldı!' },
  'marketDetail.yourBalance': { en: 'Your balance:', tr: 'Bakiyen:' },

  // ── Activity Feed ──
  'activity.title': { en: 'Live Activity', tr: 'Canlı Aktivite' },
  'activity.subtitle': { en: "Real-time updates on what everyone's betting", tr: 'Herkesin bahisleri hakkında anlık güncellemeler' },
  'activity.feedTitle': { en: 'Activity Feed', tr: 'Aktivite Akışı' },
  'activity.noActivity': { en: 'No activity yet', tr: 'Henüz aktivite yok' },
  'activity.recentBets': { en: 'Recent Bets', tr: 'Son Bahisler' },
  'activity.noBets': { en: 'No bets yet', tr: 'Henüz bahis yok' },
  'activity.toWin': { en: 'To win:', tr: 'Kazanç:' },

  // ── Admin ──
  'admin.title': { en: 'Bookmaker Admin', tr: 'Bahis Yönetimi' },
  'admin.subtitle': { en: 'Tournament management, markets, odds', tr: 'Turnuva yönetimi, bahisler, oranlar' },
  'admin.tournament': { en: 'Tournament', tr: 'Turnuva' },
  'admin.markets': { en: 'Markets', tr: 'Bahisler' },
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
  'admin.createMarket': { en: '+ Create Market', tr: '+ Bahis Oluştur' },
  'admin.close': { en: 'Close', tr: 'Kapat' },
  'admin.settle': { en: 'Settle', tr: 'Sonuçlandır' },
  'admin.winner': { en: 'Winner:', tr: 'Kazanan:' },
  'admin.noMarkets': { en: 'No markets yet. Create your first market!', tr: 'Henüz bahis yok. İlk bahsini oluştur!' },
  'admin.enterMatchResult': { en: 'Enter Match Result', tr: 'Maç Sonucu Gir' },
  'admin.winnerPreview': { en: 'Winner:', tr: 'Kazanan:' },
  'admin.invalidScore': { en: 'Invalid: one player must score 3', tr: 'Geçersiz: bir oyuncunun skoru 3 olmalı' },
  'admin.confirmResult': { en: 'Confirm Result', tr: 'Sonucu Onayla' },
  'admin.saving': { en: 'Saving...', tr: 'Kaydediliyor...' },
  'admin.cancel': { en: 'Cancel', tr: 'İptal' },
  'admin.createNewMarket': { en: 'Create New Market', tr: 'Yeni Bahis Oluştur' },
  'admin.marketName': { en: 'Market Name', tr: 'Bahis Adı' },
  'admin.description': { en: 'Description (optional)', tr: 'Açıklama (isteğe bağlı)' },
  'admin.marketType': { en: 'Market Type', tr: 'Bahis Türü' },
  'admin.bettingType': { en: 'Betting Type', tr: 'Bahis Sistemi' },
  'admin.houseCut': { en: 'House Cut (%)', tr: 'Kasa Payı (%)' },
  'admin.selections': { en: 'Selections', tr: 'Seçenekler' },
  'admin.addSelection': { en: '+ Add Selection', tr: '+ Seçenek Ekle' },
  'admin.settleMarket': { en: 'Settle Market', tr: 'Bahsi Sonuçlandır' },
  'admin.selectWinner': { en: 'Select the winning selection:', tr: 'Kazanan seçeneği seç:' },
  'admin.resultEntered': { en: 'Result entered:', tr: 'Sonuç girildi:' },
  'admin.ratingsUpdated': { en: '— Elo ratings and odds updated.', tr: '— Elo puanları ve oranlar güncellendi.' },
  'admin.poolDesc': {
    en: 'Pool betting: All stakes go into a pool. Winners split the pool proportionally.',
    tr: 'Havuz bahsi: Tüm yatırımlar havuza girer. Kazananlar havuzu orantılı paylaşır.',
  },
  'admin.houseCutDesc': {
    en: 'Percentage taken from pool before distribution (default: 10%)',
    tr: 'Dağıtım öncesi havuzdan alınan yüzde (varsayılan: %10)',
  },

  // ── Market types ──
  'marketType.match': { en: 'Match (head-to-head)', tr: 'Maç (kafa kafaya)' },
  'marketType.outright': { en: 'Outright (tournament winner)', tr: 'Genel (turnuva şampiyonu)' },
  'marketType.prop': { en: 'Prop (yes/no or multiple)', tr: 'Özel (evet/hayır veya çoklu)' },
  'bettingType.parimutuel': { en: 'Pool (Parimutuel) - Odds change with bets', tr: 'Havuz (Parimütüel) - Oranlar bahislere göre değişir' },
  'bettingType.fixed': { en: 'Fixed Odds - Traditional bookmaker', tr: 'Sabit Oran - Geleneksel bahis' },

  // ── Admin table headers ──
  'admin.tableMarket': { en: 'Market', tr: 'Bahis' },
  'admin.tableType': { en: 'Type', tr: 'Tür' },
  'admin.tableStatus': { en: 'Status', tr: 'Durum' },
  'admin.tableStaked': { en: 'Staked', tr: 'Yatırılan' },
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
  'admin.closeConfirm': { en: 'Close this market? No more bets will be allowed.', tr: 'Bu bahsi kapat? Artık bahis kabul edilmeyecek.' },
  'admin.settleConfirm': { en: 'Settle this market? Winners will be paid out.', tr: 'Bu bahsi sonuçlandır? Kazananlara ödeme yapılacak.' },
  'admin.validScores': { en: 'Please enter valid scores', tr: 'Lütfen geçerli skorlar girin' },
  'admin.invalidScoreAlert': { en: 'Invalid score: one player must have 3, other must have 0-2', tr: 'Geçersiz skor: bir oyuncu 3, diğeri 0-2 olmalı' },
  'admin.namePlaceholder': { en: 'e.g., QF1: Berkay vs Ece', tr: 'örn., ÇF1: Berkay vs Ece' },
  'admin.additionalDetails': { en: 'Additional details...', tr: 'Ek detaylar...' },
  'admin.tokensLabel': { en: 'tokens', tr: 'jeton' },

  // ── Market Detail extras ──
  'marketDetail.est': { en: 'est.', tr: 'thm.' },
  'marketDetail.current': { en: '(current)', tr: '(güncel)' },
  'marketDetail.tokens': { en: 'tokens', tr: 'jeton' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}
