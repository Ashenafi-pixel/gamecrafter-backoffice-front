import {
  DailyReportDataTableRow,
  TimeSeriesResponse,
} from "../types/analytics";

type TimeSeriesData = TimeSeriesResponse["data"];

export interface PlatformOverviewMock {
  totalBrands: number;
  totalGames: number;
  activePlayers24h: number;
  platformGgr24h: number;
  totalTransactions24h: number;
}

export const MOCK_PLATFORM_OVERVIEW: PlatformOverviewMock = {
  totalBrands: 18,
  totalGames: 2450,
  activePlayers24h: 48210,
  platformGgr24h: 128_4300, // in minor units, formatted later
  totalTransactions24h: 972_341,
};

const DAYS_OF_HISTORY = 90;

const toIsoDate = (date: Date): string =>
  date.toISOString().split("T")[0] ?? "";

const formatAmount = (value: number): string =>
  value.toFixed(2); // keep simple two‑decimals strings

const createBaseRows = (): DailyReportDataTableRow[] => {
  const today = new Date();

  const rows: DailyReportDataTableRow[] = [];

  for (let i = DAYS_OF_HISTORY - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const iso = toIsoDate(date);

    // Simple deterministic trend using sin wave + index
    const seasonFactor = 1 + 0.2 * Math.sin(i / 6);
    const growthFactor = 1 + (DAYS_OF_HISTORY - i) * 0.002;

    const baseActiveUsers = 1200 * seasonFactor * growthFactor;
    const newUsers = 120 * seasonFactor;
    const uniqueDepositors = baseActiveUsers * 0.35;
    const uniqueWithdrawers = baseActiveUsers * 0.18;

    const betCount = Math.round(baseActiveUsers * 12 * seasonFactor);
    const depositCount = Math.round(uniqueDepositors * 1.4);
    const withdrawalCount = Math.round(uniqueWithdrawers * 1.15);

    const avgBet = 3.4 * seasonFactor;
    const betAmount = betCount * avgBet;
    const winAmount = betAmount * 0.94;
    const ggr = betAmount - winAmount;

    const avgDeposit = 65 * seasonFactor;
    const avgWithdrawal = 58 * seasonFactor;
    const depositAmount = depositCount * avgDeposit;
    const withdrawalAmount = withdrawalCount * avgWithdrawal;

    const cashbackEarned = ggr * 0.04;
    const cashbackClaimed = cashbackEarned * 0.7;

    const adminCorrections = ggr * 0.01;

    rows.push({
      date: iso,
      new_users: Math.round(newUsers),
      unique_depositors: Math.round(uniqueDepositors),
      unique_withdrawers: Math.round(uniqueWithdrawers),
      active_users: Math.round(baseActiveUsers),
      bet_count: betCount,
      bet_amount: formatAmount(betAmount),
      win_amount: formatAmount(winAmount),
      ggr: formatAmount(ggr),
      cashback_earned: formatAmount(cashbackEarned),
      cashback_claimed: formatAmount(cashbackClaimed),
      deposit_count: depositCount,
      deposit_amount: formatAmount(depositAmount),
      withdrawal_count: withdrawalCount,
      withdrawal_amount: formatAmount(withdrawalAmount),
      admin_corrections: formatAmount(adminCorrections),
    });
  }

  return rows;
};

const REAL_ROWS: DailyReportDataTableRow[] = createBaseRows();

const scaleRow = (
  row: DailyReportDataTableRow,
  factor: number,
): DailyReportDataTableRow => ({
  ...row,
  new_users: Math.round(row.new_users * factor),
  unique_depositors: Math.round(row.unique_depositors * factor),
  unique_withdrawers: Math.round(row.unique_withdrawers * factor),
  active_users: Math.round(row.active_users * factor),
  bet_count: Math.round(row.bet_count * factor),
  bet_amount: formatAmount(parseFloat(row.bet_amount || "0") * factor),
  win_amount: formatAmount(parseFloat(row.win_amount || "0") * factor),
  ggr: formatAmount(parseFloat(row.ggr || "0") * factor),
  cashback_earned: formatAmount(
    parseFloat(row.cashback_earned || "0") * factor,
  ),
  cashback_claimed: formatAmount(
    parseFloat(row.cashback_claimed || "0") * factor,
  ),
  deposit_count: Math.round(row.deposit_count * factor),
  deposit_amount: formatAmount(
    parseFloat(row.deposit_amount || "0") * factor,
  ),
  withdrawal_count: Math.round(row.withdrawal_count * factor),
  withdrawal_amount: formatAmount(
    parseFloat(row.withdrawal_amount || "0") * factor,
  ),
  admin_corrections: formatAmount(
    parseFloat(row.admin_corrections || "0") * factor,
  ),
});

