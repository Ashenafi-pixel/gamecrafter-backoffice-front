import React, { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Search,
  Filter,
  Download,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Gamepad2,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  BigWinnersReportRequest,
  BigWinnersReportResponse,
  BigWinner,
} from "../../types/reports";
import { toast } from "react-hot-toast";
import { brandService, Brand } from "../../services/brandService";
import { gameManagementService } from "../../services/gameManagementService";
import { Game } from "../../types/gameManagement";

export const BigWinnersReport: React.FC = () => {
  const { reportsSvc, adminSvc } = useServices();
  const [reportData, setReportData] = useState<BigWinnersReportResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedWinner, setSelectedWinner] = useState<BigWinner | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gameSearchTerm, setGameSearchTerm] = useState("");
  const [selectedGameName, setSelectedGameName] = useState<string>("");
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const gameSearchRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const playerSearchRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<BigWinnersReportRequest>({
    page: 1,
    per_page: 20,
    date_from: new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16), // Last 24 hours
    date_to: new Date().toISOString().slice(0, 16),
    min_win_threshold: 100,
    bet_type: "both",
    sort_by: "date",
    sort_order: "desc",
    is_test_account: false, // Default: Real Accounts only
  });

  const [sortBy, setSortBy] = useState<
    "win_amount" | "net_win" | "multiplier" | "date"
  >("date");
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

  // Fetch games when search term changes
  useEffect(() => {
    const fetchGames = async () => {
      if (
        gameSearchTerm.length >= 1 ||
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

  // Click outside handler for game and player dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        gameSearchRef.current &&
        !gameSearchRef.current.contains(event.target as Node)
      ) {
        setShowGameDropdown(false);
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

  // Click outside handler for export dropdown
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
      const request: BigWinnersReportRequest = {
        ...filters,
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await reportsSvc.getBigWinnersReport(request);
      setReportData(response);
    } catch (error: any) {
      console.error("Failed to load big winners report:", error);
      toast.error(
        error.response?.data?.message || "Failed to load big winners report",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    key: keyof BigWinnersReportRequest,
    value: any,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReport();
  };

  const clearFilters = () => {
    const defaultFilters: BigWinnersReportRequest = {
      page: 1,
      per_page: 20,
      date_from: new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
      date_to: new Date().toISOString().slice(0, 16),
      min_win_threshold: 100,
      bet_type: "both",
      sort_by: "date",
      sort_order: "desc",
      is_test_account: false, // Default: Real Accounts only
    };
    setFilters(defaultFilters);
    setCurrentPage(1);
    setGameSearchTerm("");
    setSelectedGameName("");
    setShowGameDropdown(false);
    setPlayerSearchTerm("");
    setSelectedPlayerName("");
    setShowPlayerDropdown(false);
  };

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportBigWinnersReport(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `big-winners-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Big winners report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Failed to export big winners report:", error);
      toast.error("Failed to export big winners report");
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const handleSort = (
    field: "win_amount" | "net_win" | "multiplier" | "date",
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
    return new Date(dateString).toLocaleString();
  };

  const formatMultiplier = (multiplier?: number) => {
    if (!multiplier) return "N/A";
    return `${multiplier.toFixed(2)}x`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Big Winners Report
            </h1>
            <p className="text-gray-400 text-sm">
              Identify players who have won large amounts
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
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-t-lg"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-b-lg"
                >
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Big Wins</p>
                <p className="text-2xl font-bold text-white">
                  {reportData.summary.count.toLocaleString()}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Win Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(
                    parseFloat(reportData.summary.total_wins.toString()),
                  )}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Net Win</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(
                    parseFloat(reportData.summary.total_net_wins.toString()),
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Stakes</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(
                    parseFloat(reportData.summary.total_stakes.toString()),
                  )}
                </p>
              </div>
              <Gamepad2 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                From Date/Time
              </label>
              <input
                type="datetime-local"
                value={filters.date_from || ""}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value)
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                To Date/Time
              </label>
              <input
                type="datetime-local"
                value={filters.date_to || ""}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            {/* Minimum Win Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Minimum Win Threshold
              </label>
              <input
                type="number"
                value={filters.min_win_threshold || 100}
                onChange={(e) =>
                  handleFilterChange(
                    "min_win_threshold",
                    parseFloat(e.target.value) || 100,
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
                min="0"
                step="0.01"
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

            {/* Game Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Gamepad2 className="h-4 w-4 inline mr-1" />
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
                (gameSearchTerm.length >= 1 || games.length > 0) && (
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
                    ) : gameSearchTerm.length >= 1 ? (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        No games found
                      </div>
                    ) : null}
                  </div>
                )}
            </div>

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

            {/* Bet Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bet Type
              </label>
              <select
                value={filters.bet_type || "both"}
                onChange={(e) =>
                  handleFilterChange(
                    "bet_type",
                    e.target.value as "cash" | "bonus" | "both",
                  )
                }
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="both">Both</option>
                <option value="cash">Cash Only</option>
                <option value="bonus">Bonus Only</option>
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
                      | "win_amount"
                      | "net_win"
                      | "multiplier"
                      | "date",
                  );
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="date">Date/Time</option>
                <option value="win_amount">Win Amount</option>
                <option value="net_win">Net Win</option>
                <option value="multiplier">Multiplier</option>
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
            Loading big winners...
          </div>
        ) : !reportData || !reportData.data || reportData.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No big wins found for the selected criteria
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date/Time {getSortIcon("date")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Game
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Bet ID
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("win_amount")}
                    >
                      <div className="flex items-center">
                        Win Amount {getSortIcon("win_amount")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("net_win")}
                    >
                      <div className="flex items-center">
                        Net Win {getSortIcon("net_win")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Stake
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort("multiplier")}
                    >
                      <div className="flex items-center">
                        Multiplier {getSortIcon("multiplier")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {reportData.data &&
                    reportData.data.map((winner) => (
                      <tr key={winner.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(winner.date_time)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="text-white font-medium">
                              {winner.username}
                            </div>
                            {winner.email && (
                              <div className="text-gray-400 text-xs">
                                {winner.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div>
                            {winner.game_name || winner.game_id || "N/A"}
                            {winner.game_provider && (
                              <div className="text-xs text-gray-500">
                                {winner.game_provider}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {winner.bet_id || winner.round_id || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-400">
                          {formatCurrency(
                            parseFloat(winner.win_amount.toString()),
                            winner.currency,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-400">
                          {formatCurrency(
                            parseFloat(winner.net_win.toString()),
                            winner.currency,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatCurrency(
                            parseFloat(winner.stake_amount.toString()),
                            winner.currency,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-yellow-400">
                          {formatMultiplier(
                            winner.win_multiplier
                              ? parseFloat(winner.win_multiplier.toString())
                              : undefined,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {winner.currency}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => {
                              setSelectedWinner(winner);
                              setShowDetailModal(true);
                            }}
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

      {/* Detail Modal */}
      {showDetailModal && selectedWinner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Bet Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Date/Time</label>
                  <p className="text-white">
                    {formatDate(selectedWinner.date_time)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Player</label>
                  <p className="text-white">{selectedWinner.username}</p>
                  {selectedWinner.email && (
                    <p className="text-gray-400 text-sm">
                      {selectedWinner.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-400">Game</label>
                  <p className="text-white">
                    {selectedWinner.game_name ||
                      selectedWinner.game_id ||
                      "N/A"}
                  </p>
                  {selectedWinner.game_provider && (
                    <p className="text-gray-400 text-sm">
                      Provider: {selectedWinner.game_provider}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-400">Bet Source</label>
                  <p className="text-white capitalize">
                    {selectedWinner.bet_source}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Bet ID</label>
                  <p className="text-white">{selectedWinner.bet_id || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Round ID</label>
                  <p className="text-white">
                    {selectedWinner.round_id || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Stake Amount</label>
                  <p className="text-white font-semibold">
                    {formatCurrency(
                      parseFloat(selectedWinner.stake_amount.toString()),
                      selectedWinner.currency,
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Win Amount</label>
                  <p className="text-green-400 font-semibold">
                    {formatCurrency(
                      parseFloat(selectedWinner.win_amount.toString()),
                      selectedWinner.currency,
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Net Win</label>
                  <p className="text-blue-400 font-semibold">
                    {formatCurrency(
                      parseFloat(selectedWinner.net_win.toString()),
                      selectedWinner.currency,
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Multiplier</label>
                  <p className="text-yellow-400 font-semibold">
                    {formatMultiplier(
                      selectedWinner.win_multiplier
                        ? parseFloat(selectedWinner.win_multiplier.toString())
                        : undefined,
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Currency</label>
                  <p className="text-white">{selectedWinner.currency}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Bet Type</label>
                  <p className="text-white capitalize">
                    {selectedWinner.bet_type}
                  </p>
                </div>
                {selectedWinner.brand_name && (
                  <div>
                    <label className="text-sm text-gray-400">Brand</label>
                    <p className="text-white">{selectedWinner.brand_name}</p>
                  </div>
                )}
                {selectedWinner.country && (
                  <div>
                    <label className="text-sm text-gray-400">Country</label>
                    <p className="text-white">{selectedWinner.country}</p>
                  </div>
                )}
                {selectedWinner.session_id && (
                  <div>
                    <label className="text-sm text-gray-400">Session ID</label>
                    <p className="text-white font-mono text-xs">
                      {selectedWinner.session_id}
                    </p>
                  </div>
                )}
                {selectedWinner.is_jackpot && (
                  <div>
                    <label className="text-sm text-gray-400">Jackpot</label>
                    <p className="text-yellow-400 font-semibold">
                      {selectedWinner.jackpot_name || "Yes"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
