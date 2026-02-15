import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  TransactionReport as TransactionReportType,
  TransactionReportFilters,
  TransactionReportRequest,
} from "../../types/reports";
import { toast } from "react-hot-toast";
import { CopyableText } from "../common/CopyableText";

export const TransactionReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [allReports, setAllReports] = useState<TransactionReportType[]>([]);
  const [filteredReports, setFilteredReports] = useState<
    TransactionReportType[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<TransactionReportFilters>({
    type: "",
    status: "",
    method: "",
    currency: "",
    dateFrom: "",
    dateTo: "",
    minAmount: undefined,
    maxAmount: undefined,
    search: "",
    playerId: "",
    is_test_transaction: false, // Default: Real Accounts (false)
  });

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Transaction details modal
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionReportType | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  useEffect(() => {
    loadReports();
  }, [currentPage]);

  // Apply client-side filtering whenever filters or allReports change
  useEffect(() => {
    applyClientSideFilters();
  }, [filters, allReports]);

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
      const request: TransactionReportRequest = {
        page: currentPage,
        per_page: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
        filters,
      };

      const reportsResponse = await reportsSvc.getTransactionReports(request);

      console.log("Transaction reports response:", reportsResponse);

      // Store all reports for client-side filtering
      setAllReports(reportsResponse.data);

      setTotalPages(reportsResponse.total_pages);
      setTotalRecords(reportsResponse.total);
    } catch (error: any) {
      console.error("Failed to load transaction reports:", error);

      // Check if it's an authentication error
      if (error.message?.includes("Authentication failed")) {
        toast.error("Session expired. Please log in again.");
        // Optionally redirect to login page
        // navigate('/login');
      } else {
        toast.error("Failed to load transaction reports");
      }
    } finally {
      setLoading(false);
    }
  };

  const applyClientSideFilters = () => {
    let filtered = [...allReports];

    // Filter by player ID (user_id)
    if (filters.playerId) {
      filtered = filtered.filter((report) =>
        (report as any).playerId
          ?.toLowerCase()
          .includes(filters.playerId.toLowerCase()),
      );
    }

    // Filter by search (transaction ID)
    if (filters.search) {
      filtered = filtered.filter(
        (report) =>
          report.transactionId
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          (report as any).depositSessionId
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()),
      );
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(
        (report) => report.type.toLowerCase() === filters.type.toLowerCase(),
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(
        (report) =>
          report.status.toLowerCase() === filters.status.toLowerCase(),
      );
    }

    // Filter by currency
    if (filters.currency) {
      filtered = filtered.filter(
        (report) =>
          report.currency.toLowerCase() === filters.currency.toLowerCase(),
      );
    }

    // Filter by date from
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filtered = filtered.filter(
        (report) => new Date(report.createdAt) >= dateFrom,
      );
    }

    // Filter by date to
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(
        (report) => new Date(report.createdAt) <= dateTo,
      );
    }

    // Filter by min amount
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(
        (report) => report.amount >= filters.minAmount!,
      );
    }

    // Filter by max amount
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(
        (report) => report.amount <= filters.maxAmount!,
      );
    }

    // Filter by is_test_transaction
    if (filters.is_test_transaction !== undefined) {
      filtered = filtered.filter((report) => {
        const reportIsTest =
          (report as any).is_test_transaction ||
          (report as any).isTest ||
          (report as any).is_test ||
          false;
        return reportIsTest === filters.is_test_transaction;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = (a as any)[sortBy];
      let bVal: any = (b as any)[sortBy];

      if (sortBy === "createdAt" || sortBy === "processedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Pagination
    const startIndex = (currentPage - 1) * 20;
    const endIndex = startIndex + 20;
    const paginated = filtered.slice(startIndex, endIndex);

    setFilteredReports(paginated);
    setTotalRecords(filtered.length);
    setTotalPages(Math.ceil(filtered.length / 20));
  };

  const handleFilterChange = (
    key: keyof TransactionReportFilters,
    value: any,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    // Client-side filtering is applied via useEffect
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      status: "",
      method: "",
      currency: "",
      dateFrom: "",
      dateTo: "",
      minAmount: undefined,
      maxAmount: undefined,
      search: "",
      isTest: [false], // Reset to default
    });
    setCurrentPage(1);
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExporting(true);
      const blob = await reportsSvc.exportTransactionReports(filters, {
        format,
      });
      const filename = `wallet-report-${new Date().toISOString().split("T")[0]}.${format}`;
      await reportsSvc.downloadFile(blob, filename);
      toast.success(`Wallet report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Failed to export wallet report:", error);
      toast.error("Failed to export wallet report");
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

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "text-green-400 bg-green-900/20";
      case "withdrawal":
        return "text-blue-400 bg-blue-900/20";
      case "bet":
        return "text-red-400 bg-red-900/20";
      case "win":
        return "text-purple-400 bg-purple-900/20";
      case "bonus":
        return "text-yellow-400 bg-yellow-900/20";
      case "refund":
        return "text-orange-400 bg-orange-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-900/20";
      case "pending":
        return "text-yellow-400 bg-yellow-900/20";
      case "failed":
        return "text-red-400 bg-red-900/20";
      case "cancelled":
        return "text-gray-400 bg-gray-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
      case "withdrawal":
        return <ArrowUpRight className="h-4 w-4 text-blue-400" />;
      case "bet":
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case "win":
        return <TrendingUp className="h-4 w-4 text-purple-400" />;
      case "bonus":
        return <DollarSign className="h-4 w-4 text-yellow-400" />;
      case "refund":
        return <CreditCard className="h-4 w-4 text-orange-400" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return reportsSvc.formatCurrency(amount, currency);
  };

  const formatNumber = (number: number) => {
    return reportsSvc.formatNumber(number);
  };

  const shortenMiddle = (value: string, head: number = 6, tail: number = 4) => {
    if (!value) return "";
    if (value.length <= head + tail + 1) return value;
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
  };

  const formatDateEU = (iso: string) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleViewTransaction = (transaction: TransactionReportType) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const closeTransactionDetails = () => {
    setSelectedTransaction(null);
    setShowTransactionDetails(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-8 w-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold text-white">Wallet Report</h2>
            <p className="text-gray-400">
              Financial transaction analytics and monitoring
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
                User ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.playerId || ""}
                  onChange={(e) =>
                    handleFilterChange("playerId", e.target.value)
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-3 py-2"
                  placeholder="Search user ID..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Transaction ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-3 py-2"
                  placeholder="Search by transaction ID..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Type
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="bet">Bet</option>
                <option value="win">Win</option>
                <option value="bonus">Bonus</option>
                <option value="refund">Refund</option>
              </select>
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
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="processing">Processing</option>
                <option value="confirmed">Confirmed</option>
              </select>
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
                Min Amount
              </label>
              <input
                type="number"
                value={filters.minAmount || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "minAmount",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Max Amount
              </label>
              <input
                type="number"
                value={filters.maxAmount || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "maxAmount",
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
              <div className="flex items-center space-x-4">
                <span
                  className={`text-sm font-medium ${filters.is_test_transaction === false ? "text-white" : "text-gray-400"}`}
                >
                  Real Accounts
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newValue =
                      filters.is_test_transaction === false ? true : false;
                    handleFilterChange("is_test_transaction", newValue);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    filters.is_test_transaction === true
                      ? "bg-purple-600"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      filters.is_test_transaction === true
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${filters.is_test_transaction === true ? "text-white" : "text-gray-400"}`}
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

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Deposit Session ID
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("type")}
                >
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Chain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Currency
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("amount")}
                >
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  USD Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Exchange Rate
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("status")}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort("createdAt")}
                >
                  Created At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">
                      Loading wallet reports...
                    </p>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No wallet reports found
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className="text-xs font-mono text-gray-300 max-w-[140px] truncate cursor-pointer hover:text-blue-400"
                        title={report.transactionId}
                        onClick={() => {
                          navigator.clipboard.writeText(report.transactionId);
                          toast.success("Transaction ID copied!");
                        }}
                      >
                        {shortenMiddle(report.transactionId)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className="text-xs font-mono text-gray-300 cursor-pointer hover:text-blue-400"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            (report as any).playerId || "",
                          );
                          toast.success("User ID copied!");
                        }}
                        title="Click to copy"
                      >
                        {shortenMiddle((report as any).playerId || "") || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-300 max-w-[120px] truncate">
                        {(report as any).depositSessionId || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(report.type)}`}
                      >
                        {report.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {(report as any).chainId || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300 font-mono">
                      {report.currency}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {report.amount.toFixed(6)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {(report as any).usdAmount
                        ? `$${(report as any).usdAmount}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {(report as any).exchangeRate
                        ? (report as any).exchangeRate.toFixed(2)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(report.status)}
                        <span
                          className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}
                        >
                          {report.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                      {formatDateEU(report.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => handleViewTransaction(report)}
                        title="View transaction details"
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

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Transaction Details
              </h3>
              <button
                onClick={closeTransactionDetails}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Transaction Date */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Date:</span>
                <span className="text-white font-mono">
                  {new Date(selectedTransaction.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Transaction ID */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Transaction ID:</span>
                <CopyableText
                  text={selectedTransaction.id}
                  className=""
                  label="Transaction ID"
                />
              </div>

              {/* Type */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Type:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(selectedTransaction.type)}`}
                >
                  {selectedTransaction.type}
                </span>
              </div>

              {/* Amount */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(
                    selectedTransaction.amount,
                    selectedTransaction.currency,
                  )}
                </span>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center ${getStatusColor(selectedTransaction.status)}`}
                >
                  {getStatusIcon(selectedTransaction.status)}
                  <span className="ml-1">{selectedTransaction.status}</span>
                </span>
              </div>

              {/* Method */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Payment Method:</span>
                <span className="text-white">
                  {selectedTransaction.method || "N/A"}
                </span>
              </div>

              {/* Currency */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Currency:</span>
                <span className="text-white">
                  {selectedTransaction.currency}
                </span>
              </div>

              {/* Created Date */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Created:</span>
                <span className="text-white">
                  {new Date(selectedTransaction.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Updated Date */}
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Last Updated:</span>
                <span className="text-white">
                  {new Date(selectedTransaction.updatedAt).toLocaleString()}
                </span>
              </div>

              {/* Description */}
              {selectedTransaction.description && (
                <div className="py-2 border-b border-gray-700">
                  <span className="text-gray-400 block mb-2">Description:</span>
                  <span className="text-white">
                    {selectedTransaction.description}
                  </span>
                </div>
              )}

              {/* Blockchain Fields */}
              {(selectedTransaction as any).txHash && (
                <>
                  <div className="py-2 border-b border-gray-700">
                    <span className="text-gray-400 block mb-1">
                      Transaction Hash:
                    </span>
                    <span className="text-white font-mono text-xs break-all">
                      {(selectedTransaction as any).txHash}
                    </span>
                  </div>

                  {(selectedTransaction as any).fromAddress && (
                    <div className="py-2 border-b border-gray-700">
                      <span className="text-gray-400 block mb-1">
                        From Address:
                      </span>
                      <span className="text-white font-mono text-xs break-all">
                        {(selectedTransaction as any).fromAddress}
                      </span>
                    </div>
                  )}

                  {(selectedTransaction as any).toAddress && (
                    <div className="py-2 border-b border-gray-700">
                      <span className="text-gray-400 block mb-1">
                        To Address:
                      </span>
                      <span className="text-white font-mono text-xs break-all">
                        {(selectedTransaction as any).toAddress}
                      </span>
                    </div>
                  )}

                  {(selectedTransaction as any).chainId && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400">Chain:</span>
                      <span className="text-white">
                        {(selectedTransaction as any).chainId}
                      </span>
                    </div>
                  )}

                  {(selectedTransaction as any).blockNumber && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400">Block Number:</span>
                      <span className="text-white">
                        {(selectedTransaction as any).blockNumber}
                      </span>
                    </div>
                  )}

                  {(selectedTransaction as any).confirmations !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400">Confirmations:</span>
                      <span className="text-white">
                        {(selectedTransaction as any).confirmations}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Deposit Session ID */}
              {(selectedTransaction as any).depositSessionId && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Deposit Session ID:</span>
                  <span className="text-white font-mono text-xs">
                    {(selectedTransaction as any).depositSessionId}
                  </span>
                </div>
              )}

              {/* USD Amount */}
              {(selectedTransaction as any).usdAmount && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">USD Amount:</span>
                  <span className="text-white font-semibold">
                    ${(selectedTransaction as any).usdAmount}
                  </span>
                </div>
              )}

              {/* Exchange Rate */}
              {(selectedTransaction as any).exchangeRate && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Exchange Rate:</span>
                  <span className="text-white">
                    {(selectedTransaction as any).exchangeRate.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Fee */}
              {(selectedTransaction as any).fee !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Fee:</span>
                  <span className="text-white">
                    {selectedTransaction.currency}{" "}
                    {parseFloat((selectedTransaction as any).fee).toFixed(6)}
                  </span>
                </div>
              )}

              {/* Processor */}
              {(selectedTransaction as any).processor && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Processor:</span>
                  <span className="text-white capitalize">
                    {(selectedTransaction as any).processor}
                  </span>
                </div>
              )}

              {/* Block Hash */}
              {(selectedTransaction as any).blockHash && (
                <div className="py-2 border-b border-gray-700">
                  <span className="text-gray-400 block mb-1">Block Hash:</span>
                  <span className="text-white font-mono text-xs break-all">
                    {(selectedTransaction as any).blockHash}
                  </span>
                </div>
              )}

              {/* Verified At */}
              {(selectedTransaction as any).verifiedAt && (
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Verified At:</span>
                  <span className="text-white text-sm">
                    {new Date(
                      (selectedTransaction as any).verifiedAt,
                    ).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Metadata */}
              {selectedTransaction.metadata && (
                <div className="py-2">
                  <span className="text-gray-400 block mb-2">
                    Additional Information:
                  </span>
                  <pre className="text-white text-sm bg-gray-900 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedTransaction.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeTransactionDetails}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
