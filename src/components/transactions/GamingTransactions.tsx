import React, { useState, useMemo } from "react";
import { Search, CreditCard, CheckCircle2, XCircle } from "lucide-react";
import {
  GamingActivityTableView,
  type GamingActivityTransaction,
} from "../players/GamingActivityTableView";

// Sample dummy data – same structure as Player Details → Game Activity tab
const MOCK_GAMING_TRANSACTIONS: GamingActivityTransaction[] = [
  {
    id: "tx-g-001",
    user_id: "usr-101",
    username: "player_alpha",
    transaction_type: "bet",
    amount: "5.00",
    game_id: "game-slot-1",
    game_name: "Starburst",
    provider: "NetEnt",
    session_id: "sess-a1b2c3",
    round_id: "rnd-1001",
    bet_amount: "5.00",
    win_amount: "0.00",
    net_result: "-5.00",
    balance_before: "250.00",
    balance_after: "245.00",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T14:32:00Z",
  },
  {
    id: "tx-g-002",
    user_id: "usr-101",
    username: "player_alpha",
    transaction_type: "win",
    amount: "42.50",
    game_id: "game-slot-1",
    game_name: "Starburst",
    provider: "NetEnt",
    session_id: "sess-a1b2c3",
    round_id: "rnd-1001",
    bet_amount: "5.00",
    win_amount: "42.50",
    net_result: "37.50",
    balance_before: "245.00",
    balance_after: "287.50",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T14:32:05Z",
  },
  {
    id: "tx-g-003",
    user_id: "usr-102",
    username: "player_beta",
    transaction_type: "bet",
    amount: "25.00",
    game_id: "game-live-2",
    game_name: "Blackjack Live",
    provider: "Evolution",
    session_id: "sess-d4e5f6",
    round_id: "rnd-2002",
    bet_amount: "25.00",
    win_amount: "0.00",
    net_result: "-25.00",
    balance_before: "500.00",
    balance_after: "475.00",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T13:18:22Z",
  },
  {
    id: "tx-g-004",
    user_id: "usr-103",
    username: "player_gamma",
    transaction_type: "bet",
    amount: "2.50",
    game_id: "game-slot-3",
    game_name: "Gonzo's Quest",
    provider: "NetEnt",
    session_id: "sess-g7h8i9",
    round_id: "rnd-3003",
    bet_amount: "2.50",
    win_amount: "0.00",
    net_result: "-2.50",
    balance_before: "88.20",
    balance_after: "85.70",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T12:05:41Z",
  },
  {
    id: "tx-g-005",
    user_id: "usr-103",
    username: "player_gamma",
    transaction_type: "win",
    amount: "15.00",
    game_id: "game-slot-3",
    game_name: "Gonzo's Quest",
    provider: "NetEnt",
    session_id: "sess-g7h8i9",
    round_id: "rnd-3004",
    bet_amount: "2.50",
    win_amount: "15.00",
    net_result: "12.50",
    balance_before: "85.70",
    balance_after: "100.20",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T12:06:18Z",
  },
  {
    id: "tx-g-006",
    user_id: "usr-104",
    username: "player_delta",
    transaction_type: "bet",
    amount: "10.00",
    game_id: "game-slot-4",
    game_name: "Book of Dead",
    provider: "Play'n GO",
    session_id: "sess-j0k1l2",
    round_id: "rnd-4005",
    bet_amount: "10.00",
    win_amount: "0.00",
    net_result: "-10.00",
    balance_before: "320.00",
    balance_after: "310.00",
    currency: "USD",
    status: "pending",
    created_at: "2025-02-12T15:01:00Z",
    external_transaction_id: "ext-abc-123",
  },
  {
    id: "tx-g-007",
    user_id: "usr-105",
    username: "player_epsilon",
    transaction_type: "bet",
    amount: "1.00",
    game_id: "game-slot-5",
    game_name: "Dead or Alive 2",
    provider: "NetEnt",
    session_id: "sess-m3n4o5",
    round_id: "rnd-5006",
    bet_amount: "1.00",
    win_amount: "0.00",
    net_result: "-1.00",
    balance_before: "45.00",
    balance_after: "44.00",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T11:22:33Z",
  },
  {
    id: "tx-g-008",
    user_id: "usr-105",
    username: "player_epsilon",
    transaction_type: "win",
    amount: "125.00",
    game_id: "game-slot-5",
    game_name: "Dead or Alive 2",
    provider: "NetEnt",
    session_id: "sess-m3n4o5",
    round_id: "rnd-5006",
    bet_amount: "1.00",
    win_amount: "125.00",
    net_result: "124.00",
    balance_before: "44.00",
    balance_after: "169.00",
    currency: "USD",
    status: "completed",
    created_at: "2025-02-12T11:22:38Z",
  },
];

const PAGE_SIZE = 5;

export const GamingTransactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return MOCK_GAMING_TRANSACTIONS;
    return MOCK_GAMING_TRANSACTIONS.filter(
      (row) =>
        row.game_name?.toLowerCase().includes(term) ||
        row.provider?.toLowerCase().includes(term) ||
        row.username?.toLowerCase().includes(term) ||
        row.user_id?.toLowerCase().includes(term) ||
        row.id?.toLowerCase().includes(term) ||
        row.round_id?.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const page = Math.min(currentPage, totalPages) || 1;
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => filtered.slice(start, start + PAGE_SIZE),
    [filtered, start]
  );

  const meta = useMemo(
    () => ({
      total: filtered.length,
      page,
      page_size: PAGE_SIZE,
      pages: totalPages,
    }),
    [filtered.length, page, totalPages]
  );

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
  };

  const completedCount = useMemo(
    () => filtered.filter((r) => r.status === "completed").length,
    [filtered]
  );
  const pendingCount = useMemo(
    () => filtered.filter((r) => r.status === "pending").length,
    [filtered]
  );

  return (
    <div className="space-y-6">
      {/* Page Header - match game-management */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <CreditCard className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Gaming transactions
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              View and search gaming activity
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards - match game-management */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">
                Total transactions
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {filtered.length}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
              <CreditCard className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {completedCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-900/30 border border-green-700/30">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-slate-400 mt-1">
                {pendingCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
              <XCircle className="h-6 w-6 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters - match game-management */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by game, provider, player, transaction or round ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table - match game-management card */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 md:p-6">
          <GamingActivityTableView
            transactions={pageRows}
            meta={meta}
            loading={false}
            showPlayerColumn={true}
            onPageChange={handlePageChange}
            emptyMessage="No gaming transactions found"
          />
        </div>
      </div>
    </div>
  );
};
