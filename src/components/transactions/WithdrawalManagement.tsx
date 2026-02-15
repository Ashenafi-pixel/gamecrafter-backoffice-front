import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowDownLeft,
  Copy,
  Check,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Withdrawal, Balance, Transaction } from "../../types";
import { wmsService } from "../../services/wmsService";
import { brandService, Brand } from "../../services/brandService";
import { CopyableText } from "../common/CopyableText";
import toast from "react-hot-toast";

const convertToCSV = (withdrawals: Withdrawal[]): string => {
  const headers = [
    "Withdrawal ID",
    "User ID",
    "Username",
    "Network",
    "Crypto",
    "Crypto Amount",
    "USD Value",
    "Fee (USD)",
    "Status",
    "Created At",
    "Transaction Hash",
    "Requires Admin Review",
    "Admin Review Reason",
  ];
  const rows = withdrawals.map((wd) => [
    wd.withdrawal_id,
    wd.user_id,
    wd.username || "N/A",
    wd.network ||
      (wd.chain_id?.includes("sol")
        ? "SOL"
        : wd.chain_id?.includes("eth")
          ? "ERC-20"
          : wd.chain_id),
    wd.crypto_currency || wd.currency_code,
    wd.crypto_amount.toFixed(8),
    (wd.usd_amount_cents / 100).toLocaleString(),
    (wd.fee_usd_cents / 100).toFixed(2),
    wd.status,
    new Date(wd.created_at).toLocaleString(),
    wd.tx_hash || "N/A",
    wd.requires_admin_review ? "Yes" : "No",
    wd.admin_review_reason || "N/A",
  ]);

  return [
    headers.join(","),
    ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
  ].join("\n");
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const WithdrawalManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedAdminReviewReason, setSelectedAdminReviewReason] = useState<
    string | null
  >(null);
  const [showCryptoFilter, setShowCryptoFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showNetworkFilter, setShowNetworkFilter] = useState(false);
  const [showAdminReviewReasonFilter, setShowAdminReviewReasonFilter] =
    useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Ensure withdrawals is always an array
  const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];
  const [totalItems, setTotalItems] = useState(0);
  const [totalWithdrawalsUSD, setTotalWithdrawalsUSD] = useState(0);
  const [totalSuccessfulWithdrawals, setTotalSuccessfulWithdrawals] =
    useState(0);
  const [totalAwaitingAdminReview, setTotalAwaitingAdminReview] = useState(0);
  const [
    totalAwaitingAdminReviewUSDValue,
    setTotalAwaitingAdminReviewUSDValue,
  ] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [totalFailedUSDValue, setTotalFailedUSDValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [userBalance, setUserBalance] = useState<Balance | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "review">("details");
  const [userTxPage, setUserTxPage] = useState(1);
  const [userTxTotal, setUserTxTotal] = useState(0);
  const [userTxPerPage] = useState(10);
  const [userTxStats, setUserTxStats] = useState({
    total_deposits: 0,
    total_deposits_usd: 0,
    total_withdrawals: 0,
    total_withdrawals_usd: 0,
    net_flow_usd: 0,
    total_transactions: 0,
  });
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [copiedUsernameId, setCopiedUsernameId] = useState<string | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  const cryptoFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const networkFilterRef = useRef<HTMLDivElement>(null);
  const adminReviewReasonFilterRef = useRef<HTMLDivElement>(null);

  const allCryptos = ["BTC", "ETH", "USDT", "LTC", "USDC", "SOL"];
  const allStatuses = [
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
    "awaiting_admin_review",
  ];
  const allNetworks = ["ERC-20", "SOL"];
  const allAdminReviewReasons = [
    "kyc_required_on_first_withdrawal",
    "manual_review_threshold",
    "cumulative_kyc_limit_exceeded",
    "user_daily_limit_reached",
    "user_all_time_limit_reached",
    "cumulative_kyc_transaction_limit",
    "single_transaction_limit_exceeded",
    "cumulative_daily_limit_exceeded",
  ];

  const explorerUrls: { [key: string]: string } = {
    "sol-mainnet": "https://explorer.solana.com/tx/",
    "sol-testnet": "https://explorer.solana.com/tx/?cluster=testnet",
    "eth-mainnet": "https://etherscan.io/tx/",
    "eth-testnet": "https://sepolia.etherscan.io/tx/",
  };

  const mapNetworkToChainIds = (networks: string[]): string[] => {
    const chainIds: string[] = [];
    networks.forEach((network) => {
      if (network === "ERC-20") {
        chainIds.push("eth-mainnet", "eth-testnet");
      } else if (network === "SOL") {
        chainIds.push("sol-mainnet", "sol-testnet");
      }
    });
    return chainIds;
  };

  const fetchWithdrawals = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const wmsParams: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      if (debouncedSearchTerm) wmsParams.search = debouncedSearchTerm;
      if (dateRange.start) wmsParams.date_from = dateRange.start;
      if (dateRange.end) wmsParams.date_to = dateRange.end;
      if (selectedStatus) wmsParams.status = selectedStatus;
      if (selectedNetwork) {
        const chainIds = mapNetworkToChainIds([selectedNetwork]);
        wmsParams.network = chainIds.length > 0 ? chainIds[0] : undefined;
      }
      if (selectedCrypto) wmsParams.crypto = selectedCrypto;
      if (selectedAdminReviewReason)
        wmsParams.admin_review_reason = selectedAdminReviewReason;
      if (amountRange.min) wmsParams.amount_min = amountRange.min;
      if (amountRange.max) wmsParams.amount_max = amountRange.max;
      // Only send brand_id if a specific brand is selected (not "All Brands")
      if (selectedBrandId) {
        wmsParams.brand_id = selectedBrandId;
      }

      const response = await wmsService.getWithdrawals(wmsParams);

      if (response) {
        const responseData = response.data;
        const isNewFormat =
          responseData &&
          typeof responseData === "object" &&
          "withdrawals" in responseData &&
          !Array.isArray(responseData);

        let filteredWithdrawals = isNewFormat
          ? (responseData as any).withdrawals || []
          : Array.isArray(responseData)
            ? responseData
            : [];

        const mappedWithdrawals = filteredWithdrawals.map((wd: any) => ({
          ...wd,
          crypto_currency: wd.currency_code || wd.crypto_currency,
          network: wd.chain_id
            ? wd.chain_id.includes("sol")
              ? "SOL"
              : wd.chain_id.includes("eth")
                ? "ERC-20"
                : wd.chain_id
            : wd.network,
        }));

        setWithdrawals(mappedWithdrawals as Withdrawal[]);
        setTotalItems(
          isNewFormat ? (responseData as any).total || 0 : response.total || 0,
        );
        setTotalWithdrawalsUSD(
          isNewFormat
            ? (responseData as any).total_withdrawals_usd || 0
            : response.total_withdrawals_usd || 0,
        );

        setTotalAwaitingAdminReview(
          isNewFormat
            ? (responseData as any).total_awaiting_admin_review || 0
            : response.total_awaiting_admin_review || 0,
        );
        setTotalAwaitingAdminReviewUSDValue(
          isNewFormat
            ? (responseData as any).total_awaiting_admin_review_usd || 0
            : response.total_awaiting_admin_review_usd || 0,
        );
        setTotalFailed(
          isNewFormat
            ? (responseData as any).total_failed || 0
            : response.total_failed || 0,
        );
        setTotalFailedUSDValue(
          isNewFormat
            ? (responseData as any).total_failed_usd || 0
            : response.total_failed_usd || 0,
        );

        const successfulCount = isNewFormat
          ? (responseData as any).total_completed || 0
          : response.total_completed || 0;
        setTotalSuccessfulWithdrawals(Math.max(0, successfulCount));
      } else {
        setError("Failed to fetch withdrawals");
        setWithdrawals([]);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || "Failed to fetch withdrawals");
      }
      setWithdrawals([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  };

  const confirmReleaseWithdrawal = () => {
    if (selectedWithdrawal) {
      setPendingAction(selectedWithdrawal.withdrawal_id);
      setShowReleaseConfirm(true);
      setReleaseSuccess(false);
      setReleaseError(null);
      setIsReleasing(false);
    }
  };

  const confirmCancelWithdrawal = () => {
    if (selectedWithdrawal) {
      setPendingAction(selectedWithdrawal.withdrawal_id);
      setShowCancelConfirm(true);
    }
  };

  const fetchWithdrawalDetails = async (
    withdrawal: Withdrawal,
    page: number = 1,
  ) => {
    setModalLoading(true);
    setError(null);
    try {
      const balanceResponse = await wmsService.getUserBalance(
        withdrawal.user_id,
      );
      if (balanceResponse) {
        setUserBalance(balanceResponse as Balance);
      } else {
        setError("Failed to fetch user balance");
      }

      const txResponse = await wmsService.getUserTransactions(
        withdrawal.user_id,
        {
          limit: userTxPerPage,
          offset: (page - 1) * userTxPerPage,
        },
      );
      if (txResponse) {
        // Ensure data is an array
        const transactionsData = Array.isArray(txResponse.data)
          ? txResponse.data
          : [];

        // Map transactions for UI compatibility
        const mappedTransactions = transactionsData.map((tx: any) => ({
          ...tx,
          crypto_currency: tx.currency_code || tx.crypto_currency,
          network: tx.chain_id
            ? tx.chain_id.includes("sol")
              ? "SOL"
              : tx.chain_id.includes("eth")
                ? "ERC-20"
                : tx.chain_id
            : tx.network,
        }));
        setUserTransactions(mappedTransactions as Transaction[]);
        setUserTxTotal(
          txResponse.total_transactions ||
            txResponse.total ||
            transactionsData.length,
        );
        setUserTxStats({
          total_deposits: txResponse.total_deposits || 0,
          total_deposits_usd: txResponse.total_deposits_usd || 0,
          total_withdrawals: txResponse.total_withdrawals || 0,
          total_withdrawals_usd: txResponse.total_withdrawals_usd || 0,
          net_flow_usd: txResponse.net_flow_usd || 0,
          total_transactions: txResponse.total_transactions || 0,
        });
        setUserTxPage(page);
      } else {
        setError("Failed to fetch user transactions");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch withdrawal details");
    } finally {
      setModalLoading(false);
    }
  };

  const handleReleaseWithdrawal = async (withdrawalId: string) => {
    setIsReleasing(true);
    setReleaseError(null);
    setReleaseSuccess(false);
    try {
      await wmsService.approveWithdrawal(withdrawalId);
      setReleaseSuccess(true);
      setWithdrawals((prev) =>
        prev.map((wd) =>
          wd.withdrawal_id === withdrawalId
            ? { ...wd, status: "completed", requires_admin_review: false }
            : wd,
        ),
      );
      // Close modal and refresh after showing success
      setTimeout(() => {
        setShowReleaseConfirm(false);
        setSelectedWithdrawal(null);
        setActiveTab("details");
        setPendingAction(null);
        setIsReleasing(false);
        setReleaseSuccess(false);
        fetchWithdrawals(true); // Silent refresh
      }, 1500);
    } catch (err: any) {
      setIsReleasing(false);
      setReleaseError(
        err.response?.data?.message ||
          err.message ||
          "Failed to release withdrawal",
      );
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: string) => {
    setShowCancelConfirm(false);
    try {
      await wmsService.cancelWithdrawal(withdrawalId);
      setWithdrawals((prev) =>
        prev.map((wd) =>
          wd.withdrawal_id === withdrawalId
            ? { ...wd, status: "cancelled", requires_admin_review: false }
            : wd,
        ),
      );
      setSelectedWithdrawal(null);
      setActiveTab("details");
      setPendingAction(null);
      fetchWithdrawals(true); // Silent refresh
    } catch (err: any) {
      setError(err.message || "Failed to cancel withdrawal");
      setPendingAction(null);
    }
  };

  const handleCopyUserId = async (userId: string, withdrawalId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedRowId(withdrawalId);
      setTimeout(() => {
        setCopiedRowId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy user ID:", err);
    }
  };

  const handleCopyUsername = async (username: string, withdrawalId: string) => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsernameId(withdrawalId);
      setTimeout(() => {
        setCopiedUsernameId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy username:", err);
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(withdrawals);
    downloadCSV(csv, `withdrawals_${new Date().toISOString()}.csv`);
  };

  // Read filters from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");
    const crypto = urlParams.get("crypto");
    const network = urlParams.get("network");
    const dateFrom = urlParams.get("date_from");
    const dateTo = urlParams.get("date_to");

    if (status) setSelectedStatus(status);
    if (crypto) setSelectedCrypto(crypto);
    if (network) setSelectedNetwork(network);
    if (dateFrom || dateTo) {
      setDateRange({
        start: dateFrom || "",
        end: dateTo || "",
      });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cryptoFilterRef.current &&
        !cryptoFilterRef.current.contains(event.target as Node)
      ) {
        setShowCryptoFilter(false);
      }
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target as Node)
      ) {
        setShowStatusFilter(false);
      }
      if (
        networkFilterRef.current &&
        !networkFilterRef.current.contains(event.target as Node)
      ) {
        setShowNetworkFilter(false);
      }
      if (
        adminReviewReasonFilterRef.current &&
        !adminReviewReasonFilterRef.current.contains(event.target as Node)
      ) {
        setShowAdminReviewReasonFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Fetch brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // Refetch withdrawals when brand changes (including when brand_id is null for "All Brands")
  useEffect(() => {
    fetchWithdrawals(false);
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({
        page: 1,
        "per-page": 100,
      });
      if (response.success && response.data) {
        const brandsList = response.data.brands || [];
        setBrands(brandsList);

        // Check query params first
        const brandIdFromQuery = searchParams.get("brand_id");
        if (
          brandIdFromQuery &&
          brandsList.some((b: Brand) => b.id === brandIdFromQuery)
        ) {
          setSelectedBrandId(brandIdFromQuery);
          localStorage.setItem(
            "withdrawal_management_brand_id",
            brandIdFromQuery,
          );
        } else {
          // If no brand_id in query, check localStorage
          const storedBrandId = localStorage.getItem(
            "withdrawal_management_brand_id",
          );
          if (
            storedBrandId &&
            brandsList.some((b: Brand) => b.id === storedBrandId)
          ) {
            setSelectedBrandId(storedBrandId);
          } else {
            // If no brand_id in query or localStorage, select "All Brands" (null)
            setSelectedBrandId(null);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching brands:", err);
      toast.error("Failed to fetch brands");
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleBrandChange = (brandId: string) => {
    if (brandId === "") {
      setSelectedBrandId(null);
      localStorage.removeItem("withdrawal_management_brand_id");
    } else {
      setSelectedBrandId(brandId);
      localStorage.setItem("withdrawal_management_brand_id", brandId);
    }
  };

  useEffect(() => {
    fetchWithdrawals(false);
    const interval = setInterval(() => fetchWithdrawals(true), 30000);
    return () => clearInterval(interval);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    selectedCrypto,
    selectedStatus,
    selectedNetwork,
    selectedAdminReviewReason,
    dateRange,
    amountRange,
    selectedBrandId,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedCrypto,
    selectedStatus,
    selectedNetwork,
    selectedAdminReviewReason,
    dateRange,
    amountRange,
    itemsPerPage,
  ]);

  const toggleCryptoSelection = (crypto: string) => {
    setSelectedCrypto((prev) => (prev === crypto ? null : crypto));
  };

  const toggleStatusSelection = (status: string) => {
    setSelectedStatus((prev) => (prev === status ? null : status));
  };

  const toggleNetworkSelection = (network: string) => {
    setSelectedNetwork((prev) => (prev === network ? null : network));
  };

  const toggleAdminReviewReasonSelection = (reason: string) => {
    setSelectedAdminReviewReason((prev) => (prev === reason ? null : reason));
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCrypto(null);
    setSelectedStatus(null);
    setSelectedNetwork(null);
    setSelectedAdminReviewReason(null);
    setDateRange({ start: "", end: "" });
    setAmountRange({ min: "", max: "" });
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-400/10";
      case "pending":
      case "awaiting_admin_review":
        return "text-yellow-400 bg-yellow-400/10";
      case "failed":
      case "cancelled":
        return "text-red-400 bg-red-400/10";
      case "processing":
        return "text-blue-400 bg-blue-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getExplorerLink = (chainId: string, txHash: string) => {
    const baseUrl = explorerUrls[chainId] || "https://etherscan.io/tx/";
    return `${baseUrl}${txHash}`;
  };

  const SkeletonRow = () => (
    <tr className="border-b border-gray-700/50">
      {Array.from({ length: 12 }).map((_, index) => (
        <td key={index} className="py-3 px-4">
          <div className="h-4 bg-gray-600/50 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdrawal Management</h1>
        <p className="text-gray-400 mt-1">
          Search and manage platform withdrawals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">
            Total Withdrawals USD
          </h3>
          <p className="text-2xl font-bold text-white">
            $
            {totalWithdrawalsUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">
            Total Successful Withdrawals
          </h3>
          <p className="text-2xl font-bold text-white">
            {totalSuccessfulWithdrawals}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">
            Total Awaiting Admin Review
          </h3>
          <p className="text-2xl font-bold text-yellow-400">
            {totalAwaitingAdminReview}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            $
            {totalAwaitingAdminReviewUSDValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Total Failed</h3>
          <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
          <p className="text-sm text-gray-400 mt-1">
            $
            {totalFailedUSDValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-3">
          <button
            onClick={clearAllFilters}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Clear All
          </button>
          <button
            onClick={() => fetchWithdrawals(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-600/10 border border-red-600 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Withdrawal ID, User ID, Username, or Hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-3"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min USD"
                value={amountRange.min}
                onChange={(e) =>
                  setAmountRange((prev) => ({ ...prev, min: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-24"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max USD"
                value={amountRange.max}
                onChange={(e) =>
                  setAmountRange((prev) => ({ ...prev, max: e.target.value }))
                }
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm w-24"
              />
            </div>

            <div className="relative" ref={cryptoFilterRef}>
              <button
                onClick={() => setShowCryptoFilter(!showCryptoFilter)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>
                  Crypto {selectedCrypto ? `(${selectedCrypto})` : ""}
                </span>
              </button>
              {showCryptoFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[200px] z-10">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allCryptos.map((crypto) => (
                      <label
                        key={crypto}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="crypto-filter"
                          checked={selectedCrypto === crypto}
                          onChange={() => toggleCryptoSelection(crypto)}
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm">{crypto}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={statusFilterRef}>
              <button
                onClick={() => setShowStatusFilter(!showStatusFilter)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>
                  Status{" "}
                  {selectedStatus
                    ? `(${selectedStatus.replace("_", " ")})`
                    : ""}
                </span>
              </button>
              {showStatusFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[200px] z-10">
                  <div className="space-y-2">
                    {allStatuses.map((status) => (
                      <label
                        key={status}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="status-filter"
                          checked={selectedStatus === status}
                          onChange={() => toggleStatusSelection(status)}
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm capitalize">
                          {status.replace("_", " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={networkFilterRef}>
              <button
                onClick={() => setShowNetworkFilter(!showNetworkFilter)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>
                  Network {selectedNetwork ? `(${selectedNetwork})` : ""}
                </span>
              </button>
              {showNetworkFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[200px] z-10">
                  <div className="space-y-2">
                    {allNetworks.map((network) => (
                      <label
                        key={network}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="network-filter"
                          checked={selectedNetwork === network}
                          onChange={() => toggleNetworkSelection(network)}
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm">{network}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={adminReviewReasonFilterRef}>
              <button
                onClick={() =>
                  setShowAdminReviewReasonFilter(!showAdminReviewReasonFilter)
                }
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>
                  Admin Review Reason{" "}
                  {selectedAdminReviewReason
                    ? `(${selectedAdminReviewReason.replace(/_/g, " ")})`
                    : ""}
                </span>
              </button>
              {showAdminReviewReasonFilter && (
                <div className="absolute top-full left-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg p-3 min-w-[250px] max-h-64 overflow-y-auto z-10">
                  <div className="space-y-2">
                    {allAdminReviewReasons.map((reason) => (
                      <label
                        key={reason}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="admin-review-reason-filter"
                          checked={selectedAdminReviewReason === reason}
                          onChange={() =>
                            toggleAdminReviewReasonSelection(reason)
                          }
                          className="rounded border-gray-500"
                        />
                        <span className="text-white text-sm capitalize">
                          {reason.replace(/_/g, " ")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {loadingBrands ? (
              <div className="flex items-center space-x-2 px-4 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                <span className="text-gray-400 text-sm">Loading brands...</span>
              </div>
            ) : brands.length > 0 ? (
              <select
                value={selectedBrandId || ""}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.code})
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {(selectedCrypto ||
            selectedStatus ||
            selectedNetwork ||
            selectedAdminReviewReason) && (
            <div className="flex flex-wrap gap-2">
              {selectedCrypto && (
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                  <span>{selectedCrypto}</span>
                  <button onClick={() => toggleCryptoSelection(selectedCrypto)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedStatus && (
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                  <span className="capitalize">
                    {selectedStatus.replace("_", " ")}
                  </span>
                  <button onClick={() => toggleStatusSelection(selectedStatus)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedNetwork && (
                <span className="bg-teal-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                  <span>{selectedNetwork}</span>
                  <button
                    onClick={() => toggleNetworkSelection(selectedNetwork)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedAdminReviewReason && (
                <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                  <span className="capitalize">
                    {selectedAdminReviewReason.replace(/_/g, " ")}
                  </span>
                  <button
                    onClick={() =>
                      toggleAdminReviewReasonSelection(
                        selectedAdminReviewReason,
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">All Withdrawals</h3>
          <div className="flex items-center space-x-4">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="text-sm text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              withdrawals
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Withdrawal ID
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  User ID
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Username
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Network
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Crypto
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Crypto Amount
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  USD Value
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Fee (USD)
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Created At
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Hash
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && isInitialLoad ? (
                Array.from({ length: itemsPerPage }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : safeWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <p className="text-lg font-medium mb-2">
                        No data available
                      </p>
                      <p className="text-sm">
                        No withdrawals found matching your filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeWithdrawals.map((wd, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4">
                      <CopyableText
                        text={wd.withdrawal_id}
                        className="text-purple-400"
                        label="Withdrawal ID"
                        displayText={
                          wd.withdrawal_id.length > 12
                            ? `${wd.withdrawal_id.slice(0, 8)}...${wd.withdrawal_id.slice(-4)}`
                            : wd.withdrawal_id
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className="text-white font-mono text-xs truncate max-w-[80px]"
                          title={wd.user_id}
                        >
                          {wd.user_id.length > 12
                            ? `${wd.user_id.slice(0, 6)}...${wd.user_id.slice(-4)}`
                            : wd.user_id}
                        </span>
                        <button
                          onClick={() =>
                            handleCopyUserId(wd.user_id, wd.withdrawal_id)
                          }
                          className="flex-shrink-0 p-1.5 hover:bg-gray-700 rounded transition-colors"
                          title="Copy User ID"
                        >
                          {copiedRowId === wd.withdrawal_id ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {wd.username ? (
                        <div className="flex items-center space-x-2">
                          <span
                            className="text-white text-sm truncate max-w-[120px]"
                            title={wd.username}
                          >
                            {wd.username}
                          </span>
                          <button
                            onClick={() =>
                              handleCopyUsername(wd.username!, wd.withdrawal_id)
                            }
                            className="flex-shrink-0 p-1.5 hover:bg-gray-700 rounded transition-colors"
                            title="Copy Username"
                          >
                            {copiedUsernameId === wd.withdrawal_id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400 hover:text-white" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {wd.network ||
                        (wd.chain_id?.includes("sol")
                          ? "SOL"
                          : wd.chain_id?.includes("eth")
                            ? "ERC-20"
                            : wd.chain_id)}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {wd.crypto_currency || wd.currency_code}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      {wd.crypto_amount.toFixed(8)}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      ${(wd.usd_amount_cents / 100).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-right">
                      ${(wd.fee_usd_cents / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          wd.status,
                        )}`}
                      >
                        {wd.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(wd.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                      {wd.tx_hash ? (
                        <a
                          href={getExplorerLink(wd.chain_id, wd.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:underline"
                        >
                          {wd.tx_hash.slice(0, 6)}...{wd.tx_hash.slice(-4)}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedWithdrawal(wd);
                          setActiveTab("details");
                          setUserTxPage(1);
                          fetchWithdrawalDetails(wd, 1);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNum
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedWithdrawal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedWithdrawal(null);
            setActiveTab("details");
            setUserTxPage(1);
          }}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-700/50 bg-gray-800/50">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Withdrawal Details
                </h2>
                <div className="text-sm">
                  <CopyableText
                    text={selectedWithdrawal.withdrawal_id}
                    className="text-gray-400"
                    label="Withdrawal ID"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedWithdrawal(null);
                  setActiveTab("details");
                  setUserTxPage(1);
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-gray-400">Loading withdrawal details...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {error && (
                  <div className="mx-6 mt-4 bg-red-600/10 border border-red-600/50 text-red-400 p-4 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Tab Navigation */}
                <div className="flex space-x-1 px-6 pt-6 border-b border-gray-700/50">
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`px-6 py-3 font-medium text-sm transition-all ${
                      activeTab === "details"
                        ? "text-blue-400 border-b-2 border-blue-400 bg-blue-400/5"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                    }`}
                  >
                    Details
                  </button>
                  {selectedWithdrawal.status === "awaiting_admin_review" && (
                    <button
                      onClick={() => {
                        setActiveTab("review");
                        if (!userBalance || userTransactions.length === 0) {
                          fetchWithdrawalDetails(
                            selectedWithdrawal,
                            userTxPage,
                          );
                        }
                      }}
                      className={`px-6 py-3 font-medium text-sm transition-all ${
                        activeTab === "review"
                          ? "text-blue-400 border-b-2 border-blue-400 bg-blue-400/5"
                          : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                      }`}
                    >
                      Review & Release
                    </button>
                  )}
                </div>

                {/* Details Tab */}
                {activeTab === "details" && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Withdrawal ID
                        </p>
                        <CopyableText
                          text={selectedWithdrawal.withdrawal_id}
                          className="text-white break-all"
                          label="Withdrawal ID"
                        />
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          User ID
                        </p>
                        <p className="text-white font-mono text-sm break-all">
                          {selectedWithdrawal.user_id}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Crypto Currency
                        </p>
                        <p className="text-white font-semibold text-lg">
                          {selectedWithdrawal.crypto_currency ||
                            selectedWithdrawal.currency_code}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Network
                        </p>
                        <p className="text-white font-semibold">
                          {selectedWithdrawal.network ||
                            (selectedWithdrawal.chain_id?.includes("sol")
                              ? "SOL"
                              : selectedWithdrawal.chain_id?.includes("eth")
                                ? "ERC-20"
                                : selectedWithdrawal.chain_id)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Crypto Amount
                        </p>
                        <p className="text-white font-semibold text-lg">
                          {selectedWithdrawal.crypto_amount.toFixed(8)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          USD Value
                        </p>
                        <p className="text-white font-semibold text-lg text-green-400">
                          $
                          {(
                            selectedWithdrawal.usd_amount_cents / 100
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Fee (USD)
                        </p>
                        <p className="text-white font-semibold">
                          ${(selectedWithdrawal.fee_usd_cents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Status
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedWithdrawal.status)}`}
                        >
                          {selectedWithdrawal.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 md:col-span-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          To Address
                        </p>
                        <p className="text-white font-mono text-sm break-all bg-gray-900/50 p-2 rounded">
                          {selectedWithdrawal.to_address}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 md:col-span-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Source Wallet Address
                        </p>
                        <p className="text-white font-mono text-sm break-all bg-gray-900/50 p-2 rounded">
                          {selectedWithdrawal.source_wallet_address || "N/A"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 md:col-span-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Transaction Hash
                        </p>
                        {selectedWithdrawal.tx_hash ? (
                          <a
                            href={getExplorerLink(
                              selectedWithdrawal.chain_id,
                              selectedWithdrawal.tx_hash,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 font-mono text-sm break-all bg-gray-900/50 p-2 rounded block hover:bg-gray-900/70 transition-colors"
                          >
                            {selectedWithdrawal.tx_hash}
                          </a>
                        ) : (
                          <p className="text-gray-500 font-mono text-sm bg-gray-900/50 p-2 rounded">
                            N/A
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Created At
                        </p>
                        <p className="text-white text-sm">
                          {new Date(
                            selectedWithdrawal.created_at,
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Admin Review Deadline
                        </p>
                        <p className="text-white text-sm">
                          {selectedWithdrawal.admin_review_deadline
                            ? new Date(
                                selectedWithdrawal.admin_review_deadline,
                              ).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                      {selectedWithdrawal.requires_admin_review && (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 md:col-span-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                            Admin Review Reason
                          </p>
                          <p className="text-white text-sm break-words">
                            {selectedWithdrawal.admin_review_reason || "N/A"}
                          </p>
                        </div>
                      )}
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Amount Reserved (USD)
                        </p>
                        <p className="text-white font-semibold">
                          $
                          {(
                            selectedWithdrawal.amount_reserved_cents / 100
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Reservation Released
                        </p>
                        <p className="text-white">
                          {selectedWithdrawal.reservation_released ? (
                            <span className="text-green-400 font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="text-red-400 font-semibold">
                              No
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Reservation Released At
                        </p>
                        <p className="text-white text-sm">
                          {selectedWithdrawal.reservation_released_at
                            ? new Date(
                                selectedWithdrawal.reservation_released_at,
                              ).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Exchange Rate
                        </p>
                        <p className="text-white font-semibold">
                          {selectedWithdrawal.exchange_rate.toFixed(4)}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Processed By System
                        </p>
                        <p className="text-white">
                          {selectedWithdrawal.processed_by_system ? (
                            <span className="text-green-400 font-semibold">
                              Yes
                            </span>
                          ) : (
                            <span className="text-yellow-400 font-semibold">
                              No
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Review & Release Tab */}
                {activeTab === "review" &&
                  selectedWithdrawal &&
                  selectedWithdrawal.status === "awaiting_admin_review" && (
                    <div className="p-6 space-y-6">
                      {/* Transaction Statistics */}
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-4">
                          Transaction Statistics
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-5 border border-green-700/30">
                            <p className="text-xs text-green-300 uppercase tracking-wider mb-2">
                              Total Deposits
                            </p>
                            <p className="text-white font-bold text-2xl text-green-400">
                              {userTxStats.total_deposits}
                            </p>
                            <p className="text-green-300 text-sm mt-1">
                              $
                              {userTxStats.total_deposits_usd.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-lg p-5 border border-red-700/30">
                            <p className="text-xs text-red-300 uppercase tracking-wider mb-2">
                              Total Withdrawals
                            </p>
                            <p className="text-white font-bold text-2xl text-red-400">
                              {userTxStats.total_withdrawals}
                            </p>
                            <p className="text-red-300 text-sm mt-1">
                              $
                              {userTxStats.total_withdrawals_usd.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-5 border border-blue-700/30">
                            <p className="text-xs text-blue-300 uppercase tracking-wider mb-2">
                              Total Transactions
                            </p>
                            <p className="text-white font-bold text-2xl text-blue-400">
                              {userTxTotal}
                            </p>
                            <p className="text-blue-300 text-sm mt-1">
                              All time
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-5 border border-purple-700/30">
                            <p className="text-xs text-purple-300 uppercase tracking-wider mb-2">
                              Net Flow
                            </p>
                            <p
                              className={`font-bold text-2xl ${
                                userTxStats.net_flow_usd >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              $
                              {userTxStats.net_flow_usd.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </p>
                            <p className="text-purple-300 text-sm mt-1">
                              Deposits - Withdrawals
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-4">
                          User Balance
                        </h3>
                        {userBalance ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-5 border border-green-700/30">
                              <p className="text-xs text-green-300 uppercase tracking-wider mb-2">
                                Balance (USD)
                              </p>
                              <p className="text-white font-bold text-2xl text-green-400">
                                $
                                {(
                                  userBalance.amount_cents / 100
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg p-5 border border-yellow-700/30">
                              <p className="text-xs text-yellow-300 uppercase tracking-wider mb-2">
                                Reserved (USD)
                              </p>
                              <p className="text-white font-bold text-2xl text-yellow-400">
                                $
                                {(
                                  userBalance.reserved_cents / 100
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700/30 text-center">
                            <p className="text-gray-400">
                              No balance information available
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-white mb-4">
                          User Transaction History
                        </h3>
                        <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-800/50">
                                <tr>
                                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    Transaction ID
                                  </th>
                                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    Type
                                  </th>
                                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    Crypto
                                  </th>
                                  <th className="text-right py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    Amount
                                  </th>
                                  <th className="text-right py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    USD Value
                                  </th>
                                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-xs uppercase tracking-wider">
                                    Timestamp
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700/30">
                                {userTransactions.length > 0 ? (
                                  userTransactions.map((tx, index) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-700/20 transition-colors"
                                    >
                                      <td className="py-4 px-6">
                                        <CopyableText
                                          text={
                                            tx.transaction_type === "deposit"
                                              ? tx.deposit_session_id
                                              : tx.withdrawal_id
                                          }
                                          className="text-purple-400"
                                          label="Transaction ID"
                                        />
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex items-center space-x-2">
                                          {tx.transaction_type === "deposit" ? (
                                            <ArrowDownLeft className="h-4 w-4 text-green-400" />
                                          ) : (
                                            <ArrowUpRight className="h-4 w-4 text-red-400" />
                                          )}
                                          <span
                                            className={`text-sm font-medium ${
                                              tx.transaction_type === "deposit"
                                                ? "text-green-400"
                                                : "text-red-400"
                                            }`}
                                          >
                                            {tx.transaction_type}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 text-white font-bold">
                                        {tx.crypto_currency || tx.currency_code}
                                      </td>
                                      <td className="py-4 px-6 text-white text-right font-medium">
                                        {tx.amount.toFixed(8)}
                                      </td>
                                      <td className="py-4 px-6 text-white text-right font-medium">
                                        $
                                        {(
                                          tx.usd_amount_cents / 100
                                        ).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </td>
                                      <td className="py-4 px-6">
                                        <span
                                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                            tx.status,
                                          )}`}
                                        >
                                          {tx.status}
                                        </span>
                                      </td>
                                      <td className="py-4 px-6 text-gray-400 text-sm">
                                        {new Date(
                                          tx.timestamp,
                                        ).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="py-12 px-6 text-gray-400 text-center"
                                    >
                                      No transaction history available
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Pagination for User Transactions */}
                      {userTxTotal > userTxPerPage && (
                        <div className="flex items-center justify-between bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                          <div className="text-sm text-gray-400">
                            Showing{" "}
                            <span className="text-white font-medium">
                              {(userTxPage - 1) * userTxPerPage + 1}
                            </span>
                            -
                            <span className="text-white font-medium">
                              {Math.min(
                                userTxPage * userTxPerPage,
                                userTxTotal,
                              )}
                            </span>{" "}
                            of{" "}
                            <span className="text-white font-medium">
                              {userTxTotal}
                            </span>{" "}
                            transactions
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                const newPage = Math.max(1, userTxPage - 1);
                                if (selectedWithdrawal) {
                                  fetchWithdrawalDetails(
                                    selectedWithdrawal,
                                    newPage,
                                  );
                                }
                              }}
                              disabled={userTxPage === 1}
                              className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors font-medium text-sm"
                            >
                              Previous
                            </button>
                            <span className="text-sm text-gray-300 font-medium px-3">
                              Page {userTxPage} of{" "}
                              {Math.ceil(userTxTotal / userTxPerPage)}
                            </span>
                            <button
                              onClick={() => {
                                const newPage = Math.min(
                                  Math.ceil(userTxTotal / userTxPerPage),
                                  userTxPage + 1,
                                );
                                if (selectedWithdrawal) {
                                  fetchWithdrawalDetails(
                                    selectedWithdrawal,
                                    newPage,
                                  );
                                }
                              }}
                              disabled={
                                userTxPage >=
                                Math.ceil(userTxTotal / userTxPerPage)
                              }
                              className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors font-medium text-sm"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700/50">
                        <button
                          onClick={confirmCancelWithdrawal}
                          className="bg-red-600/90 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all hover:shadow-lg hover:shadow-red-600/20"
                        >
                          <XCircle className="h-5 w-5" />
                          <span>Cancel Withdrawal</span>
                        </button>
                        <button
                          onClick={confirmReleaseWithdrawal}
                          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-all hover:shadow-lg hover:shadow-green-600/20"
                        >
                          <CheckCircle className="h-5 w-5" />
                          <span>Release Withdrawal</span>
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseConfirm && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Release Withdrawal
                </h3>
              </div>
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Are you sure you want to release this withdrawal?
                </p>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Withdrawal ID:</span>
                    <CopyableText
                      text={selectedWithdrawal.withdrawal_id}
                      className="text-white"
                      label="Withdrawal ID"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">
                      $
                      {(
                        selectedWithdrawal.usd_amount_cents / 100
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>What will happen:</strong>
                  </p>
                  <ul className="text-sm text-blue-200 mt-2 space-y-1 list-disc list-inside">
                    <li>The withdrawal status will change to "completed"</li>
                    <li>The withdrawal will be processed automatically</li>
                    <li>The user's reserved balance will be released</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>
              {releaseError && (
                <div className="mb-4 p-3 bg-red-600/10 border border-red-600/50 text-red-400 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span>{releaseError}</span>
                    {releaseError
                      .toLowerCase()
                      .includes("kyc verification is required") &&
                      selectedWithdrawal && (
                        <button
                          onClick={() =>
                            navigate(`/players?q=${selectedWithdrawal.user_id}`)
                          }
                          className="ml-4 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                        >
                          View Player
                        </button>
                      )}
                  </div>
                </div>
              )}
              {releaseSuccess && (
                <div className="mb-4 p-3 bg-green-600/10 border border-green-600/50 text-green-400 rounded-lg text-sm flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Withdrawal released successfully!</span>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (!isReleasing) {
                      setShowReleaseConfirm(false);
                      setPendingAction(null);
                      setReleaseError(null);
                      setReleaseSuccess(false);
                    }
                  }}
                  disabled={isReleasing}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {releaseSuccess ? "Close" : "Cancel"}
                </button>
                <button
                  onClick={() =>
                    pendingAction && handleReleaseWithdrawal(pendingAction)
                  }
                  disabled={isReleasing || releaseSuccess}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isReleasing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Releasing...</span>
                    </>
                  ) : releaseSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Released</span>
                    </>
                  ) : (
                    <span>Confirm Release</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Cancel Withdrawal
                </h3>
              </div>
              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Are you sure you want to cancel this withdrawal?
                </p>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Withdrawal ID:</span>
                    <CopyableText
                      text={selectedWithdrawal.withdrawal_id}
                      className="text-white"
                      label="Withdrawal ID"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">
                      $
                      {(
                        selectedWithdrawal.usd_amount_cents / 100
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-red-600/10 border border-red-600/30 rounded-lg">
                  <p className="text-sm text-red-300">
                    <strong>What will happen:</strong>
                  </p>
                  <ul className="text-sm text-red-200 mt-2 space-y-1 list-disc list-inside">
                    <li>The withdrawal status will change to "cancelled"</li>
                    <li>
                      The user's reserved balance will be released back to their
                      account
                    </li>
                    <li>The withdrawal will not be processed</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    pendingAction && handleCancelWithdrawal(pendingAction)
                  }
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-red-600/20"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
