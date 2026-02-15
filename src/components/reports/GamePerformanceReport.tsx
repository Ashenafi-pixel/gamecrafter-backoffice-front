import React, { useState, useEffect, useRef } from "react";
import {
  Gamepad2,
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
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  GamePerformanceReportRequest,
  GamePerformanceReportResponse,
  GamePerformanceMetric,
  GamePlayersRequest,
  GamePlayersResponse,
  GamePlayer,
} from "../../types/reports";
import { toast } from "react-hot-toast";
import { brandService, Brand } from "../../services/brandService";
import { gameManagementService } from "../../services/gameManagementService";
import { Game } from "../../types/gameManagement";

export const GamePerformanceReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [reportData, setReportData] =
    useState<GamePerformanceReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [playersData, setPlayersData] = useState<GamePlayersResponse | null>(
    null,
  );
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersPage, setPlayersPage] = useState(1);

  // Dynamic filter states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameSearchTerm, setGameSearchTerm] = useState("");
  const [selectedGameName, setSelectedGameName] = useState<string>("");
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const gameSearchRef = useRef<HTMLDivElement>(null);

  // Default to last 30 days
  const defaultDateTo = new Date().toISOString().split("T")[0];
  const defaultDateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [filters, setFilters] = useState<GamePerformanceReportRequest>({
    page: 1,
    per_page: 20,
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
    sort_by: "ggr",
    sort_order: "desc",
    is_test_account: false, // Default: Real Accounts only
  });

  const [sortBy, setSortBy] = useState<
    "ggr" | "most_played" | "rtp" | "bet_volume"
  >("ggr");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Player filters (for drill-down)
  const [playerFilters, setPlayerFilters] = useState<
    Omit<GamePlayersRequest, "game_id">
  >({
    page: 1,
    per_page: 50,
    sort_by: "total_stake",
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

  // Fetch games when search term changes
  useEffect(() => {
    const fetchGames = async () => {
      if (
        gameSearchTerm.length >= 2 ||
        (gameSearchTerm.length === 0 && showGameDropdown)
      ) {
        try {
          setLoadingGames(true);
          const response = await gameManagementService.getGames({
            search: gameSearchTerm || undefined,
            page: 1,
            per_page: 50,
            enabled: true,
            sort_by: "name",
            sort_order: "asc",
          });
          if (response.success && response.data) {
            setGames(response.data.games || []);
          }
        } catch (error) {
          console.error("Error fetching games:", error);
        } finally {
          setLoadingGames(false);
        }
      } else if (gameSearchTerm.length === 0) {
        setGames([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchGames();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [gameSearchTerm, showGameDropdown]);

  // Initialize game search if game_id filter is already set
  useEffect(() => {
    if (filters.game_id && !selectedGameName) {
      setGameSearchTerm(filters.game_id);
    }
  }, [filters.game_id]);

  // Load players when modal opens
  useEffect(() => {
    if (showPlayersModal && selectedGame) {
      loadPlayers();
    }
  }, [showPlayersModal, selectedGame, playersPage]);

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
        gameSearchRef.current &&
        !gameSearchRef.current.contains(event.target as Node)
      ) {
        setShowGameDropdown(false);
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
      const request: GamePerformanceReportRequest = {
        ...filters,
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await reportsSvc.getGamePerformanceReport(request);
      // Ensure data is always an array, even if API returns null
      if (response && response.data === null) {
        response.data = [];
      }
      setReportData(response);
    } catch (error: any) {
      console.error("Failed to load game performance report:", error);
      // Set reportData to null on error to prevent rendering issues
      setReportData(null);
      toast.error(
        error.response?.data?.message ||
          "Failed to load game performance report",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    if (!selectedGame) return;

    try {
      setPlayersLoading(true);
      const request: GamePlayersRequest = {
        game_id: selectedGame,
        ...playerFilters,
        page: playersPage,
        per_page: 50,
      };

      const response = await reportsSvc.getGamePlayers(request);
      setPlayersData(response);
    } catch (error: any) {
      console.error("Failed to load game players:", error);
      toast.error("Failed to load game players");
    } finally {
      setPlayersLoading(false);
    }
  };

  const handleFilterChange = (
    key: keyof GamePerformanceReportRequest,
    value: any,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReport();
  };

  const clearFilters = () => {
    const defaultFilters: GamePerformanceReportRequest = {
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
      const blob = await reportsSvc.exportGamePerformanceReport(
        filters,
        format,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `game-performance-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(
        `Game performance report exported as ${format.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Failed to export game performance report:", error);
      toast.error("Failed to export game performance report");
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleSort = (
    field: "ggr" | "most_played" | "rtp" | "bet_volume",
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

  const handleViewPlayers = (gameId: string) => {
    setSelectedGame(gameId);
    setShowPlayersModal(true);
    setPlayersPage(1);
    setPlayerFilters({
      page: 1,
      per_page: 50,
      sort_by: "total_stake",
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
    if (!selectedGame) return;

    try {
      setExporting(true);
      const request: GamePlayersRequest = {
        game_id: selectedGame,
        ...playerFilters,
      };
      const blob = await reportsSvc.exportGamePlayers(request, "csv");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `game-players-${selectedGame}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Game players exported successfully");
    } catch (error) {
      console.error("Failed to export game players:", error);
      toast.error("Failed to export game players");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Gamepad2 className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Game Performance Report
            </h1>
            <p className="text-gray-400 text-sm">Aggregated metrics by game</p>
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
      {reportData && reportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Bets</p>
                <p className="text-2xl font-bold text-blue-400">
                  {reportData.summary.total_bets.toLocaleString()}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Unique Players</p>
                <p className="text-2xl font-bold text-green-400">
                  {reportData.summary.total_unique_players.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Wagered</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(reportData.summary.total_wagered)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total GGR</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(reportData.summary.total_ggr)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Rakeback</p>
                <p className="text-2xl font-bold text-pink-400">
                  {formatCurrency(reportData.summary.total_rakeback)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-pink-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average RTP</p>
                <p className="text-2xl font-bold text-white">
                  {formatPercentage(reportData.summary.average_rtp)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-500" />
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

            {/* Game Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Provider
              </label>
              <input
                type="text"
                value={filters.game_provider || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "game_provider",
                    e.target.value || undefined,
                  )
                }
                placeholder="Filter by provider"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Game ID - Searchable */}
            <div className="relative" ref={gameSearchRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Gamepad2 className="h-4 w-4 inline mr-1" />
                Game
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedGameName || gameSearchTerm}
                  onChange={(e) => {
                    setGameSearchTerm(e.target.value);
                    setSelectedGameName("");
                    setShowGameDropdown(true);
                    if (!e.target.value) {
                      handleFilterChange("game_id", undefined);
                      setShowGameDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (
                      games.length > 0 ||
                      gameSearchTerm.length >= 2 ||
                      selectedGameName
                    ) {
                      setShowGameDropdown(true);
                    }
                  }}
                  placeholder="Search games..."
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 pr-8"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {showGameDropdown &&
                (gameSearchTerm.length >= 2 || games.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingGames ? (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        Loading games...
                      </div>
                    ) : games.length > 0 ? (
                      <>
                        <div
                          className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700 cursor-pointer hover:bg-gray-700"
                          onClick={() => {
                            handleFilterChange("game_id", undefined);
                            setGameSearchTerm("");
                            setSelectedGameName("");
                            setShowGameDropdown(false);
                          }}
                        >
                          Clear selection
                        </div>
                        {games.map((game) => (
                          <div
                            key={game.id}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                            onClick={() => {
                              handleFilterChange("game_id", game.game_id);
                              setSelectedGameName(game.name);
                              setGameSearchTerm("");
                              setShowGameDropdown(false);
                            }}
                          >
                            <div className="font-medium">{game.name}</div>
                            <div className="text-xs text-gray-400">
                              ID: {game.game_id} | Provider: {game.provider}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : gameSearchTerm.length >= 2 ? (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        No games found
                      </div>
                    ) : null}
                  </div>
                )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={filters.category || ""}
                onChange={(e) =>
                  handleFilterChange("category", e.target.value || undefined)
                }
                placeholder="Filter by category"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
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
                      | "ggr"
                      | "most_played"
                      | "rtp"
                      | "bet_volume",
                  );
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="ggr">Highest GGR</option>
                <option value="most_played">Most Played</option>
                <option value="rtp">Highest RTP</option>
                <option value="bet_volume">Highest Bet Volume</option>
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
            Loading game performance report...
          </div>
        ) : !reportData || !reportData.data || reportData.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No game data found for the selected criteria
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Game
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("most_played")}
                    >
                      <div className="flex items-center">
                        Total Bets {getSortIcon("most_played")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rounds
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Unique Players
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("bet_volume")}
                    >
                      <div className="flex items-center">
                        Total Stake {getSortIcon("bet_volume")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Win
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("ggr")}
                    >
                      <div className="flex items-center">
                        GGR {getSortIcon("ggr")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("rtp")}
                    >
                      <div className="flex items-center">
                        RTP {getSortIcon("rtp")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Avg Bet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Big Wins
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {reportData.data &&
                    reportData.data.map((metric) => (
                      <tr key={metric.game_id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="text-white font-medium">
                              {metric.game_name}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {metric.game_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {metric.provider}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {metric.category || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {metric.total_bets.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {metric.total_rounds.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {metric.unique_players.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-yellow-400">
                          {formatCurrency(metric.total_stake)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-400">
                          {formatCurrency(metric.total_win)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-400">
                          {formatCurrency(metric.ggr)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatPercentage(metric.effective_rtp)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatCurrency(metric.avg_bet_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {metric.big_wins_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleViewPlayers(metric.game_id)}
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
      {showPlayersModal && selectedGame && (
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
                    Players for {selectedGame}
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
                    Currency
                  </label>
                  <input
                    type="text"
                    value={playerFilters.currency || ""}
                    onChange={(e) =>
                      handlePlayerFilterChange(
                        "currency",
                        e.target.value || undefined,
                      )
                    }
                    placeholder="Filter by currency"
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  />
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
              ) : !playersData ||
                !playersData.data ||
                playersData.data.length === 0 ? (
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
                          Total Stake
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Total Win
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          GGR
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Rakeback
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Rounds
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                          Last Played
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {playersData.data &&
                        playersData.data.map((player) => (
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
                            <td className="px-3 py-2 text-yellow-400">
                              {formatCurrency(
                                player.total_stake,
                                player.currency,
                              )}
                            </td>
                            <td className="px-3 py-2 text-green-400">
                              {formatCurrency(
                                player.total_win,
                                player.currency,
                              )}
                            </td>
                            <td
                              className={`px-3 py-2 font-semibold ${player.ngr >= 0 ? "text-red-400" : "text-green-400"}`}
                            >
                              {formatCurrency(player.ngr, player.currency)}
                            </td>
                            <td className="px-3 py-2 text-pink-400">
                              {formatCurrency(player.rakeback, player.currency)}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {player.number_of_rounds.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-gray-300">
                              {player.last_played
                                ? formatDate(player.last_played)
                                : "N/A"}
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
