import React, { useState, useEffect, useRef } from "react";
import {
  Users,
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
  BarChart3,
  User,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  PlayerMetricsReportRequest,
  PlayerMetricsReportResponse,
  PlayerMetric,
  PlayerTransactionsRequest,
  PlayerTransactionsResponse,
  PlayerTransactionDetail,
} from "../../types/reports";
import { toast } from "react-hot-toast";
import { brandService, Brand } from "../../services/brandService";

export const PlayerMetricsReport: React.FC = () => {
  const { reportsSvc, adminSvc } = useServices();
  const [reportData, setReportData] =
    useState<PlayerMetricsReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerMetric | null>(
    null,
  );
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionsData, setTransactionsData] =
    useState<PlayerTransactionsResponse | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);

  // Dynamic filter states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const playerSearchRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<PlayerMetricsReportRequest>({
    page: 1,
    per_page: 20,
    sort_by: "deposits",
    sort_order: "desc",
    is_test_account: false, // Default: Real Accounts only
  });

  const [sortBy, setSortBy] = useState<
    "deposits" | "wagering" | "net_loss" | "activity" | "registration"
  >("deposits");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Transaction filters (for drill-down)
  const [transactionFilters, setTransactionFilters] = useState<
    Omit<PlayerTransactionsRequest, "player_id">
  >({
    page: 1,
    per_page: 50,
    sort_by: "date",
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

  // Fetch players when search term changes
  useEffect(() => {
    const fetchPlayers = async () => {
      if (
        playerSearchTerm.length >= 2 ||
        (playerSearchTerm.length === 0 && showPlayerDropdown)
      ) {
        try {
          setLoadingPlayers(true);
          const filterPayload: any = {
            searchterm: playerSearchTerm || undefined,
            search: playerSearchTerm || undefined,
            username: playerSearchTerm || undefined,
            email: playerSearchTerm || undefined,
            user_id: playerSearchTerm || undefined,
          };

          const response = await adminSvc.post("/users", {
            page: 1,
            per_page: 50,
            filter: filterPayload,
          });

          if (
            response.success &&
            response.data &&
            (response.data as any).users
          ) {
            setPlayers((response.data as any).users || []);
          }
        } catch (error) {
          console.error("Error fetching players:", error);
        } finally {
          setLoadingPlayers(false);
        }
      } else if (playerSearchTerm.length === 0) {
        setPlayers([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchPlayers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [playerSearchTerm, showPlayerDropdown, adminSvc]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
      if (
        playerSearchRef.current &&
        !playerSearchRef.current.contains(event.target as Node)
      ) {
        setShowPlayerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load transactions when modal opens
  useEffect(() => {
    if (showTransactionModal && selectedPlayer) {
      loadTransactions();
    }
  }, [showTransactionModal, selectedPlayer, transactionsPage]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const request: PlayerMetricsReportRequest = {
        ...filters,
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await reportsSvc.getPlayerMetricsReport(request);
      setReportData(response);
    } catch (error: any) {
      console.error("Failed to load player metrics report:", error);
      toast.error(
        error.response?.data?.message || "Failed to load player metrics report",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!selectedPlayer) return;

    try {
      setTransactionsLoading(true);
      const request: PlayerTransactionsRequest = {
        player_id: selectedPlayer.player_id,
        ...transactionFilters,
        page: transactionsPage,
        per_page: 50,
      };

      const response = await reportsSvc.getPlayerTransactions(request);
      setTransactionsData(response);
    } catch (error: any) {
      console.error("Failed to load player transactions:", error);
      toast.error("Failed to load player transactions");
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleFilterChange = (
    key: keyof PlayerMetricsReportRequest,
    value: any,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReport();
  };

  const clearFilters = () => {
    const defaultFilters: PlayerMetricsReportRequest = {
      page: 1,
      per_page: 20,
      sort_by: "deposits",
      sort_order: "desc",
      is_test_account: false, // Default: Real Accounts only
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  const handleExport = async (format: "csv" = "csv") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportPlayerMetricsReport(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `player-metrics-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(
        `Player metrics report exported as ${format.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Failed to export player metrics report:", error);
      toast.error("Failed to export player metrics report");
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleSort = (
    field: "deposits" | "wagering" | "net_loss" | "activity" | "registration",
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewTransactions = (player: PlayerMetric) => {
    setSelectedPlayer(player);
    setShowTransactionModal(true);
    setTransactionsPage(1);
    setTransactionFilters({
      page: 1,
      per_page: 50,
      sort_by: "date",
      sort_order: "desc",
    });
  };

  const handleTransactionFilterChange = (
    key: keyof typeof transactionFilters,
    value: any,
  ) => {
    setTransactionFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyTransactionFilters = () => {
    setTransactionsPage(1);
    loadTransactions();
  };

  const handleExportTransactions = async () => {
    if (!selectedPlayer) return;

    try {
      setExporting(true);
      const request: PlayerTransactionsRequest = {
        player_id: selectedPlayer.player_id,
        ...transactionFilters,
      };
      const blob = await reportsSvc.exportPlayerTransactions(request, "csv");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `player-transactions-${selectedPlayer.username}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Player transactions exported successfully");
    } catch (error) {
      console.error("Failed to export player transactions:", error);
      toast.error("Failed to export player transactions");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Player Metrics Report
            </h1>
            <p className="text-gray-400 text-sm">
              Comprehensive player-level metrics and transaction details
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

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-white">
                  {reportData.summary.player_count.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
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
                <p className="text-gray-400 text-sm">Total Wagers</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(reportData.summary.total_wagers)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Withdrawals</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(reportData.summary.total_withdrawals)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500 rotate-180" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Player Search - Searchable */}
            <div className="relative" ref={playerSearchRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Player Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedPlayerName || playerSearchTerm}
                  onChange={(e) => {
                    setPlayerSearchTerm(e.target.value);
                    setSelectedPlayerName("");
                    setShowPlayerDropdown(true);
                    if (!e.target.value) {
                      handleFilterChange("player_search", undefined);
                      setShowPlayerDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (
                      players.length > 0 ||
                      playerSearchTerm.length >= 2 ||
                      selectedPlayerName
                    ) {
                      setShowPlayerDropdown(true);
                    }
                  }}
                  placeholder="Search players (username, email, or ID)..."
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 pr-8"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {showPlayerDropdown &&
                (playerSearchTerm.length >= 2 || players.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingPlayers ? (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        Loading players...
                      </div>
                    ) : players.length > 0 ? (
                      <>
                        <div
                          className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 cursor-pointer hover:bg-gray-700"
                          onClick={() => {
                            handleFilterChange("player_search", undefined);
                            setPlayerSearchTerm("");
                            setSelectedPlayerName("");
                            setShowPlayerDropdown(false);
                          }}
                        >
                          Clear selection
                        </div>
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                            onClick={() => {
                              // Use username, email, or user ID for search
                              const searchValue =
                                player.username || player.email || player.id;
                              handleFilterChange("player_search", searchValue);
                              setSelectedPlayerName(
                                player.username || player.email || player.id,
                              );
                              setPlayerSearchTerm("");
                              setShowPlayerDropdown(false);
                            }}
                          >
                            <div className="font-medium">
                              {player.username || "N/A"}
                            </div>
                            {player.email && (
                              <div className="text-xs text-gray-400">
                                {player.email}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              ID: {player.id}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : playerSearchTerm.length >= 2 ? (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        No players found
                      </div>
                    ) : null}
                  </div>
                )}
            </div>

            {/* Brand ID - Dynamic Dropdown */}
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

            {/* Currency - Selectable Dropdown */}
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

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                value={filters.country || ""}
                onChange={(e) =>
                  handleFilterChange("country", e.target.value || undefined)
                }
                placeholder="Filter by country"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Registration From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Registration From
              </label>
              <input
                type="date"
                value={filters.registration_from || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "registration_from",
                    e.target.value || undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Registration To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Registration To
              </label>
              <input
                type="date"
                value={filters.registration_to || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "registration_to",
                    e.target.value || undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Last Active From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Active From
              </label>
              <input
                type="date"
                value={filters.last_active_from || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "last_active_from",
                    e.target.value || undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Last Active To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Active To
              </label>
              <input
                type="date"
                value={filters.last_active_to || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "last_active_to",
                    e.target.value || undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Has Deposited */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Has Deposited?
              </label>
              <select
                value={
                  filters.has_deposited === undefined
                    ? ""
                    : filters.has_deposited
                      ? "yes"
                      : "no"
                }
                onChange={(e) =>
                  handleFilterChange(
                    "has_deposited",
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "yes",
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Has Withdrawn */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Has Withdrawn?
              </label>
              <select
                value={
                  filters.has_withdrawn === undefined
                    ? ""
                    : filters.has_withdrawn
                      ? "yes"
                      : "no"
                }
                onChange={(e) =>
                  handleFilterChange(
                    "has_withdrawn",
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "yes",
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Min Total Deposits */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Total Deposits
              </label>
              <input
                type="number"
                value={filters.min_total_deposits || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "min_total_deposits",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Total Deposits */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Total Deposits
              </label>
              <input
                type="number"
                value={filters.max_total_deposits || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "max_total_deposits",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                min="0"
                step="0.01"
              />
            </div>

            {/* Min Total Wagers */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Total Wagers
              </label>
              <input
                type="number"
                value={filters.min_total_wagers || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "min_total_wagers",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Total Wagers */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Total Wagers
              </label>
              <input
                type="number"
                value={filters.max_total_wagers || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "max_total_wagers",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                min="0"
                step="0.01"
              />
            </div>

            {/* Min Net Result */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Min Net Result
              </label>
              <input
                type="number"
                value={filters.min_net_result || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "min_net_result",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                step="0.01"
              />
            </div>

            {/* Max Net Result */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Net Result
              </label>
              <input
                type="number"
                value={filters.max_net_result || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "max_net_result",
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                step="0.01"
              />
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
                      | "wagering"
                      | "net_loss"
                      | "activity"
                      | "registration",
                  );
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="deposits">Highest Deposits</option>
                <option value="wagering">Highest Wagering</option>
                <option value="net_loss">Highest Net Loss</option>
                <option value="activity">Most Active</option>
                <option value="registration">Registration Date</option>
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
            Loading player metrics...
          </div>
        ) : !reportData || reportData.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No players found for the selected criteria
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Registration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Activity
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
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("wagering")}
                    >
                      <div className="flex items-center">
                        Total Wagered {getSortIcon("wagering")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Won
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("net_loss")}
                    >
                      <div className="flex items-center">
                        Net Gaming Result {getSortIcon("net_loss")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("activity")}
                    >
                      <div className="flex items-center">
                        Bets {getSortIcon("activity")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {reportData.data.map((player) => (
                    <tr key={player.player_id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="text-white font-medium">
                            {player.username}
                          </div>
                          {player.email && (
                            <div className="text-gray-400 text-xs">
                              {player.email}
                            </div>
                          )}
                          <div className="text-gray-500 text-xs font-mono">
                            {player.player_id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.brand_name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.country || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatDate(player.registration_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.last_activity
                          ? formatDate(player.last_activity)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-400">
                        {formatCurrency(player.total_deposits, player.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-400">
                        {formatCurrency(
                          player.total_withdrawals,
                          player.currency,
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatCurrency(player.total_wagered, player.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-400">
                        {formatCurrency(player.total_won, player.currency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold ${player.net_gaming_result >= 0 ? "text-red-400" : "text-green-400"}`}
                      >
                        {formatCurrency(
                          player.net_gaming_result,
                          player.currency,
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.number_of_sessions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {player.number_of_bets.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatCurrency(player.main_balance, player.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            player.account_status === "active"
                              ? "bg-green-900/20 text-green-400"
                              : player.account_status === "blocked"
                                ? "bg-red-900/20 text-red-400"
                                : "bg-gray-900/20 text-gray-400"
                          }`}
                        >
                          {player.account_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleViewTransactions(player)}
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

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-gray-400 hover:text-white mr-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Transaction Details
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {selectedPlayer.username} ({selectedPlayer.email || "N/A"})
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportTransactions}
                  disabled={exporting}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Transaction Filters */}
            <div className="p-4 bg-gray-900 border-b border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={transactionFilters.date_from || ""}
                    onChange={(e) =>
                      handleTransactionFilterChange(
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
                    value={transactionFilters.date_to || ""}
                    onChange={(e) =>
                      handleTransactionFilterChange(
                        "date_to",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={transactionFilters.transaction_type || ""}
                    onChange={(e) =>
                      handleTransactionFilterChange(
                        "transaction_type",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="bet">Bet</option>
                    <option value="win">Win</option>
                    <option value="bonus">Bonus</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={applyTransactionFilters}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {transactionsLoading ? (
                <div className="text-center text-gray-400 py-8">
                  Loading transactions...
                </div>
              ) : !transactionsData || transactionsData.data.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No transactions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Date/Time
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Game
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Bet Amount
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Win Amount
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Net
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Multiplier
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Transaction ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {transactionsData.data.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-700/50">
                          <td className="px-3 py-2 text-gray-300">
                            {formatDateTime(tx.date_time)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                tx.type === "deposit"
                                  ? "bg-green-900/20 text-green-400"
                                  : tx.type === "withdrawal"
                                    ? "bg-red-900/20 text-red-400"
                                    : tx.type === "win"
                                      ? "bg-purple-900/20 text-purple-400"
                                      : "bg-gray-900/20 text-gray-400"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {tx.game_name || tx.game_id || "N/A"}
                            {tx.game_provider && (
                              <div className="text-xs text-gray-500">
                                {tx.game_provider}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {tx.bet_amount
                              ? formatCurrency(tx.bet_amount, tx.currency)
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-green-400">
                            {tx.win_amount
                              ? formatCurrency(tx.win_amount, tx.currency)
                              : "-"}
                          </td>
                          <td
                            className={`px-3 py-2 font-semibold ${tx.net && tx.net >= 0 ? "text-green-400" : "text-red-400"}`}
                          >
                            {tx.net
                              ? formatCurrency(tx.net, tx.currency)
                              : formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {tx.multiplier
                              ? `${tx.multiplier.toFixed(2)}x`
                              : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                tx.status === "completed"
                                  ? "bg-green-900/20 text-green-400"
                                  : tx.status === "pending"
                                    ? "bg-yellow-900/20 text-yellow-400"
                                    : "bg-red-900/20 text-red-400"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-300 font-mono text-xs">
                            {tx.transaction_id.slice(0, 12)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transaction Pagination */}
              {transactionsData && transactionsData.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {(transactionsPage - 1) * 50 + 1} to{" "}
                    {Math.min(transactionsPage * 50, transactionsData.total)} of{" "}
                    {transactionsData.total} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setTransactionsPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={transactionsPage === 1}
                      className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <span className="text-gray-300 text-sm">
                      Page {transactionsPage} of {transactionsData.total_pages}
                    </span>
                    <button
                      onClick={() =>
                        setTransactionsPage((prev) =>
                          Math.min(transactionsData.total_pages, prev + 1),
                        )
                      }
                      disabled={
                        transactionsPage === transactionsData.total_pages
                      }
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
