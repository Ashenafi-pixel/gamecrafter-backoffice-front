import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { Transaction } from "../../types";
import { wmsService } from "../../services/wmsService";
import { brandService, Brand } from "../../services/brandService";
import { CopyableText } from "../common/CopyableText";
import toast from "react-hot-toast";

const convertToCSV = (transactions: Transaction[]): string => {
  const headers = [
    "Transaction ID",
    "Type",
    "User ID",
    "Username",
    "Network",
    "Crypto",
    "Amount",
    "USD Value",
    "Balance Before (USD)",
    "Balance After (USD)",
    "Fee",
    "Status",
    "Timestamp",
    "Hash",
  ];
  const rows = transactions.map((tx) => [
    tx.transaction_type === "deposit"
      ? tx.deposit_session_id
      : tx.withdrawal_id,
    tx.transaction_type,
    tx.user_id,
    tx.username || "N/A",
    tx.network,
    tx.crypto_currency,
    tx.amount.toFixed(8),
    (tx.usd_amount_cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    (tx.balance_before_cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    (tx.balance_after_cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    tx.fee.toFixed(8),
    tx.status,
    new Date(tx.timestamp).toLocaleString(),
    tx.tx_hash,
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

export const TransactionManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCryptos, setSelectedCryptos] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string>("");
  const [selectedProtocols, setSelectedProtocols] = useState<string>("");
  const [showCryptoFilter, setShowCryptoFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showProtocolFilter, setShowProtocolFilter] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [totalDepositsUSD, setTotalDepositsUSD] = useState(0);
  const [totalWithdrawalsUSD, setTotalWithdrawalsUSD] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [availableProtocols, setAvailableProtocols] = useState<string[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Refs for click-outside detection
  const cryptoFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const typeFilterRef = useRef<HTMLDivElement>(null);
  const protocolFilterRef = useRef<HTMLDivElement>(null);

  const allStatuses = ["pending", "verified", "failed", "processing"];
  const allTypes = ["deposit", "withdraw"];

  const explorerUrls: { [key: string]: string } = {
    "sol-mainnet": "https://explorer.solana.com/tx/",
    "sol-testnet": "https://explorer.solana.com/tx/?cluster=testnet",
    "eth-mainnet": "https://etherscan.io/tx/",
    "eth-testnet": "https://sepolia.etherscan.io/tx/",
  };

  // Fetch currencies and protocols on mount
  useEffect(() => {
    const fetchFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const [currencyConfigs, chainConfigs] = await Promise.all([
          wmsService.getCurrencyConfigs(100, 0),
          wmsService.getChainConfigs(100, 0),
        ]);

        // Extract currency codes from currency configs
        const currencies = Array.isArray(currencyConfigs)
          ? currencyConfigs
              .map((config: any) => config.currency_code)
              .filter((code: string) => code && code.trim() !== "")
          : [];
        setAvailableCurrencies(currencies);

        // Extract unique protocols from chain configs
        const protocols = new Set<string>();
        if (Array.isArray(chainConfigs)) {
          chainConfigs.forEach((config: any) => {
            if (config.protocol && config.protocol.trim() !== "") {
              protocols.add(config.protocol);
            }
          });
        }
        setAvailableProtocols(Array.from(protocols).sort());
      } catch (err: any) {
        console.error("Failed to fetch filter data:", err);
        // Set defaults on error
        setAvailableCurrencies([]);
        setAvailableProtocols([]);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    fetchFilterData();
  }, []);

  // Fetch brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // Refetch transactions when brand changes
  useEffect(() => {
    if (selectedBrandId !== null) {
      fetchTransactions(false);
    }
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

        const storedBrandId = localStorage.getItem(
          "transaction_management_brand_id",
        );
        if (storedBrandId && brandsList.some((b: Brand) => b.id === storedBrandId)) {
          setSelectedBrandId(storedBrandId);
        } else if (brandsList.length > 0) {
          const randomIndex = Math.floor(Math.random() * brandsList.length);
          const randomBrand = brandsList[randomIndex];
          setSelectedBrandId(randomBrand.id);
          localStorage.setItem(
            "transaction_management_brand_id",
            randomBrand.id,
          );
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
    setSelectedBrandId(brandId);
    localStorage.setItem("transaction_management_brand_id", brandId);
  };

  // Click-outside handlers for filter dropdowns
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
        typeFilterRef.current &&
        !typeFilterRef.current.contains(event.target as Node)
      ) {
        setShowTypeFilter(false);
      }
      if (
        protocolFilterRef.current &&
        !protocolFilterRef.current.contains(event.target as Node)
      ) {
        setShowProtocolFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchTransactions = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      // Build params for WMS service matching backend handler
      const wmsParams: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      // Add search parameter
      if (searchTerm) {
        wmsParams.search = searchTerm;
      }

      // Format dates as RFC3339 (convert date inputs to ISO format with time)
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        wmsParams.date_from = startDate.toISOString();
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        wmsParams.date_to = endDate.toISOString();
      }

      // Add amount filters (convert USD to cents)
      if (amountRange.min) {
        const minAmount = parseFloat(amountRange.min);
        if (!isNaN(minAmount)) {
          wmsParams.amount_min = minAmount;
        }
      }
      if (amountRange.max) {
        const maxAmount = parseFloat(amountRange.max);
        if (!isNaN(maxAmount)) {
          wmsParams.amount_max = maxAmount;
        }
      }

      // Add status filter
      if (selectedStatuses) {
        wmsParams.status = selectedStatuses;
      }

      // Add transaction type filter
      if (selectedTypes) {
        // Map "withdraw" to "withdrawal" for API compatibility
        wmsParams.transaction_type =
          selectedTypes === "withdraw" ? "withdrawal" : selectedTypes;
      }

      // Add protocol filter (replaces network)
      if (selectedProtocols) {
        wmsParams.protocol = selectedProtocols;
      }

      // Add currency_code filter (replaces crypto)
      if (selectedCryptos) {
        wmsParams.currency_code = selectedCryptos;
      }

      // Add brand_id filter
      if (selectedBrandId) {
        wmsParams.brand_id = selectedBrandId;
      }

      const response = await wmsService.getTransactions(wmsParams);

      if (response) {
        const transactions = response.data || [];

        // Map API response to UI Transaction type
        const mappedTransactions = transactions.map((tx: any) => ({
          ...tx,
          // Map transaction_type from "withdrawal" to "withdraw" for UI compatibility
          transaction_type:
            tx.transaction_type === "withdrawal"
              ? "withdraw"
              : tx.transaction_type,
          // Map currency_code to crypto_currency for UI
          crypto_currency: tx.currency_code || tx.crypto_currency,
          // Map chain_id to network for UI
          network: tx.chain_id
            ? tx.chain_id.includes("sol")
              ? "SOL"
              : tx.chain_id.includes("eth")
                ? "ERC-20"
                : tx.chain_id
            : tx.network,
          // Ensure deposit_session_id and withdrawal_id are set correctly
          deposit_session_id: tx.deposit_session_id || tx.id,
          withdrawal_id: tx.withdrawal_id || tx.id,
          // Include username
          username: tx.username,
          // Ensure balance fields are included
          balance_before_cents: tx.balance_before_cents || 0,
          balance_after_cents: tx.balance_after_cents || 0,
        }));

        setTransactions(mappedTransactions as Transaction[]);
        setTotalItems(response.total || 0);
        setTotalDeposits(response.total_deposits || 0);
        setTotalWithdrawals(response.total_withdrawals || 0);
        setTotalDepositsUSD(response.total_deposits_usd || 0);
        setTotalWithdrawalsUSD(response.total_withdrawals_usd || 0);
      } else {
        setError("Failed to fetch transactions");
        setTransactions([]);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || "Failed to fetch transactions");
      }
      setTransactions([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(transactions);
    downloadCSV(csv, `transactions_${new Date().toISOString()}.csv`);
  };

  useEffect(() => {
    if (selectedBrandId !== null) {
      fetchTransactions(false); // Initial load - show loading
      const interval = setInterval(() => fetchTransactions(true), 30000); // Silent polling
      return () => clearInterval(interval);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedCryptos,
    selectedStatuses,
    selectedTypes,
    selectedProtocols,
    dateRange,
    amountRange,
    selectedBrandId,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCryptos,
    selectedStatuses,
    selectedTypes,
    selectedProtocols,
    dateRange,
    amountRange,
  ]);

  const handleCryptoSelection = (crypto: string) => {
    setSelectedCryptos((prev) => (prev === crypto ? "" : crypto));
  };

  const handleStatusSelection = (status: string) => {
    setSelectedStatuses((prev) => (prev === status ? "" : status));
  };

  const handleTypeSelection = (type: string) => {
    setSelectedTypes((prev) => (prev === type ? "" : type));
  };

  const handleProtocolSelection = (protocol: string) => {
    setSelectedProtocols((prev) => (prev === protocol ? "" : protocol));
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCryptos("");
    setSelectedStatuses("");
    setSelectedTypes("");
    setSelectedProtocols("");
    setDateRange({ start: "", end: "" });
    setAmountRange({ min: "", max: "" });
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "text-green-400 bg-green-400/10";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10";
      case "failed":
        return "text-red-400 bg-red-400/10";
      case "processing":
        return "text-blue-400 bg-blue-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getExplorerLink = (chainId: string, txHash: string) => {
    const baseUrl = explorerUrls[chainId] || "https://etherscan.io/tx/";
    return `${baseUrl}${txHash}`;
  };

  const SkeletonRow = () => (
    <tr className="divide-y divide-slate-700/50">
      {Array.from({ length: 13 }).map((_, index) => (
        <td key={index} className="py-3 px-6">
          <div className="h-4 bg-slate-700/50 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Page Header - match game-management */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <Receipt className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Transaction details</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Search and filter all platform transactions
            </p>
          </div>
        </div>
      </div>

      {/* KPI cards - match game-management */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Deposits (USD)</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${totalDepositsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
              <ArrowDownLeft className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Withdrawals (USD)</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${totalWithdrawalsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
              <ArrowUpRight className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Deposits</p>
              <p className="text-2xl font-bold text-white mt-1">{totalDeposits}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Withdrawals</p>
              <p className="text-2xl font-bold text-white mt-1">{totalWithdrawals}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Filters - match game-management */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Filters</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAllFilters}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
            <button
              onClick={() => fetchTransactions(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Transaction ID, User ID, Username, or Hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl placeholder-slate-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
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
                className="bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                className="bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 text-sm w-24 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max USD"
                value={amountRange.max}
                onChange={(e) =>
                  setAmountRange((prev) => ({ ...prev, max: e.target.value }))
                }
                className="bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 text-sm w-24 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="relative" ref={cryptoFilterRef}>
              <button
                onClick={() => setShowCryptoFilter(!showCryptoFilter)}
                className={`px-4 py-2 rounded-xl flex items-center space-x-2 text-sm font-medium border transition-colors ${selectedCryptos ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-slate-950/60 border-slate-700 text-slate-300 hover:bg-slate-800/60"}`}
              >
                <Filter className="h-4 w-4" />
                <span>
                  Crypto {selectedCryptos ? `(${selectedCryptos})` : ""}
                </span>
              </button>
              {showCryptoFilter && (
                <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 min-w-[200px] z-10 shadow-xl">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {isLoadingFilters ? (
                      <div className="text-slate-400 text-sm">Loading...</div>
                    ) : availableCurrencies.length > 0 ? (
                      availableCurrencies.map((crypto) => (
                        <label
                          key={crypto}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="crypto-filter"
                            checked={selectedCryptos === crypto}
                            onChange={() => handleCryptoSelection(crypto)}
                            className="border-gray-500"
                          />
                          <span className="text-white text-sm">{crypto}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-slate-400 text-sm">
                        No currencies available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={statusFilterRef}>
              <button
                onClick={() => setShowStatusFilter(!showStatusFilter)}
                className={`px-4 py-2 rounded-xl flex items-center space-x-2 text-sm font-medium border transition-colors ${selectedStatuses ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-slate-950/60 border-slate-700 text-slate-300 hover:bg-slate-800/60"}`}
              >
                <Filter className="h-4 w-4" />
                <span>
                  Status {selectedStatuses ? `(${selectedStatuses})` : ""}
                </span>
              </button>
              {showStatusFilter && (
                <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 min-w-[200px] z-10 shadow-xl">
                  <div className="space-y-2">
                    {allStatuses.map((status) => (
                      <label
                        key={status}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="status-filter"
                          checked={selectedStatuses === status}
                          onChange={() => handleStatusSelection(status)}
                          className="border-gray-500"
                        />
                        <span className="text-white text-sm capitalize">
                          {status}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={typeFilterRef}>
              <button
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className={`px-4 py-2 rounded-xl flex items-center space-x-2 text-sm font-medium border transition-colors ${selectedTypes ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-slate-950/60 border-slate-700 text-slate-300 hover:bg-slate-800/60"}`}
              >
                <Filter className="h-4 w-4" />
                <span>Type {selectedTypes ? `(${selectedTypes})` : ""}</span>
              </button>
              {showTypeFilter && (
                <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 min-w-[200px] z-10 shadow-xl">
                  <div className="space-y-2">
                    {allTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="type-filter"
                          checked={selectedTypes === type}
                          onChange={() => handleTypeSelection(type)}
                          className="border-gray-500"
                        />
                        <span className="text-white text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={protocolFilterRef}>
              <button
                onClick={() => setShowProtocolFilter(!showProtocolFilter)}
                className={`px-4 py-2 rounded-xl flex items-center space-x-2 text-sm font-medium border transition-colors ${selectedProtocols ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-slate-950/60 border-slate-700 text-slate-300 hover:bg-slate-800/60"}`}
              >
                <Filter className="h-4 w-4" />
                <span>
                  Protocol {selectedProtocols ? `(${selectedProtocols})` : ""}
                </span>
              </button>
              {showProtocolFilter && (
                <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 min-w-[200px] z-10 shadow-xl">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {isLoadingFilters ? (
                      <div className="text-slate-400 text-sm">Loading...</div>
                    ) : availableProtocols.length > 0 ? (
                      availableProtocols.map((protocol) => (
                        <label
                          key={protocol}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="protocol-filter"
                            checked={selectedProtocols === protocol}
                            onChange={() => handleProtocolSelection(protocol)}
                            className="border-gray-500"
                          />
                          <span className="text-white text-sm">{protocol}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-slate-400 text-sm">
                        No protocols available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {loadingBrands ? (
              <div className="flex items-center space-x-2 px-4 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                <span className="text-slate-400 text-sm">Loading brands...</span>
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

          {(selectedCryptos ||
            selectedStatuses ||
            selectedTypes ||
            selectedProtocols) && (
            <div className="flex flex-wrap gap-2">
              {selectedCryptos && (
                <span className="bg-red-500/10 border border-red-500/30 text-red-300 px-2 py-1 rounded-lg text-xs flex items-center space-x-1">
                  <span>Crypto: {selectedCryptos}</span>
                  <button
                    onClick={() => handleCryptoSelection(selectedCryptos)}
                    className="hover:opacity-80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedStatuses && (
                <span className="bg-red-500/10 border border-red-500/30 text-red-300 px-2 py-1 rounded-lg text-xs flex items-center space-x-1 capitalize">
                  <span>Status: {selectedStatuses}</span>
                  <button
                    onClick={() => handleStatusSelection(selectedStatuses)}
                    className="hover:opacity-80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedTypes && (
                <span className="bg-red-500/10 border border-red-500/30 text-red-300 px-2 py-1 rounded-lg text-xs flex items-center space-x-1">
                  <span>Type: {selectedTypes}</span>
                  <button onClick={() => handleTypeSelection(selectedTypes)} className="hover:opacity-80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedProtocols && (
                <span className="bg-red-500/10 border border-red-500/30 text-red-300 px-2 py-1 rounded-lg text-xs flex items-center space-x-1">
                  <span>Protocol: {selectedProtocols}</span>
                  <button
                    onClick={() => handleProtocolSelection(selectedProtocols)}
                    className="hover:opacity-80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">All Transactions</h3>
            {isLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-red-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
              title="Export"
            >
              <Download className="h-5 w-5" />
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              transactions
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  User ID
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Username
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Network
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Crypto
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  USD Value
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Balance Before
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Balance After
                </th>
                <th className="text-right py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Fee
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Hash
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
              {isLoading && isInitialLoad ? (
                Array.from({ length: itemsPerPage }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <p className="text-lg font-medium mb-2">
                        No data available
                      </p>
                      <p className="text-sm">
                        No transactions found matching your filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, index) => (
                  <tr
                    key={index}
                    className="divide-y divide-slate-700/50 hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <CopyableText
                        text={tx.user_id}
                        displayText={`${tx.user_id.slice(0, 8)}...${tx.user_id.slice(-6)}`}
                        className="text-blue-400"
                        label="User ID"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <CopyableText
                        text={tx.username || "N/A"}
                        className="text-cyan-400"
                        label="Username"
                      />
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {tx.network ||
                        (tx.chain_id?.includes("sol")
                          ? "SOL"
                          : tx.chain_id?.includes("eth")
                            ? "ERC-20"
                            : tx.chain_id)}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {tx.crypto_currency || tx.currency_code}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      {tx.amount.toFixed(8)}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      $
                      {(tx.usd_amount_cents / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-right font-medium">
                      $
                      {(tx.balance_before_cents / 100).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-right font-medium">
                      $
                      {(tx.balance_after_cents / 100).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-right">
                      {tx.fee.toFixed(8)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          tx.status,
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-sm">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                      {tx.tx_hash ? (
                        <a
                          href={getExplorerLink(tx.chain_id, tx.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:underline"
                        >
                          {tx.tx_hash.slice(0, 6)}...{tx.tx_hash.slice(-4)}
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/80 bg-slate-800/30">
            <div className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-700/80 text-white rounded-xl border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-700/80 text-white rounded-xl border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
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
                    className={`px-3 py-1.5 rounded-xl border ${
                      currentPage === pageNum
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "bg-slate-700/80 text-white border-slate-600/50 hover:bg-slate-700"
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
                className="px-3 py-1.5 bg-slate-700/80 text-white rounded-xl border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-700/80 text-white rounded-xl border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
