import React, { useState, useEffect } from "react";
import {
  Gift,
  Filter,
  Search,
  Loader2,
  Calendar,
  DollarSign,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { brandService, Brand } from "../../services/brandService";
import toast from "react-hot-toast";

interface WelcomeBonusTransaction {
  id: string;
  user_id: string;
  username?: string;
  email?: string;
  transaction_type: string;
  amount: string;
  currency: string;
  status: string;
  balance_before: string;
  balance_after: string;
  external_transaction_id?: string;
  metadata?: string;
  created_at: string;
}

export const WelcomeBonusManagement: React.FC = () => {
  const { adminSvc } = useServices();
  const [transactions, setTransactions] = useState<WelcomeBonusTransaction[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    page_size: number;
    pages: number;
  } | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [brandId, setBrandId] = useState("");

  // Brands for dropdown
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch brands on component mount
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
        toast.error("Failed to load brands");
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    fetchWelcomeBonuses();
  }, [
    currentPage,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    status,
    userId,
    brandId,
  ]);

  const fetchWelcomeBonuses = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;

      const params: any = {
        limit: itemsPerPage,
        offset: offset,
      };

      // Add date filters
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        params.date_from = startDate.toISOString();
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        params.date_to = endDate.toISOString();
      }

      // Add amount filters
      if (minAmount) {
        params.min_amount = minAmount;
      }
      if (maxAmount) {
        params.max_amount = maxAmount;
      }

      // Add status filter
      if (status) {
        params.status = status;
      }

      // Add user_id filter
      if (userId) {
        params.user_id = userId;
      }

      // Add brand_id filter
      if (brandId) {
        params.brand_id = brandId;
      }

      const response = await adminSvc.get("/analytics/welcome_bonus", {
        params,
      });

      if (response.success && response.data) {
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        setTransactions(data);

        if (response.meta) {
          setMeta({
            total: response.meta.total || data.length,
            page: response.meta.page || currentPage,
            page_size: response.meta.page_size || itemsPerPage,
            pages:
              response.meta.pages ||
              Math.ceil((response.meta.total || data.length) / itemsPerPage),
          });
        } else {
          setMeta({
            total: data.length,
            page: currentPage,
            page_size: itemsPerPage,
            pages: Math.ceil(data.length / itemsPerPage),
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch welcome bonuses:", error);
      toast.error("Failed to fetch welcome bonus transactions");
      setTransactions([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setStatus("");
    setUserId("");
    setBrandId("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    dateFrom || dateTo || minAmount || maxAmount || status || userId || brandId;

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const CopyableField: React.FC<{
    value: string;
    fieldId: string;
    className?: string;
  }> = ({ value, fieldId, className = "" }) => {
    const isCopied = copiedField === fieldId;
    return (
      <div className={`flex items-center space-x-2 group ${className}`}>
        <span className="font-mono text-sm">{value || "N/A"}</span>
        <button
          onClick={() => copyToClipboard(value, fieldId)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-600 rounded"
          title="Copy to clipboard"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Gift className="h-8 w-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome Bonus Management
            </h1>
            <p className="text-gray-400 text-sm">
              View and filter all welcome bonus transactions
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-purple-500 rounded-full text-xs">
                {
                  [
                    dateFrom,
                    dateTo,
                    minAmount,
                    maxAmount,
                    status,
                    userId,
                    brandId,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filter Options</span>
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Min Amount
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Max Amount
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Search className="h-4 w-4 inline mr-1" />
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Filter by user ID"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Brand ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {meta && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Transactions</div>
            <div className="text-2xl font-bold text-white">
              {meta.total.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-green-400">
              $
              {transactions
                .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
                .toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Current Page</div>
            <div className="text-2xl font-bold text-purple-400">
              {meta.page} / {meta.pages}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
            <p className="text-gray-400">
              Loading welcome bonus transactions...
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No welcome bonus transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Transaction ID
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Username
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Currency
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Balance Before
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Balance After
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr
                      key={transaction.id || index}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30"
                    >
                      <td className="py-3 px-4 text-white font-mono text-sm">
                        {transaction.id || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <CopyableField
                          value={transaction.username || ""}
                          fieldId={`username-${transaction.id}`}
                        />
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <CopyableField
                          value={transaction.email || ""}
                          fieldId={`email-${transaction.id}`}
                        />
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {parseFloat(transaction.amount || "0").toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {transaction.currency || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === "completed"
                              ? "bg-green-400/10 text-green-400"
                              : transaction.status === "pending"
                                ? "bg-yellow-400/10 text-yellow-400"
                                : transaction.status === "failed"
                                  ? "bg-red-400/10 text-red-400"
                                  : "bg-gray-400/10 text-gray-400"
                          }`}
                        >
                          {transaction.status || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {parseFloat(
                          transaction.balance_before || "0",
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {parseFloat(
                          transaction.balance_after || "0",
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {transaction.created_at
                          ? new Date(transaction.created_at).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="border-t border-gray-700 px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-400 text-center sm:text-left">
                  Showing {(meta.page - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(meta.page * itemsPerPage, meta.total)} of{" "}
                  {meta.total} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-white text-sm px-4">
                    Page {meta.page} of {meta.pages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, meta.pages))
                    }
                    disabled={currentPage >= meta.pages}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
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
