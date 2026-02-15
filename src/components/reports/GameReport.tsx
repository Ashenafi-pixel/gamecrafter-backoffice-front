import React, { useState, useEffect, useRef } from "react";
import {
  Gamepad2,
  Filter,
  Download,
  DollarSign,
  Users,
  BarChart3,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Percent,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  GameReport as GameReportType,
  GameReportFilters,
  GameReportRequest,
  GameBetDetail,
} from "../../types/reports";
import { toast } from "react-hot-toast";

export const GameReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [allReports, setAllReports] = useState<GameReportType[]>([]);
  const [filteredReports, setFilteredReports] = useState<GameReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Game details modal
  const [selectedGame, setSelectedGame] = useState<GameReportType | null>(null);
  const [showGameDetails, setShowGameDetails] = useState(false);
  const [gameBets, setGameBets] = useState<GameBetDetail[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [betsPage, setBetsPage] = useState(1);
  const [betsTotalPages, setBetsTotalPages] = useState(1);

  const [filters, setFilters] = useState<GameReportFilters>({
    game: "",
    provider: "",
    gameType: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    minGgr: undefined,
    maxGgr: undefined,
    minRtp: undefined,
    maxRtp: undefined,
    minCashback: undefined,
    maxCashback: undefined,
    search: "",
    isTest: [false], // Default: only show non-test accounts
  });

  const [sortBy, setSortBy] = useState("turnoverEUR");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadReports();
  }, [currentPage, sortBy, sortOrder]);

  // Apply client-side filtering whenever filters or allReports change
  useEffect(() => {
    applyClientSideFilters();
  }, [filters, allReports, sortBy, sortOrder]);

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

  const loadReports = async () => {
    try {
      setLoading(true);
      const request: GameReportRequest = {
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
        filters,
      };

      console.log("GameReport component - sending request:", request);

      const response = await reportsSvc.getGameReports(request);

      console.log("Game reports response:", response);

      if (response.data) {
        setAllReports(response.data || []);
        setTotalPages(response.total_pages || 1);
        setTotalRecords(response.total || 0);
      } else {
        toast.error("Failed to load game reports");
      }
    } catch (error) {
      console.error("Error loading game reports:", error);
      toast.error("Failed to load game reports");
    } finally {
      setLoading(false);
    }
  };

  const applyClientSideFilters = () => {
    let filtered = [...allReports];

    // Filter by is_test (if report has isTest property)
    if (filters.isTest && filters.isTest.length > 0) {
      filtered = filtered.filter((report) => {
        const reportIsTest =
          (report as any).isTest || (report as any).is_test || false;
        return filters.isTest!.includes(reportIsTest);
      });
    }

    // Filter by search
    if (filters.search) {
      filtered = filtered.filter(
        (report) =>
          report.gameName
            ?.toLowerCase()
            .includes(filters.search!.toLowerCase()) ||
          report.provider
            ?.toLowerCase()
            .includes(filters.search!.toLowerCase()),
      );
    }

    // Filter by game
    if (filters.game) {
      filtered = filtered.filter((report) =>
        report.gameName?.toLowerCase().includes(filters.game!.toLowerCase()),
      );
    }

    // Filter by provider
    if (filters.provider) {
      filtered = filtered.filter(
        (report) =>
          report.provider?.toLowerCase() === filters.provider!.toLowerCase(),
      );
    }

    // Filter by gameType
    if (filters.gameType) {
      filtered = filtered.filter(
        (report) =>
          report.gameType?.toLowerCase() === filters.gameType!.toLowerCase(),
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(
        (report) =>
          report.status?.toLowerCase() === filters.status!.toLowerCase(),
      );
    }

    // Filter by dateFrom
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filtered = filtered.filter(
        (report) => new Date(report.createdAt) >= dateFrom,
      );
    }

    // Filter by dateTo
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (report) => new Date(report.createdAt) <= dateTo,
      );
    }

    // Filter by minGgr
    if (filters.minGgr !== undefined) {
      filtered = filtered.filter((report) => report.ggr >= filters.minGgr!);
    }

    // Filter by maxGgr
    if (filters.maxGgr !== undefined) {
      filtered = filtered.filter((report) => report.ggr <= filters.maxGgr!);
    }

    // Filter by minRtp
    if (filters.minRtp !== undefined) {
      filtered = filtered.filter((report) => report.rtp >= filters.minRtp!);
    }

    // Filter by maxRtp
    if (filters.maxRtp !== undefined) {
      filtered = filtered.filter((report) => report.rtp <= filters.maxRtp!);
    }

    // Filter by minCashback
    if (filters.minCashback !== undefined) {
      filtered = filtered.filter(
        (report) => report.cashbackGenerated >= filters.minCashback!,
      );
    }

    // Filter by maxCashback
    if (filters.maxCashback !== undefined) {
      filtered = filtered.filter(
        (report) => report.cashbackGenerated <= filters.maxCashback!,
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = (a as any)[sortBy];
      let bVal: any = (b as any)[sortBy];

      if (sortBy === "createdAt" || sortBy === "updatedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredReports(filtered);
  };

  const loadGameBets = async (gameId: string, page: number = 1) => {
    try {
      setLoadingBets(true);
      const response = await reportsSvc.getGameBets(gameId, page, 20);

      if (response.data) {
        setGameBets(response.data || []);
        setBetsTotalPages(response.pagination?.total_pages || 1);
      } else {
        toast.error("Failed to load game bets");
      }
    } catch (error) {
      console.error("Error loading game bets:", error);
      toast.error("Failed to load game bets");
    } finally {
      setLoadingBets(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleFilterChange = (key: keyof GameReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      game: "",
      provider: "",
      gameType: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      minGgr: undefined,
      maxGgr: undefined,
      minRtp: undefined,
      maxRtp: undefined,
      minCashback: undefined,
      maxCashback: undefined,
      search: "",
      isTest: [false], // Reset to default
    });
    setCurrentPage(1);
  };

  const handleViewDetails = async (game: GameReportType) => {
    setSelectedGame(game);
    setShowGameDetails(true);
    setBetsPage(1);
    await loadGameBets(game.id, 1);
  };

  const handleExport = async (format: "csv" | "excel") => {
    try {
      setExporting(true);
      const response = await reportsSvc.exportGameReports(filters, { format });

      if (response) {
        // Create download link
        const blob = new Blob([response], {
          type:
            format === "csv"
              ? "text/csv"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `game-reports-${new Date().toISOString().split("T")[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(
          `Game reports exported successfully as ${format.toUpperCase()}`,
        );
      } else {
        toast.error("Failed to export game reports");
      }
    } catch (error) {
      console.error("Error exporting game reports:", error);
      toast.error("Failed to export game reports");
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-EU").format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Game Reports</h1>
            <p className="text-gray-400">
              Comprehensive game performance analytics and bet details
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "Exporting..." : "Export"}
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 rounded-t-lg"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2 text-left text-white hover:bg-gray-600 rounded-b-lg"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game
                </label>
                <input
                  type="text"
                  value={filters.game || ""}
                  onChange={(e) => handleFilterChange("game", e.target.value)}
                  placeholder="Search by game name"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={filters.provider || ""}
                  onChange={(e) =>
                    handleFilterChange("provider", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Providers</option>
                  <option value="pragmatic">Pragmatic Play</option>
                  <option value="evolution">Evolution Gaming</option>
                  <option value="netent">NetEnt</option>
                  <option value="microgaming">Microgaming</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Type
                </label>
                <select
                  value={filters.gameType || ""}
                  onChange={(e) =>
                    handleFilterChange("gameType", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="slot">Slot</option>
                  <option value="table">Table</option>
                  <option value="live">Live</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status || ""}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min GGR (EUR)
                </label>
                <input
                  type="number"
                  value={filters.minGgr || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "minGgr",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max GGR (EUR)
                </label>
                <input
                  type="number"
                  value={filters.maxGgr || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "maxGgr",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="1000000"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min RTP (%)
                </label>
                <input
                  type="number"
                  value={filters.minRtp || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "minRtp",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max RTP (%)
                </label>
                <input
                  type="number"
                  value={filters.maxRtp || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "maxRtp",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="100"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Cashback (EUR)
                </label>
                <input
                  type="number"
                  value={filters.minCashback || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "minCashback",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Cashback (EUR)
                </label>
                <input
                  type="number"
                  value={filters.maxCashback || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "maxCashback",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="100000"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.isTest?.includes(false) || false}
                      onChange={(e) => {
                        const current = filters.isTest || [false];
                        if (e.target.checked) {
                          handleFilterChange("isTest", [
                            ...current.filter((v) => v !== false),
                            false,
                          ]);
                        } else {
                          const updated = current.filter((v) => v !== false);
                          handleFilterChange(
                            "isTest",
                            updated.length > 0 ? updated : [true],
                          );
                        }
                      }}
                      className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-white text-sm">Real Accounts</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.isTest?.includes(true) || false}
                      onChange={(e) => {
                        const current = filters.isTest || [false];
                        if (e.target.checked) {
                          handleFilterChange("isTest", [
                            ...current.filter((v) => v !== true),
                            true,
                          ]);
                        } else {
                          const updated = current.filter((v) => v !== true);
                          handleFilterChange(
                            "isTest",
                            updated.length > 0 ? updated : [false],
                          );
                        }
                      }}
                      className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-white text-sm">Test Accounts</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Games</p>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(totalRecords)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Turnover</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(
                    filteredReports.reduce(
                      (sum, report) => sum + report.turnoverEUR,
                      0,
                    ),
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Players</p>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(
                    filteredReports.reduce(
                      (sum, report) => sum + report.numberOfPlayers,
                      0,
                    ),
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Avg RTP</p>
                <p className="text-2xl font-bold text-white">
                  {filteredReports.length > 0
                    ? formatPercentage(
                        filteredReports.reduce(
                          (sum, report) => sum + report.rtp,
                          0,
                        ) / filteredReports.length,
                      )
                    : "0%"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Games Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Game
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort("numberOfBets")}
                  >
                    <div className="flex items-center">
                      Number of Bets
                      {getSortIcon("numberOfBets")}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort("turnoverEUR")}
                  >
                    <div className="flex items-center">
                      Turnover (EUR)
                      {getSortIcon("turnoverEUR")}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort("numberOfPlayers")}
                  >
                    <div className="flex items-center">
                      Players
                      {getSortIcon("numberOfPlayers")}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort("ggr")}
                  >
                    <div className="flex items-center">
                      GGR (EUR)
                      {getSortIcon("ggr")}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort("rtp")}
                  >
                    <div className="flex items-center">
                      RTP (%)
                      {getSortIcon("rtp")}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort("cashbackGenerated")}
                  >
                    <div className="flex items-center">
                      Cashback (EUR)
                      {getSortIcon("cashbackGenerated")}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="text-gray-400 mt-2">
                        Loading game reports...
                      </p>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      No game reports found
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-purple-600 rounded-lg mr-3">
                            <Gamepad2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {report.gameName}
                            </div>
                            <div className="text-sm text-gray-400">
                              {report.provider} • {report.gameType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatNumber(report.numberOfBets)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(report.turnoverEUR)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatNumber(report.numberOfPlayers)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(report.ggr)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center">
                          <Percent className="h-4 w-4 mr-1 text-gray-400" />
                          {formatPercentage(report.rtp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(report.cashbackGenerated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          onClick={() => handleViewDetails(report)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-700 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-400">
                  Showing {(currentPage - 1) * 20 + 1} to{" "}
                  {Math.min(currentPage * 20, totalRecords)} of {totalRecords}{" "}
                  results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Details Modal */}
      {showGameDetails && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedGame.gameName} - Bet Details
                </h2>
                <p className="text-gray-400">
                  {selectedGame.provider} • {selectedGame.gameType}
                </p>
              </div>
              <button
                onClick={() => setShowGameDetails(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingBets ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading bet details...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Bet Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Win Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Net Result
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Currency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Bet Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {gameBets.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-12 text-center text-gray-400"
                          >
                            No bet details found for this game
                          </td>
                        </tr>
                      ) : (
                        gameBets.map((bet) => (
                          <tr key={bet.id} className="hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                              {bet.playerUsername}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {formatCurrency(bet.betAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {formatCurrency(bet.winAmount)}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                bet.netResult >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {bet.netResult >= 0 ? "+" : ""}
                              {formatCurrency(bet.netResult)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {bet.currency}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {new Date(bet.betTime).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  bet.status === "completed"
                                    ? "bg-green-900 text-green-300"
                                    : bet.status === "pending"
                                      ? "bg-yellow-900 text-yellow-300"
                                      : "bg-red-900 text-red-300"
                                }`}
                              >
                                {bet.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bet Details Pagination */}
              {betsTotalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-400">
                      Showing {(betsPage - 1) * 20 + 1} to{" "}
                      {Math.min(betsPage * 20, gameBets.length)} of{" "}
                      {gameBets.length} bets
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setBetsPage((prev) => Math.max(prev - 1, 1));
                        loadGameBets(
                          selectedGame.id,
                          Math.max(betsPage - 1, 1),
                        );
                      }}
                      disabled={betsPage === 1}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-300">
                      Page {betsPage} of {betsTotalPages}
                    </span>
                    <button
                      onClick={() => {
                        setBetsPage((prev) =>
                          Math.min(prev + 1, betsTotalPages),
                        );
                        loadGameBets(
                          selectedGame.id,
                          Math.min(betsPage + 1, betsTotalPages),
                        );
                      }}
                      disabled={betsPage === betsTotalPages}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
