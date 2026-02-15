// Professional Casino Analytics API types based on actual API responses

export interface RealtimeStats {
  success: boolean;
  data: {
    timestamp: string;
    total_transactions: number;
    deposits_count: number;
    withdrawals_count: number;
    bets_count: number;
    wins_count: number;
    total_deposits: string;
    total_withdrawals: string;
    total_bets: string;
    total_wins: string;
    net_revenue: string;
    active_users: number;
    active_games: number;
  };
}

export interface UserAnalytics {
  success: boolean;
  data: {
    user_id: string;
    total_deposits: string;
    total_withdrawals: string;
    total_bets: string;
    total_wins: string;
    total_bonuses: string;
    total_cashback: string;
    net_loss: string;
    transaction_count: number;
    unique_games_played: number;
    session_count: number;
    avg_bet_amount: string;
    max_bet_amount: string;
    min_bet_amount: string;
    last_activity: string;
  };
}

export interface DailyReportData {
  success: boolean;
  data: {
    date: string;
    total_transactions: number;
    total_deposits: string;
    total_withdrawals: string;
    total_bets: string;
    total_wins: string;
    net_revenue: string;
    active_users: number;
    active_games: number;
    new_users: number;
    top_games: TopGame[];
    top_players: TopPlayer[];
  };
}

export interface TopGame {
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
}

export interface TopPlayer {
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
}

export interface UserTransaction {
  success: boolean;
  data: Array<{
    id: string;
    user_id: string;
    transaction_type: string;
    amount: string;
    currency: string;
    status: string;
    game_id?: string;
    session_id?: string;
    round_id?: string;
    bet_amount?: string;
    win_amount?: string;
    net_result?: string;
    balance_before?: string;
    balance_after?: string;
    external_transaction_id?: string;
    metadata?: string;
    created_at: string;
    updated_at: string;
  }>;
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

export interface BalanceHistory {
  success: boolean;
  data: null | Array<{
    timestamp: string;
    balance: string;
    currency: string;
    transaction_type: string;
    amount: string;
    tx_hash?: string;
    block_number?: number;
  }>;
}

// Enhanced Daily Report with comparison metrics
export interface EnhancedDailyReportData {
  success: boolean;
  data: {
    date: string;
    total_transactions: number;
    total_deposits: string;
    total_withdrawals: string;
    total_bets: string;
    total_wins: string;
    net_revenue: string;
    active_users: number;
    active_games: number;
    new_users: number;
    unique_depositors: number;
    unique_withdrawers: number;
    deposit_count: number;
    withdrawal_count: number;
    bet_count: number;
    win_count: number;
    cashback_earned: string;
    cashback_claimed: string;
    admin_corrections: string;

    // Comparison metrics
    previous_day_change: DailyReportComparison;
    mtd: DailyReportMetrics;
    splm: DailyReportMetrics;
    mtd_vs_splm_change: DailyReportComparison;

    top_games: TopGame[];
    top_players: TopPlayer[];
  };
}

export interface DailyReportComparison {
  total_transactions_change: string;
  new_users_change: string;
  unique_depositors_change: string;
  unique_withdrawers_change: string;
  active_users_change: string;
  bet_count_change: string;
  total_bets_change: string;
  total_wins_change: string;
  net_revenue_change: string;
  cashback_earned_change: string;
  cashback_claimed_change: string;
  admin_corrections_change: string;
  deposit_count_change: string;
  total_deposits_change: string;
  withdrawal_count_change: string;
  total_withdrawals_change: string;
  win_count_change: string;
  active_games_change: string;
}

export interface DailyReportMetrics {
  total_transactions: number;
  total_deposits: string;
  total_withdrawals: string;
  total_bets: string;
  total_wins: string;
  net_revenue: string;
  active_users: number;
  active_games: number;
  new_users: number;
  unique_depositors: number;
  unique_withdrawers: number;
  deposit_count: number;
  withdrawal_count: number;
  bet_count: number;
  win_count: number;
  cashback_earned: string;
  cashback_claimed: string;
  admin_corrections: string;
}

export interface DailyReportDataTableRow {
  date: string;
  new_users: number;
  unique_depositors: number;
  unique_withdrawers: number;
  active_users: number;
  bet_count: number;
  bet_amount: string;
  win_amount: string;
  ggr: string;
  cashback_earned: string;
  cashback_claimed: string;
  deposit_count: number;
  deposit_amount: string;
  withdrawal_count: number;
  withdrawal_amount: string;
  admin_corrections: string;
}

export type DailyReportMTD = DailyReportMetrics;
export type DailyReportSPLM = DailyReportMetrics;

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  new_users: number;
  unique_depositors: number;
  unique_withdrawers: number;
  active_users: number;
  bet_count: number;
  bet_amount: string;
  win_amount: string;
  ggr: string;
  cashback_earned: string;
  cashback_claimed: string;
  deposit_count: number;
  deposit_amount: string;
  withdrawal_count: number;
  withdrawal_amount: string;
  admin_corrections: string;
  daily_breakdown: DailyReportDataTableRow[];
  mtd: DailyReportMTD;
  splm: DailyReportSPLM;
  mtd_vs_splm_change: DailyReportComparison;
}

