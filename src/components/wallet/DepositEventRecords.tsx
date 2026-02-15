import React, { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Edit,
  Play,
  X,
  Calendar,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { wmsService } from "../../services/wmsService";
import { toast } from "react-hot-toast";
import { CopyableText } from "../common/CopyableText";

interface DepositEventRecord {
  id: string;
  chain_id: string;
  tx_hash: string;
  block_number: number;
  from_address: string;
  to_address: string;
  currency_code: string;
  amount: string;
  amount_units: number;
  usd_amount_cents: number;
  exchange_rate: number;
  status: string;
  error_message: string | null;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DepositEventRecords: React.FC = () => {
  const [records, setRecords] = useState<DepositEventRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DepositEventRecord | null>(
    null,
  );
  const [editForm, setEditForm] = useState({
    status: "",
    error_message: "",
    chain_id: "",
    tx_hash: "",
    block_number: "",
    from_address: "",
    to_address: "",
    currency_code: "",
    amount: "",
    amount_units: "",
    usd_amount_cents: "",
    exchange_rate: "",
    retry_count: "",
  });
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allChainIds = [
    "eth-mainnet",
    "eth-testnet",
    "sol-mainnet",
    "sol-testnet",
    "btc-mainnet",
  ];
  const allStatuses = [
    "pending",
    "processing",
    "processed",
    "failed",
    "retrying",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (searchTerm === "") {
      setDebouncedSearchTerm("");
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchRecords();
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    selectedChainId,
    selectedStatus,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedChainId,
    selectedStatus,
    dateFrom,
    dateTo,
    itemsPerPage,
  ]);

  const fetchRecords = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const params: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedChainId) params.chain_id = selectedChainId;
      if (selectedStatus) params.status = selectedStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await wmsService.getDepositEventRecords(params);
      setRecords(response.records || []);
      setTotalCount(response.total_count || 0);
    } catch (error: any) {
      if (!silent) {
        toast.error(
          error.response?.data?.message ||
            "Failed to fetch deposit event records",
        );
      }
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEdit = (record: DepositEventRecord) => {
    setEditingRecord(record);
    setEditForm({
      status: record.status,
      error_message: record.error_message || "",
      chain_id: record.chain_id,
      tx_hash: record.tx_hash,
      block_number: record.block_number.toString(),
      from_address: record.from_address,
      to_address: record.to_address,
      currency_code: record.currency_code,
      amount: record.amount,
      amount_units: record.amount_units.toString(),
      usd_amount_cents: record.usd_amount_cents.toString(),
      exchange_rate: record.exchange_rate.toString(),
      retry_count: record.retry_count.toString(),
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    setSaving(true);
    try {
      const updates: any = {};

      if (editForm.status !== editingRecord.status) {
        updates.status = editForm.status;
      }

      if (editForm.error_message === "") {
        updates.error_message = null;
      } else if (
        editForm.error_message !== (editingRecord.error_message || "")
      ) {
        updates.error_message = editForm.error_message;
      }

      if (editForm.chain_id !== editingRecord.chain_id) {
        updates.chain_id = editForm.chain_id;
      }
      if (editForm.tx_hash !== editingRecord.tx_hash) {
        updates.tx_hash = editForm.tx_hash;
      }
      if (
        editForm.block_number &&
        parseInt(editForm.block_number) !== editingRecord.block_number
      ) {
        updates.block_number = parseInt(editForm.block_number);
      }
      if (editForm.from_address !== editingRecord.from_address) {
        updates.from_address = editForm.from_address;
      }
      if (editForm.to_address !== editingRecord.to_address) {
        updates.to_address = editForm.to_address;
      }
      if (editForm.currency_code !== editingRecord.currency_code) {
        updates.currency_code = editForm.currency_code;
      }
      if (editForm.amount !== editingRecord.amount) {
        updates.amount = editForm.amount;
      }
      if (
        editForm.amount_units &&
        parseFloat(editForm.amount_units) !== editingRecord.amount_units
      ) {
        updates.amount_units = parseFloat(editForm.amount_units);
      }
      if (
        editForm.usd_amount_cents &&
        parseInt(editForm.usd_amount_cents) !== editingRecord.usd_amount_cents
      ) {
        updates.usd_amount_cents = parseInt(editForm.usd_amount_cents);
      }
      if (
        editForm.exchange_rate &&
        parseFloat(editForm.exchange_rate) !== editingRecord.exchange_rate
      ) {
        updates.exchange_rate = parseFloat(editForm.exchange_rate);
      }
      if (
        editForm.retry_count &&
        parseInt(editForm.retry_count) !== editingRecord.retry_count
      ) {
        updates.retry_count = parseInt(editForm.retry_count);
      }

      await wmsService.updateDepositEventRecord(editingRecord.id, updates);
      toast.success("Deposit event record updated successfully");
      setShowEditModal(false);
      fetchRecords(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerRetry = async (id: string) => {
    setRetrying(id);
    try {
      await wmsService.triggerDepositEventRetry(id);
      toast.success("Retry triggered successfully");
      setTimeout(() => fetchRecords(true), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to trigger retry");
    } finally {
      setRetrying(null);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processed":
        return "text-green-400 bg-green-400/10";
      case "processing":
      case "retrying":
        return "text-blue-400 bg-blue-400/10";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10";
      case "failed":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getExplorerLink = (chainId: string, txHash: string) => {
    const chainIdLower = chainId.toLowerCase();
    if (chainIdLower.includes("eth")) {
      if (chainIdLower.includes("testnet")) {
        return `https://sepolia.etherscan.io/tx/${txHash}`;
      }
      return `https://etherscan.io/tx/${txHash}`;
    } else if (chainIdLower.includes("sol")) {
      if (chainIdLower.includes("testnet")) {
        return `https://solscan.io/tx/${txHash}?cluster=testnet`;
      }
      return `https://solscan.io/tx/${txHash}`;
    } else if (chainIdLower.includes("btc")) {
      if (chainIdLower.includes("testnet")) {
        return `https://blockstream.info/testnet/tx/${txHash}`;
      }
      return `https://blockstream.info/tx/${txHash}`;
    }
    return "#";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedChainId(null);
    setSelectedStatus(null);
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading deposit event records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Deposit Event Records
          </h2>
          <p className="text-gray-400 mt-1">
            Manage and monitor deposit event processing
          </p>
        </div>
        <button
          onClick={() => fetchRecords(false)}
          disabled={refreshing}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by tx_hash, from_address, to_address, or id..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-3"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={selectedChainId || ""}
                onChange={(e) => setSelectedChainId(e.target.value || null)}
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Chains</option>
                {allChainIds.map((chainId) => (
                  <option key={chainId} value={chainId}>
                    {chainId}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedStatus || ""}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                {allStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Records</h3>
          <div className="text-sm text-gray-400">
            Total: {totalCount} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Chain
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Tx Hash
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  From
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  To
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Currency
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Amount
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  USD Value
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Retry Count
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Error
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Created At
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <p className="text-lg font-medium mb-2">
                        No records found
                      </p>
                      <p className="text-sm">
                        No deposit event records match your filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className="text-white font-mono text-xs truncate max-w-[120px]"
                          title={record.id}
                        >
                          {record.id.slice(0, 8)}...{record.id.slice(-4)}
                        </span>
                        <button
                          onClick={() => handleCopyId(record.id)}
                          className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
                          title="Copy ID"
                        >
                          {copiedId === record.id ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white text-sm">
                      {record.chain_id}
                    </td>
                    <td className="py-3 px-4">
                      {record.tx_hash ? (
                        <a
                          href={getExplorerLink(
                            record.chain_id,
                            record.tx_hash,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:underline font-mono text-xs flex items-center space-x-1"
                        >
                          <span>
                            {record.tx_hash.slice(0, 8)}...
                            {record.tx_hash.slice(-6)}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <CopyableText
                        text={record.from_address}
                        className="text-white font-mono text-xs"
                        displayText={`${record.from_address.slice(0, 6)}...${record.from_address.slice(-4)}`}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <CopyableText
                        text={record.to_address}
                        className="text-white font-mono text-xs"
                        displayText={`${record.to_address.slice(0, 6)}...${record.to_address.slice(-4)}`}
                      />
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {record.currency_code}
                    </td>
                    <td className="py-3 px-4 text-white text-right">
                      {record.amount_units.toFixed(8)}
                    </td>
                    <td className="py-3 px-4 text-white text-right">
                      $
                      {(record.usd_amount_cents / 100).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white text-sm">
                      {record.retry_count}
                    </td>
                    <td className="py-3 px-4">
                      {record.error_message ? (
                        <span
                          className="text-red-400 text-xs"
                          title={record.error_message}
                        >
                          {record.error_message.length > 30
                            ? `${record.error_message.slice(0, 30)}...`
                            : record.error_message}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        {record.status !== "completed" &&
                          record.status !== "processed" && (
                            <button
                              onClick={() => handleTriggerRetry(record.id)}
                              disabled={retrying === record.id}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 disabled:opacity-50"
                            >
                              {retrying === record.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  <span>Retrying...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3" />
                                  <span>Retry</span>
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 &&
          (() => {
            const getPageNumbers = () => {
              const pages: (number | string)[] = [];
              const maxVisible = 5;

              if (totalPages <= maxVisible) {
                // Show all pages if total is less than max visible
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);

                if (currentPage > 3) {
                  pages.push("...");
                }

                // Show pages around current page
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);

                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) {
                    pages.push(i);
                  }
                }

                if (currentPage < totalPages - 2) {
                  pages.push("...");
                }

                // Always show last page
                if (totalPages > 1) {
                  pages.push(totalPages);
                }
              }

              return pages;
            };

            return (
              <div className="p-4 border-t border-gray-700 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <div className="text-gray-400 text-sm">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                    {totalCount} records
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-gray-400 text-sm">
                      Rows per page:
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    title="First page"
                  >
                    First
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    title="Previous page"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((page, index) => {
                      if (page === "...") {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-gray-500"
                          >
                            ...
                          </span>
                        );
                      }
                      const pageNum = page as number;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            currentPage === pageNum
                              ? "bg-purple-600 text-white"
                              : "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-gray-400 text-sm px-2">
                    of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage >= totalPages || loading}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    title="Next page"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages || loading}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    title="Last page"
                  >
                    Last
                  </button>
                </div>
              </div>
            );
          })()}
      </div>

      {showEditModal && editingRecord && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-700/50 bg-gray-800/50">
              <h3 className="text-xl font-bold text-white">
                Edit Deposit Event Record
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chain ID
                  </label>
                  <select
                    value={editForm.chain_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, chain_id: e.target.value })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  >
                    {allChainIds.map((chainId) => (
                      <option key={chainId} value={chainId}>
                        {chainId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  >
                    {allStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={editForm.tx_hash}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tx_hash: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Block Number
                </label>
                <input
                  type="number"
                  value={editForm.block_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, block_number: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From Address
                </label>
                <input
                  type="text"
                  value={editForm.from_address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, from_address: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  To Address
                </label>
                <input
                  type="text"
                  value={editForm.to_address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, to_address: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Currency Code
                  </label>
                  <input
                    type="text"
                    value={editForm.currency_code}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        currency_code: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="text"
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: e.target.value })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount Units
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.amount_units}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount_units: e.target.value })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    USD Amount (cents)
                  </label>
                  <input
                    type="number"
                    value={editForm.usd_amount_cents}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        usd_amount_cents: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Exchange Rate
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.exchange_rate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        exchange_rate: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Retry Count
                </label>
                <input
                  type="number"
                  value={editForm.retry_count}
                  onChange={(e) =>
                    setEditForm({ ...editForm, retry_count: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Error Message
                </label>
                <textarea
                  value={editForm.error_message}
                  onChange={(e) =>
                    setEditForm({ ...editForm, error_message: e.target.value })
                  }
                  placeholder="Leave empty to clear error message"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-24 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
