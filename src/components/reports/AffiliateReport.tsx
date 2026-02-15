import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { toast } from "react-hot-toast";
import {
  AffiliateReportRequest,
  AffiliateReportResponse,
  AffiliateReportRow,
  AffiliatePlayersReportResponse,
  AffiliatePlayerReportRow,
} from "../../types/reports";
import { Loader2 } from "lucide-react";

export const AffiliateReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [report, setReport] = useState<AffiliateReportResponse | null>(null);
  const [playersReport, setPlayersReport] =
    useState<AffiliatePlayersReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedReferralCode, setSelectedReferralCode] = useState<
    string | null
  >(null);
  const [filters, setFilters] = useState<AffiliateReportRequest>({
    is_test_account: false, 
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(20);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, [currentPage]);

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
      const request = {
        ...filters,
        page: currentPage,
        per_page: perPage,
      };
      const response = await reportsSvc.getAffiliateReport(request);
      setReport(response);
    } catch (error: any) {
      console.error("Failed to load affiliate report:", error);
      toast.error(
        error?.response?.data?.message || "Failed to load affiliate report",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    key: keyof AffiliateReportRequest,
    value: string | boolean,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadReport();
  };

  const handleResetFilters = () => {
    setFilters({
      is_test_account: false, // Default: Real Accounts only
    });
    setCurrentPage(1);
    setTimeout(() => {
      loadReport();
    }, 100);
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const handleRowClick = async (referralCode: string) => {
    try {
      setSelectedReferralCode(referralCode);
      setLoadingPlayers(true);
      const response = await reportsSvc.getAffiliatePlayersReport({
        referral_code: referralCode,
        date_from: filters.date_from,
        date_to: filters.date_to,
        is_test_account: filters.is_test_account,
      });
      setPlayersReport(response);
    } catch (error: any) {
      console.error("Failed to load players report:", error);
      toast.error(
        error?.response?.data?.message || "Failed to load players report",
      );
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleBack = () => {
    setSelectedReferralCode(null);
    setPlayersReport(null);
  };

  return (
    <div className="space-y-6">
      {/* Minimal Clean Header */}
      <div className="flex items-center justify-between mb-6">
        {selectedReferralCode ? (
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Players: {selectedReferralCode}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Player-level metrics for this referral code
              </p>
            </div>
          </div>
        ) : (
          <h2 className="text-2xl font-semibold text-white">
            Affiliate Report
          </h2>
        )}
        {!selectedReferralCode && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Toggle Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={loadReport}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                title="Export"
              >
                <Download className="h-4 w-4" />
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={() => {
                      // Handle CSV export
                      setShowExportDropdown(false);
                      toast.success("Export functionality coming soon");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                  >
                    CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Minimal Filters */}
      {!selectedReferralCode && showFilters && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3 flex-wrap">
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value)
                }
                className="bg-slate-800/50 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="Date From"
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                className="bg-slate-800/50 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="Date To"
              />
              <input
                type="text"
                value={filters.referral_code || ""}
                onChange={(e) =>
                  handleFilterChange("referral_code", e.target.value)
                }
                placeholder="Referral Code"
                className="bg-slate-800/50 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">Real</span>
                <button
                  type="button"
                  onClick={() => {
                    const newValue =
                      filters.is_test_account === false ? true : false;
                    handleFilterChange("is_test_account", newValue);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filters.is_test_account === true
                      ? "bg-slate-600"
                      : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      filters.is_test_account === true
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-400">Test</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Apply
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {selectedReferralCode && playersReport?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Total Registrations</p>
            <p className="text-xl font-semibold text-white">
              {formatNumber(playersReport.summary.total_registrations)}
            </p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Unique Depositors</p>
            <p className="text-xl font-semibold text-white">
              {formatNumber(playersReport.summary.total_unique_depositors)}
            </p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Total GGR</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(playersReport.summary.total_ggr)}
            </p>
          </div>
        </div>
      )}
      {!selectedReferralCode && report?.summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Total Registrations</p>
              <p className="text-xl font-semibold text-white">
                {formatNumber(report.summary.total_registrations)}
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Unique Depositors</p>
              <p className="text-xl font-semibold text-white">
                {formatNumber(report.summary.total_unique_depositors)}
              </p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Total GGR</p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(report.summary.total_ggr)}
              </p>
            </div>
          </div>

          {/* Registrations List */}
          {report.summary.registrations &&
            report.summary.registrations.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden mt-12 mb-12">
                <div className="px-6 py-4 border-b border-slate-700/30">
                  <h3 className="text-sm font-medium text-white">
                    Recent Registrations ({report.summary.registrations.length})
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/30">
                        <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Username
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Referral Code
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Registration Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.summary.registrations.map((reg, index) => (
                        <tr
                          key={`${reg.user_id}-${index}`}
                          className="border-b border-slate-700/20 hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-6 text-sm text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-3 px-6 text-sm text-slate-300">
                            {reg.username || "N/A"}
                          </td>
                          <td className="py-3 px-6 text-sm text-slate-300">
                            {reg.email || "N/A"}
                          </td>
                          <td className="py-3 px-6 text-sm">
                            <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs">
                              {reg.referral_code}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-sm text-slate-300">
                            {reg.created_at
                              ? new Date(reg.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </>
      )}

      {/* Clean Report Table */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden">
        {!loading && !loadingPlayers && (
          <div className="px-6 py-4 border-b border-slate-700/30">
            <h3 className="text-sm font-medium text-white">
              {selectedReferralCode
                ? "Players Report"
                : "Affiliate Report by Referral Code"}
            </h3>
          </div>
        )}
        {loading || loadingPlayers ? (
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700 rounded-xl p-12 text-center shadow-xl">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-slate-400 text-lg font-medium">
                Loading report...
              </div>
            </div>
          </div>
        ) : selectedReferralCode && playersReport ? (
          // Player-level drill-down view
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Registrations
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Unique Depositors
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Active Customers
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Bets
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    GGR (USD)
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Deposits (USD)
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Withdrawals (USD)
                  </th>
                </tr>
              </thead>
              <tbody>
                {playersReport.data.map(
                  (row: AffiliatePlayerReportRow, index: number) => (
                    <tr
                      key={`${row.player_id}-${index}`}
                      className="border-b border-slate-700/20 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-6 text-sm text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-6 text-sm text-white">
                        {row.username || "N/A"}
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-300">
                        {row.email || (
                          <span className="text-slate-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right">
                        {formatNumber(row.registrations)}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right">
                        {formatNumber(row.unique_depositors)}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right">
                        {formatNumber(row.active_customers)}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right">
                        {formatNumber(row.total_bets)}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right font-medium">
                        {formatCurrency(row.ggr)}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right font-medium">
                        {formatCurrency(row.deposits_usd)}
                      </td>
                      <td className="py-3 px-6 text-sm text-white text-right font-medium">
                        {formatCurrency(row.withdrawals_usd)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : report?.data && report.data.length > 0 ? (
          // Main referral code view
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Referral Code
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Affiliate Username
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Registrations
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Unique Depositors
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Active Customers
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Bets
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    GGR (USD)
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Deposits (USD)
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Withdrawals (USD)
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((row: AffiliateReportRow, index: number) => (
                  <tr
                    key={`${row.referral_code}-${index}`}
                    onClick={() => handleRowClick(row.referral_code)}
                    className="border-b border-slate-700/20 hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-6 text-sm text-slate-400">
                      {(currentPage - 1) * perPage + index + 1}
                    </td>
                    <td className="py-3 px-6 text-sm text-white">
                      {row.referral_code}
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-300">
                      {row.affiliate_username &&
                      row.affiliate_username !== "N/A" ? (
                        row.affiliate_username
                      ) : (
                        <span className="text-slate-500 italic">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right">
                      {formatNumber(row.registrations)}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right">
                      {formatNumber(row.unique_depositors)}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right">
                      {formatNumber(row.active_customers)}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right">
                      {formatNumber(row.total_bets)}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right font-medium">
                      {formatCurrency(row.ggr)}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right font-medium">
                      {formatCurrency(row.deposits_usd)}
                    </td>
                    <td className="py-3 px-6 text-sm text-white text-right font-medium">
                      {formatCurrency(row.withdrawals_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">
            No data available for the selected filters
          </div>
        )}
        {/* Pagination */}
        {!selectedReferralCode && report?.data && report.data.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-700/30 bg-slate-800/20 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * perPage + 1} to{" "}
              {Math.min(currentPage * perPage, (report as any).total || report.data.length)} of{" "}
              {(report as any).total || report.data.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-300 px-3">
                Page {currentPage} of {(report as any).total_pages || Math.ceil(report.data.length / perPage) || 1}
              </span>
              <button
                onClick={() => {
                  const totalPages = (report as any).total_pages || Math.ceil(report.data.length / perPage) || 1;
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                }}
                disabled={currentPage >= ((report as any).total_pages || Math.ceil(report.data.length / perPage) || 1)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