const TEST_ROWS: DailyReportDataTableRow[] = REAL_ROWS.map((row) =>
  scaleRow(row, 0.35),
);

const sumAmounts = (rows: DailyReportDataTableRow[], key: keyof DailyReportDataTableRow): string => {
  const total = rows.reduce((acc, row) => {
    const raw = row[key];
    const num =
      typeof raw === "number"
        ? raw
        : parseFloat((raw as string) || "0");
    return acc + (Number.isFinite(num) ? num : 0);
  }, 0);

  return formatAmount(total);
};

const sumNumbers = (
  rows: DailyReportDataTableRow[],
  key: keyof DailyReportDataTableRow,
): number =>
  rows.reduce((acc, row) => {
    const raw = row[key];
    const num = typeof raw === "number" ? raw : parseFloat((raw as string) || "0");
    return acc + (Number.isFinite(num) ? num : 0);
  }, 0);

const createTotals = (
  rows: DailyReportDataTableRow[],
  fallbackDate: string,
): DailyReportDataTableRow => {
  if (!rows.length) {
    return {
      date: fallbackDate,
      new_users: 0,
      unique_depositors: 0,
      unique_withdrawers: 0,
      active_users: 0,
      bet_count: 0,
      bet_amount: "0.00",
      win_amount: "0.00",
      ggr: "0.00",
      cashback_earned: "0.00",
      cashback_claimed: "0.00",
      deposit_count: 0,
      deposit_amount: "0.00",
      withdrawal_count: 0,
      withdrawal_amount: "0.00",
      admin_corrections: "0.00",
    };
  }

  return {
    date: rows[0].date,
    new_users: sumNumbers(rows, "new_users"),
    unique_depositors: sumNumbers(rows, "unique_depositors"),
    unique_withdrawers: sumNumbers(rows, "unique_withdrawers"),
    active_users: sumNumbers(rows, "active_users"),
    bet_count: sumNumbers(rows, "bet_count"),
    bet_amount: sumAmounts(rows, "bet_amount"),
    win_amount: sumAmounts(rows, "win_amount"),
    ggr: sumAmounts(rows, "ggr"),
    cashback_earned: sumAmounts(rows, "cashback_earned"),
    cashback_claimed: sumAmounts(rows, "cashback_claimed"),
    deposit_count: sumNumbers(rows, "deposit_count"),
    deposit_amount: sumAmounts(rows, "deposit_amount"),
    withdrawal_count: sumNumbers(rows, "withdrawal_count"),
    withdrawal_amount: sumAmounts(rows, "withdrawal_amount"),
    admin_corrections: sumAmounts(rows, "admin_corrections"),
  };
};

const buildTimeSeries = (
  rows: DailyReportDataTableRow[],
  start: string,
  end: string,
): TimeSeriesData => {
  const revenue_trend =
    rows.map((row) => ({
      timestamp: row.date,
      ggr: row.ggr || "0",
      ngr: row.ggr || "0",
    })) || null;

  const user_activity =
    rows.map((row) => ({
      timestamp: row.date,
      active_users: row.active_users || 0,
      new_users: row.new_users || 0,
      unique_depositors: row.unique_depositors || 0,
      unique_withdrawers: row.unique_withdrawers || 0,
    })) || null;

  const transaction_volume =
    rows.map((row) => ({
      timestamp: row.date,
      total_transactions:
        (row.deposit_count || 0) +
        (row.withdrawal_count || 0) +
        (row.bet_count || 0),
      deposits: parseFloat(row.deposit_amount || "0"),
      withdrawals: parseFloat(row.withdrawal_amount || "0"),
      bets: parseFloat(row.bet_amount || "0"),
      wins: parseFloat(row.win_amount || "0"),
    })) || null;

  const deposits_vs_withdrawals =
    rows.map((row) => ({
      timestamp: row.date,
      deposits: row.deposit_amount || "0",
      withdrawals: row.withdrawal_amount || "0",
    })) || null;

  return {
    granularity: "day",
    date_range: {
      from: start,
      to: end,
    },
    revenue_trend,
    user_activity,
    transaction_volume,
    deposits_vs_withdrawals,
  };
};

