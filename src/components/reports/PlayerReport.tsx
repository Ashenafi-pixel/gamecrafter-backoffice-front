import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  MapPin,
  Activity,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  PlayerReport as PlayerReportType,
  PlayerReportFilters,
  PlayerReportRequest,
} from "../../types/reports";
import { toast } from "react-hot-toast";

export const PlayerReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [allReports, setAllReports] = useState<PlayerReportType[]>([]);
  const [filteredReports, setFilteredReports] = useState<PlayerReportType[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<PlayerReportFilters>({
    status: "",
    country: "",
    currency: "",
    dateFrom: "",
    dateTo: "",
    minWagered: undefined,
    maxWagered: undefined,
    search: "",
    isTest: [false], // Default: only show non-test accounts
  });

  const [sortBy, setSortBy] = useState("registrationDate");
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
      const request: PlayerReportRequest = {
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
        filters,
      };

      const response = await reportsSvc.getPlayerReports(request);
      setAllReports(response.data);
      setTotalPages(response.total_pages);
      setTotalRecords(response.total);
    } catch (error) {
      console.error("Failed to load player reports:", error);
      toast.error("Failed to load player reports");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof PlayerReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
          report.username
            ?.toLowerCase()
            .includes(filters.search!.toLowerCase()) ||
          report.email?.toLowerCase().includes(filters.search!.toLowerCase()),
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(
        (report) =>
          report.status?.toLowerCase() === filters.status!.toLowerCase(),
      );
    }

    // Filter by country
    if (filters.country) {
      filtered = filtered.filter(
        (report) =>
          report.country?.toLowerCase() === filters.country!.toLowerCase(),
      );
    }

    // Filter by currency
    if (filters.currency) {
      filtered = filtered.filter(
        (report) =>
          report.currency?.toLowerCase() === filters.currency!.toLowerCase(),
      );
    }

    // Filter by dateFrom
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filtered = filtered.filter(
        (report) => new Date(report.registrationDate) >= dateFrom,
      );
    }

    // Filter by dateTo
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (report) => new Date(report.registrationDate) <= dateTo,
      );
    }

    // Filter by minWagered
    if (filters.minWagered !== undefined) {
      filtered = filtered.filter(
        (report) => report.totalWagered >= filters.minWagered!,
      );
    }

    // Filter by maxWagered
    if (filters.maxWagered !== undefined) {
      filtered = filtered.filter(
        (report) => report.totalWagered <= filters.maxWagered!,
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = (a as any)[sortBy];
      let bVal: any = (b as any)[sortBy];

      if (
        sortBy === "registrationDate" ||
        sortBy === "createdAt" ||
        sortBy === "updatedAt"
      ) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredReports(filtered);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadReports();
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      country: "",
      currency: "",
      dateFrom: "",
      dateTo: "",
      minWagered: undefined,
      maxWagered: undefined,
      search: "",
      isTest: [false], // Reset to default
    });
    setCurrentPage(1);
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportPlayerReports(filters, { format });
      const filename = `player-report-${new Date().toISOString().split("T")[0]}.${format}`;
      await reportsSvc.downloadFile(blob, filename);
      toast.success(`Player report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Failed to export player report:", error);
      toast.error("Failed to export player report");
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-400 bg-green-900/20";
      case "INACTIVE":
        return "text-yellow-400 bg-yellow-900/20";
      case "BANNED":
        return "text-red-400 bg-red-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return reportsSvc.formatCurrency(amount, currency);
  };

  const formatNumber = (number: number) => {
    return reportsSvc.formatNumber(number);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-white">Player Report</h2>
            <p className="text-gray-400">
              Comprehensive player analytics and statistics
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
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
                  onClick={() => {
                    handleExport("csv");
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-t-lg"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => {
                    handleExport("excel");
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => {
                    handleExport("pdf");
                    setShowExportDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-b-lg"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-3 py-2"
                  placeholder="Search players..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Country
              </label>
              <input
                type="text"
                value={filters.country || ""}
                onChange={(e) => handleFilterChange("country", e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="Country code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Currency
              </label>
              <select
                value={filters.currency || ""}
                onChange={(e) => handleFilterChange("currency", e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="">All Currencies</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Min Wagered
              </label>
              <input
                type="number"
                value={filters.minWagered || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "minWagered",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Max Wagered
              </label>
              <input
                type="number"
                value={filters.maxWagered || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "maxWagered",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="1000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Players</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(totalRecords)}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Players</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(
                  reports.filter((r) => r.status === "ACTIVE").length,
                )}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Wagered</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(
                  filteredReports.reduce((sum, r) => sum + r.totalWagered, 0),
                  "USD",
                )}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Net Profit</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(
                  filteredReports.reduce((sum, r) => sum + r.netProfit, 0),
                  "USD",
                )}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Player
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("status")}
                >
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("registrationDate")}
                >
                  Registration
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("totalGamesPlayed")}
                >
                  Games Played
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("totalWagered")}
                >
                  Total Wagered
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("netProfit")}
                >
                  Net Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">
                      Loading player reports...
                    </p>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No player reports found
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {report.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {report.username}
                          </div>
                          <div className="text-sm text-gray-400">
                            {report.email}
                          </div>
                          {report.country && (
                            <div className="flex items-center text-xs text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {report.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(report.registrationDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatNumber(report.totalGamesPlayed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatCurrency(report.totalWagered, report.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        {report.netProfit >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1 text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1 text-red-400" />
                        )}
                        <span
                          className={
                            report.netProfit >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {formatCurrency(report.netProfit, report.currency)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button className="text-blue-400 hover:text-blue-300">
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
          <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * 20 + 1} to{" "}
              {Math.min(currentPage * 20, totalRecords)} of {totalRecords}{" "}
              results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
