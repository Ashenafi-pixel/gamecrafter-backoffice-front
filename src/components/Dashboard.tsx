import React, { useState, useEffect } from "react";
import {
  MOCK_DASHBOARD_KPIS,
  MOCK_RECENT_TRANSACTIONS,
  MOCK_TOP_GAMES,
  MOCK_BRAND_PERFORMANCE,
  getMockDashboardData,
} from "../mocks/dashboard";
import { Badge } from "./ui/Badge";
import { SkeletonKPI } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";
import { DashboardCharts } from "./dashboard/DashboardCharts";
import type { TimeSeriesResponse } from "../types/analytics";
import type { DailyReportDataTableRow } from "../types/analytics";
import { Download, LayoutDashboard, TrendingUp, Users, Gamepad2 } from "lucide-react";

const formatTooltipDate = (value: string | number | Date): string => {
  if (!value) return "";
  try {
    const d = typeof value === "string" && value.includes("T") ? new Date(value) : new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(value);
  }
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
const formatPercent = (n: number) => `${n.toFixed(1)}%`;

export function Dashboard() {
  const [kpis] = useState(MOCK_DASHBOARD_KPIS);
  const [loading, setLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesResponse["data"] | null>(null);
  const [tableRows, setTableRows] = useState<DailyReportDataTableRow[]>([]);
  const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setLoading(true);
    try {
      const { rows, timeSeries } = getMockDashboardData(start, today, false);
      setTableRows(rows);
      setTimeSeriesData(timeSeries);
      setTimeSeriesError(null);
    } catch (e) {
      setTimeSeriesError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const kpiItems = [
    { label: "Total Bet", value: formatCurrency(kpis.totalBet) },
    { label: "Total Win", value: formatCurrency(kpis.totalWin) },
    { label: "GGR", value: formatCurrency(kpis.ggr) },
    { label: "NGR", value: formatCurrency(kpis.ngr) },
    { label: "Active Players", value: formatNumber(kpis.activePlayers) },
    { label: "Open Sessions", value: formatNumber(kpis.openSessions) },
    { label: "Avg RTP", value: formatPercent(kpis.avgRtp) },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header - match game-management */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <LayoutDashboard className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Platform overview and key metrics
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards - match game-management */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <SkeletonKPI key={i} />)
          : kpiItems.map((item, i) => (
              <div
                key={item.label}
                className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">{item.label}</p>
                    <p className="text-xl font-bold text-white mt-1 tabular-nums">{item.value}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    {i < 4 ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : i < 6 ? (
                      <Users className="h-5 w-5 text-red-500" />
                    ) : (
                      <Gamepad2 className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Analytics - match game-management card */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Analytics
          </h3>
          <button
            title="Export"
            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex h-[320px] items-center justify-center text-slate-400 text-sm">
              Loading…
            </div>
          ) : timeSeriesError ? (
            <EmptyState
              title="Failed to load analytics"
              description={timeSeriesError}
              actionLabel="Retry"
              onAction={() => window.location.reload()}
            />
          ) : (
            <DashboardCharts
              timeSeriesData={timeSeriesData}
              tableRows={tableRows}
              loading={false}
              error={timeSeriesError}
              onRetry={() => window.location.reload()}
              formatTooltipDate={formatTooltipDate}
            />
          )}
        </div>
      </div>

      {/* Tables row - match game-management cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Recent transactions
            </h3>
            <div className="flex items-center gap-2">
              <button
                title="Export"
                className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Brand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {MOCK_RECENT_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-white">{tx.type}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={tx.status === "Completed" ? "success" : "warning"}>{tx.status}</Badge>
                    </td>
                    <td className="px-4 py-3 truncate max-w-[100px]">{tx.brand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top games */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Top games
            </h3>
            <button
              title="Export"
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Game</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Provider</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Bets</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">RTP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {MOCK_TOP_GAMES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-white truncate max-w-[120px]">{row.name}</td>
                    <td className="px-4 py-3">{row.provider}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white">{formatCurrency(row.bets)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPercent(row.rtp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brand performance */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Brand performance
            </h3>
            <button
              title="Export"
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Bet</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">GGR</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Players</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {MOCK_BRAND_PERFORMANCE.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-white truncate max-w-[100px]">{row.brand}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white">{formatCurrency(row.bet)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white">{formatCurrency(row.ggr)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.players)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
