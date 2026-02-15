import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, Download, RefreshCw, X } from "lucide-react";
import { DepositSession } from "../../types";
import { wmsService } from "../../services/wmsService";
import { brandService, Brand } from "../../services/brandService";
import { CopyableText } from "../common/CopyableText";
import toast from "react-hot-toast";

const convertToCSV = (deposits: DepositSession[]): string => {
  const headers = [
    "Session ID",
    "User ID",
    "Username",
    "Network",
    "Crypto",
    "Crypto Amount",
    "USD Value",
    "Status",
    "Created At",
    "Transaction Hash",
  ];
  const rows = deposits.map((ds) => [
    ds.session_id,
    ds.user_id,
    ds.username || "N/A",
    ds.network,
    ds.crypto_currency,
    ds.amount.toFixed(8),
    (ds.usd_amount_cents / 100).toLocaleString(),
    ds.status,
    new Date(ds.created_at).toLocaleString(),
    ds.tx_hash || "N/A",
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

export const DepositManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [showCryptoFilter, setShowCryptoFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showNetworkFilter, setShowNetworkFilter] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deposits, setDeposits] = useState<DepositSession[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalDepositsUSD, setTotalDepositsUSD] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Refs for filter dropdowns to handle click outside
  const cryptoFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const networkFilterRef = useRef<HTMLDivElement>(null);

  const allCryptos = ["BTC", "ETH", "USDT", "USDC", "SOL"];
  const allStatuses = ["pending", "verified", "failed", "processing"];
  const allNetworks = ["ERC-20", "ETH-MAINNET", "SOL", "ETH", "BTC"];

  const explorerUrls: { [key: string]: string } = {
    "eth-mainnet": "https://etherscan.io/tx/",
    "eth-testnet": "https://sepolia.etherscan.io/tx/",
    "sol-mainnet": "https://solscan.io/tx/",
    "sol-testnet": "https://solscan.io/tx/?cluster=testnet",
    "btc-mainnet": "https://blockstream.info/tx/",
    "btc-testnet": "https://blockstream.info/testnet/tx/",
    "tron-mainnet": "https://tronscan.org/#/transaction/",
    "bsc-mainnet": "https://bscscan.com/tx/",
  };

  const fetchDeposits = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const wmsParams: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };

      if (searchTerm) wmsParams.search = searchTerm;
      if (selectedCrypto) wmsParams.crypto = selectedCrypto;
      if (selectedStatus) wmsParams.status = selectedStatus;
      if (selectedNetwork) {
        wmsParams.protocol = selectedNetwork;
      }
      if (dateRange.start) {
        const dateFrom = new Date(dateRange.start);
        dateFrom.setHours(0, 0, 0, 0);
        wmsParams.date_from = dateFrom.toISOString();
      }
      if (dateRange.end) {
        const dateTo = new Date(dateRange.end);
        dateTo.setHours(23, 59, 59, 999);
        wmsParams.date_to = dateTo.toISOString();
      }
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
      if (selectedBrandId) wmsParams.brand_id = selectedBrandId;

      const response = await wmsService.getDeposits(wmsParams);

      if (response) {
        const responseData: any = response.data;
        const depositsArray = Array.isArray(responseData)
          ? responseData
          : responseData &&
              typeof responseData === "object" &&
              "deposits" in responseData
            ? responseData.deposits
            : [];

        const mappedDeposits = depositsArray.map((ds: any) => ({
          ...ds,
          session_id: ds.deposit_session_id || ds.session_id,
          username: ds.username,
          crypto_currency: ds.currency_code || ds.crypto_currency,
          network: ds.chain_id
            ? ds.chain_id.includes("eth")
              ? "ERC-20"
              : ds.chain_id.includes("tron")
                ? "TRC-20"
                : ds.chain_id.includes("bsc")
                  ? "BEP-20"
                  : ds.chain_id
            : ds.network,
          amount: ds.amount || 0,
          usd_amount_cents: ds.usd_amount_cents || 0,
          status: ds.status || "pending",
          created_at: ds.timestamp || ds.created_at,
        }));

        setDeposits(mappedDeposits as DepositSession[]);
        const totalCount =
          responseData &&
          typeof responseData === "object" &&
          !Array.isArray(responseData) &&
          "total_count" in responseData
            ? responseData.total_count || response.total || 0
            : response.total || 0;
        const totalUSD =
          responseData &&
          typeof responseData === "object" &&
          !Array.isArray(responseData) &&
          "total_deposits_usd_value_cents" in responseData
            ? responseData.total_deposits_usd_value_cents ||
              response.total_deposits_usd_value_cents ||
              0
            : response.total_deposits_usd_value_cents || 0;
        setTotalItems(totalCount);
        setTotalDeposits(totalCount);
        setTotalDepositsUSD(totalUSD / 100);
      } else {
        setError("Failed to fetch deposits");
        setDeposits([]);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || "Failed to fetch deposits from WMS");
      }
      setDeposits([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(deposits);
    downloadCSV(csv, `deposits_${new Date().toISOString()}.csv`);
  };

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch brands on mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // Refetch deposits when brand changes
  useEffect(() => {
    if (selectedBrandId !== null) {
      fetchDeposits(false);
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
          "deposit_management_brand_id",
        );
        if (
          storedBrandId &&
          brandsList.some((b: Brand) => b.id === storedBrandId)
        ) {
          setSelectedBrandId(storedBrandId);
        } else if (brandsList.length > 0) {
          const randomIndex = Math.floor(Math.random() * brandsList.length);
          const randomBrand = brandsList[randomIndex];
          setSelectedBrandId(randomBrand.id);
          localStorage.setItem("deposit_management_brand_id", randomBrand.id);
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
    localStorage.setItem("deposit_management_brand_id", brandId);
  };

  useEffect(() => {
    if (selectedBrandId !== null) {
      fetchDeposits(false);
      const interval = setInterval(() => fetchDeposits(true), 30000);
      return () => clearInterval(interval);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedCrypto,
    selectedStatus,
    selectedNetwork,
    dateRange,
    amountRange,
    selectedBrandId,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCrypto,
    selectedStatus,
    selectedNetwork,
    dateRange,
    amountRange,
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

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCrypto(null);
    setSelectedStatus(null);
    setSelectedNetwork(null);
    setDateRange({ start: "", end: "" });
    setAmountRange({ min: "", max: "" });
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "text-green-400 bg-green-400/10";
      case "pending":
      case "processing":
        return "text-yellow-400 bg-yellow-400/10";
      case "failed":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getExplorerLink = (chainId: string, txHash: string) => {
    const chainIdLower = chainId.toLowerCase();
    // Check for exact match first
    if (explorerUrls[chainId]) {
      return `${explorerUrls[chainId]}${txHash}`;
    }
    // Fallback to pattern matching
    if (chainIdLower.includes("sol")) {
      if (chainIdLower.includes("testnet")) {
        return `https://solscan.io/tx/${txHash}?cluster=testnet`;
      }
      return `https://solscan.io/tx/${txHash}`;
    } else if (chainIdLower.includes("eth")) {
      if (chainIdLower.includes("testnet")) {
        return `https://sepolia.etherscan.io/tx/${txHash}`;
      }
      return `https://etherscan.io/tx/${txHash}`;
    } else if (chainIdLower.includes("btc")) {
      if (chainIdLower.includes("testnet")) {
        return `https://blockstream.info/testnet/tx/${txHash}`;
      }
      return `https://blockstream.info/tx/${txHash}`;
    }
    // Default fallback
    const baseUrl = explorerUrls[chainId] || "https://etherscan.io/tx/";
    return `${baseUrl}${txHash}`;
  };

  const SkeletonRow = () => (
    <tr className="border-b border-gray-700/50">
      {Array.from({ length: 10 }).map((_, index) => (
        <td key={index} className="py-3 px-4">
          <div className="h-4 bg-gray-600/50 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Management</h1>
        <p className="text-gray-400 mt-1">
          Search and manage platform deposits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">
            Total Deposits USD
          </h3>
          <p className="text-2xl font-bold text-white">
            $
            {totalDepositsUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400">Total Deposits</h3>
          <p className="text-2xl font-bold text-white">{totalDeposits}</p>
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
            onClick={() => fetchDeposits(false)}
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
              placeholder="Search by Session ID, User ID, Username, or Hash..."
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

          {(selectedCrypto || selectedStatus || selectedNetwork) && (
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
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">All Deposits</h3>
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
              deposits
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Session ID
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
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Created At
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Hash
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && isInitialLoad ? (
                Array.from({ length: itemsPerPage }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <p className="text-lg font-medium mb-2">
                        No data available
                      </p>
                      <p className="text-sm">
                        No deposits found matching your filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                deposits.map((ds, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4">
                      <CopyableText
                        text={ds.session_id}
                        className="text-purple-400"
                        label="Session ID"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <CopyableText
                        text={ds.user_id}
                        displayText={`${ds.user_id.slice(0, 8)}...${ds.user_id.slice(-6)}`}
                        className="text-blue-400"
                        label="User ID"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <CopyableText
                        text={ds.username || "N/A"}
                        className="text-cyan-400"
                        label="Username"
                      />
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {ds.network}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {ds.crypto_currency}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      {ds.amount.toFixed(8)}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      ${(ds.usd_amount_cents / 100).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ds.status)}`}
                      >
                        {ds.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(ds.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                      {ds.tx_hash ? (
                        <a
                          href={getExplorerLink(ds.chain_id, ds.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:underline"
                        >
                          {ds.tx_hash.slice(0, 6)}...{ds.tx_hash.slice(-4)}
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
    </div>
  );
};