const filterByRange = (
  rows: DailyReportDataTableRow[],
  start: string,
  end: string,
): DailyReportDataTableRow[] =>
  rows.filter((row) => row.date >= start && row.date <= end);

export const getMockDashboardData = (
  start: string,
  end: string,
  isTestAccount: boolean,
): {
  rows: DailyReportDataTableRow[];
  totals: DailyReportDataTableRow;
  timeSeries: TimeSeriesData;
} => {
  const sourceRows = isTestAccount ? TEST_ROWS : REAL_ROWS;
  const rows = filterByRange(sourceRows, start, end);
  const totals = createTotals(rows, start || toIsoDate(new Date()));
  const timeSeries = buildTimeSeries(rows, start, end);

  return { rows, totals, timeSeries };
};

// Enterprise dashboard KPIs (for current period)
export interface DashboardKPIs {
  totalBet: number;
  totalWin: number;
  ggr: number;
  ngr: number;
  activePlayers: number;
  openSessions: number;
  avgRtp: number;
}

export const MOCK_DASHBOARD_KPIS: DashboardKPIs = {
  totalBet: 2_847_320,
  totalWin: 2_681_481,
  ggr: 165_839,
  ngr: 158_200,
  activePlayers: 48_210,
  openSessions: 12_444,
  avgRtp: 94.2,
};

export interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  brand: string;
  date: string;
}

export const MOCK_RECENT_TRANSACTIONS: RecentTransaction[] = [
  { id: "tx-001", type: "Bet", amount: 125.0, currency: "USD", status: "Completed", brand: "Brand Alpha", date: "2025-02-13T14:32:00Z" },
  { id: "tx-002", type: "Win", amount: 89.5, currency: "USD", status: "Completed", brand: "Brand Beta", date: "2025-02-13T14:28:00Z" },
  { id: "tx-003", type: "Deposit", amount: 500.0, currency: "USD", status: "Completed", brand: "Brand Alpha", date: "2025-02-13T14:15:00Z" },
  { id: "tx-004", type: "Withdrawal", amount: 200.0, currency: "USD", status: "Pending", brand: "Brand Beta", date: "2025-02-13T14:02:00Z" },
  { id: "tx-005", type: "Bet", amount: 50.0, currency: "USD", status: "Completed", brand: "Brand Alpha", date: "2025-02-13T13:58:00Z" },
];

export interface TopGameRow {
  name: string;
  provider: string;
  bets: number;
  rtp: number;
  players: number;
}

export const MOCK_TOP_GAMES: TopGameRow[] = [
  { name: "Starburst", provider: "NetEnt", bets: 425_000, rtp: 96.1, players: 8420 },
  { name: "Book of Dead", provider: "Play'n GO", bets: 398_200, rtp: 96.2, players: 7890 },
  { name: "Gonzo's Quest", provider: "NetEnt", bets: 312_100, rtp: 95.9, players: 6540 },
  { name: "Sweet Bonanza", provider: "Pragmatic", bets: 287_500, rtp: 96.5, players: 5210 },
  { name: "Big Bass Bonanza", provider: "Pragmatic", bets: 265_800, rtp: 96.7, players: 4890 },
];

export interface BrandPerformanceRow {
  brand: string;
  bet: number;
  win: number;
  ggr: number;
  players: number;
}

export const MOCK_BRAND_PERFORMANCE: BrandPerformanceRow[] = [
  { brand: "Brand Alpha", bet: 1_245_000, win: 1_172_100, ggr: 72_900, players: 18_200 },
  { brand: "Brand Beta", bet: 982_400, win: 924_100, ggr: 58_300, players: 14_500 },
  { brand: "Brand Gamma", bet: 620_920, win: 585_519, ggr: 35_401, players: 15_510 },
];

