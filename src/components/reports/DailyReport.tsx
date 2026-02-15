import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  DailyReport as DailyReportType,
  DailyReportFilters,
  DailyReportRequest,
} from "../../types/reports";
import {
  EnhancedDailyReportData,
  DailyReportMetrics,
  DailyReportComparison,
  WeeklyReport,
} from "../../types/analytics";
import { clientSvc } from "../../services/apiService";
import { toast } from "react-hot-toast";

export const DailyReport: React.FC = () => {
  const { reportsSvc, adminSvc } = useServices();

  interface WeeklyReportWithTrends extends WeeklyReport {
    daily_trends: {
      date: string;
      totalTransactions: number;
      deposits: string;
      withdrawals: string;
      bets: string;
      wins: string;
      ggr: string;
      ngr: string;
    }[];
  }

  // Tab state
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  const [weeklyReportData, setWeeklyReportData] =
    useState<WeeklyReportWithTrends | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyDateFrom, setWeeklyDateFrom] = useState(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return lastWeek.toISOString().split("T")[0];
  });
  const [weeklyDateTo, setWeeklyDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState<any>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Daily report state (new)
  const [dailyReportData, setDailyReportData] = useState<
    EnhancedDailyReportData["data"] | null
  >(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dailyLoading, setDailyLoading] = useState(false);

  const [filters, setFilters] = useState<DailyReportFilters>({
    dateFrom: "",
    dateTo: "",
    groupBy: "day",
    is_test_account: false,
  });

  const fetchWeeklyReport = async () => {
    try {
      setWeeklyLoading(true);
      const response = await reportsSvc.getWeeklyReport(
        weeklyDateFrom,
        filters.is_test_account,
      );
      if (response && response.success && response.data) {
        const weekly: WeeklyReport = response.data;
        const trends =
          weekly.daily_breakdown?.map((row) => ({
            date: row.date,
            totalTransactions: row.bet_count || 0,
            deposits: row.deposit_amount || "0",
            withdrawals: row.withdrawal_amount || "0",
            bets: row.bet_amount || "0",
            wins: row.win_amount || "0",
            ggr: row.ggr || "0",
            ngr: row.ggr || "0",
          })) || [];
        setWeeklyReportData({
          ...weekly,
          daily_trends: trends,
        });
      } else {
        toast.error("Failed to fetch weekly report");
        setWeeklyReportData(null);
      }
    } catch (error) {
      toast.error("Failed to fetch weekly report");
      setWeeklyReportData(null);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const handleTabChange = (tab: "daily" | "weekly") => {
    setActiveTab(tab);
    if (tab === "weekly") {
      fetchWeeklyReport();
    } else {
      fetchEnhancedDailyReport();
    }
  };

  const calculatePercentageChange = (
    current: number,
    previous: number,
  ): string => {
    if (!previous || previous === 0) {
      return current > 0 ? "100%" : "-";
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const getDateRanges = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "T00:00:00Z");
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
      const mtdFrom = firstDayOfMonth.toISOString().split("T")[0];
      const mtdTo = dateStr;

      const previousMonth = new Date(Date.UTC(year, month - 1, 1));
      const lastDayPrevMonth = new Date(Date.UTC(year, month, 0));
      const maxDayPrevMonth = lastDayPrevMonth.getUTCDate();
      const splmDay = Math.min(day, maxDayPrevMonth);
      const splmFrom = previousMonth.toISOString().split("T")[0];
      const splmTo = new Date(Date.UTC(year, month - 1, splmDay))
        .toISOString()
        .split("T")[0];

      const previousDay = new Date(date);
      previousDay.setUTCDate(previousDay.getUTCDate() - 1);
      const previousDayStr = previousDay.toISOString().split("T")[0];

      return { mtdFrom, mtdTo, splmFrom, splmTo, previousDayStr };
    } catch (error) {
      console.error("Error calculating date ranges:", error);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      return {
        mtdFrom: today,
        mtdTo: today,
        splmFrom: yesterday,
        splmTo: yesterday,
        previousDayStr: yesterday,
      };
    }
  };

  const fetchEnhancedDailyReport = async () => {
    try {
      setDailyLoading(true);
      const response = await reportsSvc.getEnhancedDailyReport(
        selectedDate,
        filters.is_test_account,
      );
      if (response && response.success && response.data) {
        const d = response.data;
        const mapped: EnhancedDailyReportData["data"] = {
          date: d.date,
          total_transactions: parseInt(d.total_transactions || "0", 10),
          total_deposits: d.total_deposits || "0",
          total_withdrawals: d.total_withdrawals || "0",
          total_bets: d.total_bets || "0",
          total_wins: d.total_wins || "0",
          net_revenue: d.net_revenue || "0",
          active_users: parseInt(d.active_users || "0", 10),
          active_games: parseInt(d.active_games || "0", 10),
          new_users: parseInt(d.new_users || "0", 10),
          unique_depositors: parseInt(d.unique_depositors || "0", 10),
          unique_withdrawers: parseInt(d.unique_withdrawers || "0", 10),
          deposit_count: parseInt(d.deposit_count || "0", 10),
          withdrawal_count: parseInt(d.withdrawal_count || "0", 10),
          bet_count: parseInt(d.bet_count || "0", 10),
          win_count: parseInt(d.win_count || "0", 10),
          cashback_earned: d.cashback_earned || "0",
          cashback_claimed: d.cashback_claimed || "0",
          admin_corrections: d.admin_corrections || "0",
          previous_day_change: d.previous_day_change,
          mtd: d.mtd,
          splm: d.splm,
          mtd_vs_splm_change: d.mtd_vs_splm_change,
          top_games: d.top_games || [],
          top_players: d.top_players || [],
        };
        setDailyReportData(mapped);
      } else {
        toast.error("Failed to fetch daily report");
        setDailyReportData(null);
      }
    } catch (error) {
      toast.error("Failed to fetch daily report");
      setDailyReportData(null);
    } finally {
      setDailyLoading(false);
    }
  };

  // Fetch initial data on mount with today's date and real accounts
  useEffect(() => {
    fetchEnhancedDailyReport();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFilterChange = (key: keyof DailyReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    if (activeTab === "weekly") {
      fetchWeeklyReport();
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      groupBy: "day",
      is_test_account: false,
    });
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    setWeeklyDateFrom(lastWeek.toISOString().split("T")[0]);
    setWeeklyDateTo(today.toISOString().split("T")[0]);
  };

  const handleViewDetail = async (report: DailyReportType) => {
    try {
      console.log("Viewing detail for report:", report);
      setSelectedReportDetail(report);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Failed to load report details:", error);
      toast.error("Failed to load report details");
    }
  };

  const handleWeeklyViewDetail = (
    day: WeeklyReportWithTrends["daily_trends"][number],
  ) => {
    const report: DailyReportType = {
      id: `weekly-${day.date}`,
      date: day.date,
      totalPlayers: 0,
      newPlayers: 0,
      activePlayers: 0,
      totalDeposits: parseFloat(day.deposits || "0"),
      totalWithdrawals: parseFloat(day.withdrawals || "0"),
      totalWagered: parseFloat(day.bets || "0"),
      totalWon: parseFloat(day.wins || "0"),
      netRevenue: parseFloat(day.ggr || "0"),
      averageBet: 0,
      topGame: "",
      topCountry: "",
      conversionRate: 0,
      detailedData: {
        total_transactions: day.totalTransactions,
        total_deposits: day.deposits || "0",
        total_withdrawals: day.withdrawals || "0",
        total_bets: day.bets || "0",
        total_wins: day.wins || "0",
        net_revenue: day.ggr || "0",
        active_games: 0,
        unique_depositors: 0,
        unique_withdrawers: 0,
        deposit_count: 0,
        withdrawal_count: 0,
        bet_count: day.totalTransactions,
        win_count: 0,
        cashback_earned: "0",
        cashback_claimed: "0",
        admin_corrections: "0",
        top_games: [],
        top_players: [],
      },
    };
    setSelectedReportDetail(report);
    setShowDetailModal(true);
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportDailyReports(filters, { format });
      const filename = `daily-report-${new Date().toISOString().split("T")[0]}.${format}`;
      await reportsSvc.downloadFile(blob, filename);
      toast.success(`Daily report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Failed to export daily report:", error);
      toast.error("Failed to export daily report");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return reportsSvc.formatCurrency(amount);
  };

  const formatNumber = (number: number) => {
    return reportsSvc.formatNumber(number);
  };

  const formatPercentage = (value: number) => {
    return reportsSvc.formatPercentage(value);
  };

  return (
    <div className="space-y-6">
      {/* Minimal Clean Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">
          Reports
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={async () => {
              try {
                if (activeTab === "daily") {
                  await fetchEnhancedDailyReport();
                } else {
                  await fetchWeeklyReport();
                }
                toast.success("Report refreshed");
              } catch (error) {
                console.error("Failed to refresh report data:", error);
                toast.error("Failed to refresh report data");
              }
            }}
            disabled={activeTab === "daily" ? dailyLoading : weeklyLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${(activeTab === "daily" ? dailyLoading : weeklyLoading) ? "animate-spin" : ""}`} />
          </button>
          <div className="relative" ref={exportDropdownRef}>
            <button
              disabled={exporting}
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"
              title="Export"
            >
              <Download className="h-4 w-4" />
            </button>
            {showExportDropdown && !exporting && (
              <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                <button
                  onClick={() => {
                    handleExport("csv");
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => {
                    handleExport("excel");
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  Excel
                </button>
                <button
                  onClick={() => {
                    handleExport("pdf");
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Minimal Tabs */}
      <div className="flex space-x-1 border-b border-slate-700/50 mb-6">
          <button
          onClick={() => handleTabChange("daily")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "daily"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-slate-300"
            }`}
          >
          Daily
          </button>
          <button
          onClick={() => handleTabChange("weekly")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "weekly"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Weekly
          </button>
      </div>

      {/* Daily Report Tab */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Minimal Date & Account Type Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  fetchEnhancedDailyReport();
                }}
                className="bg-slate-800/50 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-400">Real</span>
                <button
                  type="button"
                  onClick={() => {
                  const newValue = filters.is_test_account === false ? true : false;
                    handleFilterChange("is_test_account", newValue);
                    fetchEnhancedDailyReport();
                  }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  filters.is_test_account === true ? "bg-slate-600" : "bg-slate-700"
                  }`}
                >
                  <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    filters.is_test_account === true ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              <span className="text-sm text-slate-400">Test</span>
            </div>
          </div>

          {/* Daily Report Table */}
          {dailyLoading ? (
            <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl p-12 text-center shadow-xl">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div className="text-slate-400 text-lg font-medium">
                Loading daily report...
              </div>
              </div>
            </div>
          ) : dailyReportData ? (
            <>
              {/* Daily Metrics Table */}
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/30">
                  <h3 className="text-sm font-medium text-white">
                    Daily Metrics
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/30">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400">
                        Metric
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400">
                        Today
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400">
                        vs Yesterday
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400">
                        MTD
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400">
                        SPLM
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-400">
                        MTD vs SPLM
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/20">
                    {/* Number of Registrations */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Registrations
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.new_users?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.new_users_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.mtd?.new_users?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.splm?.new_users?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.new_users_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Unique Depositors */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Unique Depositors
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.unique_depositors ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.unique_depositors_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.mtd?.unique_depositors ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.splm?.unique_depositors ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.unique_depositors_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Unique Withdrawers */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Unique Withdrawers
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.unique_withdrawers}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.unique_withdrawers_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.mtd?.unique_withdrawers?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.splm?.unique_withdrawers?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.unique_withdrawers_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Active Customers */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Active Customers
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.active_users}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.active_users_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.mtd?.active_users?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.splm?.active_users?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.active_users_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Number of Bets */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Bets
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.bet_count}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.bet_count_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.mtd?.bet_count?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.splm?.bet_count?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.bet_count_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Bet Amount */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Bet Amount (USD)
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.total_bets ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.total_bets_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.total_bets ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.total_bets ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.total_bets_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Win Amount */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Win Amount (USD)
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.total_wins ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.total_wins_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.total_wins ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.total_wins ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.total_wins_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* GGR */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        GGR (Bet - Wins) USD
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {(
                          parseFloat(dailyReportData?.total_bets ?? "0") -
                          parseFloat(dailyReportData?.total_wins ?? "0")
                        ).toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/50">-</span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${(parseFloat(dailyReportData?.mtd?.total_bets ?? "0") - parseFloat(dailyReportData?.mtd?.total_wins ?? "0")).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${(parseFloat(dailyReportData?.splm?.total_bets ?? "0") - parseFloat(dailyReportData?.splm?.total_wins ?? "0")).toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/50">-</span>
                      </td>
                    </tr>

                    {/* Cashback Earned */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Cashback Earned
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.cashback_earned ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.cashback_earned_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.cashback_earned ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.cashback_earned ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.cashback_earned_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Cashback Claimed */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Cashback Claimed
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.cashback_claimed ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.cashback_claimed_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.cashback_claimed ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.cashback_claimed ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.cashback_claimed_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Number of Deposits */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Deposits
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.deposit_count}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.deposit_count_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.mtd?.deposit_count?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.splm?.deposit_count?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.deposit_count_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Deposit Amount */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Deposit Amount (USD)
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.total_deposits ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.total_deposits_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.total_deposits ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.total_deposits ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.total_deposits_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Number of Withdrawals */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Number of Withdrawals
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        {dailyReportData?.withdrawal_count}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.withdrawal_count_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.mtd?.withdrawal_count?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {dailyReportData?.splm?.withdrawal_count?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.withdrawal_count_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Withdrawal Amount */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Withdrawal Amount (USD)
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.total_withdrawals ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.total_withdrawals_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.total_withdrawals ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.total_withdrawals ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.total_withdrawals_change ?? "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Admin Corrections */}
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        Admin Corrections (USD)
                      </td>
                      <td className="px-6 py-4 text-right text-white text-sm">
                        $
                        {parseFloat(
                          dailyReportData?.admin_corrections ?? "0",
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.previous_day_change?.admin_corrections_change ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.mtd?.admin_corrections ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        ${parseFloat(dailyReportData?.splm?.admin_corrections ?? "0").toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-slate-400">
                          {dailyReportData?.mtd_vs_splm_change?.admin_corrections_change ?? "-"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </div>

            {/* Top Performing Games Table */}
              {dailyReportData?.top_games &&
                dailyReportData.top_games.length > 0 && (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden mt-12">
                  <div className="px-6 py-4 border-b border-slate-700/30">
                    <h3 className="text-sm font-medium text-white">
                      Top Performing Games
                    </h3>
                  </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                        <tr className="border-b border-slate-700/30">
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                            #
                            </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Game
                            </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Total Bets
                            </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Total Wins
                            </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Net Revenue
                            </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Players
                            </th>
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-slate-700/20">
                        {dailyReportData?.top_games.map((game, index) => (
                            <tr
                              key={game.game_id}
                            className="hover:bg-slate-800/40 transition-colors"
                            >
                            <td className="px-6 py-4 text-sm text-slate-400">
                              {index + 1}
                              </td>
                            <td className="px-6 py-4 text-sm text-white">
                                {game.game_name || game.game_id}
                              </td>
                            <td className="px-6 py-4 text-right text-white text-sm">
                                ${parseFloat(game.total_bets).toLocaleString()}
                              </td>
                            <td className="px-6 py-4 text-right text-white text-sm">
                                ${parseFloat(game.total_wins).toLocaleString()}
                              </td>
                            <td className="px-6 py-4 text-right text-white text-sm">
                                ${parseFloat(game.net_revenue).toLocaleString()}
                              </td>
                            <td className="px-6 py-4 text-right text-white text-sm">
                                {game.player_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Top Players Section */}
              {dailyReportData?.top_players &&
                dailyReportData.top_players.length > 0 && (
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden mt-12">
                    <div className="px-6 py-4 border-b border-slate-700/30">
                      <h3 className="text-sm font-medium text-white">
                      Top Players
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700/30">
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                              #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Player ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Username
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Total Bets
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Total Wins
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Net Loss
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Transactions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/20">
                          {dailyReportData?.top_players.map((player, index) => (
                            <tr
                              key={player.user_id}
                              className="hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm text-slate-400">
                                {index + 1}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-300">
                                {player.user_id ? player.user_id.slice(-8) : ""}
                              </td>
                              <td className="px-6 py-4 text-sm text-white">
                                {player.username}
                              </td>
                              <td className="px-6 py-4 text-right text-white text-sm">
                                ${parseFloat(player.total_bets).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right text-white text-sm">
                                ${parseFloat(player.total_wins).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right text-white text-sm">
                                ${parseFloat(player.net_loss).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right text-white text-sm">
                                {player.transaction_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl p-12 text-center shadow-xl">
              <div className="text-slate-400 text-lg font-medium">
                No data available for the selected date
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Report Tab */}
      {activeTab === "weekly" && (
        <>
          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={weeklyDateFrom}
                    onChange={(e) => setWeeklyDateFrom(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={weeklyDateTo}
                    onChange={(e) => setWeeklyDateTo(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Group By
                  </label>
                  <select
                    value={filters.groupBy || "day"}
                    onChange={(e) =>
                      handleFilterChange("groupBy", e.target.value)
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account Type
                  </label>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`text-sm font-medium ${filters.is_test_account === false ? "text-white" : "text-gray-400"}`}
                    >
                      Real Accounts
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newValue =
                          filters.is_test_account === false ? true : false;
                        handleFilterChange("is_test_account", newValue);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        filters.is_test_account === true
                          ? "bg-purple-600"
                          : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          filters.is_test_account === true
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-sm font-medium ${filters.is_test_account === true ? "text-white" : "text-gray-400"}`}
                    >
                      Test Accounts
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Clear Filters
                </button>
                <button
                  onClick={applyFilters}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Professional Weekly Report Table */}
          {weeklyLoading ? (
            <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl p-12 text-center shadow-xl">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <div className="text-slate-400 text-lg font-medium">
                  Loading weekly report...
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-b border-slate-600">
                  <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Date
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Total Transactions
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Total Deposits
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Total Withdrawals
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Total Bets
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Total Wins
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        GGR
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Conversion Rate
                    </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {!weeklyReportData?.daily_trends ||
                    weeklyReportData.daily_trends.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        No weekly report data found
                      </td>
                    </tr>
                  ) : (
                    [...(weeklyReportData.daily_trends || [])]
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((day) => {
                        const ggr = parseFloat(day.ggr || "0");
                        const ngr = parseFloat(day.ngr || "0");
                        const conversionRate = 0;

                        return (
                          <tr key={day.date} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-sm font-medium text-white">
                                  {new Date(day.date).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                <BarChart3 className="h-4 w-4 mr-2 text-gray-400" />
                                {day.totalTransactions.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
                                $
                                {parseFloat(
                                  day.deposits || "0",
                                ).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                <TrendingDown className="h-4 w-4 mr-2 text-red-400" />
                                $
                                {parseFloat(
                                  day.withdrawals || "0",
                                ).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                                ${parseFloat(day.bets || "0").toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                <BarChart3 className="h-4 w-4 mr-2 text-orange-400" />
                                ${parseFloat(day.wins || "0").toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                {ggr >= 0 ? (
                                  <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 mr-2 text-red-400" />
                                )}
                                <span
                                  className={
                                    ggr >= 0 ? "text-green-400" : "text-red-400"
                                  }
                                >
                                  ${ggr.toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center">
                                <BarChart3 className="h-4 w-4 mr-2 text-gray-400" />
                                {conversionRate.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <button
                                onClick={() => handleWeeklyViewDetail(day)}
                                className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="text-xs">View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {weeklyReportData &&
              weeklyReportData.daily_trends &&
              weeklyReportData.daily_trends.length > 0 && (
                <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {weeklyReportData.daily_trends.length} day(s) from{" "}
                    {new Date(weeklyDateFrom).toLocaleDateString()} to{" "}
                    {new Date(weeklyDateTo).toLocaleDateString()}
                  </div>
                </div>
              )}
          </div>
          )}

          {/* Detail Modal */}
          {showDetailModal && selectedReportDetail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    Daily Report Details -{" "}
                    {new Date(selectedReportDetail.date).toLocaleDateString()}
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {selectedReportDetail.detailedData && (
                  <div className="space-y-6">
                    {console.log(
                      "Detail modal data:",
                      selectedReportDetail.detailedData,
                    )}
                    {/* Additional Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">
                          Total Transactions
                        </p>
                        <p className="text-xl font-bold text-white">
                          {formatNumber(
                            selectedReportDetail.detailedData
                              .total_transactions,
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Active Games</p>
                        <p className="text-xl font-bold text-white">
                          {formatNumber(
                            selectedReportDetail.detailedData.active_games,
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Bet Count</p>
                        <p className="text-xl font-bold text-white">
                          {formatNumber(
                            selectedReportDetail.detailedData.bet_count,
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm">Win Count</p>
                        <p className="text-xl font-bold text-white">
                          {formatNumber(
                            selectedReportDetail.detailedData.win_count,
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Top Games */}
                    {selectedReportDetail.detailedData.top_games &&
                      selectedReportDetail.detailedData.top_games.length >
                        0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-4">
                            Top Games
                          </h4>
                          <div className="bg-gray-700 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-600">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Rank
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Game
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Provider
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Total Bets
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Total Wins
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Net Revenue
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Players
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Actual RTP
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-600">
                                {selectedReportDetail.detailedData.top_games.map(
                                  (game: any, index: number) => (
                                    <tr
                                      key={game.game_id}
                                      className="hover:bg-gray-600"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {game.rank}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-white">
                                        {game.game_name || game.game_id}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {game.provider}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {formatCurrency(
                                          parseFloat(game.total_bets),
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {formatCurrency(
                                          parseFloat(game.total_wins),
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {formatCurrency(
                                          parseFloat(game.net_revenue),
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {game.player_count}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {game.rtp}%
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    {/* Top Players */}
                    {selectedReportDetail.detailedData.top_players &&
                      selectedReportDetail.detailedData.top_players.length >
                        0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-4">
                            Top Players
                          </h4>
                          <div className="bg-gray-700 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-600">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Rank
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Player ID
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Username
                                  </th>

                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Total Bets
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Total Wins
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Net Loss
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Transactions
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Games Played
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                                    Last Activity
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-600">
                                {selectedReportDetail.detailedData.top_players.map(
                                  (player: any, index: number) => (
                                    <tr
                                      key={player.user_id}
                                      className="hover:bg-gray-600"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {player.rank}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {player.user_id
                                          ? player.user_id.slice(-8)
                                          : ""}
                                      </td>

                                      <td className="px-4 py-2 text-sm text-white">
                                        {player.username}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {formatCurrency(
                                          parseFloat(player.total_bets),
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {formatCurrency(
                                          parseFloat(player.total_wins),
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {formatCurrency(
                                          parseFloat(player.net_loss),
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {player.transaction_count}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {player.unique_games_played}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-300">
                                        {new Date(
                                          player.last_activity,
                                        ).toLocaleString()}
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
