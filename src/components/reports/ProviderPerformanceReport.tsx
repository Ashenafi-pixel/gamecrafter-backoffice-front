import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Search,
  Filter,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
  ArrowLeft,
  Users,
  BarChart3,
  Target,
  Zap,
  Gamepad2,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { useNavigate } from "react-router-dom";
import {
  ProviderPerformanceReportRequest,
  ProviderPerformanceReportResponse,
  ProviderPerformanceMetric,
} from "../../types/reports";
import { toast } from "react-hot-toast";
import { brandService, Brand } from "../../services/brandService";

export const ProviderPerformanceReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const navigate = useNavigate();
  const [reportData, setReportData] =
    useState<ProviderPerformanceReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic filter states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Default to last 30 days
  const defaultDateTo = new Date().toISOString().split("T")[0];
  const defaultDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [filters, setFilters] = useState<ProviderPerformanceReportRequest>({
    page: 1,
    per_page: 20,
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: "ggr",
    sort_order: "desc",
    is_test_account: false, // Default: Real Accounts only
  });

  const [sortBy, setSortBy] = useState<
    "ggr" | "ngr" | "most_played" | "rtp" | "bet_volume"
  >("ggr");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadReport();
  }, [currentPage, sortBy, sortOrder]);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const response = await brandService.getBrands({
          page: 1,
          "per-page": 100, // Get all brands
        });
        if (response.success && response.data) {
          setBrands(response.data.brands || []);
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setLoadingBrands(false);
      }
    };
    fetchBrands();
  }, []);

  // Click outside handler
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

  const loadReport = async () => {
    try {
      setLoading(true);
      const request: ProviderPerformanceReportRequest = {
        ...filters,
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await reportsSvc.getProviderPerformanceReport(request);
      if (response && response.data === null) {
        response.data = [];
      }
      setReportData(response);
    } catch (error: any) {
      console.error("Failed to load provider performance report:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to load provider performance report",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    key: keyof ProviderPerformanceReportRequest,
    value: any,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReport();
  };

  const clearFilters = () => {
    const defaultFilters: ProviderPerformanceReportRequest = {
      page: 1,
      per_page: 20,
      date_from: defaultDateFrom,
      date_to: defaultDateTo,
      sort_by: "ggr",
      sort_order: "desc",
      is_test_account: false, // Default: Real Accounts only
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleExport = async (format: "csv" = "csv") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportProviderPerformanceReport(
        filters,
        format,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `provider-performance-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(
        `Provider performance report exported as ${format.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Failed to export provider performance report:", error);
      toast.error("Failed to export provider performance report");
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleSort = (
    field: "ggr" | "ngr" | "most_played" | "rtp" | "bet_volume",
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) {
      return "0.00%";
    }
    // Handle Decimal type from backend (shopspring/decimal)
    const numValue =
      typeof value === "string"
        ? parseFloat(value)
        : typeof value === "number"
          ? value
          : 0;
    if (isNaN(numValue)) {
      return "0.00%";
    }
    return `${numValue.toFixed(2)}%`;
  };

  const handleViewGames = (provider: string) => {
    // Navigate to game performance report with provider filter
    const params = new URLSearchParams();
    params.set("provider", provider);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.brand_id) params.set("brand_id", filters.brand_id);
    if (filters.currency) params.set("currency", filters.currency);
    navigate(`/reports/game-performance?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Provider Performance Report
            </h1>
            <p className="text-slate-400 text-sm">
              Aggregated metrics by game provider
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-700 transition-colors font-medium"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <div className="relative" ref={exportDropdownRef}>
            <button
              disabled={exporting}
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-xl disabled:opacity-50 font-medium shadow-lg shadow-red-500/20 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? "Exporting..." : "Export"}</span>
            </button>
            {showExportDropdown && !exporting && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-10 backdrop-blur-sm">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-4 py-2.5 text-white hover:bg-slate-700 rounded-xl text-sm transition-colors"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Bar */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Bets</p>
                <p className="text-2xl font-bold text-red-400">
                  {reportData.summary.total_bets.toLocaleString()}
                </p>
              </div>
              <Target className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Unique Players</p>
                <p className="text-2xl font-bold text-green-400">
                  {reportData.summary.total_unique_players.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Wagered</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(reportData.summary.total_wagered)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total GGR</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(reportData.summary.total_ggr)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Rakeback</p>
                <p className="text-2xl font-bold text-pink-400">
                  {formatCurrency(reportData.summary.total_rakeback)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-pink-500" />
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Average RTP</p>
                <p className="text-2xl font-bold text-white">
                  {formatPercentage(reportData.summary.average_rtp)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date From (Required) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date From <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value || undefined)
                }
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                required
              />
            </div>

            {/* Date To (Required) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date To <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) =>
                  handleFilterChange("date_to", e.target.value || undefined)
                }
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                required
              />
            </div>

            {/* Brand ID - Dynamic Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Brand
              </label>
              <select
                value={filters.brand_id || ""}
                onChange={(e) =>
                  handleFilterChange("brand_id", e.target.value || undefined)
                }
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                disabled={loadingBrands}
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {loadingBrands && (
                <p className="text-xs text-slate-400 mt-1">Loading brands...</p>
              )}
            </div>

            {/* Currency - Selectable Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Currency
              </label>
              <select
                value={filters.currency || ""}
                onChange={(e) =>
                  handleFilterChange("currency", e.target.value || undefined)
                }
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="">All Currencies</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="BRL">BRL</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
                <option value="INR">INR</option>
                <option value="MXN">MXN</option>
                <option value="KRW">KRW</option>
                <option value="SGD">SGD</option>
                <option value="HKD">HKD</option>
                <option value="NZD">NZD</option>
                <option value="ZAR">ZAR</option>
                <option value="CHF">CHF</option>
                <option value="SEK">SEK</option>
                <option value="NOK">NOK</option>
                <option value="DKK">DKK</option>
                <option value="PLN">PLN</option>
                <option value="TRY">TRY</option>
              </select>
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Provider
              </label>
              <input
                type="text"
                value={filters.provider || ""}
                onChange={(e) =>
                  handleFilterChange("provider", e.target.value || undefined)
                }
                placeholder="Filter by provider"
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={filters.category || ""}
                onChange={(e) =>
                  handleFilterChange("category", e.target.value || undefined)
                }
                placeholder="Filter by category"
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(
                    e.target.value as
                      | "ggr"
                      | "ngr"
                      | "most_played"
                      | "rtp"
                      | "bet_volume",
                  );
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="ggr">Highest GGR</option>
                <option value="ngr">Highest GGR</option>
                <option value="most_played">Most Played</option>
                <option value="rtp">Highest RTP</option>
                <option value="bet_volume">Highest Bet Volume</option>
              </select>
            </div>

            {/* Test Account Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Account Type
              </label>
              <div className="flex items-center space-x-4">
                <span
                  className={`text-sm font-medium ${filters.is_test_account === false ? "text-white" : "text-slate-400"}`}
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    filters.is_test_account === true
                      ? "bg-red-600"
                      : "bg-slate-600"
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
                  className={`text-sm font-medium ${filters.is_test_account === true ? "text-white" : "text-slate-400"}`}
                >
                  Test Accounts
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-slate-300 hover:text-white border border-slate-700 rounded-xl hover:bg-slate-700/80 font-medium transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-500/20 transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            Loading provider performance report...
          </div>
        ) : !reportData || !reportData.data || reportData.data.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No provider data found for the selected criteria
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/80 border-b border-slate-700/80 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Total Games
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700/80"
                      onClick={() => handleSort("most_played")}
                    >
                      <div className="flex items-center">
                        Total Bets {getSortIcon("most_played")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Rounds
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Unique Players
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700/80"
                      onClick={() => handleSort("bet_volume")}
                    >
                      <div className="flex items-center">
                        Total Stake {getSortIcon("bet_volume")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Total Win
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700/80"
                      onClick={() => handleSort("ggr")}
                    >
                      <div className="flex items-center">
                        GGR {getSortIcon("ggr")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700/80"
                      onClick={() => handleSort("rtp")}
                    >
                      <div className="flex items-center">
                        RTP {getSortIcon("rtp")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Avg Bet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Big Wins
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reportData.data && reportData.data.map((metric) => (
                    <tr key={metric.provider} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div className="text-white font-medium">
                          {metric.provider}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {metric.total_games.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {metric.total_bets.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {metric.total_rounds.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {metric.unique_players.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-yellow-400">
                        {formatCurrency(metric.total_stake)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-400">
                        {formatCurrency(metric.total_win)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-400">
                        {formatCurrency(metric.ggr)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {formatPercentage(metric.effective_rtp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {formatCurrency(metric.avg_bet_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {metric.big_wins_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewGames(metric.provider)}
                          className="text-red-400 hover:text-red-300 flex items-center space-x-1 font-medium transition-colors"
                        >
                          <Gamepad2 className="h-4 w-4" />
                          <span>View Games</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {reportData.total_pages > 1 && (
              <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/80 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing {(currentPage - 1) * 20 + 1} to{" "}
                  {Math.min(currentPage * 20, reportData.total)} of{" "}
                  {reportData.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-slate-300 text-sm">
                    Page {currentPage} of {reportData.total_pages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(reportData.total_pages, prev + 1),
                      )
                    }
                    disabled={currentPage === reportData.total_pages}
                    className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
