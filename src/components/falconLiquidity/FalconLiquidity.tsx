import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  FalconLiquidityData,
  FalconLiquidityFilters,
  FalconLiquiditySummary,
} from "../../types/falconLiquidity";
import { falconLiquidityService } from "../../services/falconLiquidityService";

const FalconLiquidity: React.FC = () => {
  const [data, setData] = useState<FalconLiquidityData[]>([]);
  const [summary, setSummary] = useState<FalconLiquiditySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<FalconLiquidityData | null>(
    null,
  );
  const [showViewModal, setShowViewModal] = useState(false);
  const [filters, setFilters] = useState<FalconLiquidityFilters>({
    page: 1,
    per_page: 50,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    current_page: 1,
    total_pages: 1,
    per_page: 50,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dataResponse, summaryResponse] = await Promise.all([
        falconLiquidityService.getAllData(filters),
        falconLiquidityService.getSummary(),
      ]);

      if (dataResponse.success) {
        setData(dataResponse.data.messages || []);
        const total = dataResponse.data.total || 0;
        const perPage = filters.per_page || 50;
        const currentPage = filters.page || 1;
        const totalPages = Math.ceil(total / perPage);

        setPagination({
          total,
          current_page: currentPage,
          total_pages: totalPages,
          per_page: perPage,
        });
      } else {
        setError("Failed to load Falcon Liquidity data");
      }

      if (summaryResponse.success) {
        setSummary(summaryResponse.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load Falcon Liquidity data");
      console.error("Error loading Falcon Liquidity data:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (
    key: keyof FalconLiquidityFilters,
    value: any,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.total_pages) return;
    setFilters((prev) => ({
      ...prev,
      page: page,
    }));
  };

  const handleNextPage = () => {
    if (pagination.current_page < pagination.total_pages) {
      handlePageChange(pagination.current_page + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.current_page > 1) {
      handlePageChange(pagination.current_page - 1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "acknowledged":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "acknowledged":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case "casino":
        return "bg-purple-100 text-purple-800";
      case "sport":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatMessageData = (messageData: any) => {
    try {
      return JSON.stringify(messageData, null, 2);
    } catch {
      return String(messageData);
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Falcon Liquidity</h1>
            <p className="text-gray-400">
              Monitor Falcon Liquidity messages and data flow
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Total Messages</p>
                  <p className="text-2xl font-bold text-white">
                    {summary.total_messages}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-600 rounded-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-white">
                    {summary.pending_messages}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-600 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Sent</p>
                  <p className="text-2xl font-bold text-white">
                    {summary.sent_messages}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-600 rounded-lg">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Failed</p>
                  <p className="text-2xl font-bold text-white">
                    {summary.failed_messages}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Casino Messages</p>
                  <p className="text-2xl font-bold text-white">
                    {summary.casino_messages}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-600 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-400 text-sm">Sport Messages</p>
                  <p className="text-2xl font-bold text-white">
                    {summary.sport_messages}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">Filters</h3>
            <button
              onClick={() =>
                setFilters({
                  page: 1,
                  per_page: 50,
                })
              }
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear All Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message Type
              </label>
              <select
                value={filters.message_type || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "message_type",
                    e.target.value || undefined,
                  )
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="casino">Casino</option>
                <option value="sport">Sport</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="acknowledged">Acknowledged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                placeholder="Search by transaction ID..."
                value={filters.transaction_id || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "transaction_id",
                    e.target.value || undefined,
                  )
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="text"
                placeholder="Search by user ID..."
                value={filters.user_id || ""}
                onChange={(e) =>
                  handleFilterChange("user_id", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message ID
              </label>
              <input
                type="text"
                placeholder="Search by message ID..."
                value={filters.message_id || ""}
                onChange={(e) =>
                  handleFilterChange("message_id", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) =>
                  handleFilterChange("date_to", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reconciliation Status
              </label>
              <select
                value={filters.reconciliation_status || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "reconciliation_status",
                    e.target.value || undefined,
                  )
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="reconciled">Reconciled</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">
                Loading Falcon Liquidity data...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No Falcon Liquidity data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Message Type
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="text-white font-mono text-sm">
                          {item.transaction_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300 font-mono text-sm">
                          {item.user_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getMessageTypeColor(item.message_type)}`}
                        >
                          {item.message_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(item.status)}
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedData(item);
                            setShowViewModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-gray-400">
            Showing{" "}
            {pagination.total > 0
              ? (pagination.current_page - 1) * pagination.per_page + 1
              : 0}{" "}
            to{" "}
            {Math.min(
              pagination.current_page * pagination.per_page,
              pagination.total,
            )}{" "}
            of {pagination.total} results
          </div>
          {pagination.total_pages > 1 ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousPage}
                disabled={pagination.current_page === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {Array.from(
                  { length: Math.min(5, pagination.total_pages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.current_page <= 3) {
                      pageNum = i + 1;
                    } else if (
                      pagination.current_page >=
                      pagination.total_pages - 2
                    ) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = pagination.current_page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          pagination.current_page === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-white hover:bg-gray-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  },
                )}
              </div>
              <button
                onClick={handleNextPage}
                disabled={pagination.current_page === pagination.total_pages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              {pagination.total > 0 ? "All results shown" : "No results"}
            </div>
          )}
        </div>

        {/* View Details Modal */}
        {showViewModal && selectedData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Falcon Liquidity Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Transaction ID
                    </label>
                    <p className="text-white font-mono text-sm">
                      {selectedData.transaction_id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      User ID
                    </label>
                    <p className="text-white font-mono text-sm">
                      {selectedData.user_id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Message Type
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getMessageTypeColor(selectedData.message_type)}`}
                    >
                      {selectedData.message_type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Status
                    </label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedData.status)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(selectedData.status)}`}
                      >
                        {selectedData.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Created At
                    </label>
                    <p className="text-white text-sm">
                      {formatDateTime(selectedData.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Updated At
                    </label>
                    <p className="text-white text-sm">
                      {formatDateTime(selectedData.updated_at)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message Data
                  </label>
                  <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto text-sm">
                    {formatMessageData(selectedData.message_data)}
                  </pre>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FalconLiquidity;
