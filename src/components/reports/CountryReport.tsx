import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
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
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  CountryReportRequest,
  CountryReportResponse,
  CountryMetric,
  CountryPlayersRequest,
  CountryPlayersResponse,
  CountryPlayer,
} from "../../types/reports";
import { toast } from "react-hot-toast";
import { brandService, Brand } from "../../services/brandService";

export const CountryReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [reportData, setReportData] = useState<CountryReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [playersData, setPlayersData] = useState<CountryPlayersResponse | null>(
    null,
  );
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersPage, setPlayersPage] = useState(1);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Default to last 30 days
  const defaultDateTo = new Date().toISOString().split("T")[0];
  const defaultDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [filters, setFilters] = useState<CountryReportRequest>({
    page: 1,
    per_page: 20,
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    user_type: "all",
    sort_by: "ngr",
    sort_order: "desc",
    is_test_account: false, // Default: Real Accounts only
  });

  const [sortBy, setSortBy] = useState<
    "deposits" | "ngr" | "active_users" | "alphabetical"
  >("ngr");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Player filters (for drill-down)
  const [playerFilters, setPlayerFilters] = useState<
    Omit<CountryPlayersRequest, "country">
  >({
    page: 1,
    per_page: 50,
    sort_by: "ngr",
    sort_order: "desc",
  });

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

  // Load players when modal opens
  useEffect(() => {
    if (showPlayersModal && selectedCountry) {
      loadPlayers();
    }
  }, [showPlayersModal, selectedCountry, playersPage]);

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
      const request: CountryReportRequest = {
        ...filters,
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await reportsSvc.getCountryReport(request);
      setReportData(response);
    } catch (error: any) {
      console.error("Failed to load country report:", error);
      toast.error(
        error.response?.data?.message || "Failed to load country report",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    if (!selectedCountry) return;

    try {
      setPlayersLoading(true);
      const request: CountryPlayersRequest = {
        country: selectedCountry,
        ...playerFilters,
        page: playersPage,
        per_page: 50,
      };

      const response = await reportsSvc.getCountryPlayers(request);
      setPlayersData(response);
    } catch (error: any) {
      console.error("Failed to load country players:", error);
      toast.error("Failed to load country players");
    } finally {
      setPlayersLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CountryReportRequest, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReport();
  };

  const clearFilters = () => {
    const defaultFilters: CountryReportRequest = {
      page: 1,
      per_page: 20,
      date_from: defaultDateFrom,
      date_to: defaultDateTo,
      user_type: "all",
      sort_by: "ngr",
      sort_order: "desc",
      is_test_account: false, // Default: Real Accounts only
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleExport = async (format: "csv" = "csv") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportCountryReport(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `country-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Country report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Failed to export country report:", error);
      toast.error("Failed to export country report");
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleSort = (
    field: "deposits" | "ngr" | "active_users" | "alphabetical",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewPlayers = (country: string) => {
    setSelectedCountry(country);
    setShowPlayersModal(true);
    setPlayersPage(1);
    setPlayerFilters({
      page: 1,
      per_page: 50,
      sort_by: "ngr",
      sort_order: "desc",
    });
  };

  const handlePlayerFilterChange = (
    key: keyof typeof playerFilters,
    value: any,
  ) => {
    setPlayerFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyPlayerFilters = () => {
    setPlayersPage(1);
    loadPlayers();
  };

  const handleExportPlayers = async () => {
    if (!selectedCountry) return;

    try {
      setExporting(true);
      const request: CountryPlayersRequest = {
        country: selectedCountry,
        ...playerFilters,
      };
      const blob = await reportsSvc.exportCountryPlayers(request, "csv");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `country-players-${selectedCountry}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Country players exported successfully");
    } catch (error) {
      console.error("Failed to export country players:", error);
      toast.error("Failed to export country players");
    } finally {
      setExporting(false);
    }
  };

  // Get country flag emoji (simplified - using first two letters)
  const getCountryFlag = (country: string) => {
    if (!country || country === "Unknown") return "🌍";
    // This is a simplified version - in production, you'd use a proper country code to flag mapping
    return "🌍";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Globe className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Country Report</h1>
            <p className="text-gray-400 text-sm">
              Aggregated metrics by player country
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <div className="relative" ref={exportDropdownRef}>
            <button
              disabled={exporting}
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? "Exporting..." : "Export"}</span>
            </button>
            {showExportDropdown && !exporting && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-lg"
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Deposits</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(reportData.summary.total_deposits)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total GGR</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(reportData.summary.total_ngr)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-blue-400">
                  {reportData.summary.total_active_users.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Depositors</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {reportData.summary.total_depositors.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Registrations</p>
                <p className="text-2xl font-bold text-white">
                  {reportData.summary.total_registrations.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date From (Required) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date From <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value || undefined)
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                required
              />
            </div>

            {/* Date To (Required) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date To <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) =>
                  handleFilterChange("date_to", e.target.value || undefined)
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                required
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brand
              </label>
              <select
                value={filters.brand_id || ""}
                onChange={(e) =>
                  handleFilterChange("brand_id", e.target.value || undefined)
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
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
                <p className="text-xs text-gray-400 mt-1">Loading brands...</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={filters.currency || ""}
                onChange={(e) =>
                  handleFilterChange("currency", e.target.value || undefined)
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="">All Currencies</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
              </select>
            </div>

            {/* Countries (Multi-select - simplified as text input for now) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Countries (comma-separated)
              </label>
              <input
                type="text"
                value={filters.countries?.join(", ") || ""}
                onChange={(e) => {
                  const countries = e.target.value
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => c);
                  handleFilterChange(
                    "countries",
                    countries.length > 0 ? countries : undefined,
                  );
                }}
                placeholder="US, UK, CA, etc."
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* User Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User Type
              </label>
              <select
                value={filters.user_type || "all"}
                onChange={(e) =>
                  handleFilterChange(
                    "user_type",
                    e.target.value as "depositors" | "all" | "active",
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="all">All Players</option>
                <option value="depositors">Depositors Only</option>
                <option value="active">Active Players Only</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(
                    e.target.value as
                      | "deposits"
                      | "ngr"
                      | "active_users"
                      | "alphabetical",
                  );
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="ngr">Highest GGR</option>
                <option value="deposits">Highest Deposits</option>
                <option value="active_users">Most Active Users</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
              </select>
            </div>

            {/* Test Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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

          <div className="flex items-center justify-end space-x-2 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-300 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-700"
            >
              Clear Filters
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            Loading country report...
          </div>
        ) : !reportData || reportData.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No country data found for the selected criteria
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("alphabetical")}
                    >
                      <div className="flex items-center">
                        Country {getSortIcon("alphabetical")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Registrations
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("active_users")}
                    >
                      <div className="flex items-center">
                        Active Players {getSortIcon("active_users")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      FTDs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Depositors
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("deposits")}
                    >
                      <div className="flex items-center">
                        Total Deposits {getSortIcon("deposits")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Withdrawals
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Net Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Wagered
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Won
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      GGR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Avg Deposit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Avg Wager
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {reportData.data.map((metric) => (
                    <tr key={metric.country} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">
                            {getCountryFlag(metric.country)}
                          </span>
                          <span className="text-white font-medium">
                            {metric.country}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {metric.total_registrations.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {metric.active_players.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {metric.first_time_depositors.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {metric.total_depositors.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-400">
                        {formatCurrency(metric.total_deposits)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-400">
                        {formatCurrency(metric.total_withdrawals)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold ${metric.net_position >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatCurrency(metric.net_position)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatCurrency(metric.total_wagered)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-400">
                        {formatCurrency(metric.total_won)}
                      </td>
                      <td className="px-4 py-3 text-sm text-yellow-400">
                        {formatCurrency(metric.ggr)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatCurrency(metric.average_deposit_per_player)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatCurrency(metric.average_wager_per_player)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewPlayers(metric.country)}
                          className="text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {reportData.total_pages > 1 && (
              <div className="px-4 py-3 bg-gray-900 flex items-center justify-between">
                <div className="text-sm text-gray-400">
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
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-gray-300">
                    Page {currentPage} of {reportData.total_pages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(reportData.total_pages, prev + 1),
                      )
                    }
                    disabled={currentPage === reportData.total_pages}
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Players Drill-Down Modal */}
      {showPlayersModal && selectedCountry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPlayersModal(false)}
                  className="text-gray-400 hover:text-white mr-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Players in {selectedCountry}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {playersData?.total || 0} players found
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportPlayers}
                  disabled={exporting}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setShowPlayersModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Player Filters */}
            <div className="p-4 bg-gray-900 border-b border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={playerFilters.date_from || ""}
                    onChange={(e) =>
                      handlePlayerFilterChange(
                        "date_from",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={playerFilters.date_to || ""}
                    onChange={(e) =>
                      handlePlayerFilterChange(
                        "date_to",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    KYC Status
                  </label>
                  <select
                    value={playerFilters.kyc_status || ""}
                    onChange={(e) =>
                      handlePlayerFilterChange(
                        "kyc_status",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={applyPlayerFilters}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Players Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {playersLoading ? (
                <div className="text-center text-gray-400 py-8">
                  Loading players...
                </div>
              ) : !playersData || playersData.data.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No players found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Player
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Deposits
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Withdrawals
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Total Wagered
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          GGR
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Last Active
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Registration
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {playersData.data.map((player) => (
                        <tr
                          key={player.player_id}
                          className="hover:bg-gray-700/50"
                        >
                          <td className="px-3 py-2">
                            <div>
                              <div className="text-white font-medium">
                                {player.username}
                              </div>
                              {player.email && (
                                <div className="text-gray-400 text-xs">
                                  {player.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-green-400">
                            {formatCurrency(
                              player.total_deposits,
                              player.currency,
                            )}
                          </td>
                          <td className="px-3 py-2 text-red-400">
                            {formatCurrency(
                              player.total_withdrawals,
                              player.currency,
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {formatCurrency(
                              player.total_wagered,
                              player.currency,
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 font-semibold ${player.ngr >= 0 ? "text-red-400" : "text-green-400"}`}
                          >
                            {formatCurrency(player.ngr, player.currency)}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {player.last_activity
                              ? formatDate(player.last_activity)
                              : "N/A"}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {formatDate(player.registration_date)}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {formatCurrency(player.balance, player.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Players Pagination */}
              {playersData && playersData.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {(playersPage - 1) * 50 + 1} to{" "}
                    {Math.min(playersPage * 50, playersData.total)} of{" "}
                    {playersData.total} players
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setPlayersPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={playersPage === 1}
                      className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <span className="text-gray-300 text-sm">
                      Page {playersPage} of {playersData.total_pages}
                    </span>
                    <button
                      onClick={() =>
                        setPlayersPage((prev) =>
                          Math.min(playersData.total_pages, prev + 1),
                        )
                      }
                      disabled={playersPage === playersData.total_pages}
                      className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
