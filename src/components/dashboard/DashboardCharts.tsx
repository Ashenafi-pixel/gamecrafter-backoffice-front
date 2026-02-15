import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { RefreshCw } from "lucide-react";
import type { TimeSeriesResponse } from "../../types/analytics";
import type { DailyReportDataTableRow } from "../../types/analytics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
);

const formatLabel = (value: string | number | Date): string => {
  if (!value) return "";
  const d = typeof value === "string" && value.includes("T") ? new Date(value) : new Date(String(value));
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const TEXT_PRIMARY = "#E6EDF3";
const TEXT_SECONDARY = "#9AA4B2";
const TEXT_MUTED = "#6E7681";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#0d9488";
const ACCENT_ALPHA = "rgba(13, 148, 136, 0.14)";
const SUCCESS = "#1FBF75";
const DANGER = "#E5484D";
const BG_TOOLTIP = "#1B222C";

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: BG_TOOLTIP,
      titleColor: TEXT_PRIMARY,
      bodyColor: TEXT_SECONDARY,
      borderColor: BORDER,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
      displayColors: true,
      callbacks: {} as Record<string, (v: unknown) => string>,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: TEXT_MUTED, maxTicksLimit: 8, font: { size: 11 } },
      border: { display: false },
    },
    y: {
      grid: { color: BORDER, drawTicks: false },
      ticks: { color: TEXT_MUTED, font: { size: 11 } },
      border: { display: false },
    },
  },
};

interface DashboardChartsProps {
  timeSeriesData: TimeSeriesResponse["data"] | null;
  tableRows: DailyReportDataTableRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  formatTooltipDate: (v: string | number | Date) => string;
}

