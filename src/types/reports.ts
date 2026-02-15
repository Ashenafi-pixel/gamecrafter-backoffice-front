// Report Types
export interface PlayerReport {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  registrationDate: string;
  lastLoginDate: string;
  totalGamesPlayed: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  status: "active" | "inactive" | "banned";
  country?: string;
  currency: string;
}

export interface GameReport {
  id: string;
  gameName: string;
  gameType: "slot" | "table" | "live" | "sports";
  provider: string;
  numberOfBets: number;
  turnoverEUR: number;
  numberOfPlayers: number;
  ggr: number; // Gross Gaming Revenue
  rtp: number; // Return to Player
  cashbackGenerated: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface GameBetDetail {
  id: string;
  playerId: string;
  playerUsername: string;
  betAmount: number;
  winAmount: number;
  netResult: number;
  currency: string;
  betTime: string;
  gameRoundId: string;
  status: "pending" | "completed" | "cancelled";
}

export interface TransactionReport {
  id: string;
  transactionId: string;
  playerId: string;
  playerUsername: string;
  type: "deposit" | "withdrawal" | "bet" | "win" | "bonus" | "refund";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  method: string;
  createdAt: string;
  processedAt?: string;
  description?: string;
}

export interface DailyReport {
  id?: string;
  date: string;
  totalPlayers: number;
  newPlayers: number;
  activePlayers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalWagered: number;
  totalWon: number;
  netRevenue: number;
  averageBet: number;
  topGame: string;
  topCountry: string;
  conversionRate: number;
  detailedData?: {
    total_transactions: number;
    total_deposits: string;
    total_withdrawals: string;
    total_bets: string;
    total_wins: string;
    net_revenue: string;
    active_games: number;
    unique_depositors: number;
    unique_withdrawers: number;
    deposit_count: number;
    withdrawal_count: number;
    bet_count: number;
    win_count: number;
    cashback_earned: string;
    cashback_claimed: string;
    admin_corrections: string;
    top_games: Array<{
      game_id: string;
      game_name: string;
      provider: string;
      total_bets: string;
      total_wins: string;
      net_revenue: string;
      player_count: number;
      session_count: number;
      avg_bet_amount: string;
      rtp: string;
      rank: number;
    }>;
    top_players: Array<{
      user_id: string;
      username: string;
      total_deposits: string;
      total_withdrawals: string;
      total_bets: string;
      total_wins: string;
      net_loss: string;
      transaction_count: number;
      unique_games_played: number;
      session_count: number;
      avg_bet_amount: string;
      last_activity: string;
      rank: number;
    }>;
  };
}

// Filter Types
export interface PlayerReportFilters {
  status?: string;
  country?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  minWagered?: number;
  maxWagered?: number;
  search?: string;
  isTest?: boolean[]; // Multi-select: [false] by default, can include [true] or both
}

export interface AffiliateReportRequest {
  date_from?: string;
  date_to?: string;
  referral_code?: string;
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface AffiliateReportRow {
  date: string;
  referral_code: string;
  affiliate_username: string;
  registrations: number;
  unique_depositors: number;
  active_customers: number;
  total_bets: number;
  ggr: string | number;
  ngr: string | number;
  deposits_usd: string | number;
  withdrawals_usd: string | number;
}

export interface AffiliateRegistration {
  user_id: string;
  username: string;
  email: string;
  referral_code: string;
  created_at: string;
}

export interface AffiliateReportSummary {
  total_registrations: number;
  total_unique_depositors: number;
  total_active_customers: number;
  total_bets: number;
  total_ggr: string | number;
  total_ngr: string | number;
  total_deposits_usd: string | number;
  total_withdrawals_usd: string | number;
  registrations: AffiliateRegistration[]; // List of all registrations
}

export interface AffiliateReportResponse {
  message: string;
  data: AffiliateReportRow[];
  summary: AffiliateReportSummary;
}

export interface AffiliatePlayersReportRequest {
  referral_code: string;
  date_from?: string;
  date_to?: string;
  is_test_account?: boolean;
}

export interface AffiliatePlayerReportRow {
  player_id: string;
  username: string;
  email: string;
  registrations: number;
  unique_depositors: number;
  active_customers: number;
  total_bets: number;
  ggr: string | number;
  ngr: string | number;
  deposits_usd: string | number;
  withdrawals_usd: string | number;
}

export interface AffiliatePlayersReportResponse {
  message: string;
  data: AffiliatePlayerReportRow[];
  summary: AffiliateReportSummary;
}

export interface GameReportFilters {
  game?: string;
  provider?: string;
  gameType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minGgr?: number;
  maxGgr?: number;
  minRtp?: number;
  maxRtp?: number;
  minCashback?: number;
  maxCashback?: number;
  search?: string;
  isTest?: boolean[]; // Multi-select: [false] by default
}

export interface TransactionReportFilters {
  type?: string;
  status?: string;
  method?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  playerId?: string;
  is_test_transaction?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface DailyReportFilters {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: "day" | "week" | "month";
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

// API Request/Response Types
export interface ReportRequest {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface PlayerReportRequest extends ReportRequest {
  filters?: PlayerReportFilters;
}

export interface GameReportRequest extends ReportRequest {
  filters?: GameReportFilters;
}

export interface TransactionReportRequest extends ReportRequest {
  filters?: TransactionReportFilters;
}

export interface DailyReportRequest extends ReportRequest {
  filters?: DailyReportFilters;
}

export interface ReportResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type PlayerReportResponse = ReportResponse<PlayerReport>;
export type GameReportResponse = ReportResponse<GameReport>;
export type TransactionReportResponse = ReportResponse<TransactionReport>;
export type DailyReportResponse = ReportResponse<DailyReport>;

// Export Types
export interface ExportOptions {
  format: "csv" | "excel" | "pdf";
  filename?: string;
  includeCharts?: boolean;
}

// Big Winners Report Types
export interface BigWinner {
  id: string;
  date_time: string;
  player_id: string;
  username: string;
  email?: string;
  brand_id?: string;
  brand_name?: string;
  game_provider?: string;
  game_id?: string;
  game_name?: string;
  bet_id?: string;
  round_id?: string;
  stake_amount: number;
  win_amount: number;
  net_win: number;
  currency: string;
  win_multiplier?: number;
  bet_type: "cash" | "bonus" | "mixed";
  is_jackpot: boolean;
  jackpot_name?: string;
  session_id?: string;
  country?: string;
  bet_source: "bets" | "groove" | "sport_bets" | "plinko";
}

export interface BigWinnersSummary {
  total_wins: number;
  total_net_wins: number;
  total_stakes: number;
  count: number;
}

export interface BigWinnersReportRequest {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  brand_id?: string;
  game_provider?: string;
  game_id?: string;
  player_search?: string;
  min_win_threshold?: number;
  bet_type?: "cash" | "bonus" | "both";
  sort_by?: "win_amount" | "net_win" | "multiplier" | "date";
  sort_order?: "asc" | "desc";
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface BigWinnersReportResponse {
  message: string;
  data: BigWinner[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  summary: BigWinnersSummary;
}

// Player Metrics Report Types
export interface PlayerMetric {
  player_id: string;
  username: string;
  email?: string;
  brand_id?: string;
  brand_name?: string;
  country?: string;
  registration_date: string;
  last_activity?: string;
  main_balance: number;
  currency: string;
  total_deposits: number;
  total_withdrawals: number;
  net_deposits: number;
  total_wagered: number;
  total_won: number;
  rakeback_earned: number;
  rakeback_claimed: number;
  net_gaming_result: number;
  number_of_sessions: number;
  number_of_bets: number;
  account_status: string;
  device_type?: string;
  kyc_status?: string;
  first_deposit_date?: string;
  last_deposit_date?: string;
}

export interface PlayerMetricsSummary {
  total_deposits: number;
  total_ngr: number;
  total_wagers: number;
  total_withdrawals: number;
  player_count: number;
}

export interface PlayerMetricsReportRequest {
  page?: number;
  per_page?: number;
  player_search?: string;
  brand_id?: string;
  currency?: string;
  country?: string;
  registration_from?: string;
  registration_to?: string;
  last_active_from?: string;
  last_active_to?: string;
  has_deposited?: boolean;
  has_withdrawn?: boolean;
  min_total_deposits?: number;
  max_total_deposits?: number;
  min_total_wagers?: number;
  max_total_wagers?: number;
  min_net_result?: number;
  max_net_result?: number;
  sort_by?: "deposits" | "wagering" | "net_loss" | "activity" | "registration";
  sort_order?: "asc" | "desc";
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface PlayerMetricsReportResponse {
  message: string;
  data: PlayerMetric[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  summary: PlayerMetricsSummary;
}

export interface PlayerTransactionDetail {
  id: string;
  transaction_id: string;
  type: "deposit" | "withdrawal" | "bet" | "win" | "bonus" | "adjustment";
  date_time: string;
  amount: number;
  currency: string;
  status: string;
  game_provider?: string;
  game_id?: string;
  game_name?: string;
  bet_id?: string;
  round_id?: string;
  bet_amount?: number;
  win_amount?: number;
  rakeback_earned?: number;
  rakeback_claimed?: number;
  rtp?: number;
  multiplier?: number;
  ggr?: number;
  net?: number;
  bet_type?: "cash" | "bonus";
  payment_method?: string;
  tx_hash?: string;
  network?: string;
  chain_id?: string;
  fees?: number;
  device?: string;
  ip_address?: string;
  session_id?: string;
}

export interface PlayerTransactionsRequest {
  player_id: string;
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  transaction_type?:
    | "deposit"
    | "withdrawal"
    | "bet"
    | "win"
    | "bonus"
    | "adjustment";
  game_provider?: string;
  game_id?: string;
  min_amount?: number;
  max_amount?: number;
  sort_by?: "date" | "amount" | "net" | "game";
  sort_order?: "asc" | "desc";
}

export interface PlayerTransactionsResponse {
  message: string;
  data: PlayerTransactionDetail[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
}

// Country Report Types
export interface CountryMetric {
  country: string;
  total_registrations: number;
  active_players: number;
  first_time_depositors: number;
  total_depositors: number;
  total_deposits: number;
  total_withdrawals: number;
  net_position: number;
  total_wagered: number;
  total_won: number;
  ggr: number;
  ngr: number;
  average_deposit_per_player: number;
  average_wager_per_player: number;
  rakeback_earned: number;
  rakeback_converted: number;
  self_exclusions: number;
}

export interface CountryReportSummary {
  total_deposits: number;
  total_ngr: number;
  total_active_users: number;
  total_depositors: number;
  total_registrations: number;
}

export interface CountryReportRequest {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  brand_id?: string;
  currency?: string;
  countries?: string[];
  acquisition_channel?: string;
  user_type?: "depositors" | "all" | "active";
  sort_by?: "deposits" | "ngr" | "active_users" | "alphabetical";
  sort_order?: "asc" | "desc";
  convert_to_base_currency?: boolean;
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface CountryReportResponse {
  message: string;
  data: CountryMetric[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  summary: CountryReportSummary;
}

export interface CountryPlayer {
  player_id: string;
  username: string;
  email?: string;
  country: string;
  total_deposits: number;
  total_withdrawals: number;
  total_wagered: number;
  ngr: number;
  last_activity?: string;
  registration_date: string;
  balance: number;
  currency: string;
}

export interface CountryPlayersRequest {
  country: string;
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  min_deposits?: number;
  max_deposits?: number;
  activity_from?: string;
  activity_to?: string;
  kyc_status?: string;
  min_balance?: number;
  max_balance?: number;
  sort_by?: "deposits" | "ngr" | "activity" | "registration";
  sort_order?: "asc" | "desc";
}

export interface CountryPlayersResponse {
  message: string;
  data: CountryPlayer[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
}

// Game Performance Report Types
export interface GamePerformanceMetric {
  game_id: string;
  game_name: string;
  provider: string;
  category?: string;
  total_bets: number;
  total_rounds: number;
  unique_players: number;
  total_stake: number;
  total_win: number;
  ggr: number;
  ngr: number;
  effective_rtp: number;
  avg_bet_amount: number;
  rakeback_earned: number;
  big_wins_count: number;
  highest_win: number;
  highest_multiplier: number;
}

export interface GamePerformanceSummary {
  total_bets: number;
  total_unique_players: number;
  total_wagered: number;
  total_ggr: number;
  total_rakeback: number;
  average_rtp: number;
}

export interface GamePerformanceReportRequest {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  brand_id?: string;
  currency?: string;
  game_provider?: string;
  game_id?: string;
  category?: string;
  sort_by?: "ggr" | "ngr" | "most_played" | "rtp" | "bet_volume";
  sort_order?: "asc" | "desc";
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface GamePerformanceReportResponse {
  message: string;
  data: GamePerformanceMetric[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  summary: GamePerformanceSummary;
}

export interface GamePlayer {
  player_id: string;
  username: string;
  email?: string;
  total_stake: number;
  total_win: number;
  ngr: number;
  rakeback: number;
  number_of_rounds: number;
  last_played?: string;
  currency: string;
}

export interface GamePlayersRequest {
  game_id: string;
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  currency?: string;
  bet_type?: string;
  min_stake?: number;
  max_stake?: number;
  min_net_result?: number;
  max_net_result?: number;
  sort_by?: "total_stake" | "total_win" | "ngr" | "rounds" | "last_played";
  sort_order?: "asc" | "desc";
}

export interface GamePlayersResponse {
  message: string;
  data: GamePlayer[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
}

// Provider Performance Report Types
export interface ProviderPerformanceMetric {
  provider: string;
  total_games: number;
  total_bets: number;
  total_rounds: number;
  unique_players: number;
  total_stake: number;
  total_win: number;
  ggr: number;
  ngr: number;
  effective_rtp: number;
  avg_bet_amount: number;
  rakeback_earned: number;
  big_wins_count: number;
  highest_win: number;
  highest_multiplier: number;
}

export interface ProviderPerformanceReportRequest {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  brand_id?: string;
  currency?: string;
  provider?: string;
  category?: string;
  sort_by?: "ggr" | "ngr" | "most_played" | "rtp" | "bet_volume";
  sort_order?: "asc" | "desc";
  is_test_account?: boolean; // Toggle: false for Real Accounts, true for Test Accounts
}

export interface ProviderPerformanceReportResponse {
  message: string;
  data: ProviderPerformanceMetric[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  summary: GamePerformanceSummary;
}
