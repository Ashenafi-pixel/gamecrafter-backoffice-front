import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  Gamepad2,
  Activity,
  RefreshCw,
  Clock,
  Filter,
} from "lucide-react";
import { analyticsService } from "../../services/analyticsService";

interface RealtimeStats {
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
}

interface TopGame {
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

interface TopPlayer {
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

export const AnalyticsDashboard: React.FC = () => {
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(
    null,
  );
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"games" | "players">("games");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [gamesLimit, setGamesLimit] = useState(10);
  const [playersLimit, setPlayersLimit] = useState(10);
  const [isTestAccount, setIsTestAccount] = useState(false); // Default: Real Accounts (false)

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [realtimeResponse, topGamesResponse, topPlayersResponse] =
        await Promise.all([
          analyticsService.getRealtimeStats(),
          analyticsService.getTopGames({
            limit: gamesLimit,
            date_from: dateRange.from,
            date_to: dateRange.to,
            is_test_account: isTestAccount,
          }),
          analyticsService.getTopPlayers({
            limit: playersLimit,
            date_from: dateRange.from,
            date_to: dateRange.to,
            is_test_account: isTestAccount,
          }),
        ]);

      console.log("Realtime Response:", realtimeResponse);
      console.log("Top Games Response:", topGamesResponse);
      console.log("Top Players Response:", topPlayersResponse);

      if (realtimeResponse.success && realtimeResponse.data) {
        console.log("Setting realtime stats:", realtimeResponse.data);
        setRealtimeStats(realtimeResponse.data);
      }

      if (topGamesResponse.success && topGamesResponse.data) {
        console.log("Setting top games:", topGamesResponse.data);
        setTopGames(topGamesResponse.data);
      }

      if (topPlayersResponse.success && topPlayersResponse.data) {
        console.log("Setting top players:", topPlayersResponse.data);
        setTopPlayers(topPlayersResponse.data);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTopGames = async () => {
    try {
      setGamesLoading(true);
      const response = await analyticsService.getTopGames({
        limit: gamesLimit,
        date_from: dateRange.from,
        date_to: dateRange.to,
        is_test_account: isTestAccount,
      });

      if (response.success && response.data) {
        setTopGames(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching top games:", err);
    } finally {
      setGamesLoading(false);
    }
  };

  const fetchTopPlayers = async () => {
    try {
      setPlayersLoading(true);
      const response = await analyticsService.getTopPlayers({
        limit: playersLimit,
        date_from: dateRange.from,
        date_to: dateRange.to,
        is_test_account: isTestAccount,
      });

      if (response.success && response.data) {
        setTopPlayers(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching top players:", err);
    } finally {
      setPlayersLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, isTestAccount]);

  useEffect(() => {
    fetchTopGames();
  }, [gamesLimit, isTestAccount]);

  useEffect(() => {
    fetchTopPlayers();
  }, [playersLimit, isTestAccount]);

  const formatCurrency = (amount: string | number) => {
    console.log("Formatting currency:", amount, typeof amount);
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    console.log("Parsed amount:", numAmount);
    if (isNaN(numAmount)) {
      console.log("Amount is NaN, returning $0.00");
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numAmount);
  };

  const formatNumber = (num: number) => {
    console.log("Formatting number:", num, typeof num);
    if (isNaN(num)) {
      console.log("Number is NaN, returning 0");
      return "0";
    }
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  console.log("Component state:", {
    realtimeStats,
    topGames,
    topPlayers,
    loading,
    error,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Sub-header and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <BarChart3 className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Real-time metrics
            </h2>
            <p className="text-slate-400 text-sm">
              Real-time insights and performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2">
            <Clock className="h-4 w-4 text-red-500" />
            <span className="text-sm text-slate-400">
              {lastUpdated
                ? `Updated ${getTimeAgo(lastUpdated.toISOString())}`
                : "Never updated"}
            </span>
          </div>
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-700/80 hover:bg-slate-700 border border-slate-600/50 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-400" />
            <span className="text-red-200 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Date Range Filter - gradient card */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-slate-400" />
            <span className="text-slate-300 font-medium">Date range</span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
              className="bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className="bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-300 font-medium text-sm">
              Account type
            </span>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm ${isTestAccount === false ? "text-white" : "text-slate-400"}`}
              >
                Real
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsTestAccount(!isTestAccount);
                  fetchAnalyticsData();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                  isTestAccount === true ? "bg-red-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isTestAccount === true ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm ${isTestAccount === true ? "text-white" : "text-slate-400"}`}
              >
                Test
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Games and Top Players Tabs */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="border-b border-slate-700/80">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("games")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === "games"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Gamepad2 className="h-5 w-5" />
                <span>Top Games</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("players")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === "players"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Top Players</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Top Games Table */}
          {activeTab === "games" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Gamepad2 className="h-6 w-6 text-red-500" />
                  <h2 className="text-xl font-semibold text-white">
                    Top Games
                  </h2>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-400">By Revenue</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-400">Limit:</span>
                    <select
                      value={gamesLimit}
                      onChange={(e) => setGamesLimit(Number(e.target.value))}
                      className="bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              {gamesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : topGames.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Rank
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Game Name
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Provider
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Net Revenue
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Total Bets
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Total Wins
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Players
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Sessions
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Avg Bet
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Actual RTP
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {topGames.map((game, index) => (
                        <tr
                          key={game.game_id}
                          className="hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-red-500/20 border border-red-500/50 text-red-400 rounded-full text-sm font-bold">
                              {game.rank || index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {game.game_name}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {game.provider}
                          </td>
                          <td className="px-6 py-4 text-green-400 font-semibold">
                            {formatCurrency(game.net_revenue)}
                          </td>
                          <td className="px-6 py-4 text-white">
                            {formatCurrency(game.total_bets)}
                          </td>
                          <td className="px-6 py-4 text-white">
                            {formatCurrency(game.total_wins)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatNumber(game.player_count)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatNumber(game.session_count)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatCurrency(game.avg_bet_amount)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatNumber(parseFloat(game.rtp))}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gamepad2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No game data available</p>
                </div>
              )}
            </div>
          )}

          {/* Top Players Table */}
          {activeTab === "players" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6 text-green-500" />
                  <h2 className="text-xl font-semibold text-white">
                    Top Players
                  </h2>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400">By Activity</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Limit:</span>
                    <select
                      value={playersLimit}
                      onChange={(e) => setPlayersLimit(Number(e.target.value))}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              {playersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
                </div>
              ) : topPlayers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700 text-sm text-left">
                    <thead className="text-xs font-medium text-slate-300 uppercase tracking-wider bg-slate-700">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Rank
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Player ID
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Username
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Net P & L
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Total Bets
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Total Wins
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Games Played
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Sessions
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Transactions
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Avg Bet
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPlayers.map((player, index) => (
                        <tr
                          key={player.user_id}
                          className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                              {player.rank || index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {player.user_id ? player.user_id.slice(-8) : ""}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {player.username}
                          </td>

                          <td
                            className={`px-6 py-4 font-semibold ${parseFloat(player.net_loss) <= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {formatCurrency(player.net_loss)}
                          </td>
                          <td className="px-6 py-4 text-white">
                            {formatCurrency(player.total_bets)}
                          </td>
                          <td className="px-6 py-4 text-white">
                            {formatCurrency(player.total_wins)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatNumber(player.unique_games_played)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatNumber(player.session_count)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatNumber(player.transaction_count)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {formatCurrency(player.avg_bet_amount)}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {new Date(
                              player.last_activity,
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No player data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
