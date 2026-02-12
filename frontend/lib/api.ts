/**
 * API client for Fantasy Darts Betting
 */

// Always use relative /api path — Next.js rewrites proxy to the backend (no CORS)
const API_BASE = '/api';

export interface User {
  id: number;
  email: string;
  name: string;
  balance: number;
  is_admin: boolean;
  created_at: string;
  phone_number: string | null;
  whatsapp_opted_in: boolean;
}

export interface Selection {
  id: number;
  name: string;
  odds: number;  // Initial/fixed odds
  pool_total: number;  // Amount staked on this selection
  pool_percentage: number;  // % of total pool
  dynamic_odds: number;  // Current odds based on pool (parimutuel)
  is_winner: boolean;
}

export interface Market {
  id: number;
  name: string;
  description: string | null;
  market_type: string;
  betting_type: 'fixed' | 'parimutuel';
  house_cut: number;
  status: 'open' | 'closed' | 'settled';
  created_at: string;
  closes_at: string | null;
  selections: Selection[];
  total_staked: number;
  pool_after_cut: number;  // Pool minus house cut
}

export interface Bet {
  id: number;
  user_id: number;
  user_name: string;
  selection_id: number;
  selection_name: string;
  market_name: string;
  stake: number;
  odds_at_time: number;
  potential_win: number;  // Estimated (changes for parimutuel)
  actual_payout?: number;  // Final payout after settlement
  is_parimutuel: boolean;
  status: 'active' | 'won' | 'lost' | 'void';
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    name: string;
    balance: number;
  };
  total_bets: number;
  win_rate: number;
  profit: number;
  roi_pct: number;
  total_staked: number;
  streak: string;  // "W3", "L2", or ""
  badges: string[];  // "first_blood", "high_roller", "lucky_streak", "whale", "sharp"
}

export interface BalanceHistoryEntry {
  timestamp: string;
  balance: number;
  event: string;  // "joined", "bet_placed", "won", "lost"
}

export interface Activity {
  id: number;
  activity_type: string;
  message: string;
  data: string | null;
  created_at: string;
}

// Public Tournament types
export interface StandingEntry {
  rank: number;
  player: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  legs_for: number;
  legs_against: number;
  leg_diff: number;
  remaining?: number;
  score?: number;
  tiebreaks?: number;
}

export interface CompletedMatch {
  round: number;
  match_id: number;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  winner: string | null;
  is_draw: boolean;
}

// Admin / Tournament types
export interface ScheduledMatch {
  round: number;
  match_id: number;
  player1: string;
  player2: string;
}

export interface PlayerRating {
  rank: number;
  player: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
}

export interface OutrightOdds {
  player: string;
  true_probability: number;
  implied_probability: number;
  odds: number;
  top8_pct: number;
}

export interface EnterResultResponse {
  message: string;
  match_id: number;
  winner: string;
  score: string;
  updated_ratings: PlayerRating[];
  updated_outright_odds: OutrightOdds[];
}

// Prop Market types (S7)
export interface PropMarketPreview {
  name: string;
  description: string;
  selections: { name: string; odds: number }[];
  match_round: number;
  match_id: number;
}

// WhatsApp types (S19)
export interface PhoneUpdateResponse {
  message: string;
  phone_number: string;
  whatsapp_opted_in: boolean;
}

export interface WhatsAppLog {
  id: number;
  user_id: number | null;
  message_type: string;
  template_name: string;
  status: string;
  meta_message_id: string | null;
  created_at: string;
}

export interface WhatsAppSendResult {
  message: string;
  sent: number;
  failed: number;
}