export interface DailyReportDataTableResponse {
  rows: DailyReportDataTableRow[];
  totals: DailyReportDataTableRow;
}

// Transaction Stats Chart API types
export interface TransactionStatsByInterval {
  date: string;
  total_deposits_usd_cents: number;
  total_withdrawals_usd_cents: number;
  count_deposits: number;
  count_withdrawals: number;
}

export interface TransactionStatsResponse {
  message: string;
  success: boolean;
  status: number;
  data: TransactionStatsByInterval[];
}

export type IntervalType = "daily" | "weekly" | "monthly";

export interface DashboardOverviewResponse {
  success: boolean;
  data: {
    date_range: {
      from: string;
      to: string;
    };
    summary: {
      total_deposits: string;
      total_withdrawals: string;
      total_bets: string;
      total_wins: string;
      ggr: string;
      cashback_claimed: string;
      ngr: string;
      active_users: number;
      active_games: number;
      total_transactions: number;
    };
    daily_breakdown?: Array<{
      date: string;
      deposits: string;
      withdrawals: string;
      bets: string;
      wins: string;
      ggr: string;
      cashback_claimed: string;
      ngr: string;
      active_users: number;
      active_games: number;
    }>;
  };
}

export interface PerformanceSummaryResponse {
  success: boolean;
  data: {
    range_type: string;
    date_range: {
      from: string;
      to: string;
    };
    financial_overview: {
      ggr: string;
      ngr: string;
      total_deposits: string;
      total_withdrawals: string;
      cashback_claimed: string;
      net_deposits: string;
    };
    betting_metrics: {
      total_bets: string;
      total_wins: string;
      bet_count: number;
      win_count: number;
      avg_bet_amount: string;
      rtp: string;
    };
    user_activity: {
      active_users: number;
      new_users: number;
      unique_depositors: number;
      unique_withdrawers: number;
      avg_deposit_per_user: string;
      avg_withdrawal_per_user: string;
    };
    transaction_volume: {
      total_transactions: number;
      deposit_count: number;
      withdrawal_count: number;
      bet_count: number;
      win_count: number;
      cashback_earned_count: number;
      cashback_claimed_count: number;
    };
    daily_trends: Array<{
      date: string;
      ggr: string;
      ngr: string;
      deposits: string;
      withdrawals: string;
      bets: string;
      wins: string;
      active_users: number;
    }> | null;
  };
}

export interface TimeSeriesResponse {
  success: boolean;
  data: {
    granularity: string;
    date_range: {
      from: string;
      to: string;
    };
    revenue_trend: Array<{
      timestamp: string;
      ggr: string;
      ngr: string;
    }> | null;
    user_activity: Array<{
      timestamp: string;
      active_users: number;
      new_users: number;
      unique_depositors: number;
      unique_withdrawers: number;
    }> | null;
    transaction_volume: Array<{
      timestamp: string;
      total_transactions: number;
      deposits: number;
      withdrawals: number;
      bets: number;
      wins: number;
    }> | null;
    deposits_vs_withdrawals: Array<{
      timestamp: string;
      deposits: string;
      withdrawals: string;
    }> | null;
  };
}
