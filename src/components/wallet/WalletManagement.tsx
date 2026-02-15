import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Wallet,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  TrendingDown,
  Flame,
  Snowflake,
  X,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  List,
  Activity,
  Webhook,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  wmsService,
  WalletWithUserDetails,
  WalletStats,
} from "../../services/wmsService";
import { toast } from "react-hot-toast";
import { ServicesStatus } from "./ServicesStatus";
import { DepositEventRecords } from "./DepositEventRecords";
import { WebhookManagement } from "./WebhookManagement";

const USE_TESTNETS = false;

interface WalletData {
  chain_id: string;
  address: string;
  balance: number;
  currency: string;
  balance_usd_cents?: number;
  updated_at?: string;
}

interface FundTransfer {
  crypto_currency: string;
  chain_id: string;
  network: string;
  hot_wallet: string;
  cold_wallet: string;
  amount: number;
}

interface ChainConfig {
  chain_id: string;
  name: string;
  networks: string[];
  crypto_currencies: string[];
}

interface CurrencyConfig {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_type: string;
  decimal_places: number;
  smallest_unit_name: string;
  is_active: boolean;
  created_at: string;
}

export const WalletManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const prevTabParamRef = useRef<string | null>(null);

  // Get tab from URL or default to "wallets"
  const getTabFromUrl = ():
    | "wallets"
    | "movements"
    | "all-wallets"
    | "services-status"
    | "deposit-events"
    | "webhooks" => {
    const tab = searchParams.get("tab");
    const validTabs = [
      "wallets",
      "movements",
      "all-wallets",
      "services-status",
      "deposit-events",
      "webhooks",
    ];
    if (tab && validTabs.includes(tab)) {
      return tab as
        | "wallets"
        | "movements"
        | "all-wallets"
        | "services-status"
        | "deposit-events"
        | "webhooks";
    }
    return "wallets";
  };

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hotWalletData, setHotWalletData] = useState<WalletData[]>([]);
  const [coldWalletData, setColdWalletData] = useState<WalletData[]>([]);
  const [visibleAddresses, setVisibleAddresses] = useState<Set<string>>(
    new Set(),
  );
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showFundTransferModal, setShowFundTransferModal] =
    useState<boolean>(false);
  const [isSubmittingFundTransfer, setIsSubmittingFundTransfer] =
    useState<boolean>(false);
  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>([]);
  const [isLoadingModalData, setIsLoadingModalData] = useState<boolean>(false);
  const [fundTransfer, setFundTransfer] = useState<FundTransfer>({
    crypto_currency: "",
    chain_id: "",
    network: "mainnet",
    hot_wallet: "",
    cold_wallet: "",
    amount: 0,
  });

  const [activeTab, setActiveTab] = useState<
    | "wallets"
    | "movements"
    | "all-wallets"
    | "services-status"
    | "deposit-events"
    | "webhooks"
  >(getTabFromUrl());

  // Update URL when tab changes
  const handleTabChange = (
    tab:
      | "wallets"
      | "movements"
      | "all-wallets"
      | "services-status"
      | "deposit-events"
      | "webhooks",
  ) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", tab);
    setSearchParams(newSearchParams, { replace: true });
  };

  // Initialize tab from URL on mount and when tab param changes (not other params)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const tabFromUrl = getTabFromUrl();
    
    // Only update tab if the tab param actually changed (not just other params)
    if (tabParam !== prevTabParamRef.current) {
      prevTabParamRef.current = tabParam;
      if (tabParam && tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
      }
    }
    
    // If no tab in URL, set current active tab in URL (preserve current state)
    if (!tabParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("tab", activeTab);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, activeTab, setSearchParams]);

  // Cache tracking for tabs
  const [tabCache, setTabCache] = useState<Set<string>>(new Set());

  const [fundMovements, setFundMovements] = useState<any[]>([]);
  const [fundMovementsStats, setFundMovementsStats] = useState({
    total_count: 0,
    total_completed_amount: 0,
    total_completed_count: 0,
    total_pending_count: 0,
    total_failed_count: 0,
    total_to_cold_count: 0,
    total_to_hot_count: 0,
  });
  const [fundMovementsPage, setFundMovementsPage] = useState(1);
  const [fundMovementsPerPage, setFundMovementsPerPage] = useState(10);
  const [fundMovementsLoading, setFundMovementsLoading] = useState(false);
  const [fundMovementsFilters, setFundMovementsFilters] = useState({
    chain_id: "",
    currency_code: "",
    status: "",
    movement_type: "",
    date_from: "",
    date_to: "",
  });
  const [fundMovementsChains, setFundMovementsChains] = useState<ChainConfig[]>(
    [],
  );

  const [allWallets, setAllWallets] = useState<WalletWithUserDetails[]>([]);
  const [allWalletsLoading, setAllWalletsLoading] = useState(false);
  const [allWalletsTotalCount, setAllWalletsTotalCount] = useState(0);
  const [allWalletsStats, setAllWalletsStats] = useState<WalletStats | null>(
    null,
  );
  const [isCurrencyStatsExpanded, setIsCurrencyStatsExpanded] =
    useState<boolean>(false);
  const [allWalletsPage, setAllWalletsPage] = useState(1);
  const [allWalletsPerPage, setAllWalletsPerPage] = useState(10);
  const [allWalletsFilters, setAllWalletsFilters] = useState({
    chain_id: "",
    search: "",
    is_active: "",
    // Currency-specific filter (mutually exclusive with fiat filter)
    currency: "",
    currency_amount_min: "",
    currency_amount_max: "",
    // Combined fiat filter (mutually exclusive with currency filter)
    total_fiat_amount_min: "",
    total_fiat_amount_max: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [allWalletsChains, setAllWalletsChains] = useState<ChainConfig[]>([]);
  const [allWalletsCurrencies, setAllWalletsCurrencies] = useState<string[]>(
    [],
  );
  const [loadingAllWalletsCurrencies, setLoadingAllWalletsCurrencies] =
    useState(false);
  const [selectedWallet, setSelectedWallet] =
    useState<WalletWithUserDetails | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedWalletsForTransfer, setSelectedWalletsForTransfer] = useState<
    Set<string>
  >(new Set());
  const [syncingWalletId, setSyncingWalletId] = useState<string | null>(null);
  const [triggeringSweeper, setTriggeringSweeper] = useState(false);
  const [triggeringBackfill, setTriggeringBackfill] = useState(false);
  const [syncingBalances, setSyncingBalances] = useState(false);
  const [syncingInternalWallets, setSyncingInternalWallets] = useState(false);
  const [showTransferToHotModal, setShowTransferToHotModal] = useState(false);
  const [transferMode, setTransferMode] = useState<"single" | "batch">(
    "single",
  );
  const [transferForm, setTransferForm] = useState({
    wallet_address: "",
    chain_id: "",
    currency_code: "",
    amount: 0,
  });
  const [batchTransferForm, setBatchTransferForm] = useState({
    chain_id: "",
    currency_code: "",
    transfers: [] as Array<{ wallet_address: string; amount: number }>,
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [chainCurrencies, setChainCurrencies] = useState<any[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<{
    fee_native: number;
    fee_usd: number;
    fee_currency: string;
    rent_exempt_reserve?: number;
    rent_exempt_reserve_usd?: number;
    total_amount: number;
    total_usd: number;
    max_transferable: number;
  } | null>(null);
  const [loadingFeeEstimate, setLoadingFeeEstimate] = useState(false);
  const [transferValidation, setTransferValidation] = useState<{
    is_valid: boolean;
    available_balance: number;
    requested_amount: number;
    estimated_fee: number;
    rent_exempt_reserve?: number;
    total_required: number;
    max_transferable: number;
    can_transfer: boolean;
    error_message?: string;
  } | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedCurrencyBalance, setSelectedCurrencyBalance] = useState<number>(0);
  const [selectedCurrencyBalanceUSD, setSelectedCurrencyBalanceUSD] = useState<number>(0);

  const formatAddress = (address: string) => {
    if (visibleAddresses.has(address)) {
      return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (updatedAt?: string): string => {
    if (!updatedAt) return "Unknown";
    try {
      const date = new Date(updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) {
        return "Just now";
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return "Unknown";
    }
  };

  const getExplorerUrl = (chainId: string, address: string): string | null => {
    const chainIdLower = chainId.toLowerCase();

    if (chainIdLower.includes("btc")) {
      if (chainIdLower.includes("testnet")) {
        return `https://blockstream.info/testnet/address/${address}`;
      } else {
        return `https://blockstream.info/address/${address}`;
      }
    } else if (chainIdLower.includes("sol")) {
      if (chainIdLower.includes("testnet")) {
        return `https://solscan.io/address/${address}?cluster=testnet`;
      } else {
        return `https://solscan.io/address/${address}`;
      }
    } else if (chainIdLower.includes("eth")) {
      if (chainIdLower.includes("testnet")) {
        return `https://sepolia.etherscan.io/address/${address}`;
      } else {
        return `https://etherscan.io/address/${address}`;
      }
    }

    return null;
  };

  const toggleAddressVisibility = (address: string) => {
    setVisibleAddresses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  const fetchWalletData = useCallback(
    async (force: boolean = false) => {
      // Check cache if not forcing refresh
      if (!force && tabCache.has("wallets")) {
        return;
      }

      setIsLoading(true);
      try {
        const [hotWalletData, coldWalletData] = await Promise.all([
          wmsService.getHotWalletData(),
          wmsService.getColdWalletData(),
        ]);

        console.log("Hot Wallet Data:", hotWalletData);
        console.log("Cold Wallet Data:", coldWalletData);

        let filteredHotData = hotWalletData || [];
        let filteredColdData = coldWalletData || [];

        // Filter out testnet chains if USE_TESTNETS is false
        if (!USE_TESTNETS) {
          filteredHotData = filteredHotData.filter(
            (wallet: WalletData) => !wallet.chain_id.endsWith("-testnet"),
          );
          filteredColdData = filteredColdData.filter(
            (wallet: WalletData) => !wallet.chain_id.endsWith("-testnet"),
          );
        }

        setHotWalletData(filteredHotData);
        setColdWalletData(filteredColdData);
        setTabCache((prev) => new Set(prev).add("wallets"));
      } catch (err: any) {
        console.error("Error fetching wallet data:", err);
        toast.error(err.message || "Failed to fetch wallet data");
      } finally {
        setIsLoading(false);
      }
    },
    [tabCache],
  );

  const handleRefreshWalletData = async () => {
    setIsRefreshing(true);
    try {
      await fetchWalletData(true); // Force refresh
      toast.success("Wallet data refreshed successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh wallet data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncInternalWallets = async () => {
    setSyncingInternalWallets(true);
    try {
      await wmsService.syncInternalWallets();
      toast.success("Internal wallets synced successfully");
      await fetchWalletData(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to sync internal wallets");
    } finally {
      setSyncingInternalWallets(false);
    }
  };

  const handleFundTransfer = async () => {
    if (
      !fundTransfer.hot_wallet ||
      !fundTransfer.cold_wallet ||
      fundTransfer.amount <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmittingFundTransfer(true);
    try {
      const response = await wmsService.transferFunds(fundTransfer);
      if (response.success) {
        toast.success("Funds transferred successfully");
        setShowFundTransferModal(false);
        setFundTransfer({
          crypto_currency: "",
          chain_id: "",
          network: "mainnet",
          hot_wallet: "",
          cold_wallet: "",
          amount: 0,
        });
        await fetchWalletData();
      } else {
        toast.error(response.message || "Failed to transfer funds");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to transfer funds",
      );
    } finally {
      setIsSubmittingFundTransfer(false);
    }
  };

  const fetchChainsAndCurrencies = useCallback(async () => {
    setIsLoadingModalData(true);
    try {
      const [chainConfigs, currencyConfigs] = await Promise.all([
        wmsService.getChainConfigs(100, 0),
        wmsService.getCurrencyConfigs(100, 0),
      ]);
      console.log("Chain Configs:", chainConfigs);
      console.log("Currency Configs:", currencyConfigs);
      setChains(chainConfigs || []);
      setCurrencies(currencyConfigs || []);
    } catch (err: any) {
      console.error("Error fetching chains and currencies:", err);
      toast.error("Failed to fetch chains and currencies");
    } finally {
      setIsLoadingModalData(false);
    }
  }, []);

  const fetchFundMovementsChains = useCallback(async () => {
    try {
      const supportedChains = await wmsService.getSupportedChains();
      const chainsList = Array.isArray(supportedChains) ? supportedChains : [];
      setFundMovementsChains(chainsList);
    } catch (err: any) {
      console.error("Error fetching supported chains for fund movements:", err);
      toast.error("Failed to fetch supported chains");
    }
  }, []);

  const handleOpenFundTransferModal = async () => {
    setShowFundTransferModal(true);
    await fetchChainsAndCurrencies();
  };

  const getFilteredHotWallets = () => {
    if (!fundTransfer.chain_id) return [];
    let filtered = hotWalletData.filter(
      (w) => w.chain_id === fundTransfer.chain_id,
    );
    // Apply testnet filter if USE_TESTNETS is false
    if (!USE_TESTNETS) {
      filtered = filtered.filter((w) => !w.chain_id.endsWith("-testnet"));
    }
    return filtered;
  };

  const getFilteredColdWallets = () => {
    if (!fundTransfer.chain_id) return [];
    let filtered = coldWalletData.filter(
      (w) => w.chain_id === fundTransfer.chain_id,
    );
    // Apply testnet filter if USE_TESTNETS is false
    if (!USE_TESTNETS) {
      filtered = filtered.filter((w) => !w.chain_id.endsWith("-testnet"));
    }
    return filtered;
  };

  // Group wallets by chain_id and address
  const groupWalletsByChainAndAddress = (wallets: WalletData[]) => {
    const grouped: { [key: string]: WalletData[] } = {};
    wallets.forEach((wallet) => {
      const key = `${wallet.chain_id}-${wallet.address}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(wallet);
    });
    return grouped;
  };

  const groupedHotWallets = groupWalletsByChainAndAddress(hotWalletData);
  const groupedColdWallets = groupWalletsByChainAndAddress(coldWalletData);

  // Calculate stats for hot wallets
  const hotWalletStats = React.useMemo(() => {
    const totalUsdCents = hotWalletData.reduce(
      (sum, wallet) => sum + (wallet.balance_usd_cents || 0),
      0,
    );
    const uniqueAddresses = new Set(hotWalletData.map((w) => w.address)).size;
    const currencyStats = hotWalletData.reduce(
      (acc, wallet) => {
        const key = wallet.currency;
        if (!acc[key]) {
          acc[key] = { currency: key, total_balance: 0, total_usd_cents: 0 };
        }
        acc[key].total_balance += wallet.balance || 0;
        acc[key].total_usd_cents += wallet.balance_usd_cents || 0;
        return acc;
      },
      {} as Record<
        string,
        { currency: string; total_balance: number; total_usd_cents: number }
      >,
    );
    return {
      total_usd_cents: totalUsdCents,
      total_wallet_count: uniqueAddresses,
      currency_stats: Object.values(currencyStats),
    };
  }, [hotWalletData]);

  // Calculate stats for cold wallets
  const coldWalletStats = React.useMemo(() => {
    const totalUsdCents = coldWalletData.reduce(
      (sum, wallet) => sum + (wallet.balance_usd_cents || 0),
      0,
    );
    const uniqueAddresses = new Set(coldWalletData.map((w) => w.address)).size;
    const currencyStats = coldWalletData.reduce(
      (acc, wallet) => {
        const key = wallet.currency;
        if (!acc[key]) {
          acc[key] = { currency: key, total_balance: 0, total_usd_cents: 0 };
        }
        acc[key].total_balance += wallet.balance || 0;
        acc[key].total_usd_cents += wallet.balance_usd_cents || 0;
        return acc;
      },
      {} as Record<
        string,
        { currency: string; total_balance: number; total_usd_cents: number }
      >,
    );
    return {
      total_usd_cents: totalUsdCents,
      total_wallet_count: uniqueAddresses,
      currency_stats: Object.values(currencyStats),
    };
  }, [coldWalletData]);

  const fetchFundMovements = useCallback(
    async (force: boolean = false) => {
      const cacheKey = `movements-${JSON.stringify(fundMovementsFilters)}-${fundMovementsPage}-${fundMovementsPerPage}`;
      if (!force && tabCache.has(cacheKey)) {
        return;
      }

      setFundMovementsLoading(true);
      try {
        const params: any = {
          limit: fundMovementsPerPage,
          offset: (fundMovementsPage - 1) * fundMovementsPerPage,
        };

        // Send all non-empty filter parameters to backend - no client-side filtering
        if (
          fundMovementsFilters.chain_id &&
          fundMovementsFilters.chain_id.trim() !== ""
        ) {
          params.chain_id = fundMovementsFilters.chain_id.trim();
        }
        if (
          fundMovementsFilters.currency_code &&
          fundMovementsFilters.currency_code.trim() !== ""
        ) {
          params.currency_code = fundMovementsFilters.currency_code.trim();
        }
        if (
          fundMovementsFilters.status &&
          fundMovementsFilters.status.trim() !== ""
        ) {
          params.status = fundMovementsFilters.status.trim();
        }
        if (
          fundMovementsFilters.movement_type &&
          fundMovementsFilters.movement_type.trim() !== ""
        ) {
          params.movement_type = fundMovementsFilters.movement_type.trim();
        }

        // Send dates - API accepts both RFC3339 format and simple date format (YYYY-MM-DD)
        // Convert to RFC3339 format for consistency
        if (
          fundMovementsFilters.date_from &&
          fundMovementsFilters.date_from.trim() !== ""
        ) {
          try {
            const dateFrom = new Date(fundMovementsFilters.date_from);
            if (!isNaN(dateFrom.getTime())) {
              dateFrom.setHours(0, 0, 0, 0);
              params.date_from = dateFrom.toISOString();
            } else {
              // If date parsing fails, send as-is (might be in correct format already)
              params.date_from = fundMovementsFilters.date_from.trim();
            }
          } catch (e) {
            // If conversion fails, send as-is
            params.date_from = fundMovementsFilters.date_from.trim();
          }
        }

        if (
          fundMovementsFilters.date_to &&
          fundMovementsFilters.date_to.trim() !== ""
        ) {
          try {
            const dateTo = new Date(fundMovementsFilters.date_to);
            if (!isNaN(dateTo.getTime())) {
              dateTo.setHours(23, 59, 59, 999);
              params.date_to = dateTo.toISOString();
            } else {
              // If date parsing fails, send as-is (might be in correct format already)
              params.date_to = fundMovementsFilters.date_to.trim();
            }
          } catch (e) {
            // If conversion fails, send as-is
            params.date_to = fundMovementsFilters.date_to.trim();
          }
        }

        const response = await wmsService.getFundMovements(params);
        // Use data directly from backend - no client-side filtering
        setFundMovements(response.data || []);
        setFundMovementsStats(
          response.stats || {
            total_count: 0,
            total_completed_amount: 0,
            total_completed_count: 0,
            total_pending_count: 0,
            total_failed_count: 0,
            total_to_cold_count: 0,
            total_to_hot_count: 0,
          },
        );
        setTabCache((prev) => new Set(prev).add(cacheKey));
      } catch (err: any) {
        console.error("Error fetching fund movements:", err);
        toast.error(err.message || "Failed to fetch fund movements");
        setFundMovements([]);
      } finally {
        setFundMovementsLoading(false);
      }
    },
    [fundMovementsPage, fundMovementsPerPage, fundMovementsFilters, tabCache],
  );

  // Removed - fetchWalletData is now only called in the activeTab useEffect below

  const fetchAllWalletsChains = useCallback(async () => {
    try {
      const chainConfigs = await wmsService.getChainConfigs(100, 0);
      setAllWalletsChains(chainConfigs);
    } catch (err: any) {
      console.error("Error fetching chains:", err);
    }
  }, []);

  const fetchAllWalletsCurrencies = useCallback(async (chainId?: string) => {
    setLoadingAllWalletsCurrencies(true);
    try {
      if (chainId) {
        // Fetch currencies for specific chain
        const currencies = await wmsService.getChainCurrencies(chainId);
        const currencyCodes: string[] = currencies
          .map((c: any) => c.currency_code || c.code || c)
          .filter(
            (code: any): code is string =>
              typeof code === "string" && Boolean(code),
          );
        setAllWalletsCurrencies([...new Set(currencyCodes)].sort());
      } else {
        // Fetch all currencies
        const currencyConfigs = await wmsService.getCurrencyConfigs(100, 0);
        const currencyCodes: string[] = currencyConfigs
          .map((c: any) => c.currency_code || c.code || c)
          .filter(
            (code: any): code is string =>
              typeof code === "string" && Boolean(code),
          );
        setAllWalletsCurrencies([...new Set(currencyCodes)].sort());
      }
    } catch (err: any) {
      console.error("Error fetching currencies:", err);
      setAllWalletsCurrencies([]);
    } finally {
      setLoadingAllWalletsCurrencies(false);
    }
  }, []);

  const fetchChainCurrencies = useCallback(async (chainId: string) => {
    if (!chainId) return;
    setLoadingCurrencies(true);
    setChainCurrencies([]);
    try {
      const currencies = await wmsService.getChainCurrencies(chainId);
      setChainCurrencies(currencies || []);
    } catch (err: any) {
      console.error("Error fetching chain currencies:", err);
      setChainCurrencies([]);
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  const handleMaxButton = async () => {
    if (
      !transferForm.wallet_address ||
      !transferForm.chain_id ||
      !transferForm.currency_code
    ) {
      toast.error("Please select wallet, chain, and currency first");
      return;
    }

    try {
      setLoadingFeeEstimate(true);
      const feeData = await wmsService.estimateTransferFee({
        wallet_address: transferForm.wallet_address,
        chain_id: transferForm.chain_id,
        currency_code: transferForm.currency_code,
        amount: selectedCurrencyBalance,
      });

      const maxAmount = feeData.max_transferable;
      if (maxAmount > 0) {
        setTransferForm((prev) => ({
          ...prev,
          amount: maxAmount,
        }));
      } else {
        toast.error("Insufficient balance for transfer");
      }
    } catch (error: any) {
      console.error("Error calculating max amount:", error);
      toast.error("Failed to calculate maximum transferable amount");
    } finally {
      setLoadingFeeEstimate(false);
    }
  };

  const handleMoveToHotWallet = async () => {
    if (
      !transferForm.wallet_address ||
      !transferForm.chain_id ||
      !transferForm.currency_code ||
      transferForm.amount <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (transferValidation && !transferValidation.can_transfer) {
      toast.error(transferValidation.error_message || "Transfer validation failed");
      return;
    }

    setShowConfirmationModal(true);
  };

  const confirmTransfer = async () => {
    setIsSubmittingTransfer(true);
    try {
      const response = await wmsService.moveFundsFromWalletToHot({
        wallet_address: transferForm.wallet_address,
        chain_id: transferForm.chain_id,
        currency_code: transferForm.currency_code,
        amount: transferForm.amount,
      });

      if (response.success) {
        toast.success(
          response.message || "Funds moved to hot wallet successfully",
        );
        setShowTransferToHotModal(false);
        setShowConfirmationModal(false);
        setSelectedWalletsForTransfer(new Set());
        setTransferForm({
          wallet_address: "",
          chain_id: "",
          currency_code: "",
          amount: 0,
        });
        setFeeEstimate(null);
        setTransferValidation(null);
        await fetchAllWallets();
      } else {
        toast.error(response.message || "Failed to move funds");
      }
    } catch (err: any) {
      console.error("Error moving funds to hot wallet:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to move funds to hot wallet",
      );
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleBatchMoveToHotWallet = async () => {
    if (
      !batchTransferForm.chain_id ||
      !batchTransferForm.currency_code ||
      batchTransferForm.transfers.length === 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (batchTransferForm.transfers.some((t) => t.amount <= 0)) {
      toast.error("All transfer amounts must be greater than 0");
      return;
    }

    const isSolana = batchTransferForm.chain_id.toLowerCase().includes("sol");
    if (!isSolana) {
      toast.error("Batch transfers are only supported for Solana chains");
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const response = await wmsService.moveFundsFromWalletsToHotBatch({
        chain_id: batchTransferForm.chain_id,
        currency_code: batchTransferForm.currency_code,
        transfers: batchTransferForm.transfers,
      });

      if (response.success) {
        toast.success(
          response.message || "Batch funds moved to hot wallet successfully",
        );
        setShowTransferToHotModal(false);
        setSelectedWalletsForTransfer(new Set());
        setBatchTransferForm({
          chain_id: "",
          currency_code: "",
          transfers: [],
        });
        await fetchAllWallets(); // Refresh after moving funds
      } else {
        toast.error(response.message || "Failed to move funds");
      }
    } catch (err: any) {
      console.error("Error moving batch funds to hot wallet:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to move batch funds to hot wallet",
      );
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const fetchAllWallets = useCallback(async () => {
    // Always fetch fresh data when called - no cache to prevent filter issues
    setAllWalletsLoading(true);
    try {
      const offset = (allWalletsPage - 1) * allWalletsPerPage;
      const params: any = {
        limit: allWalletsPerPage,
        offset: offset,
      };

      if (allWalletsFilters.chain_id) {
        params.chain_id = allWalletsFilters.chain_id;
      }
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (allWalletsFilters.is_active !== "") {
        params.is_active = allWalletsFilters.is_active === "true";
      }

      // Currency-specific filter (currency and min are required, max is optional)
      const hasCurrency =
        allWalletsFilters.currency &&
        String(allWalletsFilters.currency).trim() !== "";
      const hasMin =
        allWalletsFilters.currency_amount_min !== "" &&
        String(allWalletsFilters.currency_amount_min).trim() !== "";
      const hasMax =
        allWalletsFilters.currency_amount_max !== "" &&
        String(allWalletsFilters.currency_amount_max).trim() !== "";

      if (hasCurrency && hasMin) {
        const minAmount = parseFloat(
          String(allWalletsFilters.currency_amount_min),
        );
        if (!isNaN(minAmount) && minAmount >= 0) {
          params.currency = allWalletsFilters.currency;
          params.currency_amount_min = minAmount;

          // Max amount is optional
          if (hasMax) {
            const maxAmount = parseFloat(
              String(allWalletsFilters.currency_amount_max),
            );
            if (!isNaN(maxAmount) && maxAmount >= minAmount) {
              params.currency_amount_max = maxAmount;
            }
          }
        }
      }

      // Combined fiat filter (min and/or max can be provided)
      const hasFiatMin =
        allWalletsFilters.total_fiat_amount_min !== "" &&
        String(allWalletsFilters.total_fiat_amount_min).trim() !== "";
      const hasFiatMax =
        allWalletsFilters.total_fiat_amount_max !== "" &&
        String(allWalletsFilters.total_fiat_amount_max).trim() !== "";

      if (hasFiatMin || hasFiatMax) {
        if (hasFiatMin) {
          const minCents = parseFloat(
            String(allWalletsFilters.total_fiat_amount_min),
          );
          if (!isNaN(minCents) && minCents >= 0) {
            params.total_fiat_amount_min = Math.round(minCents * 100); // Convert dollars to cents
          }
        }

        if (hasFiatMax) {
          const maxCents = parseFloat(
            String(allWalletsFilters.total_fiat_amount_max),
          );
          if (!isNaN(maxCents) && maxCents >= 0) {
            params.total_fiat_amount_max = Math.round(maxCents * 100); // Convert dollars to cents
          }
        }

        // Validate that max >= min if both are provided
        if (
          hasFiatMin &&
          hasFiatMax &&
          params.total_fiat_amount_min !== undefined &&
          params.total_fiat_amount_max !== undefined
        ) {
          if (params.total_fiat_amount_max < params.total_fiat_amount_min) {
            // Remove max if it's less than min
            delete params.total_fiat_amount_max;
          }
        }
      }

      const response = await wmsService.getAllWallets(params);
      setAllWallets(response.wallets);
      setAllWalletsTotalCount(response.total_count);
      setAllWalletsStats(response.stats || null);
    } catch (err: any) {
      console.error("Error fetching all wallets:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to fetch wallets",
      );
    } finally {
      setAllWalletsLoading(false);
    }
  }, [allWalletsPage, allWalletsPerPage, allWalletsFilters, debouncedSearch, tabCache]);

  const handleTriggerSweeper = async () => {
    try {
      setTriggeringSweeper(true);
      const response = await wmsService.triggerSweeper();
      if (response.success) {
        toast.success(response.message || "Sweeper triggered successfully");
        await fetchFundMovements();
      } else {
        toast.error(response.message || "Failed to trigger sweeper");
      }
    } catch (err: any) {
      console.error("Error triggering sweeper:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to trigger sweeper",
      );
    } finally {
      setTriggeringSweeper(false);
    }
  };

  const handleTriggerBackfill = async () => {
    try {
      setTriggeringBackfill(true);
      const response = await wmsService.triggerBackfill();
      if (response.success) {
        toast.success(response.message || "Backfill triggered successfully");
        await fetchAllWallets(); // Force refresh after backfill
      } else {
        toast.error(response.message || "Failed to trigger backfill");
      }
    } catch (err: any) {
      console.error("Error triggering backfill:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to trigger backfill",
      );
    } finally {
      setTriggeringBackfill(false);
    }
  };

  const handleSyncWalletBalances = async () => {
    try {
      setSyncingBalances(true);
      const response = await wmsService.syncWalletBalances();
      if (response.success) {
        toast.success(
          response.message || "Wallet balances synced successfully",
        );
        await fetchAllWallets(); // Force refresh after sync
      } else {
        toast.error(response.message || "Failed to sync wallet balances");
      }
    } catch (err: any) {
      console.error("Error syncing wallet balances:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to sync wallet balances",
      );
    } finally {
      setSyncingBalances(false);
    }
  };

  const handleSyncSingleWalletBalance = async (
    walletId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent row click
    try {
      setSyncingWalletId(walletId);
      const response = await wmsService.syncWalletBalance(walletId);
      if (response.success) {
        toast.success(response.message || "Wallet balance synced successfully");
        await fetchAllWallets(); // Force refresh after sync
      } else {
        toast.error(response.message || "Failed to sync wallet balance");
      }
    } catch (err: any) {
      console.error("Error syncing wallet balance:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to sync wallet balance",
      );
    } finally {
      setSyncingWalletId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "wallets") {
      fetchWalletData();
    } else if (activeTab === "movements") {
      if (fundMovementsChains.length === 0) {
        fetchFundMovementsChains();
      }
      if (currencies.length === 0) {
        fetchChainsAndCurrencies();
      }
      fetchFundMovements();
    } else if (activeTab === "all-wallets") {
      if (allWalletsChains.length === 0) {
        fetchAllWalletsChains();
      }
      if (allWalletsCurrencies.length === 0) {
        fetchAllWalletsCurrencies(allWalletsFilters.chain_id || undefined);
      }
      fetchAllWallets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fee estimation with debouncing
  useEffect(() => {
    if (
      !showTransferToHotModal ||
      transferMode !== "single" ||
      !transferForm.wallet_address ||
      !transferForm.chain_id ||
      !transferForm.currency_code ||
      transferForm.amount <= 0
    ) {
      setFeeEstimate(null);
      setTransferValidation(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoadingFeeEstimate(true);
        const [feeData, validationData] = await Promise.all([
          wmsService.estimateTransferFee({
            wallet_address: transferForm.wallet_address,
            chain_id: transferForm.chain_id,
            currency_code: transferForm.currency_code,
            amount: transferForm.amount,
          }),
          wmsService.validateTransfer({
            wallet_address: transferForm.wallet_address,
            chain_id: transferForm.chain_id,
            currency_code: transferForm.currency_code,
            amount: transferForm.amount,
          }),
        ]);
        setFeeEstimate(feeData);
        setTransferValidation(validationData);
      } catch (error: any) {
        console.error("Error estimating fee or validating transfer:", error);
        setFeeEstimate(null);
        setTransferValidation(null);
      } finally {
        setLoadingFeeEstimate(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    showTransferToHotModal,
    transferMode,
    transferForm.wallet_address,
    transferForm.chain_id,
    transferForm.currency_code,
    transferForm.amount,
  ]);

  // Update selected currency balance when currency changes
  useEffect(() => {
    if (
      showTransferToHotModal &&
      transferMode === "single" &&
      transferForm.wallet_address &&
      transferForm.currency_code
    ) {
      const wallet = allWallets.find(
        (w) => w.address === transferForm.wallet_address,
      );
      if (wallet) {
        const balance = wallet.balances?.find(
          (b) => b.currency_code === transferForm.currency_code,
        );
        if (balance) {
          setSelectedCurrencyBalance(balance.balance_amount);
          setSelectedCurrencyBalanceUSD(balance.balance_usd_cents / 100);
        } else {
          setSelectedCurrencyBalance(0);
          setSelectedCurrencyBalanceUSD(0);
        }
      }
    } else {
      setSelectedCurrencyBalance(0);
      setSelectedCurrencyBalanceUSD(0);
    }
  }, [
    showTransferToHotModal,
    transferMode,
    transferForm.wallet_address,
    transferForm.currency_code,
    allWallets,
  ]);

  // Sync pagination state with URL params
  useEffect(() => {
    if (activeTab === "all-wallets") {
      const pageParam = searchParams.get("page");
      const perPageParam = searchParams.get("per_page");
      
      if (pageParam) {
        const page = parseInt(pageParam, 10);
        if (!isNaN(page) && page > 0) {
          setAllWalletsPage(page);
        }
      }
      
      if (perPageParam) {
        const perPage = parseInt(perPageParam, 10);
        if (!isNaN(perPage) && [10, 25, 50, 100].includes(perPage)) {
          setAllWalletsPerPage(perPage);
        }
      }
    }
  }, [activeTab, searchParams]);

  // Update URL when pagination changes
  useEffect(() => {
    if (activeTab === "all-wallets") {
      const newParams = new URLSearchParams(searchParams);
      // Always preserve the tab param
      newParams.set("tab", "all-wallets");
      if (allWalletsPage > 1) {
        newParams.set("page", allWalletsPage.toString());
      } else {
        newParams.delete("page");
      }
      if (allWalletsPerPage !== 10) {
        newParams.set("per_page", allWalletsPerPage.toString());
      } else {
        newParams.delete("per_page");
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, allWalletsPage, allWalletsPerPage, searchParams, setSearchParams]);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(allWalletsFilters.search);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [allWalletsFilters.search]);

  useEffect(() => {
    if (showTransferToHotModal) {
      if (transferMode === "single" && transferForm.chain_id) {
        fetchChainCurrencies(transferForm.chain_id);
      } else if (transferMode === "batch" && batchTransferForm.chain_id) {
        fetchChainCurrencies(batchTransferForm.chain_id);
      }
    } else {
      setChainCurrencies([]);
    }
  }, [
    showTransferToHotModal,
    transferMode,
    transferForm.chain_id,
    batchTransferForm.chain_id,
  ]);

  useEffect(() => {
    if (activeTab === "all-wallets") {
      setAllWalletsPage(1);
      fetchAllWallets(); // Refresh when filters change
    }
  }, [allWalletsFilters]);

  // Refetch all wallets when pagination changes (only if on all-wallets tab)
  useEffect(() => {
    if (activeTab === "all-wallets") {
      fetchAllWallets();
    }
  }, [allWalletsPage, allWalletsPerPage, fetchAllWallets, activeTab]);

  // Refetch fund movements when filters or pagination change (only if on movements tab)
  useEffect(() => {
    if (activeTab === "movements") {
      fetchFundMovements(true); // Force refresh when filters or page change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fundMovementsFilters,
    fundMovementsPage,
    fundMovementsPerPage,
    activeTab,
  ]);

  useEffect(() => {
    if (activeTab === "all-wallets") {
      fetchAllWalletsCurrencies(allWalletsFilters.chain_id || undefined);
    }
  }, [allWalletsFilters.chain_id, activeTab, fetchAllWalletsCurrencies]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 bg-green-400/10";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10";
      case "failed":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case "to_cold_storage":
        return "To Cold Storage";
      case "to_hot_wallet":
        return "To Hot Wallet";
      case "manual_to_hot_wallet":
        return "Manual to Hot Wallet";
      case "rebalance":
        return "Rebalance";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Wallet className="h-8 w-8 text-purple-400" />
            <span>Wallet Management</span>
          </h1>
          <p className="text-gray-400 mt-2">
            Manage hot and cold wallet balances and transfers
          </p>
        </div>
        <div className="flex space-x-3">
          {activeTab === "wallets" && (
            <>
              <button
                onClick={handleSyncInternalWallets}
                disabled={syncingInternalWallets || isLoading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-green-600/20 transition-all"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncingInternalWallets ? "animate-spin" : ""}`}
                />
                <span>
                  {syncingInternalWallets ? "Syncing..." : "Sync Balances"}
                </span>
              </button>
              <button
                onClick={handleRefreshWalletData}
                disabled={isLoading || isRefreshing}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
              </button>
              <button
                onClick={handleOpenFundTransferModal}
                disabled={isLoading || isRefreshing}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-purple-600/20 transition-all"
              >
                <TrendingDown className="h-4 w-4" />
                <span>Move Funds to Cold Wallet</span>
              </button>
            </>
          )}
          {activeTab === "movements" && (
            <button
              onClick={() => fetchFundMovements(true)}
              disabled={fundMovementsLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all"
            >
              <RefreshCw
                className={`h-4 w-4 ${fundMovementsLoading ? "animate-spin" : ""}`}
              />
              <span>{fundMovementsLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 border-b border-gray-700">
        <button
          onClick={() => handleTabChange("wallets")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "wallets"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span>Internal Wallets</span>
          </div>
        </button>
        <button
          onClick={() => handleTabChange("movements")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "movements"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span>Fund Movements</span>
          </div>
        </button>
        <button
          onClick={() => handleTabChange("all-wallets")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "all-wallets"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>User Generated Wallets</span>
          </div>
        </button>
        <button
          onClick={() => handleTabChange("services-status")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "services-status"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Services Status</span>
          </div>
        </button>
        <button
          onClick={() => handleTabChange("deposit-events")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "deposit-events"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Deposit Events</span>
          </div>
        </button>
        <button
          onClick={() => handleTabChange("webhooks")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "webhooks"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Webhook className="h-4 w-4" />
            <span>Webhooks</span>
          </div>
        </button>
      </div>

      {activeTab === "wallets" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 border border-orange-500/30 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Flame className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Hot Wallets</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-2xl font-bold">
                  {hotWalletStats.total_wallet_count}
                </p>
                <p className="text-gray-400 text-xs font-medium">Wallets</p>
              </div>
            </div>
            {hotWalletStats.total_usd_cents > 0 && (
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <p className="text-gray-400 text-xs font-medium mb-1">
                  Total USD Value
                </p>
                <p className="text-white text-xl font-bold">
                  $
                  {(hotWalletStats.total_usd_cents / 100).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </p>
              </div>
            )}
            {isLoading || isRefreshing ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : hotWalletData.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No hot wallet data available
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {Object.entries(groupedHotWallets).map(([key, wallets]) => {
                  const firstWallet = wallets[0];
                  const uniqueAddress = firstWallet.address;
                  const totalUsdCents = wallets.reduce((sum, wallet) => {
                    return sum + (wallet.balance_usd_cents || 0);
                  }, 0);
                  return (
                    <div
                      key={key}
                      className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-3 hover:bg-gray-700/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <span className="text-white font-mono text-xs font-semibold bg-orange-500/20 px-2 py-0.5 rounded whitespace-nowrap">
                            {firstWallet.chain_id}
                          </span>
                          <span className="text-white font-mono text-xs truncate">
                            {formatAddress(uniqueAddress)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(uniqueAddress)}
                            className="text-gray-400 hover:text-orange-400 transition-colors p-0.5 flex-shrink-0"
                            title="Copy address"
                          >
                            {copiedAddress === uniqueAddress ? (
                              <Check className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              toggleAddressVisibility(uniqueAddress)
                            }
                            disabled={isLoading || isRefreshing}
                            className="text-gray-400 hover:text-orange-400 disabled:opacity-50 transition-colors p-0.5 flex-shrink-0"
                            title={
                              visibleAddresses.has(uniqueAddress)
                                ? "Hide address"
                                : "Show full address"
                            }
                          >
                            {visibleAddresses.has(uniqueAddress) ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {firstWallet.updated_at && (
                            <span
                              className="text-gray-400 text-xs"
                              title={new Date(firstWallet.updated_at).toLocaleString()}
                            >
                              {formatTimeAgo(firstWallet.updated_at)}
                            </span>
                          )}
                          {totalUsdCents > 0 && (
                            <span className="text-green-400 font-semibold text-xs">
                              $
                              {(totalUsdCents / 100).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-600/50">
                              <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">
                                Currency
                              </th>
                              <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">
                                Balance
                              </th>
                              <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">
                                USD Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {wallets.map((wallet, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-700/30"
                              >
                                <td className="py-2 px-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300">
                                    {wallet.currency}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <span className="text-white font-semibold text-sm">
                                    {typeof wallet.balance === "number"
                                      ? wallet.balance.toLocaleString(
                                          undefined,
                                          { maximumFractionDigits: 6 },
                                        )
                                      : wallet.balance}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  {wallet.balance_usd_cents !== undefined ? (
                                    <span className="text-green-400 font-semibold text-sm">
                                      $
                                      {(
                                        wallet.balance_usd_cents / 100
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-sm">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-800/50 border border-blue-500/30 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Snowflake className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cold Wallets</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-2xl font-bold">
                  {coldWalletStats.total_wallet_count}
                </p>
                <p className="text-gray-400 text-xs font-medium">Wallets</p>
              </div>
            </div>
            {coldWalletStats.total_usd_cents > 0 && (
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <p className="text-gray-400 text-xs font-medium mb-1">
                  Total USD Value
                </p>
                <p className="text-white text-xl font-bold">
                  $
                  {(coldWalletStats.total_usd_cents / 100).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </p>
              </div>
            )}
            {isLoading || isRefreshing ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : coldWalletData.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No cold wallet data available
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {Object.entries(groupedColdWallets).map(([key, wallets]) => {
                  const firstWallet = wallets[0];
                  const uniqueAddress = firstWallet.address;
                  const totalUsdCents = wallets.reduce((sum, wallet) => {
                    return sum + (wallet.balance_usd_cents || 0);
                  }, 0);
                  return (
                    <div
                      key={key}
                      className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-3 hover:bg-gray-700/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <span className="text-white font-mono text-xs font-semibold bg-blue-500/20 px-2 py-0.5 rounded whitespace-nowrap">
                            {firstWallet.chain_id}
                          </span>
                          <span className="text-white font-mono text-xs truncate">
                            {formatAddress(uniqueAddress)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(uniqueAddress)}
                            className="text-gray-400 hover:text-blue-400 transition-colors p-0.5 flex-shrink-0"
                            title="Copy address"
                          >
                            {copiedAddress === uniqueAddress ? (
                              <Check className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              toggleAddressVisibility(uniqueAddress)
                            }
                            disabled={isLoading || isRefreshing}
                            className="text-gray-400 hover:text-blue-400 disabled:opacity-50 transition-colors p-0.5 flex-shrink-0"
                            title={
                              visibleAddresses.has(uniqueAddress)
                                ? "Hide address"
                                : "Show full address"
                            }
                          >
                            {visibleAddresses.has(uniqueAddress) ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {firstWallet.updated_at && (
                            <span
                              className="text-gray-400 text-xs"
                              title={new Date(firstWallet.updated_at).toLocaleString()}
                            >
                              {formatTimeAgo(firstWallet.updated_at)}
                            </span>
                          )}
                          {totalUsdCents > 0 && (
                            <span className="text-green-400 font-semibold text-xs">
                              $
                              {(totalUsdCents / 100).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-600/50">
                              <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">
                                Currency
                              </th>
                              <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">
                                Balance
                              </th>
                              <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">
                                USD Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {wallets.map((wallet, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-700/30"
                              >
                                <td className="py-2 px-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                                    {wallet.currency}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <span className="text-white font-semibold text-sm">
                                    {typeof wallet.balance === "number"
                                      ? wallet.balance.toLocaleString(
                                          undefined,
                                          { maximumFractionDigits: 6 },
                                        )
                                      : wallet.balance}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  {wallet.balance_usd_cents !== undefined ? (
                                    <span className="text-green-400 font-semibold text-sm">
                                      $
                                      {(
                                        wallet.balance_usd_cents / 100
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-sm">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "movements" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">Total</h3>
              <p className="text-xl font-bold text-white">
                {fundMovementsStats.total_count}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">
                Completed
              </h3>
              <p className="text-xl font-bold text-green-400">
                {fundMovementsStats.total_completed_count}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">
                Pending
              </h3>
              <p className="text-xl font-bold text-yellow-400">
                {fundMovementsStats.total_pending_count}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">Failed</h3>
              <p className="text-xl font-bold text-red-400">
                {fundMovementsStats.total_failed_count}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">
                To Cold
              </h3>
              <p className="text-xl font-bold text-blue-400">
                {fundMovementsStats.total_to_cold_count}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">To Hot</h3>
              <p className="text-xl font-bold text-orange-400">
                {fundMovementsStats.total_to_hot_count}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">
                Total Amount
              </h3>
              <p className="text-xl font-bold text-white">
                $
                {(
                  (fundMovementsStats.total_completed_amount || 0) / 100
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Chain
                </label>
                <select
                  value={fundMovementsFilters.chain_id}
                  onChange={(e) => {
                    setFundMovementsFilters((prev) => ({
                      ...prev,
                      chain_id: e.target.value,
                    }));
                    setFundMovementsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Chains</option>
                  {fundMovementsChains
                    .filter(
                      (chain) =>
                        USE_TESTNETS || !chain.chain_id.endsWith("-testnet"),
                    )
                    .map((chain) => (
                      <option key={chain.chain_id} value={chain.chain_id}>
                        {chain.name || chain.chain_id}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Currency
                </label>
                <select
                  value={fundMovementsFilters.currency_code}
                  onChange={(e) => {
                    setFundMovementsFilters((prev) => ({
                      ...prev,
                      currency_code: e.target.value,
                    }));
                    setFundMovementsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Currencies</option>
                  {currencies
                    .filter(
                      (curr) =>
                        curr.currency_type === "crypto" && curr.is_active,
                    )
                    .map((currency) => (
                      <option
                        key={currency.currency_code}
                        value={currency.currency_code}
                      >
                        {currency.currency_code}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={fundMovementsFilters.status}
                  onChange={(e) => {
                    setFundMovementsFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }));
                    setFundMovementsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Type
                </label>
                <select
                  value={fundMovementsFilters.movement_type}
                  onChange={(e) => {
                    setFundMovementsFilters((prev) => ({
                      ...prev,
                      movement_type: e.target.value,
                    }));
                    setFundMovementsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="to_cold_storage">To Cold Storage</option>
                  <option value="to_hot_wallet">To Hot Wallet</option>
                  <option value="manual_to_hot_wallet">
                    Manual to Hot Wallet
                  </option>
                  <option value="rebalance">Rebalance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={fundMovementsFilters.date_from}
                  onChange={(e) => {
                    setFundMovementsFilters((prev) => ({
                      ...prev,
                      date_from: e.target.value,
                    }));
                    setFundMovementsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={fundMovementsFilters.date_to}
                  onChange={(e) => {
                    setFundMovementsFilters((prev) => ({
                      ...prev,
                      date_to: e.target.value,
                    }));
                    setFundMovementsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleTriggerSweeper}
                disabled={triggeringSweeper}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-purple-600/20 transition-all"
              >
                <RefreshCw
                  className={`h-4 w-4 ${triggeringSweeper ? "animate-spin" : ""}`}
                />
                <span>
                  {triggeringSweeper ? "Triggering..." : "Trigger Sweeper"}
                </span>
              </button>
              <button
                onClick={() => {
                  setFundMovementsFilters({
                    chain_id: "",
                    currency_code: "",
                    status: "",
                    movement_type: "",
                    date_from: "",
                    date_to: "",
                  });
                  setFundMovementsPage(1);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Clear Filters
              </button>
            </div>
            {(fundMovementsFilters.chain_id ||
              fundMovementsFilters.currency_code ||
              fundMovementsFilters.status ||
              fundMovementsFilters.movement_type ||
              fundMovementsFilters.date_from ||
              fundMovementsFilters.date_to) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <span className="text-xs font-medium text-gray-400">
                      Active Filters:
                    </span>
                    {fundMovementsFilters.chain_id && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Chain:{" "}
                        {fundMovementsChains.find(
                          (c) => c.chain_id === fundMovementsFilters.chain_id,
                        )?.name || fundMovementsFilters.chain_id}
                        <button
                          onClick={() => {
                            setFundMovementsFilters((prev) => ({
                              ...prev,
                              chain_id: "",
                            }));
                            setFundMovementsPage(1);
                          }}
                          className="ml-2 hover:text-purple-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {fundMovementsFilters.currency_code && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Currency: {fundMovementsFilters.currency_code}
                        <button
                          onClick={() => {
                            setFundMovementsFilters((prev) => ({
                              ...prev,
                              currency_code: "",
                            }));
                            setFundMovementsPage(1);
                          }}
                          className="ml-2 hover:text-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {fundMovementsFilters.status && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                        Status:{" "}
                        {fundMovementsFilters.status.charAt(0).toUpperCase() +
                          fundMovementsFilters.status.slice(1)}
                        <button
                          onClick={() => {
                            setFundMovementsFilters((prev) => ({
                              ...prev,
                              status: "",
                            }));
                            setFundMovementsPage(1);
                          }}
                          className="ml-2 hover:text-green-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {fundMovementsFilters.movement_type && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        Type:{" "}
                        {fundMovementsFilters.movement_type ===
                        "to_cold_storage"
                          ? "To Cold Storage"
                          : fundMovementsFilters.movement_type ===
                              "to_hot_wallet"
                            ? "To Hot Wallet"
                            : fundMovementsFilters.movement_type
                                .charAt(0)
                                .toUpperCase() +
                              fundMovementsFilters.movement_type.slice(1)}
                        <button
                          onClick={() => {
                            setFundMovementsFilters((prev) => ({
                              ...prev,
                              movement_type: "",
                            }));
                            setFundMovementsPage(1);
                          }}
                          className="ml-2 hover:text-orange-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {fundMovementsFilters.date_from && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                        From:{" "}
                        {new Date(
                          fundMovementsFilters.date_from,
                        ).toLocaleDateString()}
                        <button
                          onClick={() => {
                            setFundMovementsFilters((prev) => ({
                              ...prev,
                              date_from: "",
                            }));
                            setFundMovementsPage(1);
                          }}
                          className="ml-2 hover:text-yellow-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {fundMovementsFilters.date_to && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        To:{" "}
                        {new Date(
                          fundMovementsFilters.date_to,
                        ).toLocaleDateString()}
                        <button
                          onClick={() => {
                            setFundMovementsFilters((prev) => ({
                              ...prev,
                              date_to: "",
                            }));
                            setFundMovementsPage(1);
                          }}
                          className="ml-2 hover:text-pink-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fund Movements Table */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {fundMovementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : fundMovements.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No fund movements found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Chain
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Currency
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          From Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          To Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Admin ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Tx Hash
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fundMovements.map((movement: any) => (
                        <tr
                          key={movement.id}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-white text-sm">
                            {getMovementTypeLabel(movement.movement_type)}
                          </td>
                          <td className="px-4 py-3 text-white text-sm font-mono">
                            {movement.chain_id}
                          </td>
                          <td className="px-4 py-3 text-white text-sm">
                            {movement.crypto_currency}
                          </td>
                          <td className="px-4 py-3 text-white text-sm font-semibold">
                            {movement.amount?.toLocaleString(undefined, {
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-white text-sm font-mono">
                                {formatAddress(movement.from_address)}
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(movement.from_address)
                                }
                                className="text-gray-400 hover:text-blue-400 transition-colors p-0.5"
                                title="Copy address"
                              >
                                {copiedAddress === movement.from_address ? (
                                  <Check className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-white text-sm font-mono">
                                {formatAddress(movement.to_address)}
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(movement.to_address)
                                }
                                className="text-gray-400 hover:text-blue-400 transition-colors p-0.5"
                                title="Copy address"
                              >
                                {copiedAddress === movement.to_address ? (
                                  <Check className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(movement.status)}
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(movement.status)}`}
                              >
                                {movement.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {movement.admin_id ? (
                              <button
                                onClick={() => {
                                  navigate(
                                    `/settings?tab=admin-users&search=${encodeURIComponent(movement.admin_id)}`,
                                  );
                                }}
                                className="text-blue-400 hover:text-blue-300 text-sm font-mono truncate max-w-[120px] block text-left transition-colors"
                                title={movement.admin_id}
                              >
                                {formatAddress(movement.admin_id)}
                              </button>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {movement.tx_hash ? (
                              <a
                                href={(() => {
                                  const chainId =
                                    movement.chain_id?.toLowerCase() || "";
                                  if (chainId.includes("sol")) {
                                    return `https://solscan.io/tx/${movement.tx_hash}`;
                                  } else if (chainId.includes("eth")) {
                                    return `https://etherscan.io/tx/${movement.tx_hash}`;
                                  } else if (chainId.includes("btc")) {
                                    return `https://blockstream.info/tx/${movement.tx_hash}`;
                                  }
                                  return `https://etherscan.io/tx/${movement.tx_hash}`;
                                })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm font-mono truncate max-w-[120px] block"
                                title={movement.tx_hash}
                              >
                                {formatAddress(movement.tx_hash)}
                              </a>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(movement.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {fundMovementsStats.total_count > 0 &&
                  (() => {
                    const totalPages = Math.ceil(
                      fundMovementsStats.total_count / fundMovementsPerPage,
                    );
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

                        if (fundMovementsPage > 3) {
                          pages.push("...");
                        }

                        // Show pages around current page
                        const start = Math.max(2, fundMovementsPage - 1);
                        const end = Math.min(
                          totalPages - 1,
                          fundMovementsPage + 1,
                        );

                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalPages) {
                            pages.push(i);
                          }
                        }

                        if (fundMovementsPage < totalPages - 2) {
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
                            Showing{" "}
                            {(fundMovementsPage - 1) * fundMovementsPerPage + 1}{" "}
                            to{" "}
                            {Math.min(
                              fundMovementsPage * fundMovementsPerPage,
                              fundMovementsStats.total_count,
                            )}{" "}
                            of {fundMovementsStats.total_count} movements
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-gray-400 text-sm">
                              Rows per page:
                            </label>
                            <select
                              value={fundMovementsPerPage}
                              onChange={async (e) => {
                                const newPerPage = Number(e.target.value);
                                setFundMovementsPerPage(newPerPage);
                                setFundMovementsPage(1);
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
                            onClick={() => setFundMovementsPage(1)}
                            disabled={
                              fundMovementsPage === 1 || fundMovementsLoading
                            }
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                            title="First page"
                          >
                            First
                          </button>
                          <button
                            onClick={() =>
                              setFundMovementsPage((prev) =>
                                Math.max(1, prev - 1),
                              )
                            }
                            disabled={
                              fundMovementsPage === 1 || fundMovementsLoading
                            }
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
                                  onClick={() => setFundMovementsPage(pageNum)}
                                  disabled={fundMovementsLoading}
                                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                    fundMovementsPage === pageNum
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
                              setFundMovementsPage((prev) => prev + 1)
                            }
                            disabled={
                              fundMovementsPage >= totalPages ||
                              fundMovementsLoading
                            }
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                            title="Next page"
                          >
                            Next
                          </button>
                          <button
                            onClick={() => setFundMovementsPage(totalPages)}
                            disabled={
                              fundMovementsPage >= totalPages ||
                              fundMovementsLoading
                            }
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                            title="Last page"
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    );
                  })()}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "all-wallets" && (
        <div className="space-y-6">
          {allWalletsStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-800/50 to-purple-900/50 border border-purple-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs font-medium mb-1">
                        Total Wallets
                      </p>
                      <p className="text-white text-2xl font-bold">
                        {allWalletsStats.total_wallet_count}
                      </p>
                    </div>
                    <Wallet className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-800/50 to-green-900/50 border border-green-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs font-medium mb-1">
                        Total USD Value
                      </p>
                      <p className="text-white text-2xl font-bold">
                        $
                        {(allWalletsStats.total_usd_cents / 100).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                </div>
              </div>
              {allWalletsStats.currency_stats &&
                allWalletsStats.currency_stats.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setIsCurrencyStatsExpanded(!isCurrencyStatsExpanded)
                      }
                      className="flex items-center justify-between w-full mb-4 p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-white">
                          Currency Statistics
                        </h3>
                        {!isCurrencyStatsExpanded && (
                          <span className="text-gray-400 text-sm">
                            ({allWalletsStats.currency_stats.length}{" "}
                            {allWalletsStats.currency_stats.length === 1
                              ? "currency"
                              : "currencies"}
                            )
                          </span>
                        )}
                      </div>
                      {isCurrencyStatsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {isCurrencyStatsExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {allWalletsStats.currency_stats.map((stat: any) => (
                          <div
                            key={`${stat.currency_code}-${stat.chain_id || ""}`}
                            className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 border border-blue-700/50 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-gray-400 text-xs font-medium mb-1">
                                  {stat.currency_code}
                                </p>
                                {stat.chain_id && (
                                  <p className="text-gray-500 text-xs mb-1">
                                    {stat.chain_id}
                                  </p>
                                )}
                                <p className="text-white text-lg font-semibold">
                                  {stat.total_balance.toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 8 },
                                  )}
                                </p>
                                <p className="text-blue-300 text-xs mt-1">
                                  $
                                  {(
                                    stat.total_balance_usd_cents / 100
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </>
          )}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            {/* Basic Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Chain ID
                </label>
                <select
                  value={allWalletsFilters.chain_id}
                  onChange={(e) => {
                    setAllWalletsFilters((prev) => ({
                      ...prev,
                      chain_id: e.target.value,
                    }));
                    setAllWalletsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Chains</option>
                  {allWalletsChains.map((chain) => (
                    <option key={chain.chain_id} value={chain.chain_id}>
                      {chain.chain_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Search
                </label>
                <input
                  type="text"
                  value={allWalletsFilters.search}
                  onChange={(e) => {
                    setAllWalletsFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }));
                    setAllWalletsPage(1);
                  }}
                  placeholder="Address, username, email"
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Status
                </label>
                <select
                  value={allWalletsFilters.is_active}
                  onChange={(e) => {
                    setAllWalletsFilters((prev) => ({
                      ...prev,
                      is_active: e.target.value,
                    }));
                    setAllWalletsPage(1);
                  }}
                  className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSyncWalletBalances}
                  disabled={syncingBalances}
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-teal-600/20 transition-all"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncingBalances ? "animate-spin" : ""}`}
                  />
                  <span className="text-sm">
                    {syncingBalances ? "Syncing..." : "Sync Balances"}
                  </span>
                </button>
              </div>
            </div>

            {/* Advanced Filters - Only show when chain_id is selected */}
            {allWalletsFilters.chain_id && (
              <div className="space-y-3 mt-4">
                {/* Currency-Specific Filter */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Currency Balance Filter
                    </label>
                    {(allWalletsFilters.currency ||
                      allWalletsFilters.currency_amount_min ||
                      allWalletsFilters.currency_amount_max) && (
                      <button
                        onClick={() => {
                          setAllWalletsFilters((prev) => ({
                            ...prev,
                            currency: "",
                            currency_amount_min: "",
                            currency_amount_max: "",
                          }));
                          setAllWalletsPage(1);
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Currency <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={allWalletsFilters.currency}
                        onChange={(e) => {
                          const newCurrency = e.target.value;
                          setAllWalletsFilters((prev) => {
                            const updated = { ...prev, currency: newCurrency };
                            // Clear fiat filter when currency filter is used
                            if (newCurrency) {
                              updated.total_fiat_amount_min = "";
                              updated.total_fiat_amount_max = "";
                            }
                            return updated;
                          });
                          setAllWalletsPage(1);
                        }}
                        disabled={
                          !!(
                            allWalletsFilters.total_fiat_amount_min ||
                            allWalletsFilters.total_fiat_amount_max
                          ) || loadingAllWalletsCurrencies
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Currency</option>
                        {allWalletsCurrencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Min Amount <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={allWalletsFilters.currency_amount_min}
                        onChange={(e) => {
                          const newMin = e.target.value;
                          setAllWalletsFilters((prev) => {
                            const updated = {
                              ...prev,
                              currency_amount_min: newMin,
                            };
                            // Clear fiat filter when currency filter is used
                            if (newMin) {
                              updated.total_fiat_amount_min = "";
                              updated.total_fiat_amount_max = "";
                            }
                            return updated;
                          });
                          setAllWalletsPage(1);
                        }}
                        placeholder="0.00"
                        disabled={
                          !!(
                            allWalletsFilters.total_fiat_amount_min ||
                            allWalletsFilters.total_fiat_amount_max
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Max Amount (Optional)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={allWalletsFilters.currency_amount_max}
                        onChange={(e) => {
                          const newMax = e.target.value;
                          setAllWalletsFilters((prev) => {
                            const updated = {
                              ...prev,
                              currency_amount_max: newMax,
                            };
                            // Clear fiat filter when currency filter is used
                            if (newMax) {
                              updated.total_fiat_amount_min = "";
                              updated.total_fiat_amount_max = "";
                            }
                            return updated;
                          });
                          setAllWalletsPage(1);
                        }}
                        placeholder="0.00"
                        disabled={
                          !!(
                            allWalletsFilters.total_fiat_amount_min ||
                            allWalletsFilters.total_fiat_amount_max
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="text-red-400">*</span> Currency and Min
                    Amount are required. Max Amount is optional.
                  </p>
                </div>

                {/* Combined Fiat Filter */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">
                      Total USD Value Filter
                    </label>
                    {(allWalletsFilters.total_fiat_amount_min ||
                      allWalletsFilters.total_fiat_amount_max) && (
                      <button
                        onClick={() => {
                          setAllWalletsFilters((prev) => ({
                            ...prev,
                            total_fiat_amount_min: "",
                            total_fiat_amount_max: "",
                          }));
                          setAllWalletsPage(1);
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Min USD Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={allWalletsFilters.total_fiat_amount_min}
                        onChange={(e) => {
                          const newMin = e.target.value;
                          setAllWalletsFilters((prev) => {
                            const updated = {
                              ...prev,
                              total_fiat_amount_min: newMin,
                            };
                            // Clear currency filter when fiat filter is used
                            if (newMin) {
                              updated.currency = "";
                              updated.currency_amount_min = "";
                              updated.currency_amount_max = "";
                            }
                            return updated;
                          });
                          setAllWalletsPage(1);
                        }}
                        placeholder="0.00"
                        disabled={
                          !!(
                            allWalletsFilters.currency ||
                            allWalletsFilters.currency_amount_min ||
                            allWalletsFilters.currency_amount_max
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Max USD Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={allWalletsFilters.total_fiat_amount_max}
                        onChange={(e) => {
                          const newMax = e.target.value;
                          setAllWalletsFilters((prev) => {
                            const updated = {
                              ...prev,
                              total_fiat_amount_max: newMax,
                            };
                            // Clear currency filter when fiat filter is used
                            if (newMax) {
                              updated.currency = "";
                              updated.currency_amount_min = "";
                              updated.currency_amount_max = "";
                            }
                            return updated;
                          });
                          setAllWalletsPage(1);
                        }}
                        placeholder="0.00"
                        disabled={
                          !!(
                            allWalletsFilters.currency ||
                            allWalletsFilters.currency_amount_min ||
                            allWalletsFilters.currency_amount_max
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Filter by total USD value. Min and/or Max can be provided.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleTriggerBackfill}
                disabled={triggeringBackfill}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-5 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-orange-600/20 transition-all h-[42px]"
              >
                <RefreshCw
                  className={`h-4 w-4 ${triggeringBackfill ? "animate-spin" : ""}`}
                />
                <span>
                  {triggeringBackfill ? "Triggering..." : "Trigger Backfill"}
                </span>
              </button>
              <button
                onClick={() => fetchAllWallets()}
                disabled={allWalletsLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all h-[42px]"
              >
                <RefreshCw
                  className={`h-4 w-4 ${allWalletsLoading ? "animate-spin" : ""}`}
                />
                <span>{allWalletsLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>

            {(allWalletsFilters.chain_id ||
              allWalletsFilters.search ||
              allWalletsFilters.is_active ||
              allWalletsFilters.currency ||
              allWalletsFilters.currency_amount_min ||
              allWalletsFilters.currency_amount_max ||
              allWalletsFilters.total_fiat_amount_min ||
              allWalletsFilters.total_fiat_amount_max) && (
              <div className="mb-4 pt-4 border-t border-gray-700 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <span className="text-xs font-medium text-gray-400">
                      Active Filters:
                    </span>
                    {allWalletsFilters.chain_id && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Chain: {allWalletsFilters.chain_id}
                        <button
                          onClick={() => {
                            setAllWalletsFilters((prev) => ({
                              ...prev,
                              chain_id: "",
                            }));
                            setAllWalletsPage(1);
                          }}
                          className="ml-2 hover:text-purple-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {allWalletsFilters.search && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Search: {allWalletsFilters.search}
                        <button
                          onClick={() => {
                            setAllWalletsFilters((prev) => ({
                              ...prev,
                              search: "",
                            }));
                            setAllWalletsPage(1);
                          }}
                          className="ml-2 hover:text-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {allWalletsFilters.is_active && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                        Status:{" "}
                        {allWalletsFilters.is_active === "true"
                          ? "Active"
                          : "Inactive"}
                        <button
                          onClick={() => {
                            setAllWalletsFilters((prev) => ({
                              ...prev,
                              is_active: "",
                            }));
                            setAllWalletsPage(1);
                          }}
                          className="ml-2 hover:text-green-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {allWalletsFilters.currency &&
                      allWalletsFilters.currency_amount_min &&
                      allWalletsFilters.currency_amount_max && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          Currency: {allWalletsFilters.currency} (
                          {allWalletsFilters.currency_amount_min} -{" "}
                          {allWalletsFilters.currency_amount_max})
                          <button
                            onClick={() => {
                              setAllWalletsFilters((prev) => ({
                                ...prev,
                                currency: "",
                                currency_amount_min: "",
                                currency_amount_max: "",
                              }));
                              setAllWalletsPage(1);
                            }}
                            className="ml-2 hover:text-orange-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                    {allWalletsFilters.total_fiat_amount_min &&
                      allWalletsFilters.total_fiat_amount_max && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          USD Value: ${allWalletsFilters.total_fiat_amount_min}{" "}
                          - ${allWalletsFilters.total_fiat_amount_max}
                          <button
                            onClick={() => {
                              setAllWalletsFilters((prev) => ({
                                ...prev,
                                total_fiat_amount_min: "",
                                total_fiat_amount_max: "",
                              }));
                              setAllWalletsPage(1);
                            }}
                            className="ml-2 hover:text-yellow-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                  </div>
                  <button
                    onClick={() => {
                      setAllWalletsFilters({
                        chain_id: "",
                        search: "",
                        is_active: "",
                        currency: "",
                        currency_amount_min: "",
                        currency_amount_max: "",
                        total_fiat_amount_min: "",
                        total_fiat_amount_max: "",
                      });
                      setAllWalletsPage(1);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <X className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            )}
            {selectedWalletsForTransfer.size > 0 && (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    const selectedWallets = allWallets.filter((w) =>
                      selectedWalletsForTransfer.has(w.id),
                    );
                    const chainIds = new Set(
                      selectedWallets.map((w) => w.chain_id),
                    );

                    if (chainIds.size > 1) {
                      toast.error(
                        "Please select wallets with the same chain ID",
                      );
                      setSelectedWalletsForTransfer(new Set());
                      return;
                    }

                    if (selectedWallets.length === 1) {
                      const chainId = selectedWallets[0].chain_id;
                      setTransferMode("single");
                      setTransferForm({
                        wallet_address: selectedWallets[0].address,
                        chain_id: chainId,
                        currency_code: "",
                        amount: 0,
                      });
                      setShowTransferToHotModal(true);
                      if (chainId) {
                        fetchChainCurrencies(chainId);
                      }
                    } else {
                      const chainId = Array.from(chainIds)[0];
                      const isSolana = chainId.toLowerCase().includes("sol");
                      setTransferMode(isSolana ? "batch" : "single");
                      setBatchTransferForm({
                        chain_id: chainId,
                        currency_code: "",
                        transfers: selectedWallets.map((w) => ({
                          wallet_address: w.address,
                          amount: 0,
                        })),
                      });
                      setShowTransferToHotModal(true);
                      if (chainId) {
                        fetchChainCurrencies(chainId);
                      }
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 shadow-lg shadow-purple-600/20 transition-all"
                >
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    Move to Hot Wallet ({selectedWalletsForTransfer.size})
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {allWalletsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : allWallets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No wallets found
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <div className="text-gray-400 text-sm">
                    Total: {allWalletsTotalCount} wallets
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-gray-400 text-sm">
                      Rows per page:
                    </label>
                    <select
                      value={allWalletsPerPage}
                      onChange={(e) => {
                        setAllWalletsPerPage(Number(e.target.value));
                        setAllWalletsPage(1);
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50 border-b border-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedWalletsForTransfer.size ===
                                allWallets.length && allWallets.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWalletsForTransfer(
                                  new Set(allWallets.map((w) => w.id)),
                                );
                              } else {
                                setSelectedWalletsForTransfer(new Set());
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Chain ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Total USD Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last Used
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {allWallets.map((wallet) => (
                        <tr
                          key={wallet.id}
                          onClick={() => {
                            setSelectedWallet(wallet);
                            setShowWalletModal(true);
                          }}
                          className="hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedWalletsForTransfer.has(
                                wallet.id,
                              )}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(
                                  selectedWalletsForTransfer,
                                );
                                if (e.target.checked) {
                                  newSet.add(wallet.id);
                                } else {
                                  newSet.delete(wallet.id);
                                }
                                setSelectedWalletsForTransfer(newSet);
                              }}
                              className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-mono text-sm">
                                {formatAddress(wallet.address)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(wallet.address);
                                }}
                                className="text-gray-400 hover:text-purple-400 transition-colors"
                              >
                                {copiedAddress === wallet.address ? (
                                  <Check className="h-4 w-4 text-green-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-300 text-sm">
                              {wallet.chain_id}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="text-white">
                                {wallet.user.username}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {wallet.user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(() => {
                              const totalUsdCents =
                                wallet.balances?.reduce((sum, balance) => {
                                  return sum + (balance.balance_usd_cents || 0);
                                }, 0) || 0;
                              return totalUsdCents > 0 ? (
                                <span className="text-green-400 font-semibold text-sm">
                                  $
                                  {(totalUsdCents / 100).toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                wallet.is_active
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {wallet.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(wallet.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {wallet.last_used
                              ? new Date(wallet.last_used).toLocaleString()
                              : "-"}
                          </td>
                          <td
                            className="px-4 py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) =>
                                handleSyncSingleWalletBalance(wallet.id, e)
                              }
                              disabled={
                                syncingWalletId === wallet.id ||
                                allWalletsLoading
                              }
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                            >
                              {syncingWalletId === wallet.id ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  <span>Syncing...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Sync Balance</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {allWalletsTotalCount > 0 &&
                  (() => {
                    const totalPages = Math.ceil(
                      allWalletsTotalCount / allWalletsPerPage,
                    );
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

                        if (allWalletsPage > 3) {
                          pages.push("...");
                        }

                        // Show pages around current page
                        const start = Math.max(2, allWalletsPage - 1);
                        const end = Math.min(
                          totalPages - 1,
                          allWalletsPage + 1,
                        );

                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalPages) {
                            pages.push(i);
                          }
                        }

                        if (allWalletsPage < totalPages - 2) {
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
                        <div className="text-gray-400 text-sm">
                          Showing {(allWalletsPage - 1) * allWalletsPerPage + 1}{" "}
                          to{" "}
                          {Math.min(
                            allWalletsPage * allWalletsPerPage,
                            allWalletsTotalCount,
                          )}{" "}
                          of {allWalletsTotalCount} wallets
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setAllWalletsPage(1)}
                            disabled={allWalletsPage === 1 || allWalletsLoading}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                            title="First page"
                          >
                            First
                          </button>
                          <button
                            onClick={() =>
                              setAllWalletsPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={allWalletsPage === 1 || allWalletsLoading}
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
                                  onClick={() => setAllWalletsPage(pageNum)}
                                  disabled={allWalletsLoading}
                                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                    allWalletsPage === pageNum
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
                              setAllWalletsPage((prev) => prev + 1)
                            }
                            disabled={
                              allWalletsPage >= totalPages || allWalletsLoading
                            }
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                            title="Next page"
                          >
                            Next
                          </button>
                          <button
                            onClick={() => setAllWalletsPage(totalPages)}
                            disabled={
                              allWalletsPage >= totalPages || allWalletsLoading
                            }
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                            title="Last page"
                          >
                            Last
                          </button>
                        </div>
                      </div>
                    );
                  })()}
              </>
            )}
          </div>
        </div>
      )}

      {showWalletModal && selectedWallet && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowWalletModal(false);
            setSelectedWallet(null);
          }}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Wallet Details</h2>
              <button
                onClick={() => {
                  setShowWalletModal(false);
                  setSelectedWallet(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Move Funds Button */}
              <div className="flex justify-end pb-4 border-b border-gray-700">
                <button
                  onClick={() => {
                    setTransferMode("single");
                    setTransferForm({
                      wallet_address: selectedWallet.address,
                      chain_id: selectedWallet.chain_id,
                      currency_code: "",
                      amount: 0,
                    });
                    setShowTransferToHotModal(true);
                    setShowWalletModal(false);
                    if (selectedWallet.chain_id) {
                      fetchChainCurrencies(selectedWallet.chain_id);
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 shadow-lg shadow-purple-600/20 transition-all"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Move Funds to Hot Wallet</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Wallet ID
                  </label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                    <span className="text-white font-mono text-sm">
                      {selectedWallet.id}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Address
                  </label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 flex items-center justify-between">
                    {getExplorerUrl(
                      selectedWallet.chain_id,
                      selectedWallet.address,
                    ) ? (
                      <a
                        href={
                          getExplorerUrl(
                            selectedWallet.chain_id,
                            selectedWallet.address,
                          )!
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-sm break-all transition-colors"
                      >
                        {selectedWallet.address}
                      </a>
                    ) : (
                      <span className="text-white font-mono text-sm break-all">
                        {selectedWallet.address}
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(selectedWallet.address)}
                      className="text-gray-400 hover:text-purple-400 transition-colors ml-2 flex-shrink-0"
                    >
                      {copiedAddress === selectedWallet.address ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Chain ID
                  </label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                    <span className="text-white text-sm">
                      {selectedWallet.chain_id}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Vault Key Path
                  </label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                    <span className="text-white font-mono text-sm break-all">
                      {selectedWallet.vault_key_path}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Status
                  </label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedWallet.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {selectedWallet.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Created At
                  </label>
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                    <span className="text-white text-sm">
                      {new Date(selectedWallet.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                {selectedWallet.last_used && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Last Used
                    </label>
                    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                      <span className="text-white text-sm">
                        {new Date(selectedWallet.last_used).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  User Information
                </label>
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">User ID</div>
                      <div className="text-white font-mono text-sm">
                        {selectedWallet.user.id}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Username</div>
                      <div className="text-white text-sm">
                        {selectedWallet.user.username}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Email</div>
                      <div className="text-white text-sm">
                        {selectedWallet.user.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedWallet.balances &&
                selectedWallet.balances.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Balances
                    </label>
                    <div className="bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-800/50 border-b border-gray-600">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                              Currency
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">
                              Balance
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">
                              USD Value
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">
                              Last Deposit
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">
                              Last Deposit At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {selectedWallet.balances.map((balance, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3">
                                <span className="text-white text-sm font-medium">
                                  {balance.currency_code}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-white text-sm">
                                  {balance.balance_amount.toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 8 },
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {balance.balance_usd_cents !== undefined &&
                                balance.balance_usd_cents > 0 ? (
                                  <span className="text-green-400 font-semibold text-sm">
                                    $
                                    {(
                                      balance.balance_usd_cents / 100
                                    ).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-sm">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-gray-300 text-sm">
                                  {balance.last_deposit_amount !== undefined
                                    ? balance.last_deposit_amount.toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 8 },
                                      )
                                    : "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-gray-300 text-sm">
                                  {balance.last_deposit_at
                                    ? new Date(
                                        balance.last_deposit_at,
                                      ).toLocaleString()
                                    : "-"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {showTransferToHotModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowTransferToHotModal(false);
            setSelectedWalletsForTransfer(new Set());
            setChainCurrencies([]);
          }}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                Move Funds to Hot Wallet
              </h2>
              <button
                onClick={() => {
                  setShowTransferToHotModal(false);
                  setSelectedWalletsForTransfer(new Set());
                  setChainCurrencies([]);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {transferMode === "single" ? (
                <div className="space-y-4">
                  {(() => {
                    const wallet = allWallets.find(
                      (w) => w.address === transferForm.wallet_address,
                    );
                    return (
                      wallet && (
                        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">
                            Wallet Balances
                          </div>
                          <div className="space-y-2">
                            {wallet.balances && wallet.balances.length > 0 ? (
                              wallet.balances.map((balance, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-white">
                                    {balance.currency_code}
                                  </span>
                                  <span className="text-gray-300">
                                    {balance.balance_amount.toLocaleString(
                                      undefined,
                                      { maximumFractionDigits: 8 },
                                    )}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-400 text-sm">
                                No balances available
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    );
                  })()}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={transferForm.wallet_address}
                      onChange={(e) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          wallet_address: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Wallet address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Chain ID
                    </label>
                    <select
                      value={transferForm.chain_id}
                      onChange={(e) => {
                        const chainId = e.target.value;
                        setTransferForm((prev) => ({
                          ...prev,
                          chain_id: chainId,
                          currency_code: "",
                        }));
                        if (chainId) {
                          fetchChainCurrencies(chainId);
                        } else {
                          setChainCurrencies([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Chain</option>
                      {allWalletsChains.map((chain) => (
                        <option key={chain.chain_id} value={chain.chain_id}>
                          {chain.chain_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Currency Code
                    </label>
                    {loadingCurrencies ? (
                      <div className="w-full px-3 py-2 bg-gray-700 text-gray-400 border border-gray-600 rounded-lg text-sm">
                        Loading currencies...
                      </div>
                    ) : (
                      <select
                        value={transferForm.currency_code}
                        onChange={(e) =>
                          setTransferForm((prev) => ({
                            ...prev,
                            currency_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={!transferForm.chain_id}
                      >
                        <option value="">Select Currency</option>
                        {chainCurrencies
                          .filter((c) => c.is_active)
                          .map((currency) => (
                            <option
                              key={currency.id}
                              value={currency.currency_code}
                            >
                              {currency.currency_code}{" "}
                              {currency.is_native ? "(Native)" : ""}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  {transferForm.currency_code && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="text-sm text-blue-300 mb-2 font-medium">
                        Available Balance
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white text-lg font-semibold">
                            {selectedCurrencyBalance.toLocaleString(undefined, {
                              maximumFractionDigits: 8,
                            })}{" "}
                            {transferForm.currency_code}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            ${selectedCurrencyBalanceUSD.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            USD
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Amount
                      </label>
                      <button
                        onClick={handleMaxButton}
                        disabled={
                          loadingFeeEstimate ||
                          !transferForm.currency_code ||
                          selectedCurrencyBalance <= 0
                        }
                        className="text-sm font-semibold px-4 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg border border-purple-500/50 shadow-md shadow-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-purple-700"
                      >
                        {loadingFeeEstimate ? "Calculating..." : "MAX"}
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.00000001"
                      min="0"
                      value={transferForm.amount}
                      onChange={(e) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                    {transferValidation && !transferValidation.is_valid && (
                      <p className="text-red-400 text-xs mt-1">
                        {transferValidation.error_message}
                      </p>
                    )}
                  </div>
                  {loadingFeeEstimate && (
                    <div className="text-gray-400 text-sm flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Estimating fees...</span>
                    </div>
                  )}
                  {feeEstimate && !loadingFeeEstimate && (
                    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-3">
                      <div className="text-sm font-medium text-gray-300 mb-2">
                        Transaction Summary
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transfer Amount:</span>
                          <span className="text-white">
                            {transferForm.amount.toLocaleString(undefined, {
                              maximumFractionDigits: 8,
                            })}{" "}
                            {transferForm.currency_code}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Network Fee:</span>
                          <span className="text-yellow-300">
                            {feeEstimate.fee_native.toLocaleString(undefined, {
                              maximumFractionDigits: 8,
                            })}{" "}
                            {feeEstimate.fee_currency}
                          </span>
                        </div>
                        {feeEstimate.rent_exempt_reserve &&
                          feeEstimate.rent_exempt_reserve > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Rent Exempt Reserve:
                              </span>
                              <span className="text-blue-300">
                                {feeEstimate.rent_exempt_reserve.toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 8 },
                                )}{" "}
                                {feeEstimate.fee_currency}
                              </span>
                            </div>
                          )}
                        <div className="border-t border-gray-600 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-300 font-medium">
                              Total Deducted:
                            </span>
                            <span className="text-white font-semibold">
                              {feeEstimate.total_amount.toLocaleString(undefined, {
                                maximumFractionDigits: 8,
                              })}{" "}
                              {transferForm.currency_code}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>≈</span>
                            <span>
                              ${feeEstimate.total_usd.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}{" "}
                              USD
                            </span>
                          </div>
                        </div>
                        {transferValidation && (
                          <div className="border-t border-gray-600 pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Remaining Balance:
                              </span>
                              <span className="text-green-300">
                                {(
                                  selectedCurrencyBalance - feeEstimate.total_amount
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 8,
                                })}{" "}
                                {transferForm.currency_code}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowTransferToHotModal(false);
                        setSelectedWalletsForTransfer(new Set());
                        setFeeEstimate(null);
                        setTransferValidation(null);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMoveToHotWallet}
                      disabled={
                        isSubmittingTransfer ||
                        !transferForm.wallet_address ||
                        !transferForm.chain_id ||
                        !transferForm.currency_code ||
                        transferForm.amount <= 0 ||
                        (transferValidation && !transferValidation.can_transfer) ||
                        loadingFeeEstimate
                      }
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                    >
                      {isSubmittingTransfer ? "Processing..." : "Review Transfer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Chain ID
                    </label>
                    <select
                      value={batchTransferForm.chain_id}
                      onChange={(e) => {
                        const chainId = e.target.value;
                        const isSolana = chainId.toLowerCase().includes("sol");
                        if (!isSolana) {
                          setTransferMode("single");
                        }
                        setBatchTransferForm((prev) => ({
                          ...prev,
                          chain_id: chainId,
                          currency_code: "",
                        }));
                        if (chainId) {
                          fetchChainCurrencies(chainId);
                        } else {
                          setChainCurrencies([]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Chain</option>
                      {allWalletsChains.map((chain) => (
                        <option key={chain.chain_id} value={chain.chain_id}>
                          {chain.chain_id}
                        </option>
                      ))}
                    </select>
                    {batchTransferForm.chain_id &&
                      !batchTransferForm.chain_id
                        .toLowerCase()
                        .includes("sol") && (
                        <p className="text-yellow-400 text-xs mt-1">
                          Batch transfers are only available for Solana chains
                        </p>
                      )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Currency Code
                    </label>
                    {loadingCurrencies ? (
                      <div className="w-full px-3 py-2 bg-gray-700 text-gray-400 border border-gray-600 rounded-lg text-sm">
                        Loading currencies...
                      </div>
                    ) : (
                      <select
                        value={batchTransferForm.currency_code}
                        onChange={(e) =>
                          setBatchTransferForm((prev) => ({
                            ...prev,
                            currency_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={!batchTransferForm.chain_id}
                      >
                        <option value="">Select Currency</option>
                        {chainCurrencies
                          .filter((c) => c.is_active)
                          .map((currency) => (
                            <option
                              key={currency.id}
                              value={currency.currency_code}
                            >
                              {currency.currency_code}{" "}
                              {currency.is_native ? "(Native)" : ""}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Transfers
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {batchTransferForm.transfers.map((transfer, idx) => {
                        const wallet = allWallets.find(
                          (w) => w.address === transfer.wallet_address,
                        );
                        const selectedCurrencyBalance = wallet?.balances?.find(
                          (b) =>
                            b.currency_code === batchTransferForm.currency_code,
                        );
                        return (
                          <div
                            key={idx}
                            className="bg-gray-700/50 border border-gray-600 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <div className="text-white text-sm font-mono">
                                  {formatAddress(transfer.wallet_address)}
                                </div>
                                {wallet && (
                                  <div className="text-gray-400 text-xs">
                                    {wallet.user.username} - {wallet.user.email}
                                  </div>
                                )}
                                {selectedCurrencyBalance && (
                                  <div className="text-green-400 text-xs mt-1">
                                    Balance:{" "}
                                    {selectedCurrencyBalance.balance_amount.toLocaleString(
                                      undefined,
                                      { maximumFractionDigits: 8 },
                                    )}{" "}
                                    {batchTransferForm.currency_code}
                                  </div>
                                )}
                              </div>
                              <div className="w-32 ml-4">
                                <input
                                  type="number"
                                  step="0.00000001"
                                  min="0"
                                  value={transfer.amount}
                                  onChange={(e) => {
                                    const newTransfers = [
                                      ...batchTransferForm.transfers,
                                    ];
                                    newTransfers[idx].amount =
                                      parseFloat(e.target.value) || 0;
                                    setBatchTransferForm((prev) => ({
                                      ...prev,
                                      transfers: newTransfers,
                                    }));
                                  }}
                                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="Amount"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowTransferToHotModal(false);
                        setSelectedWalletsForTransfer(new Set());
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBatchMoveToHotWallet}
                      disabled={
                        isSubmittingTransfer ||
                        !batchTransferForm.chain_id ||
                        !batchTransferForm.currency_code ||
                        batchTransferForm.transfers.length === 0 ||
                        batchTransferForm.transfers.some((t) => t.amount <= 0)
                      }
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                    >
                      {isSubmittingTransfer
                        ? "Processing..."
                        : "Transfer Batch"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && feeEstimate && transferValidation && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setShowConfirmationModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Confirm Transfer
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Please review the transfer details before confirming
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">From</div>
                    <div className="text-white font-mono text-xs">
                      {formatAddress(transferForm.wallet_address)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">To</div>
                    <div className="text-white font-mono text-xs">
                      Hot Wallet
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Chain</div>
                    <div className="text-white">{transferForm.chain_id}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Currency</div>
                    <div className="text-white">{transferForm.currency_code}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium text-gray-300 mb-3">
                  Transfer Breakdown
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">
                      {transferForm.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}{" "}
                      {transferForm.currency_code}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>≈</span>
                    <span>
                      ${((transferForm.amount * feeEstimate.total_usd) / feeEstimate.total_amount).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD
                    </span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network Fee:</span>
                      <span className="text-yellow-300">
                        {feeEstimate.fee_native.toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}{" "}
                        {feeEstimate.fee_currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>≈</span>
                      <span>${feeEstimate.fee_usd.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })} USD</span>
                    </div>
                  </div>
                  {feeEstimate.rent_exempt_reserve &&
                    feeEstimate.rent_exempt_reserve > 0 && (
                      <div className="border-t border-gray-600 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Rent Exempt Reserve:
                          </span>
                          <span className="text-blue-300">
                            {feeEstimate.rent_exempt_reserve.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 8 },
                            )}{" "}
                            {feeEstimate.fee_currency}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>≈</span>
                          <span>
                            ${feeEstimate.rent_exempt_reserve_usd?.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 },
                            )}{" "}
                            USD
                          </span>
                        </div>
                      </div>
                    )}
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300 font-medium">
                        Total Deducted:
                      </span>
                      <span className="text-white font-bold">
                        {feeEstimate.total_amount.toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}{" "}
                        {transferForm.currency_code}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>≈</span>
                      <span>
                        ${feeEstimate.total_usd.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        USD
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Remaining Balance:</span>
                      <span className="text-green-300 font-semibold">
                        {(
                          selectedCurrencyBalance - feeEstimate.total_amount
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}{" "}
                        {transferForm.currency_code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {transferForm.chain_id.toLowerCase().includes("sol") && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="text-xs text-blue-300">
                    <strong>Note:</strong> A rent exempt reserve of{" "}
                    {feeEstimate.rent_exempt_reserve?.toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                    })}{" "}
                    SOL will remain in the wallet to keep it active.
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTransfer}
                  disabled={isSubmittingTransfer}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  {isSubmittingTransfer ? "Processing..." : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Transfer Modal */}
      {showFundTransferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Move Funds to Cold Wallet
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Transfer from hot to cold storage
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFundTransferModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {isLoadingModalData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Chain <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={fundTransfer.chain_id}
                      onChange={(e) =>
                        setFundTransfer((prev) => ({
                          ...prev,
                          chain_id: e.target.value,
                          hot_wallet: "",
                          cold_wallet: "",
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select a chain</option>
                      {chains
                        .filter(
                          (chain) =>
                            USE_TESTNETS ||
                            !chain.chain_id.endsWith("-testnet"),
                        )
                        .map((chain) => (
                          <option key={chain.chain_id} value={chain.chain_id}>
                            {chain.name} ({chain.chain_id})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Crypto Currency <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={fundTransfer.crypto_currency}
                      onChange={(e) =>
                        setFundTransfer((prev) => ({
                          ...prev,
                          crypto_currency: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select a currency</option>
                      {currencies
                        .filter(
                          (curr) =>
                            curr.currency_type === "crypto" && curr.is_active,
                        )
                        .map((currency) => (
                          <option
                            key={currency.currency_code}
                            value={currency.currency_code}
                          >
                            {currency.currency_name} ({currency.currency_code})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <label className="block text-sm font-medium text-orange-300 mb-2 flex items-center space-x-2">
                      <Flame className="h-4 w-4" />
                      <span>
                        From: Hot Wallet Address{" "}
                        <span className="text-red-400">*</span>
                      </span>
                    </label>
                    <select
                      value={fundTransfer.hot_wallet}
                      onChange={(e) =>
                        setFundTransfer((prev) => ({
                          ...prev,
                          hot_wallet: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 text-white border border-orange-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      disabled={!fundTransfer.chain_id}
                    >
                      <option value="">Select hot wallet address</option>
                      {getFilteredHotWallets().length === 0 ? (
                        <option value="" disabled>
                          No hot wallets found for this chain
                        </option>
                      ) : (
                        getFilteredHotWallets().map((wallet, idx) => (
                          <option key={idx} value={wallet.address}>
                            {formatAddress(wallet.address)} -{" "}
                            {typeof wallet.balance === "number"
                              ? wallet.balance.toFixed(6)
                              : wallet.balance}{" "}
                            {wallet.currency}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-300 mb-2 flex items-center space-x-2">
                      <Snowflake className="h-4 w-4" />
                      <span>
                        To: Cold Wallet Address{" "}
                        <span className="text-red-400">*</span>
                      </span>
                    </label>
                    <select
                      value={fundTransfer.cold_wallet}
                      onChange={(e) =>
                        setFundTransfer((prev) => ({
                          ...prev,
                          cold_wallet: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 text-white border border-blue-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={!fundTransfer.chain_id}
                    >
                      <option value="">Select cold wallet address</option>
                      {getFilteredColdWallets().length === 0 ? (
                        <option value="" disabled>
                          No cold wallets found for this chain
                        </option>
                      ) : (
                        getFilteredColdWallets().map((wallet, idx) => (
                          <option key={idx} value={wallet.address}>
                            {formatAddress(wallet.address)} -{" "}
                            {typeof wallet.balance === "number"
                              ? wallet.balance.toFixed(6)
                              : wallet.balance}{" "}
                            {wallet.currency}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={fundTransfer.amount}
                      onChange={(e) =>
                        setFundTransfer((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter amount"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowFundTransferModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFundTransfer}
                disabled={
                  isSubmittingFundTransfer ||
                  !fundTransfer.hot_wallet ||
                  !fundTransfer.cold_wallet ||
                  fundTransfer.amount <= 0
                }
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20"
              >
                {isSubmittingFundTransfer ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Transferring...</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>Transfer to Cold Wallet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "services-status" && <ServicesStatus />}

      {activeTab === "deposit-events" && <DepositEventRecords />}

      {activeTab === "webhooks" && <WebhookManagement />}
    </div>
  );
};