// Match Stats types (S9)
export interface MatchStats {
  match_id: number;
  player1: string;
  player2: string;
  total_180s: number | null;
  highest_checkout: number | null;
  p1_180: boolean;
  p2_180: boolean;
  p1_ton_checkout: boolean;
  p2_ton_checkout: boolean;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'API request failed');
    }

    return response.json();
  }

  // Auth
  async register(email: string, name: string): Promise<{ access_token: string }> {
    const result = await this.fetch<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
    this.setToken(result.access_token);
    return result;
  }

  async login(email: string): Promise<{ access_token: string }> {
    const result = await this.fetch<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    this.setToken(result.access_token);
    return result;
  }

  async getMe(): Promise<User> {
    return this.fetch<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Markets
  async getMarkets(status?: string): Promise<Market[]> {
    const params = status ? `?status=${status}` : '';
    return this.fetch<Market[]>(`/markets${params}`);
  }

  async getMarket(id: number): Promise<Market> {
    return this.fetch<Market>(`/markets/${id}`);
  }

  async createMarket(data: {
    name: string;
    description?: string;
    market_type: string;
    betting_type?: 'fixed' | 'parimutuel';
    house_cut?: number;
    selections: { name: string; odds: number }[];
  }): Promise<Market> {
    return this.fetch<Market>('/markets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async closeMarket(id: number): Promise<void> {
    await this.fetch(`/markets/${id}/close`, { method: 'PUT' });
  }

  async settleMarket(id: number, winningSelectionId: number): Promise<void> {
    await this.fetch(`/markets/${id}/settle`, {
      method: 'PUT',
      body: JSON.stringify({ winning_selection_id: winningSelectionId }),
    });
  }

  // Bets
  async placeBet(selectionId: number, stake: number): Promise<Bet> {
    return this.fetch<Bet>('/bets', {
      method: 'POST',
      body: JSON.stringify({ selection_id: selectionId, stake }),
    });
  }

  async getMyBets(): Promise<Bet[]> {
    return this.fetch<Bet[]>('/bets/my');
  }

  async getAllBets(): Promise<Bet[]> {
    return this.fetch<Bet[]>('/bets/all');
  }

  // Leaderboard
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.fetch<LeaderboardEntry[]>('/leaderboard');
  }

  async getBalanceHistory(userId: number): Promise<BalanceHistoryEntry[]> {
    return this.fetch<BalanceHistoryEntry[]>(`/leaderboard/${userId}/history`);
  }

  // Activity
  async getActivities(limit: number = 20): Promise<Activity[]> {
    return this.fetch<Activity[]>(`/activities?limit=${limit}`);
  }

  // Public Tournament
  async getStandings(): Promise<StandingEntry[]> {
    return this.fetch<StandingEntry[]>('/tournament/standings');
  }

  async getTournamentRatings(): Promise<PlayerRating[]> {
    return this.fetch<PlayerRating[]>('/tournament/ratings');
  }

  async getResults(): Promise<CompletedMatch[]> {
    return this.fetch<CompletedMatch[]>('/tournament/results');
  }

  async getUpcomingMatches(): Promise<ScheduledMatch[]> {
    return this.fetch<ScheduledMatch[]>('/tournament/upcoming');
  }

  // Admin Tournament
  async getScheduledMatches(): Promise<ScheduledMatch[]> {
    return this.fetch<ScheduledMatch[]>('/admin/scheduled-matches');
  }

  async enterResult(
    matchId: number, score1: number, score2: number, winner: string,
    propData?: { total_180s?: number; highest_checkout?: number; p1_180?: boolean; p2_180?: boolean; p1_ton_checkout?: boolean; p2_ton_checkout?: boolean }
  ): Promise<EnterResultResponse> {
    return this.fetch<EnterResultResponse>('/admin/enter-result', {
      method: 'POST',
      body: JSON.stringify({ match_id: matchId, score1, score2, winner, ...propData }),
    });
  }

  async getCurrentRatings(): Promise<PlayerRating[]> {
    return this.fetch<PlayerRating[]>('/admin/current-ratings');
  }

  async getCurrentOdds(): Promise<OutrightOdds[]> {
    return this.fetch<OutrightOdds[]>('/admin/current-odds');
  }

  // Prop Markets (S7)
  async getPropMarkets(matchId?: number, status?: string): Promise<Market[]> {
    const params = new URLSearchParams();
    if (matchId) params.append('match_id', matchId.toString());
    if (status) params.append('status', status);
    const qs = params.toString();
    return this.fetch<Market[]>(`/prop-markets${qs ? '?' + qs : ''}`);
  }

  async previewPropMarkets(matchId: number): Promise<PropMarketPreview[]> {
    return this.fetch<PropMarketPreview[]>(`/prop-markets/preview/${matchId}`);
  }

  async generatePropMarkets(matchId: number): Promise<Market[]> {
    return this.fetch<Market[]>('/admin/prop-markets/generate', {
      method: 'POST',
      body: JSON.stringify({ match_id: matchId }),
    });
  }

  // Match Stats (S9)
  async getMatchStats(matchId: number): Promise<MatchStats> {
    return this.fetch<MatchStats>(`/tournament/match-stats/${matchId}`);
  }

  async updateMatchStats(matchId: number, data: Partial<MatchStats>): Promise<MatchStats> {
    return this.fetch<MatchStats>(`/admin/match-stats/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Phone / WhatsApp (S19)
  async updatePhone(phoneNumber: string): Promise<PhoneUpdateResponse> {
    return this.fetch<PhoneUpdateResponse>('/auth/phone', {
      method: 'PUT',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  async removePhone(): Promise<void> {
    await this.fetch('/auth/phone', { method: 'DELETE' });
  }

  async setWhatsAppOptIn(optedIn: boolean): Promise<PhoneUpdateResponse> {
    return this.fetch<PhoneUpdateResponse>('/auth/whatsapp-opt-in', {
      method: 'PUT',
      body: JSON.stringify({ opted_in: optedIn }),
    });
  }

  async sendWhatsApp(template: string): Promise<WhatsAppSendResult> {
    return this.fetch<WhatsAppSendResult>(`/admin/whatsapp/send-${template}`, {
      method: 'POST',
    });
  }

  async getWhatsAppLogs(limit: number = 50): Promise<WhatsAppLog[]> {
    return this.fetch<WhatsAppLog[]>(`/admin/whatsapp/logs?limit=${limit}`);
  }
}

export const api = new ApiClient();