export function DashboardCharts({
  timeSeriesData,
  tableRows,
  loading,
  error,
  onRetry,
  formatTooltipDate,
}: DashboardChartsProps) {
  const hasRevenue = timeSeriesData?.revenue_trend?.length;
  const hasUserActivity = timeSeriesData?.user_activity?.length;
  const hasTxVolume = timeSeriesData?.transaction_volume?.length;
  const hasDepVsWith = timeSeriesData?.deposits_vs_withdrawals?.length;
  const sortedRows = [...tableRows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
    empty?: boolean;
    emptyMessage?: string;
  }> = ({ title, children, empty, emptyMessage }) => (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--bg-raised)] p-4 relative min-h-[260px]">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{title}</h3>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-overlay)]/90 rounded-[6px] z-10">
          <RefreshCw className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[6px] z-10">
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-2">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-[var(--accent)] hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      ) : empty ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[6px]">
          <p className="text-[var(--text-muted)] text-sm">{emptyMessage ?? "No data for range"}</p>
        </div>
      ) : (
        <div className="h-[220px]">{children}</div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GGR trend – thin line, no fill */}
      <ChartCard
        title="GGR trend"
        empty={!hasRevenue}
        emptyMessage="Select a date range with data"
      >
        {hasRevenue && (
          <Line
            data={{
              labels: timeSeriesData!.revenue_trend!.map((i) => formatLabel(i.timestamp)),
              datasets: [
                {
                  label: "GGR",
                  data: timeSeriesData!.revenue_trend!.map((i) => parseFloat(i.ggr || "0") || 0),
                  borderColor: ACCENT,
                  backgroundColor: ACCENT_ALPHA,
                  borderWidth: 2,
                  borderDash: [],
                  fill: true,
                  tension: 0.35,
                  pointRadius: 0,
                  pointHoverRadius: 6,
                  pointHoverBackgroundColor: ACCENT,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                tooltip: {
                  ...commonOptions.plugins.tooltip,
                  callbacks: {
                    label: (ctx) =>
                      `GGR: $${Number(ctx.parsed.y).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    title: (items) => items.length && formatTooltipDate(timeSeriesData!.revenue_trend![items[0].dataIndex].timestamp),
                  },
                },
              },
              scales: {
                ...commonOptions.scales,
                y: {
                  ...commonOptions.scales.y,
                  ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: (v) => `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`,
                  },
                },
              },
            }}
          />
        )}
      </ChartCard>

      {/* Players – two thin lines */}
      <ChartCard
        title="Players"
        empty={!hasUserActivity}
        emptyMessage="Select a date range with data"
      >
        {hasUserActivity && (
          <Line
            data={{
              labels: timeSeriesData!.user_activity!.map((i) => formatLabel(i.timestamp)),
              datasets: [
                {
                  label: "Active",
                  data: timeSeriesData!.user_activity!.map((i) => i.active_users ?? 0),
                  borderColor: ACCENT,
                  borderWidth: 2,
                  borderDash: [],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 0,
                  pointHoverRadius: 5,
                },
                {
                  label: "New",
                  data: timeSeriesData!.user_activity!.map((i) => i.new_users ?? 0),
                  borderColor: TEXT_SECONDARY,
                  borderWidth: 2,
                  borderDash: [6, 4],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 0,
                  pointHoverRadius: 5,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                legend: { display: true, position: "top", align: "end", labels: { color: TEXT_SECONDARY, usePointStyle: true } },
                tooltip: {
                  ...commonOptions.plugins.tooltip,
                  callbacks: {
                    title: (items) =>
                      items.length && formatTooltipDate(timeSeriesData!.user_activity![items[0].dataIndex].timestamp),
                  },
                },
              },
            }}
          />
        )}
      </ChartCard>

      {/* Transaction volume – slim bars */}
      <ChartCard
        title="Transaction volume"
        empty={!hasTxVolume}
        emptyMessage="Select a date range with data"
      >
        {hasTxVolume && (
          <Bar
            data={{
              labels: timeSeriesData!.transaction_volume!.map((i) => formatLabel(i.timestamp)),
              datasets: [
                {
                  label: "Transactions",
                  data: timeSeriesData!.transaction_volume!.map((i) => i.total_transactions ?? 0),
                  backgroundColor: "rgba(13, 148, 136, 0.5)",
                  borderColor: ACCENT,
                  borderWidth: 1,
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                tooltip: {
                  ...commonOptions.plugins.tooltip,
                  callbacks: {
                    title: (items) =>
                      items.length && formatTooltipDate(timeSeriesData!.transaction_volume![items[0].dataIndex].timestamp),
                  },
                },
              },
            }}
          />
        )}
      </ChartCard>

      {/* Financial – single thin line (GGR again, different view) */}
      <ChartCard
        title="GGR over time"
        empty={!hasRevenue}
        emptyMessage="Select a date range with data"
      >
        {hasRevenue && (
          <Line
            data={{
              labels: timeSeriesData!.revenue_trend!.map((i) => formatLabel(i.timestamp)),
              datasets: [
                {
                  label: "GGR",
                  data: timeSeriesData!.revenue_trend!.map((i) => parseFloat(i.ggr || "0") || 0),
                  borderColor: "#f97316",
                  borderWidth: 2,
                  borderDash: [6, 4],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 0,
                  pointHoverRadius: 5,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                tooltip: {
                  ...commonOptions.plugins.tooltip,
                  callbacks: {
                    label: (ctx) =>
                      `$${Number(ctx.parsed.y).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    title: (items) =>
                      items.length && formatTooltipDate(timeSeriesData!.revenue_trend![items[0].dataIndex].timestamp),
                  },
                },
              },
              scales: {
                ...commonOptions.scales,
                y: {
                  ...commonOptions.scales.y,
                  ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: (v) =>
                      `$${Number(v) >= 1000000 ? `${(Number(v) / 1e6).toFixed(1)}M` : Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`,
                  },
                },
              },
            }}
          />
        )}
      </ChartCard>

      {/* Betting vs winnings – grouped bars */}
      <ChartCard
        title="Bets vs wins"
        empty={sortedRows.length === 0}
        emptyMessage="Select a date range with data"
      >
        {sortedRows.length > 0 && (
          <Bar
            data={{
              labels: sortedRows.map((r) => formatLabel(r.date)),
              datasets: [
                {
                  label: "Bets",
                  data: sortedRows.map((r) => parseFloat(r.bet_amount || "0")),
                  backgroundColor: "rgba(13, 148, 136, 0.5)",
                  borderColor: ACCENT,
                  borderWidth: 1,
                  borderRadius: 4,
                },
                {
                  label: "Wins",
                  data: sortedRows.map((r) => parseFloat(r.win_amount || "0")),
                  backgroundColor: "rgba(31, 191, 117, 0.35)",
                  borderColor: SUCCESS,
                  borderWidth: 1,
                  borderRadius: 4,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                legend: { display: true, position: "top", align: "end", labels: { color: TEXT_SECONDARY, usePointStyle: true } },
                tooltip: {
                  ...commonOptions.plugins.tooltip,
                  callbacks: {
                    label: (ctx) =>
                      `$${Number(ctx.parsed.y).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                    title: (items) => items.length && formatTooltipDate(sortedRows[items[0].dataIndex].date),
                  },
                },
              },
            }}
          />
        )}
      </ChartCard>

      {/* Deposits vs withdrawals – two lines */}
      <ChartCard
        title="Deposits vs withdrawals"
        empty={!hasDepVsWith}
        emptyMessage="Select a date range with data"
      >
        {hasDepVsWith && (
          <Line
            data={{
              labels: timeSeriesData!.deposits_vs_withdrawals!.map((i) => formatLabel(i.timestamp)),
              datasets: [
                {
                  label: "Deposits",
                  data: timeSeriesData!.deposits_vs_withdrawals!.map((i) => parseFloat(i.deposits || "0") || 0),
                  borderColor: SUCCESS,
                  borderWidth: 2,
                  borderDash: [],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 0,
                  pointHoverRadius: 5,
                },
                {
                  label: "Withdrawals",
                  data: timeSeriesData!.deposits_vs_withdrawals!.map((i) => parseFloat(i.withdrawals || "0") || 0),
                  borderColor: ACCENT,
                  borderWidth: 2,
                  borderDash: [6, 4],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 0,
                  pointHoverRadius: 5,
                },
              ],
            }}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                legend: { display: true, position: "top", align: "end", labels: { color: TEXT_SECONDARY, usePointStyle: true } },
                tooltip: {
                  ...commonOptions.plugins.tooltip,
                  callbacks: {
                    label: (ctx) =>
                      `$${Number(ctx.parsed.y).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    title: (items) =>
                      items.length &&
                      formatTooltipDate(timeSeriesData!.deposits_vs_withdrawals![items[0].dataIndex].timestamp),
                  },
                },
              },
              scales: {
                ...commonOptions.scales,
                y: {
                  ...commonOptions.scales.y,
                  ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: (v) =>
                      `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`,
                  },
                },
              },
            }}
          />
        )}
      </ChartCard>
    </div>
  );
}
