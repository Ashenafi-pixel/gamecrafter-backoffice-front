import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import toast from "react-hot-toast";
import { DailyReportData } from "../../types/analytics";

export const DailyReport: React.FC = () => {
  const { analyticsSvc } = useServices();
  const [selectedDate, setSelectedDate] = useState("2024-01-07");
  const [dailyData, setDailyData] = useState<DailyReportData["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // Set the token for analytics API
  useEffect(() => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTVlMTY4ZmItMTY4ZS00MTgzLTg0YzUtZDQ5MDM4Y2UwMGI1IiwiaXNfdmVyaWZpZWQiOmZhbHNlLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwiZXhwIjoxNzU5MjExNTAyLCJpYXQiOjE3NTkxMjUxMDIsImlzcyI6InR1Y2FuYml0Iiwic3ViIjoiYTVlMTY4ZmItMTY4ZS00MTgzLTg0YzUtZDQ5MDM4Y2UwMGI1In0.gzyyL55i2OFVEtnaRBJ9632vomVt-iSh3Lel2ZsF3Lg";
    localStorage.setItem("access_token", token);
  }, []);

  // Fetch daily report
  const fetchDailyReport = async (date: string) => {
    setLoading(true);
    try {
      const response = await analyticsSvc.get<DailyReportData["data"]>(
        `/admin/analytics/reports/daily?date=${date}`,
      );
      if (response.success && response.data) {
        setDailyData(response.data);
        toast.success(`Daily report loaded for ${date}`);
      }
    } catch (error: any) {
      toast.error("Failed to fetch daily report: " + error.message);
      console.error("Daily report error:", error);
      setDailyData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReport(selectedDate);
  }, [selectedDate]);

  // Refresh data
  const handleRefresh = () => {
    fetchDailyReport(selectedDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Report</h1>
          <p className="text-gray-400 mt-1">
            Comprehensive daily performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2"
          />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Daily Metrics Overview */}
      {dailyData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400">
              {dailyData.total_transactions}
            </div>
            <div className="text-sm text-gray-400 mt-2">Total Transactions</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400">
              {dailyData.active_users}
            </div>
            <div className="text-sm text-gray-400 mt-2">Active Users</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400">
              {dailyData.active_games}
            </div>
            <div className="text-sm text-gray-400 mt-2">Active Games</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {dailyData.new_users}
            </div>
            <div className="text-sm text-gray-400 mt-2">New Users</div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
          <div className="text-gray-400 text-lg mb-4">
            {loading ? "Loading daily report..." : "No data available"}
          </div>
          {!loading && (
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Load Daily Report
            </button>
          )}
        </div>
      )}

      {/* Financial Summary */}
      {dailyData && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Financial Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Total Deposits</span>
                <span className="text-green-400 font-bold">
                  ${parseFloat(dailyData.total_deposits).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Total Withdrawals</span>
                <span className="text-red-400 font-bold">
                  ${parseFloat(dailyData.total_withdrawals).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Total Bets</span>
                <span className="text-blue-400 font-bold">
                  ${parseFloat(dailyData.total_bets).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Total Wins</span>
                <span className="text-yellow-400 font-bold">
                  ${parseFloat(dailyData.total_wins).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Net Revenue</span>
                <span className="text-purple-400 font-bold text-xl">
                  ${parseFloat(dailyData.net_revenue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300">Date</span>
                <span className="text-gray-300">
                  {new Date(dailyData.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Games Section */}
      {dailyData && dailyData.top_games && dailyData.top_games.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">
            Top Performing Games
          </h3>
          <div className="space-y-4">
            {dailyData.top_games.slice(0, 3).map((game, index) => (
              <div
                key={game.game_id}
                className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">
                      {game.game_name || `Game ${game.game_id}`}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {game.provider || "Unknown Provider"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">
                      ${parseFloat(game.net_revenue).toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-xs">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">
                      {game.player_count}
                    </div>
                    <div className="text-gray-400 text-xs">Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-400 font-bold">{game.rtp}%</div>
                    <div className="text-gray-400 text-xs">Actual RTP</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Players Section */}
      {dailyData &&
        dailyData.top_players &&
        dailyData.top_players.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Top Active Players
            </h3>
            <div className="space-y-3">
              {dailyData.top_players.slice(0, 5).map((player, index) => (
                <div
                  key={player.user_id}
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        {player.username}
                      </h4>
                      <div className="text-gray-400 text-sm flex items-center space-x-2">
                        <span>ID:</span>
                        <span
                          className="font-mono text-gray-300"
                          title={player.user_id}
                        >
                          {player.user_id ? player.user_id.slice(-8) : ""}
                        </span>
                        <button
                          onClick={() =>
                            player.user_id &&
                            navigator.clipboard.writeText(player.user_id)
                          }
                          className="text-gray-400 hover:text-white text-xs underline"
                          title="Copy full ID"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-blue-400 font-bold">
                        ${parseFloat(player.total_bets).toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-xs">Total Bets</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`font-bold ${parseFloat(player.net_loss) > 0 ? "text-red-400" : "text-green-400"}`}
                      >
                        ${parseFloat(player.net_loss).toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-xs">Net Loss</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400 font-bold">
                        {player.transaction_count}
                      </div>
                      <div className="text-gray-400 text-xs">Transactions</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};
