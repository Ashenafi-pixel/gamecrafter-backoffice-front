import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Settings,
  Save,
  Bell,
  Shield,
  Globe,
  Trash2,
  Plus,
  RefreshCw,
  MapPin,
  Edit2,
  Search,
  MoreVertical,
  AlertTriangle,
  Sliders,
  Database,
  UserCog,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { wmsService } from "../../services/wmsService";
import {
  configService,
  SystemConfig as DatabaseConfig,
} from "../../services/configService";
import { getMockBrands } from "../../mocks/brands";
import toast from "react-hot-toast";

interface CurrencyConfig {
  currency_code: string;
  currency_name: string;
  currency_type: "fiat" | "crypto";
  decimal_places: number;
  smallest_unit_name: string;
  is_active: boolean;
}

interface ChainConfig {
  id: string;
  chain_id: string;
  name: string;
  networks: string[];
  crypto_currencies: string[];
  processor: "internal" | "pdm";
  is_testnet: boolean;
  status: "active" | "inactive";
}

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
}

/** API response shape for /settings/general (snake_case) */
interface GeneralSettingsData {
  site_name?: string;
  site_description?: string;
  support_email?: string;
  timezone?: string;
  language?: string;
  maintenance_mode?: boolean;
  registration_enabled?: boolean;
  demo_mode?: boolean;
}

/** API response shape for /settings/security (snake_case) */
interface SecuritySettingsData {
  session_timeout?: number;
  max_login_attempts?: number;
  lockout_duration?: number;
  two_factor_required?: boolean;
  password_min_length?: number;
  password_require_special?: boolean;
  ip_whitelist_enabled?: boolean;
  rate_limit_enabled?: boolean;
  rate_limit_requests?: number;
}

interface WithdrawalGlobalStatus {
  enabled: boolean;
  reason?: string;
  paused_by?: string;
  paused_at?: string;
}

interface WithdrawalThreshold {
  value: number;
  currency: string;
  active: boolean;
}

interface WithdrawalThresholds {
  hourly_volume: WithdrawalThreshold;
  daily_volume: WithdrawalThreshold;
  single_transaction: WithdrawalThreshold;
  user_daily: WithdrawalThreshold;
}

interface WithdrawalManualReview {
  enabled: boolean;
  threshold_amount: number;
  currency: string;
  require_kyc: boolean;
}

interface WalletData {
  chain_id: string;
  address: string;
  balance: number;
  currency: string;
}

interface FundTransfer {
  crypto_currency: string;
  chain_id: string;
  network: string;
  hot_wallet: string;
  cold_wallet: string;
  amount: number;
}

interface SupportedChain {
  id: string;
  chain_id: string;
  name: string;
  networks: string[];
  processor: string;
  crypto_currencies: string[];
  is_testnet: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

/** API response shape for /ipfilters */
interface IpFiltersResponse {
  ip_filters?: Array<{
    id: string;
    type?: string;
    start_ip?: string;
    end_ip?: string;
    description?: string;
    created_at?: string;
    created_by?: { first_name?: string; last_name?: string; email?: string };
  }>;
}

/** API response shape for /settings/geo-blocking */
interface GeoBlockingData {
  enable_geo_blocking?: boolean;
  default_action?: string;
  vpn_detection?: boolean;
  proxy_detection?: boolean;
  tor_blocking?: boolean;
  log_attempts?: boolean;
  blocked_countries?: string[];
  allowed_countries?: string[];
  bypass_countries?: string[];
}

/** API response shape for /settings/welcome-bonus */
interface WelcomeBonusData {
  type?: string;
  enabled?: boolean;
  fixed_enabled?: boolean;
  percentage_enabled?: boolean;
  fixed_amount?: number;
  percentage?: number;
  max_deposit_amount?: number;
  ip_restriction_enabled?: boolean;
  allow_multiple_bonuses_per_ip?: boolean;
  max_bonus_percentage?: number;
}

export const SettingsManagement: React.FC = () => {
  const { walletMgmtSvc, adminSvc } = useServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "general";
  const removedTabs = ["payments", "tips", "welcome-bonus"];
  const initialTab = removedTabs.includes(tabFromUrl) ? "general" : tabFromUrl;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab") || "general";
    const validTab = removedTabs.includes(tab) ? "general" : tab;
    setActiveTab(validTab);
  }, [searchParams]);

  // IP Filter Functions
  const loadIpFilters = async () => {
    try {
      setLoadingIpRules(true);
      const response = await adminSvc.get<IpFiltersResponse>("/ipfilters?page=1&per-page=100");
      if (response.success && response.data) {
        const ipFilters = response.data.ip_filters || [];
        const filters = ipFilters.map((filter: any) => ({
          id: filter.id,
          type: (filter.type === "allow" ? "allow" : "block") as "allow" | "block",
          target: (filter.end_ip && filter.end_ip.trim() ? "range" : "ip") as "ip" | "range" | "country",
          value:
            filter.end_ip && filter.end_ip.trim()
              ? `${filter.start_ip}-${filter.end_ip}`
              : filter.start_ip,
          description: filter.description || "",
          isActive: true,
          createdDate: new Date(filter.created_at || new Date())
            .toISOString()
            .split("T")[0],
          createdBy: filter.created_by
            ? `${filter.created_by.first_name} ${filter.created_by.last_name}`.trim() ||
              filter.created_by.email
            : "Unknown",
        }));
        setIpRules(filters as IPRule[]);
      }
    } catch (error) {
      console.error("Failed to load IP filters:", error);
      toast.error("Failed to load IP filters");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const createIpFilter = async (ruleData: any) => {
    try {
      setLoadingIpRules(true);
      const [startIp, endIp] = ruleData.value.includes("-")
        ? ruleData.value.split("-")
        : [ruleData.value, ""];

      const payload = {
        start_ip: startIp,
        end_ip: endIp || "",
        type: ruleData.type === "block" ? "deny" : "allow",
        description: ruleData.description,
      };

      const response = await adminSvc.post("/ipfilters", payload);
      if (response.success) {
        toast.success("IP filter created successfully");
        await loadIpFilters();
        setShowCreateRuleModal(false);
        setRuleFormData({
          type: "block",
          target: "ip",
          value: "",
          description: "",
        });
      }
    } catch (error) {
      console.error("Failed to create IP filter:", error);
      toast.error("Failed to create IP filter");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const updateIpFilter = async (ruleId: string, ruleData: any) => {
    try {
      setLoadingIpRules(true);
      const deleteResponse = await adminSvc.delete("/ipfilters", {
        data: { id: ruleId },
      });
      if (!deleteResponse.success)
        throw new Error("Failed to delete old IP filter");

      const [startIp, endIp] = ruleData.value.includes("-")
        ? ruleData.value.split("-")
        : [ruleData.value, ""];

      const payload = {
        start_ip: startIp,
        end_ip: endIp || "",
        type: ruleData.type === "block" ? "deny" : "allow",
        description: ruleData.description,
      };

      const createResponse = await adminSvc.post("/ipfilters", payload);
      if (createResponse.success) {
        toast.success("IP filter updated successfully");
        await loadIpFilters();
        setShowCreateRuleModal(false);
        setEditingRule(null);
        setRuleFormData({
          type: "block",
          target: "ip",
          value: "",
          description: "",
        });
      }
    } catch (error) {
      console.error("Failed to update IP filter:", error);
      toast.error("Failed to update IP filter");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const deleteIpFilter = async (ruleId: string) => {
    try {
      setLoadingIpRules(true);
      const response = await adminSvc.delete("/ipfilters", {
        data: { id: ruleId },
      });
      if (response.success) {
        toast.success("IP filter deleted successfully");
        await loadIpFilters();
      }
    } catch (error) {
      console.error("Failed to delete IP filter:", error);
      toast.error("Failed to delete IP filter");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      await updateIpFilter(editingRule.id, ruleFormData);
    } else {
      await createIpFilter(ruleFormData);
    }
  };

  const handleEditRule = (rule: IPRule) => {
    setEditingRule(rule);
    setRuleFormData({
      type: rule.type,
      target: rule.target,
      value: rule.value,
      description: rule.description,
    });
    setShowCreateRuleModal(true);
  };

  const handleDeleteRule = (rule: IPRule) => {
    setRuleToDelete(rule);
    setShowDeleteRuleModal(true);
  };

  const confirmDeleteRule = async () => {
    if (ruleToDelete) {
      await deleteIpFilter(ruleToDelete.id);
      setShowDeleteRuleModal(false);
      setRuleToDelete(null);
    }
  };

  const toggleRuleStatus = (ruleId: string) => {
    setIpRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule,
      ),
    );
  };

  const getTypeColor = (type: string) => {
    return type === "allow"
      ? "text-green-400 bg-green-400/10"
      : "text-red-400 bg-red-400/10";
  };

  const getTargetIcon = (target: string) => {
    switch (target) {
      case "country":
        return <Globe className="h-4 w-4" />;
      case "range":
        return <Shield className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  // Geo Blocking Functions
  const loadGeoBlockingSettings = async () => {
    try {
      setLoadingGeoSettings(true);
      const queryParams = selectedBrandId ? `?brand_id=${selectedBrandId}` : "";
      const response = await adminSvc.get<GeoBlockingData>(
        `/settings/geo-blocking${queryParams}`,
      );
      if (response.success && response.data) {
        const data = response.data;
        setGeoSettings({
          enableGeoBlocking: data.enable_geo_blocking || false,
          defaultAction: ((data.default_action === "block" ? "block" : "allow") as "allow" | "block"),
          vpnDetection: data.vpn_detection || false,
          proxyDetection: data.proxy_detection || false,
          torBlocking: data.tor_blocking || false,
          logAttempts: data.log_attempts || false,
          blockedCountries: data.blocked_countries || [],
          allowedCountries: data.allowed_countries || [],
          bypassCountries: data.bypass_countries || [],
        });
      }
    } catch (error) {
      console.error("Failed to load geo blocking settings:", error);
      toast.error("Failed to load geo blocking settings");
    } finally {
      setLoadingGeoSettings(false);
    }
  };

  const saveGeoBlockingSettings = async () => {
    try {
      setLoadingGeoSettings(true);
      const payload: any = {
        enable_geo_blocking: geoSettings.enableGeoBlocking,
        default_action: geoSettings.defaultAction,
        vpn_detection: geoSettings.vpnDetection,
        proxy_detection: geoSettings.proxyDetection,
        tor_blocking: geoSettings.torBlocking,
        log_attempts: geoSettings.logAttempts,
        blocked_countries: geoSettings.blockedCountries,
        allowed_countries: geoSettings.allowedCountries,
        bypass_countries: geoSettings.bypassCountries,
      };

      // Include brand_id if selected
      if (selectedBrandId) {
        payload.brand_id = selectedBrandId;
      }

      const response = await adminSvc.put("/settings/geo-blocking", payload);
      if (response.success) {
        toast.success("Geo blocking settings saved successfully");
        // Reload settings to reflect the saved changes
        await loadGeoBlockingSettings();
      }
    } catch (error) {
      console.error("Failed to save geo blocking settings:", error);
      toast.error("Failed to save geo blocking settings");
    } finally {
      setLoadingGeoSettings(false);
    }
  };

  const updateGeoSetting = (key: string, value: any) => {
    setGeoSettings((prev) => ({ ...prev, [key]: value }));
  };

  const countries = [
    { code: "US", name: "United States" },
    { code: "CN", name: "China" },
    { code: "RU", name: "Russia" },
    { code: "IR", name: "Iran" },
    { code: "KP", name: "North Korea" },
    { code: "SY", name: "Syria" },
    { code: "CU", name: "Cuba" },
    { code: "SD", name: "Sudan" },
    { code: "MM", name: "Myanmar" },
    { code: "BY", name: "Belarus" },
  ];

  const resetRuleForm = () => {
    setRuleFormData({
      type: "block",
      target: "ip",
      value: "",
      description: "",
    });
    setShowCreateRuleModal(false);
    setEditingRule(null);
  };
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showChainModal, setShowChainModal] = useState<boolean>(false);
  const [showSystemModal, setShowSystemModal] = useState<boolean>(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] =
    useState<boolean>(false);
  const [showFundTransferModal, setShowFundTransferModal] =
    useState<boolean>(false);
  const [isSubmittingCurrency, setIsSubmittingCurrency] =
    useState<boolean>(false);
  const [isSubmittingChain, setIsSubmittingChain] = useState<boolean>(false);
  const [isSubmittingSystem, setIsSubmittingSystem] = useState<boolean>(false);
  const [isSubmittingFundTransfer, setIsSubmittingFundTransfer] =
    useState<boolean>(false);
  const [isDeletingConfig, setIsDeletingConfig] = useState<boolean>(false);
  const [configToDelete, setConfigToDelete] = useState<{
    type: "currency" | "chain" | "system";
    id: string;
    name?: string;
  } | null>(null);
  const [hotWalletData, setHotWalletData] = useState<WalletData[]>([]);
  const [coldWalletData, setColdWalletData] = useState<WalletData[]>([]);
  const [visibleAddresses, setVisibleAddresses] = useState<Set<string>>(
    new Set(),
  );

  // Admin Users state
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState<boolean>(false);
  const [deletingAdminUser, setDeletingAdminUser] = useState<boolean>(false);
  const [adminUserToDelete, setAdminUserToDelete] = useState<any | null>(null);
  const [showDeleteAdminModal, setShowDeleteAdminModal] =
    useState<boolean>(false);
  const [adminUserSearchTerm, setAdminUserSearchTerm] = useState<string>(() => {
    const searchFromUrl = searchParams.get("search");
    return searchFromUrl || "";
  });
  const [openAdminDropdown, setOpenAdminDropdown] = useState<string | null>(
    null,
  );

  const [fundTransfer, setFundTransfer] = useState<FundTransfer>({
    crypto_currency: "BTC",
    chain_id: "1",
    network: "mainnet",
    hot_wallet: "",
    cold_wallet: "",
    amount: 0,
  });
  const [newCurrencyConfig, setNewCurrencyConfig] = useState<
    Partial<CurrencyConfig>
  >({
    currency_code: "",
    currency_name: "",
    currency_type: "fiat",
    decimal_places: 2,
    smallest_unit_name: "",
    is_active: true,
  });
  const [newChainConfig, setNewChainConfig] = useState<Partial<ChainConfig>>({
    chain_id: "",
    name: "",
    networks: [],
    crypto_currencies: [],
    processor: "internal",
    is_testnet: false,
    status: "active",
  });
  const [newSystemConfig, setNewSystemConfig] = useState<Partial<SystemConfig>>(
    {
      config_key: "",
      config_value: {},
      description: "",
    },
  );
  const [systemConfigValueFields, setSystemConfigValueFields] = useState<{
    [key: string]: { key: string; value: string }[];
  }>({});
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Crypto Casino",
    siteDescription: "Premier cryptocurrency casino platform",
    supportEmail: "support@cryptocasino.com",
    timezone: "UTC",
    language: "en",
    maintenanceMode: false,
    registrationEnabled: true,
    demoMode: false,
  });
  const [tipSettings, setTipSettings] = useState({
    tipTransactionFeeFromWho: "sender", // "sender" or "receiver"
    transactionFee: 1, // 1-100
  });
  // Use ref to store latest tip settings to avoid stale closure issues
  const tipSettingsRef = useRef(tipSettings);

  const [welcomeBonusSettings, setWelcomeBonusSettings] = useState<{
    fixed_enabled: boolean;
    percentage_enabled: boolean;
    fixed_amount: number;
    percentage: number;
    max_deposit_amount: number;
    ip_restriction_enabled: boolean;
    allow_multiple_bonuses_per_ip: boolean;
    max_bonus_percentage?: number;
  }>({
    fixed_enabled: false,
    percentage_enabled: false,
    fixed_amount: 0.0,
    percentage: 0.0,
    max_deposit_amount: 0.0,
    ip_restriction_enabled: true,
    allow_multiple_bonuses_per_ip: false,
  });
  const [_isLoadingWelcomeBonus, setIsLoadingWelcomeBonus] = useState(false);
  const [_isSavingWelcomeBonus, setIsSavingWelcomeBonus] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    ipWhitelistEnabled: false,
    rateLimitEnabled: true,
    rateLimitRequests: 100,
  });
  const [currencyConfigs, setCurrencyConfigs] = useState<CurrencyConfig[]>([]);
  const [chainConfigs, setChainConfigs] = useState<ChainConfig[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [dbConfigs, setDbConfigs] = useState<DatabaseConfig[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);

  // IP/Geo rules state
  interface IPRule {
    id: string;
    type: "allow" | "block";
    target: "ip" | "range" | "country";
    value: string;
    description: string;
    isActive: boolean;
    createdDate: string;
    createdBy: string;
  }
  const [ipRules, setIpRules] = useState<IPRule[]>([]);
  const [loadingIpRules, setLoadingIpRules] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<IPRule | null>(null);
  const [editingRule, setEditingRule] = useState<IPRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    type: "block" as "allow" | "block",
    target: "ip" as "ip" | "range" | "country",
    value: "",
    description: "",
  });

  // Geo-blocking settings state
  const [geoSettings, setGeoSettings] = useState({
    enableGeoBlocking: true,
    defaultAction: "allow" as "allow" | "block",
    vpnDetection: true,
    proxyDetection: true,
    torBlocking: true,
    logAttempts: true,
    blockedCountries: [] as string[],
    allowedCountries: [] as string[],
    bypassCountries: [] as string[],
  });
  const [loadingGeoSettings, setLoadingGeoSettings] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingConfigValue, setEditingConfigValue] = useState<string>("");
  const [withdrawalGlobalStatus, _setWithdrawalGlobalStatus] =
    useState<WithdrawalGlobalStatus>({
      enabled: true,
      reason: "",
    });
  const [withdrawalThresholds, _setWithdrawalThresholds] =
    useState<WithdrawalThresholds>({
      hourly_volume: { value: 50000, currency: "USD", active: true },
      daily_volume: { value: 1000000, currency: "USD", active: true },
      single_transaction: { value: 10000, currency: "USD", active: true },
      user_daily: { value: 5000, currency: "USD", active: true },
    });
  const [withdrawalManualReview, _setWithdrawalManualReview] =
    useState<WithdrawalManualReview>({
      enabled: true,
      threshold_amount: 5000,
      currency: "USD",
      require_kyc: true,
    });
  const [configChanges, setConfigChanges] = useState<{
    currency: { [key: string]: Partial<CurrencyConfig> };
    chain: { [key: string]: Partial<ChainConfig> };
    system: { [key: string]: Partial<SystemConfig> };
  }>({
    currency: {},
    chain: {},
    system: {},
  });
  const [supportedChains, setSupportedChains] = useState<SupportedChain[]>([]);

  const toggleAddressVisibility = useCallback((address: string) => {
    setVisibleAddresses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
        setTimeout(() => {
          setVisibleAddresses((current) => {
            const updated = new Set(current);
            updated.delete(address);
            return updated;
          });
        }, 10000);
      }
      return newSet;
    });
  }, []);

  const formatAddress = useCallback(
    (address: string) => {
      if (visibleAddresses.has(address)) {
        return address;
      }
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
    [visibleAddresses],
  );

  const fetchConfigurations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const _params = { limit: "50", offset: "0" };

      // Only fetch data based on active tab
      const promises: Promise<any>[] = [];
      const responseKeys: string[] = [];

      if (activeTab === "configurations") {
        promises.push(
          wmsService
            .getCurrencyConfigs()
            .then((configs) => ({
              success: true,
              data: {
                currency_configs: Array.isArray(configs) ? configs : [],
                total: Array.isArray(configs) ? configs.length : 0,
              },
            })),
          wmsService
            .getSupportedChains()
            .then((chains) => ({
              success: true,
              data: {
                chain_configs: Array.isArray(chains) ? chains : [],
                total: Array.isArray(chains) ? chains.length : 0,
              },
            })),
        );
        responseKeys.push("currency", "chain");
      }

      if (activeTab === "database") {
        // Fetch database configs separately using the new configService
        try {
          const configs = await configService.getAllConfigs(
            selectedBrandId || undefined,
          );
          setDbConfigs(configs);
        } catch (err) {
          console.error("Failed to fetch database configs:", err);
        }
      }

      const responses = await Promise.all(promises);

      // Process responses based on what was fetched
      let responseIndex = 0;

      if (activeTab === "configurations") {
        const currencyResponse = responses[responseIndex++];
        const chainResponse = responses[responseIndex++];

        if (currencyResponse.success && currencyResponse.data) {
          setCurrencyConfigs(currencyResponse.data.currency_configs);
        }

        if (chainResponse.success && chainResponse.data) {
          setChainConfigs(chainResponse.data.chain_configs);
        }
      }

      await fetchSupportedChains();
    } catch (err: any) {
      setError(err.message || "Failed to fetch configurations");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, adminSvc]);

  const fetchSupportedChains = useCallback(async () => {
    try {
      const data = await wmsService.getSupportedChains();
      setSupportedChains(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch supported chains");
    }
  }, []);

  // Fetch admin users
  const fetchAdminUsers = useCallback(async () => {
    try {
      setLoadingAdminUsers(true);
      const response = await adminSvc.get("/users_admin?page=1&per_page=50");
      if (response.success && response.data) {
        const users = (response.data as any).map((u: any) => ({
          id: u.id,
          username: u.username || "",
          email: u.email || "",
          phone_number: u.phone_number || "",
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          role:
            u.roles && u.roles.length > 0
              ? u.roles.map((r: any) => r.name).join(", ")
              : "Admin",
          status:
            (u.status || "ACTIVE").toUpperCase() === "ACTIVE"
              ? "Active"
              : "Inactive",
          created_at: u.created_at || "",
          is_admin: u.is_admin || false,
          user_type: u.user_type || "ADMIN",
        }));
        setAdminUsers(users);
      } else {
        setAdminUsers([]);
      }
    } catch (error: any) {
      console.error("Error fetching admin users:", error);
      toast.error("Failed to fetch admin users");
      setAdminUsers([]);
    } finally {
      setLoadingAdminUsers(false);
    }
  }, [adminSvc]);

  // Delete admin user
  const handleDeleteAdminUser = async () => {
    if (!adminUserToDelete) return;

    setDeletingAdminUser(true);
    try {
      const response = await adminSvc.delete(
        `/users_admin/${adminUserToDelete.id}`,
      );
      if (response.success) {
        toast.success("Admin user deleted successfully");
        setShowDeleteAdminModal(false);
        setAdminUserToDelete(null);
        await fetchAdminUsers();
      } else {
        toast.error(response.message || "Failed to delete admin user");
      }
    } catch (error: any) {
      console.error("Error deleting admin user:", error);
      toast.error(error.message || "Failed to delete admin user");
    } finally {
      setDeletingAdminUser(false);
    }
  };

  // Initialize search term from URL when admin-users tab becomes active
  useEffect(() => {
    if (activeTab === "admin-users") {
      const searchFromUrl = searchParams.get("search") || "";
      if (searchFromUrl !== adminUserSearchTerm) {
        setAdminUserSearchTerm(searchFromUrl);
      }
    }
  }, [activeTab, searchParams]);

  // Update URL when search term changes (only for admin-users tab)
  useEffect(() => {
    if (activeTab === "admin-users") {
      const newSearchParams = new URLSearchParams(searchParams);
      if (adminUserSearchTerm) {
        newSearchParams.set("search", adminUserSearchTerm);
      } else {
        newSearchParams.delete("search");
      }
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [adminUserSearchTerm, activeTab, searchParams, setSearchParams]);

  // Fetch admin users when tab is active
  useEffect(() => {
    if (activeTab === "admin-users") {
      fetchAdminUsers();
    }
  }, [activeTab, fetchAdminUsers]);

  const handleRefreshWalletData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Fetch hot wallet data
      const hotWalletData = await wmsService.getHotWalletData();
      setHotWalletData(hotWalletData || []);

      // Fetch cold wallet data
      const coldWalletData = await wmsService.getColdWalletData();
      setColdWalletData(coldWalletData || []);

      toast.success("Wallet data refreshed successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh wallet data");
      console.error("Error refreshing wallet data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const _handleMoveFundsToHot = useCallback(async () => {
    try {
      setIsSubmittingFundTransfer(true);

      const response = await wmsService.transferFunds(fundTransfer);

      if (response.success) {
        toast.success("Funds moved to hot wallet successfully");
        setShowFundTransferModal(false);
        // Reset fund transfer form
        setFundTransfer({
          crypto_currency: "BTC",
          chain_id: "1",
          network: "mainnet",
          hot_wallet: "",
          cold_wallet: "",
          amount: 0,
        });
        // Refresh wallet data
        await handleRefreshWalletData();
      } else {
        toast.error(response.message || "Failed to move funds");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to move funds",
      );
      console.error("Error moving funds:", err);
    } finally {
      setIsSubmittingFundTransfer(false);
    }
  }, [fundTransfer, handleRefreshWalletData]);

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    // Don't load settings if no brand is selected
    if (!selectedBrandId) {
      return;
    }

    setIsLoading(true);
    try {
      // Build query params with brand_id (required)
      const queryParams = `?brand_id=${selectedBrandId}`;

      const [generalRes, securityRes] = await Promise.all([
        adminSvc.get<GeneralSettingsData>(`/settings/general${queryParams}`),
        adminSvc.get<SecuritySettingsData>(`/settings/security${queryParams}`),
      ]);

      if (generalRes.success) {
        // Map snake_case backend fields to camelCase frontend fields
        const generalData = generalRes.data!;
        setGeneralSettings({
          siteName: generalData.site_name || "Crypto Casino",
          siteDescription:
            generalData.site_description ||
            "Premier cryptocurrency casino platform",
          supportEmail: generalData.support_email || "support@cryptocasino.com",
          timezone: generalData.timezone || "UTC",
          language: generalData.language || "en",
          maintenanceMode: generalData.maintenance_mode || false,
          registrationEnabled:
            generalData.registration_enabled !== undefined
              ? generalData.registration_enabled
              : true,
          demoMode: generalData.demo_mode || false,
        });
      }
      if (securityRes.success) {
        // Map snake_case backend fields to camelCase frontend fields
        const securityData = securityRes.data!;
        setSecuritySettings({
          sessionTimeout: securityData.session_timeout || 30,
          maxLoginAttempts: securityData.max_login_attempts || 5,
          lockoutDuration: securityData.lockout_duration || 15,
          twoFactorRequired: securityData.two_factor_required || false,
          passwordMinLength: securityData.password_min_length || 8,
          passwordRequireSpecial:
            securityData.password_require_special !== undefined
              ? securityData.password_require_special
              : true,
          ipWhitelistEnabled: securityData.ip_whitelist_enabled || false,
          rateLimitEnabled:
            securityData.rate_limit_enabled !== undefined
              ? securityData.rate_limit_enabled
              : true,
          rateLimitRequests: securityData.rate_limit_requests || 100,
        });
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      // Filter out "brand_id is required" error message
      const errorMessage = err.message || "Failed to load settings";
      if (!errorMessage.toLowerCase().includes("brand_id is required")) {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [adminSvc, selectedBrandId]);

  // Use demo brands from Brands sidebar (no API)
  useEffect(() => {
    const loadedBrands = getMockBrands().map((b) => ({ id: b.id, name: b.name }));
    setBrands(loadedBrands);
    if (loadedBrands.length > 0) {
      setSelectedBrandId((prev) => prev || loadedBrands[0].id);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "configurations" || activeTab === "database") {
      fetchConfigurations();
    }
    if (activeTab === "ip-blocking") {
      loadIpFilters();
    }
    if (activeTab === "settings") {
      loadGeoBlockingSettings();
    }
  }, [activeTab, selectedBrandId, fetchConfigurations]);

  // Fetch welcome bonus settings
  const fetchWelcomeBonusSettings = useCallback(async () => {
    if (!selectedBrandId) {
      return;
    }
    try {
      setIsLoadingWelcomeBonus(true);
      const response = await adminSvc.get<WelcomeBonusData>(
        `/settings/welcome-bonus?brand_id=${selectedBrandId}`,
      );
      if (response.success && response.data) {
        const data = response.data;
        // Handle backward compatibility: if old format (type/enabled), convert to new format
        let fixedEnabled = data.fixed_enabled || false;
        let percentageEnabled = data.percentage_enabled || false;

        if (data.type && data.enabled !== undefined) {
          if (data.type === "fixed" && data.enabled) {
            fixedEnabled = true;
          } else if (data.type === "percentage" && data.enabled) {
            percentageEnabled = true;
          }
        }

        setWelcomeBonusSettings({
          fixed_enabled: fixedEnabled,
          percentage_enabled: percentageEnabled,
          fixed_amount: data.fixed_amount || 0.0,
          percentage: data.percentage || 0.0,
          max_deposit_amount: data.max_deposit_amount || 0.0,
          ip_restriction_enabled:
            data.ip_restriction_enabled !== undefined
              ? data.ip_restriction_enabled
              : true,
          allow_multiple_bonuses_per_ip:
            data.allow_multiple_bonuses_per_ip !== undefined
              ? data.allow_multiple_bonuses_per_ip
              : false,
        });
      }
    } catch (err: any) {
      console.error("Failed to load welcome bonus settings:", err);
      // If no settings exist, use defaults
      setWelcomeBonusSettings({
        fixed_enabled: false,
        percentage_enabled: false,
        fixed_amount: 0.0,
        percentage: 0.0,
        max_deposit_amount: 0.0,
        ip_restriction_enabled: true,
        allow_multiple_bonuses_per_ip: false,
      });
    } finally {
      setIsLoadingWelcomeBonus(false);
    }
  }, [adminSvc, selectedBrandId]);

  // Save welcome bonus settings
  const saveWelcomeBonusSettings = useCallback(async () => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      setIsSavingWelcomeBonus(true);
      const { max_bonus_percentage, ...settingsToSave } = welcomeBonusSettings;
      const response = await adminSvc.put("/settings/welcome-bonus", {
        brand_id: selectedBrandId,
        ...settingsToSave,
      });
      if (response.success) {
        toast.success("Welcome bonus settings saved successfully");
        setHasUnsavedChanges(false);
      } else {
        throw new Error(
          response.message || "Failed to save welcome bonus settings",
        );
      }
    } catch (err: any) {
      console.error("Failed to save welcome bonus settings:", err);
      toast.error(err.message || "Failed to save welcome bonus settings");
    } finally {
      setIsSavingWelcomeBonus(false);
    }
  }, [adminSvc, selectedBrandId, welcomeBonusSettings]);

  // Load welcome bonus settings when tab is active and brand is selected
  useEffect(() => {
    if (activeTab === "welcome-bonus" && selectedBrandId) {
      fetchWelcomeBonusSettings();
    }
  }, [activeTab, selectedBrandId, fetchWelcomeBonusSettings]);

  // Load settings when component mounts or brand changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateGeneralSetting = useCallback((key: string, value: any) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const _updateSecuritySetting = useCallback((key: string, value: any) => {
    setSecuritySettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const _updateTipSetting = useCallback((key: string, value: any) => {
    setTipSettings((prev) => {
      const updated = { ...prev, [key]: value };
      // Update ref immediately so saveSettings always has latest value
      tipSettingsRef.current = updated;
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const updateCurrencyConfig = useCallback(
    (currencyCode: string, updates: Partial<CurrencyConfig>) => {
      setConfigChanges((prev) => ({
        ...prev,
        currency: {
          ...prev.currency,
          [currencyCode]: { ...prev.currency[currencyCode], ...updates },
        },
      }));
      setHasUnsavedChanges(true);
    },
    [],
  );

  const updateChainConfig = useCallback(
    (chainId: string, updates: Partial<ChainConfig>) => {
      setConfigChanges((prev) => ({
        ...prev,
        chain: {
          ...prev.chain,
          [chainId]: { ...prev.chain[chainId], ...updates },
        },
      }));
      setHasUnsavedChanges(true);
    },
    [],
  );

  const updateSystemConfig = useCallback(
    (configKey: string, updates: Partial<SystemConfig>) => {
      setConfigChanges((prev) => ({
        ...prev,
        system: {
          ...prev.system,
          [configKey]: { ...prev.system[configKey], ...updates },
        },
      }));
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handleSystemConfigValueChange = useCallback(
    (
      configKey: string,
      index: number,
      field: "key" | "value",
      value: string,
    ) => {
      setSystemConfigValueFields((prev) => {
        const newFields = [...(prev[configKey] || [])];
        newFields[index] = { ...newFields[index], [field]: value };
        const newConfigValue = newFields.reduce((acc, { key, value }) => {
          try {
            acc[key] = JSON.parse(value);
            return acc;
          } catch {
            return acc;
          }
        }, {} as any);
        updateSystemConfig(configKey, { config_value: newConfigValue });
        return { ...prev, [configKey]: newFields };
      });
    },
    [updateSystemConfig],
  );

  const addSystemConfigField = useCallback((configKey: string) => {
    setSystemConfigValueFields((prev) => ({
      ...prev,
      [configKey]: [...(prev[configKey] || []), { key: "", value: "" }],
    }));
  }, []);

  const removeSystemConfigField = useCallback(
    (configKey: string, index: number) => {
      setSystemConfigValueFields((prev) => {
        const newFields = [...(prev[configKey] || [])];
        newFields.splice(index, 1);
        const newConfigValue = newFields.reduce((acc, { key, value }) => {
          try {
            acc[key] = JSON.parse(value);
            return acc;
          } catch {
            return acc;
          }
        }, {} as any);
        updateSystemConfig(configKey, { config_value: newConfigValue });
        return { ...prev, [configKey]: newFields };
      });
    },
    [updateSystemConfig],
  );

  const addNewConfig = useCallback(
    async (type: "currency" | "chain" | "system") => {
      const setSubmitting = {
        currency: setIsSubmittingCurrency,
        chain: setIsSubmittingChain,
        system: setIsSubmittingSystem,
      }[type];
      setSubmitting(true);
      setError(null);
      try {
        if (type === "currency") {
          if (
            !newCurrencyConfig.currency_code ||
            !newCurrencyConfig.currency_name
          ) {
            throw new Error("Currency code and name are required");
          }
          const response =
            await wmsService.createCurrencyConfig(newCurrencyConfig);
          if (!response.success) throw new Error(response.message);
          setNewCurrencyConfig({
            currency_code: "",
            currency_name: "",
            currency_type: "fiat",
            decimal_places: 2,
            smallest_unit_name: "",
            is_active: true,
          });
          setShowCurrencyModal(false);
        } else if (type === "chain") {
          if (!newChainConfig.chain_id || !newChainConfig.name) {
            throw new Error("Chain ID and name are required");
          }
          const response = await wmsService.createChain(newChainConfig);
          if (!response.success) throw new Error(response.message);
          setNewChainConfig({
            chain_id: "",
            name: "",
            networks: [],
            crypto_currencies: [],
            processor: "internal",
            is_testnet: false,
            status: "active",
          });
          setShowChainModal(false);
        } else if (type === "system") {
          if (!newSystemConfig.config_key) {
            throw new Error("Config key is required");
          }
          const configValue = newSystemConfig.config_value
            ? Object.entries(newSystemConfig.config_value).reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value }),
                {},
              )
            : {};
          const response = await adminSvc.post("/system-configs/create", {
            ...newSystemConfig,
            config_value: configValue,
            brand_id: selectedBrandId || null,
          });
          if (!response.success) throw new Error(response.message);
          setNewSystemConfig({
            config_key: "",
            config_value: {},
            description: "",
          });
          setShowSystemModal(false);
        }
        await fetchConfigurations();
      } catch (err: any) {
        setError(err.message || `Failed to add new ${type} config`);
      } finally {
        setSubmitting(false);
      }
    },
    [
      walletMgmtSvc,
      newCurrencyConfig,
      newChainConfig,
      newSystemConfig,
      fetchConfigurations,
    ],
  );

  const confirmDeleteConfig = useCallback(
    (type: "currency" | "chain" | "system", id: string, name?: string) => {
      setConfigToDelete({ type, id, name });
      setShowConfirmDeleteModal(true);
    },
    [],
  );

  const deleteConfig = useCallback(async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true);
    setError(null);
    try {
      const { type, id } = configToDelete;
      let response;
      if (type === "currency") {
        response = await wmsService.deleteCurrencyConfig(id);
      } else if (type === "chain") {
        response = await wmsService.deleteChain(id);
      } else {
        response = await walletMgmtSvc.delete(`/system-configs/${id}`);
      }
      if (!response.success) throw new Error(response.message);
      await fetchConfigurations();
      setShowConfirmDeleteModal(false);
      setConfigToDelete(null);
    } catch (err: any) {
      setError(err.message || `Failed to delete ${configToDelete.type} config`);
    } finally {
      setIsDeletingConfig(false);
    }
  }, [walletMgmtSvc, configToDelete, fetchConfigurations]);

  const initiateFundTransfer = useCallback(async () => {
    setIsSubmittingFundTransfer(true);
    setError(null);
    try {
      if (
        !fundTransfer.chain_id ||
        !fundTransfer.network ||
        !fundTransfer.crypto_currency ||
        !fundTransfer.hot_wallet ||
        !fundTransfer.cold_wallet ||
        !fundTransfer.amount ||
        fundTransfer.amount <= 0
      ) {
        throw new Error(
          "All fund transfer fields are required and amount must be positive",
        );
      }
      const response = await wmsService.transferFunds(fundTransfer);
      if (!response.success) throw new Error(response.message);
      setFundTransfer({
        crypto_currency: "",
        chain_id: "",
        network: "",
        hot_wallet: "",
        cold_wallet: "",
        amount: 0,
      });
      setShowFundTransferModal(false);
      await fetchConfigurations();
    } catch (err: any) {
      setError(err.message || "Failed to initiate fund transfer");
    } finally {
      setIsSubmittingFundTransfer(false);
    }
  }, [fundTransfer, fetchConfigurations]);

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updates = [];

      // Save settings to backend - map camelCase to snake_case
      // Include brand_id if selected
      const brandIdPayload = selectedBrandId
        ? { brand_id: selectedBrandId }
        : {};

      updates.push(
        adminSvc.put("/settings/general", {
          ...brandIdPayload,
          site_name: generalSettings.siteName,
          site_description: generalSettings.siteDescription,
          support_email: generalSettings.supportEmail,
          timezone: generalSettings.timezone,
          language: generalSettings.language,
          maintenance_mode: generalSettings.maintenanceMode,
          registration_enabled: generalSettings.registrationEnabled,
          demo_mode: generalSettings.demoMode,
        }),
        adminSvc.put("/settings/security", {
          ...brandIdPayload,
          session_timeout: securitySettings.sessionTimeout,
          max_login_attempts: securitySettings.maxLoginAttempts,
          lockout_duration: securitySettings.lockoutDuration,
          two_factor_required: securitySettings.twoFactorRequired,
          password_min_length: securitySettings.passwordMinLength,
          password_require_special: securitySettings.passwordRequireSpecial,
          ip_whitelist_enabled: securitySettings.ipWhitelistEnabled,
          rate_limit_enabled: securitySettings.rateLimitEnabled,
          rate_limit_requests: securitySettings.rateLimitRequests,
        }),
      );

      // Save configuration changes
      updates.push(
        ...Object.entries(configChanges.currency).map(
          ([currencyCode, updates]) =>
            wmsService.updateCurrencyConfig(currencyCode, {
              currency_code: currencyCode,
              ...updates,
            }),
        ),
        ...Object.entries(configChanges.chain).map(([chainId, updates]) =>
          wmsService.updateChain(chainId, {
            chain_id: chainId,
            ...updates,
          }),
        ),
        ...Object.entries(configChanges.system).map(([configKey, updates]) =>
          walletMgmtSvc.post("/system-configs", {
            config_key: configKey,
            ...updates,
          }),
        ),
      );

      const responses = await Promise.all(updates);
      responses.forEach((response, index) => {
        if (!response.success) {
          const key =
            Object.keys(configChanges.currency)[index] ||
            Object.keys(configChanges.chain)[index] ||
            Object.keys(configChanges.system)[index];
          throw new Error(
            `Failed to update config ${key}: ${response.message}`,
          );
        }
      });

      setConfigChanges({ currency: {}, chain: {}, system: {} });
      setHasUnsavedChanges(false);
      await fetchConfigurations();
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "SITE_SETTINGS_SAVE",
          category: "SiteSettings",
          severity: "info",
          description: "Saved site settings (general, security)",
        });
      } catch {}
    } catch (err: any) {
      // Filter out "brand_id is required" error message
      const errorMessage = err.message || "Failed to save settings";
      if (!errorMessage.toLowerCase().includes("brand_id is required")) {
        setError(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    walletMgmtSvc,
    configChanges,
    fetchConfigurations,
    adminSvc,
    generalSettings,
    securitySettings,
    selectedBrandId,
  ]);

  const updateWithdrawalGlobalStatus = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await walletMgmtSvc.put(
        "/system-config/withdrawal/global-status",
        withdrawalGlobalStatus,
      );
      if (!response.success) throw new Error(response.message);
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "WITHDRAWAL_GLOBAL_STATUS_UPDATE",
          category: "SiteSettings",
          severity: withdrawalGlobalStatus.enabled ? "warning" : "info",
          description: `Withdrawal global status updated`,
          details: withdrawalGlobalStatus,
        });
      } catch {}
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err.message || "Failed to update withdrawal global status");
    } finally {
      setIsSaving(false);
    }
  }, [walletMgmtSvc, withdrawalGlobalStatus]);

  const _updateWithdrawalThresholds = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await walletMgmtSvc.put(
        "/system-config/withdrawal/thresholds",
        withdrawalThresholds,
      );
      if (!response.success) throw new Error(response.message);
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "WITHDRAWAL_THRESHOLDS_UPDATE",
          category: "SiteSettings",
          severity: "info",
          description: "Updated withdrawal thresholds",
          details: withdrawalThresholds,
        });
      } catch {}
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err.message || "Failed to update withdrawal thresholds");
    } finally {
      setIsSaving(false);
    }
  }, [walletMgmtSvc, withdrawalThresholds]);

  const _updateWithdrawalManualReview = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await walletMgmtSvc.put(
        "/system-config/withdrawal/manual-review",
        withdrawalManualReview,
      );
      if (!response.success) throw new Error(response.message);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(
        err.message || "Failed to update withdrawal manual review settings",
      );
    } finally {
      setIsSaving(false);
    }
  }, [walletMgmtSvc, withdrawalManualReview]);

  const sidebarSections = [
    {
      title: "Platform",
      tabs: [
        { id: "general", label: "General", icon: Settings },
      ],
    },
    {
      title: "Security & location",
      tabs: [
        { id: "ip-blocking", label: "IP allow / block", icon: Shield },
        { id: "settings", label: "Geo-blocking", icon: Globe },
      ],
    },
    {
      title: "System & users",
      tabs: [
        { id: "configurations", label: "Configuration", icon: Sliders },
        { id: "database", label: "Database", icon: Database },
        { id: "admin-users", label: "Admin users", icon: UserCog },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <Settings className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Site settings
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Configure platform settings by brand
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveSettings}
            disabled={!hasUnsavedChanges || isSaving || isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              hasUnsavedChanges && !isSaving && !isLoading
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/20"
                : "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <Bell className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-medium text-red-400">{error}</span>
        </div>
      )}

      {hasUnsavedChanges && !error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-400">
            You have unsaved changes
          </span>
        </div>
      )}

      {/* Full-width brand bar */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
            Configure for brand
          </label>
          <select
            value={selectedBrandId || ""}
            onChange={(e) => setSelectedBrandId(e.target.value || null)}
            className="bg-slate-950/60 text-white border border-slate-700 rounded-xl px-4 py-2 min-w-[200px] focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main card: vertical sidebar + content */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 overflow-hidden flex flex-col md:flex-row min-h-[480px] backdrop-blur-sm">
        <aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r border-slate-700/80 bg-slate-800/30">
          <nav className="p-3 space-y-6" aria-label="Settings sections">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <h2 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {section.title}
                </h2>
                <div className="space-y-0.5">
                  {section.tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveTab(id);
                        setSearchParams({ tab: id });
                      }}
                      disabled={isLoading || isSaving}
                      className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-medium text-sm text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        activeTab === id
                          ? "bg-red-500/15 text-red-500"
                          : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 p-6 md:p-8 overflow-auto">
          {activeTab === "general" && (
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/80">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  General settings
                </h3>
              </div>
              <div className="p-4 md:p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Site name
                  </label>
                  <input
                    type="text"
                    value={generalSettings.siteName}
                    onChange={(e) =>
                      updateGeneralSetting("siteName", e.target.value)
                    }
                    disabled={isLoading || isSaving}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Support email
                  </label>
                  <input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) =>
                      updateGeneralSetting("supportEmail", e.target.value)
                    }
                    disabled={isLoading || isSaving}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Timezone
                  </label>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) =>
                      updateGeneralSetting("timezone", e.target.value)
                    }
                    disabled={isLoading || isSaving}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                    <option value="GMT">Greenwich Mean Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Language
                  </label>
                  <select
                    value={generalSettings.language}
                    onChange={(e) =>
                      updateGeneralSetting("language", e.target.value)
                    }
                    disabled={isLoading || isSaving}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Site description
                </label>
                <textarea
                  value={generalSettings.siteDescription}
                  onChange={(e) =>
                    updateGeneralSetting("siteDescription", e.target.value)
                  }
                  disabled={isLoading || isSaving}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 h-20 resize-none disabled:opacity-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500"
                />
              </div>
              <div className="space-y-4 pt-2">
                <h4 className="text-slate-300 font-medium text-sm uppercase tracking-wider">System controls</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.maintenanceMode}
                      onChange={(e) =>
                        updateGeneralSetting(
                          "maintenanceMode",
                          e.target.checked,
                        )
                      }
                      disabled={isLoading || isSaving}
                      className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                    />
                    <span className="text-slate-200">Maintenance mode</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.registrationEnabled}
                      onChange={(e) =>
                        updateGeneralSetting(
                          "registrationEnabled",
                          e.target.checked,
                        )
                      }
                      disabled={isLoading || isSaving}
                      className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                    />
                    <span className="text-slate-200">Allow new registrations</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.demoMode}
                      onChange={(e) =>
                        updateGeneralSetting("demoMode", e.target.checked)
                      }
                      disabled={isLoading || isSaving}
                      className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                    />
                    <span className="text-slate-200">Demo mode</span>
                  </label>
                </div>
              </div>
              </div>
            </div>
          )}

          {activeTab === "configurations" && (
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/80">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  Configuration settings
                </h3>
              </div>
              <div className="p-4 md:p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-medium">
                    Currency Configurations
                  </h4>
                  <button
                    onClick={() => setShowCurrencyModal(true)}
                    disabled={isLoading || isSaving}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-xl flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add currency</span>
                  </button>
                </div>
                {isLoading ? (
                  <div className="text-slate-400">Loading...</div>
                ) : currencyConfigs.length === 0 ? (
                  <div className="text-slate-400">
                    No currency configurations available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currencyConfigs.map((config) => (
                      <div
                        key={config.currency_code}
                        className="border border-slate-700/80 rounded-xl p-4 relative"
                      >
                        <button
                          onClick={() =>
                            confirmDeleteConfig(
                              "currency",
                              config.currency_code,
                              config.currency_name,
                            )
                          }
                          disabled={isLoading || isSaving}
                          className="absolute top-4 right-4 text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Currency Code
                            </label>
                            <input
                              type="text"
                              value={config.currency_code}
                              disabled
                              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Currency Name
                            </label>
                            <input
                              type="text"
                              value={
                                configChanges.currency[config.currency_code]
                                  ?.currency_name || config.currency_name
                              }
                              onChange={(e) =>
                                updateCurrencyConfig(config.currency_code, {
                                  currency_name: e.target.value,
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Currency Type
                            </label>
                            <select
                              value={
                                configChanges.currency[config.currency_code]
                                  ?.currency_type || config.currency_type
                              }
                              onChange={(e) =>
                                updateCurrencyConfig(config.currency_code, {
                                  currency_type: e.target.value as
                                    | "fiat"
                                    | "crypto",
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            >
                              <option value="fiat">Fiat</option>
                              <option value="crypto">Crypto</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Decimal Places
                            </label>
                            <input
                              type="number"
                              value={
                                configChanges.currency[config.currency_code]
                                  ?.decimal_places || config.decimal_places
                              }
                              onChange={(e) =>
                                updateCurrencyConfig(config.currency_code, {
                                  decimal_places: parseInt(e.target.value) || 0,
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Smallest Unit Name
                            </label>
                            <input
                              type="text"
                              value={
                                configChanges.currency[config.currency_code]
                                  ?.smallest_unit_name ||
                                config.smallest_unit_name
                              }
                              onChange={(e) =>
                                updateCurrencyConfig(config.currency_code, {
                                  smallest_unit_name: e.target.value,
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={
                                  configChanges.currency[config.currency_code]
                                    ?.is_active ?? config.is_active
                                }
                                onChange={(e) =>
                                  updateCurrencyConfig(config.currency_code, {
                                    is_active: e.target.checked,
                                  })
                                }
                                disabled={isLoading || isSaving}
                                className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                              />
                              <span className="text-white">Active</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-medium">
                    Chain Configurations
                  </h4>
                  <button
                    onClick={() => setShowChainModal(true)}
                    disabled={isLoading || isSaving}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Chain</span>
                  </button>
                </div>
                {isLoading ? (
                  <div className="text-slate-400">Loading...</div>
                ) : chainConfigs.length === 0 ? (
                  <div className="text-slate-400">
                    No chain configurations available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chainConfigs.map((config) => (
                      <div
                        key={config.chain_id}
                        className="border border-slate-700/80 rounded-xl p-4 relative"
                      >
                        <button
                          onClick={() =>
                            confirmDeleteConfig("chain", config.id, config.name)
                          }
                          disabled={isLoading || isSaving}
                          className="absolute top-4 right-4 text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Chain ID
                            </label>
                            <input
                              type="text"
                              value={config.chain_id}
                              disabled
                              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Name
                            </label>
                            <input
                              type="text"
                              value={
                                configChanges.chain[config.chain_id]?.name ||
                                config.name
                              }
                              onChange={(e) =>
                                updateChainConfig(config.chain_id, {
                                  name: e.target.value,
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Processor
                            </label>
                            <select
                              value={
                                configChanges.chain[config.chain_id]
                                  ?.processor || config.processor
                              }
                              onChange={(e) =>
                                updateChainConfig(config.chain_id, {
                                  processor: e.target.value as
                                    | "internal"
                                    | "pdm",
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            >
                              <option value="internal">Internal</option>
                              <option value="pdm">PDM</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Status
                            </label>
                            <select
                              value={
                                configChanges.chain[config.chain_id]?.status ||
                                config.status
                              }
                              onChange={(e) =>
                                updateChainConfig(config.chain_id, {
                                  status: e.target.value as
                                    | "active"
                                    | "inactive",
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={
                                  configChanges.chain[config.chain_id]
                                    ?.is_testnet ?? config.is_testnet
                                }
                                onChange={(e) =>
                                  updateChainConfig(config.chain_id, {
                                    is_testnet: e.target.checked,
                                  })
                                }
                                disabled={isLoading || isSaving}
                                className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                              />
                              <span className="text-white">Testnet</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-medium">
                    System Configurations
                  </h4>
                  <button
                    onClick={() => setShowSystemModal(true)}
                    disabled={isLoading || isSaving}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add System Config</span>
                  </button>
                </div>
                {isLoading ? (
                  <div className="text-slate-400">Loading...</div>
                ) : systemConfigs.length === 0 ? (
                  <div className="text-slate-400">
                    No system configurations available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {systemConfigs.map((config) => (
                      <div
                        key={config.config_key}
                        className="border border-slate-700/80 rounded-xl p-4 relative"
                      >
                        <button
                          onClick={() =>
                            confirmDeleteConfig(
                              "system",
                              config.id,
                              config.config_key,
                            )
                          }
                          disabled={isLoading || isSaving}
                          className="absolute top-4 right-4 text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Config Key
                            </label>
                            <input
                              type="text"
                              value={config.config_key}
                              disabled
                              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Config Value
                            </label>
                            <div className="space-y-2">
                              {(
                                systemConfigValueFields[config.config_key] || []
                              ).map((field, index) => (
                                <div
                                  key={index}
                                  className="flex space-x-2 items-center"
                                >
                                  <input
                                    type="text"
                                    value={field.key}
                                    onChange={(e) =>
                                      handleSystemConfigValueChange(
                                        config.config_key,
                                        index,
                                        "key",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Key"
                                    disabled={isLoading || isSaving}
                                    className="w-1/2 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                                  />
                                  <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) =>
                                      handleSystemConfigValueChange(
                                        config.config_key,
                                        index,
                                        "value",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Value (JSON)"
                                    disabled={isLoading || isSaving}
                                    className="w-1/2 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                                  />
                                  <button
                                    onClick={() =>
                                      removeSystemConfigField(
                                        config.config_key,
                                        index,
                                      )
                                    }
                                    disabled={isLoading || isSaving}
                                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() =>
                                  addSystemConfigField(config.config_key)
                                }
                                disabled={isLoading || isSaving}
                                className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1 disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add Field</span>
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                              Description
                            </label>
                            <textarea
                              value={
                                configChanges.system[config.config_key]
                                  ?.description || config.description
                              }
                              onChange={(e) =>
                                updateSystemConfig(config.config_key, {
                                  description: e.target.value,
                                })
                              }
                              disabled={isLoading || isSaving}
                              className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 h-20 resize-none disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* Database Configs Tab */}
          {activeTab === "database" && (
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  Database configurations
                </h3>
                <button
                  onClick={() => fetchConfigurations()}
                  disabled={isLoading || isSaving}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="p-4 md:p-6 space-y-6">
              {/* Brand Selection */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Filter by Brand
                </label>
                <select
                  value={selectedBrandId || ""}
                  onChange={(e) => setSelectedBrandId(e.target.value || null)}
                  className="w-full md:w-64 bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  Showing configurations for selected brand
                </p>
              </div>

              {isLoading ? (
                <div className="text-slate-400 text-center py-8">Loading...</div>
              ) : dbConfigs.length === 0 ? (
                <div className="text-slate-400 text-center py-8">
                  No database configurations available
                </div>
              ) : (
                <div className="space-y-4">
                  {dbConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="border border-slate-700/80 rounded-xl p-4 bg-slate-800/50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={config.name}
                            disabled
                            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">
                            Value
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={
                                editingConfigId === config.id
                                  ? editingConfigValue
                                  : config.value
                              }
                              onChange={(e) =>
                                setEditingConfigValue(e.target.value)
                              }
                              onFocus={() => {
                                setEditingConfigId(config.id);
                                setEditingConfigValue(config.value);
                              }}
                              disabled={isSaving}
                              className="flex-1 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                            />
                            {editingConfigId === config.id && (
                              <>
                                <button
                                  onClick={async () => {
                                    try {
                                      setIsSaving(true);
                                      await configService.updateConfig(
                                        config.id,
                                        editingConfigValue,
                                      );
                                      // Update local state
                                      setDbConfigs((prev) =>
                                        prev.map((c) =>
                                          c.id === config.id
                                            ? {
                                                ...c,
                                                value: editingConfigValue,
                                              }
                                            : c,
                                        ),
                                      );
                                      setEditingConfigId(null);
                                      setEditingConfigValue("");
                                      toast.success(
                                        "Config updated successfully",
                                      );
                                    } catch (err) {
                                      console.error(
                                        "Failed to update config:",
                                        err,
                                      );
                                      toast.error("Failed to update config");
                                    } finally {
                                      setIsSaving(false);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
                                >
                                  <Save className="h-4 w-4" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingConfigId(null);
                                    setEditingConfigValue("");
                                  }}
                                  disabled={isSaving}
                                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">
                            Created At
                          </label>
                          <input
                            type="text"
                            value={new Date(config.created_at).toLocaleString()}
                            disabled
                            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          )}

          {activeTab === "ip-blocking" && (
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  IP & geo rules ({ipRules.length})
                </h3>
                <button
                  onClick={() => {
                    setRuleFormData({
                      type: "block",
                      target: "ip",
                      value: "",
                      description: "",
                    });
                    setEditingRule(null);
                    setShowCreateRuleModal(true);
                  }}
                  disabled={loadingIpRules}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create rule</span>
                </button>
              </div>

              <div className="p-4 md:p-6">
              <div className="overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/80">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Rule ID
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Target
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Value
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Created
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Created By
                      </th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingIpRules ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-slate-400"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                            <span>Loading IP filters...</span>
                          </div>
                        </td>
                      </tr>
                    ) : ipRules.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-slate-400"
                        >
                          No IP filters found. Create your first rule to get
                          started.
                        </td>
                      </tr>
                    ) : (
                      ipRules.map((rule, index) => (
                        <tr
                          key={index}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 text-red-400 font-mono text-sm">
                            {rule.id}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(rule.type)}`}
                            >
                              {rule.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getTargetIcon(rule.target)}
                              <span className="text-white capitalize">
                                {rule.target}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white font-mono">
                            {rule.value}
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                            {rule.description}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleRuleStatus(rule.id)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                rule.isActive
                                  ? "text-green-400 bg-green-400/10 hover:bg-green-400/20"
                                  : "text-slate-400 bg-slate-500/10 hover:bg-slate-500/20"
                              }`}
                            >
                              {rule.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-sm">
                            {rule.createdDate}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-sm">
                            {rule.createdBy}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditRule(rule)}
                                disabled={loadingIpRules}
                                className="text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule)}
                                disabled={loadingIpRules}
                                className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}

          {activeTab === "admin-users" && (
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/80">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  Admin users
                </h3>
              </div>
              <div className="p-4 md:p-6">

              {/* Search */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by username, email, or ID..."
                    value={adminUserSearchTerm}
                    onChange={(e) => setAdminUserSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Admin Users Table */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden">
                {loadingAdminUsers ? (
                  <div className="text-center py-8 text-slate-400">
                    Loading admin users...
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/80">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">
                          ID
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">
                          Created
                        </th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers
                        .filter((user) => {
                          if (!adminUserSearchTerm) return true;
                          const search = adminUserSearchTerm.toLowerCase();
                          return (
                            user.id.toLowerCase().includes(search) ||
                            user.email.toLowerCase().includes(search) ||
                            user.username.toLowerCase().includes(search) ||
                            (user.first_name &&
                              user.first_name.toLowerCase().includes(search)) ||
                            (user.last_name &&
                              user.last_name.toLowerCase().includes(search))
                          );
                        })
                        .map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-slate-700/50 hover:bg-slate-700/30"
                          >
                            <td className="py-3 px-4 text-red-400 font-mono text-sm">
                              {user.id}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {user.email}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4 text-blue-400 text-sm">
                              {user.role}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.status === "Active"
                                    ? "text-green-400 bg-green-400/10"
                                    : "text-slate-400 bg-slate-500/10"
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-sm">
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end">
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setOpenAdminDropdown(
                                        openAdminDropdown === user.id
                                          ? null
                                          : user.id,
                                      )
                                    }
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                    title="Actions"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>

                                  {openAdminDropdown === user.id && (
                                    <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-10">
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setAdminUserToDelete(user);
                                            setShowDeleteAdminModal(true);
                                            setOpenAdminDropdown(null);
                                          }}
                                          className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-red-400 transition-colors"
                                        >
                                          <Trash2 className="h-4 w-4 mr-3" />
                                          Delete User
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {adminUsers.filter((user) => {
                        if (!adminUserSearchTerm) return true;
                        const search = adminUserSearchTerm.toLowerCase();
                        return (
                          user.id.toLowerCase().includes(search) ||
                          user.email.toLowerCase().includes(search) ||
                          user.username.toLowerCase().includes(search) ||
                          (user.first_name &&
                            user.first_name.toLowerCase().includes(search)) ||
                          (user.last_name &&
                            user.last_name.toLowerCase().includes(search))
                        );
                      }).length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-slate-400"
                          >
                            {adminUserSearchTerm
                              ? "No admin users found matching your search"
                              : "No admin users found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Delete Admin User Modal */}
              {showDeleteAdminModal && adminUserToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl w-full max-w-md">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-white">
                            Delete Admin User
                          </h3>
                          <p className="text-sm text-slate-400">
                            This action cannot be undone.
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <p className="text-slate-300">
                          Are you sure you want to delete this admin user?
                        </p>
                        <div className="mt-3 p-3 bg-slate-800/60 rounded-xl">
                          <div className="text-sm text-slate-300">
                            <div>
                              <span className="font-medium">Username:</span>{" "}
                              {adminUserToDelete.username}
                            </div>
                            <div>
                              <span className="font-medium">Email:</span>{" "}
                              {adminUserToDelete.email}
                            </div>
                            <div>
                              <span className="font-medium">User ID:</span>{" "}
                              {adminUserToDelete.id}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setShowDeleteAdminModal(false);
                            setAdminUserToDelete(null);
                          }}
                          disabled={deletingAdminUser}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAdminUser}
                          disabled={deletingAdminUser}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {deletingAdminUser && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          )}
                          <span>
                            {deletingAdminUser ? "Deleting..." : "Delete Admin"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-4 border-b border-slate-700/80">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  Geo-blocking configuration
                </h3>
              </div>
              <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                  <h5 className="text-slate-200 font-medium mb-4 text-sm">
                    General settings
                  </h5>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={geoSettings.enableGeoBlocking}
                        onChange={(e) =>
                          updateGeoSetting(
                            "enableGeoBlocking",
                            e.target.checked,
                          )
                        }
                        className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20"
                      />
                      <span className="text-white">Enable Geo-Blocking</span>
                    </label>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Default Action
                      </label>
                      <select
                        value={geoSettings.defaultAction}
                        onChange={(e) =>
                          updateGeoSetting("defaultAction", e.target.value)
                        }
                        className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2"
                      >
                        <option value="allow">Allow by Default</option>
                        <option value="block">Block by Default</option>
                      </select>
                    </div>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={geoSettings.logAttempts}
                        onChange={(e) =>
                          updateGeoSetting("logAttempts", e.target.checked)
                        }
                        className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20"
                      />
                      <span className="text-white">Log Access Attempts</span>
                    </label>
                  </div>
                </div>

                {/* Security Features */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
                  <h5 className="text-white font-medium mb-4">
                    Security Features
                  </h5>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={geoSettings.vpnDetection}
                        onChange={(e) =>
                          updateGeoSetting("vpnDetection", e.target.checked)
                        }
                        className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20"
                      />
                      <span className="text-white">Block VPN Traffic</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={geoSettings.proxyDetection}
                        onChange={(e) =>
                          updateGeoSetting("proxyDetection", e.target.checked)
                        }
                        className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20"
                      />
                      <span className="text-white">Block Proxy Traffic</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={geoSettings.torBlocking}
                        onChange={(e) =>
                          updateGeoSetting("torBlocking", e.target.checked)
                        }
                        className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20"
                      />
                      <span className="text-white">Block Tor Traffic</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Settings */}
              <div className="flex justify-end">
                <button
                  onClick={saveGeoBlockingSettings}
                  disabled={loadingGeoSettings}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2"
                >
                  {loadingGeoSettings && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {loadingGeoSettings
                      ? "Saving..."
                      : "Save geo-blocking settings"}
                  </span>
                </button>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              Add Currency Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={newCurrencyConfig.currency_code}
                  onChange={(e) =>
                    setNewCurrencyConfig({
                      ...newCurrencyConfig,
                      currency_code: e.target.value,
                    })
                  }
                  disabled={isSubmittingCurrency}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Currency Name
                </label>
                <input
                  type="text"
                  value={newCurrencyConfig.currency_name}
                  onChange={(e) =>
                    setNewCurrencyConfig({
                      ...newCurrencyConfig,
                      currency_name: e.target.value,
                    })
                  }
                  disabled={isSubmittingCurrency}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Currency Type
                </label>
                <select
                  value={newCurrencyConfig.currency_type}
                  onChange={(e) =>
                    setNewCurrencyConfig({
                      ...newCurrencyConfig,
                      currency_type: e.target.value as "fiat" | "crypto",
                    })
                  }
                  disabled={isSubmittingCurrency}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                >
                  <option value="fiat">Fiat</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Decimal Places
                </label>
                <input
                  type="number"
                  value={newCurrencyConfig.decimal_places}
                  onChange={(e) =>
                    setNewCurrencyConfig({
                      ...newCurrencyConfig,
                      decimal_places: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={isSubmittingCurrency}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Smallest Unit Name
                </label>
                <input
                  type="text"
                  value={newCurrencyConfig.smallest_unit_name}
                  onChange={(e) =>
                    setNewCurrencyConfig({
                      ...newCurrencyConfig,
                      smallest_unit_name: e.target.value,
                    })
                  }
                  disabled={isSubmittingCurrency}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={newCurrencyConfig.is_active}
                    onChange={(e) =>
                      setNewCurrencyConfig({
                        ...newCurrencyConfig,
                        is_active: e.target.checked,
                      })
                    }
                    disabled={isSubmittingCurrency}
                    className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                  />
                  <span className="text-white">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCurrencyModal(false)}
                disabled={isSubmittingCurrency}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50 border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => addNewConfig("currency")}
                disabled={isSubmittingCurrency}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmittingCurrency ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              Add Chain Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Chain ID
                </label>
                <input
                  type="text"
                  value={newChainConfig.chain_id}
                  onChange={(e) =>
                    setNewChainConfig({
                      ...newChainConfig,
                      chain_id: e.target.value,
                    })
                  }
                  disabled={isSubmittingChain}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newChainConfig.name}
                  onChange={(e) =>
                    setNewChainConfig({
                      ...newChainConfig,
                      name: e.target.value,
                    })
                  }
                  disabled={isSubmittingChain}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Processor
                </label>
                <select
                  value={newChainConfig.processor}
                  onChange={(e) =>
                    setNewChainConfig({
                      ...newChainConfig,
                      processor: e.target.value as "internal" | "pdm",
                    })
                  }
                  disabled={isSubmittingChain}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                >
                  <option value="internal">Internal</option>
                  <option value="pdm">PDM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Status
                </label>
                <select
                  value={newChainConfig.status}
                  onChange={(e) =>
                    setNewChainConfig({
                      ...newChainConfig,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  disabled={isSubmittingChain}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={newChainConfig.is_testnet}
                    onChange={(e) =>
                      setNewChainConfig({
                        ...newChainConfig,
                        is_testnet: e.target.checked,
                      })
                    }
                    disabled={isSubmittingChain}
                    className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/20 disabled:opacity-50"
                  />
                  <span className="text-white">Testnet</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowChainModal(false)}
                disabled={isSubmittingChain}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50 border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => addNewConfig("chain")}
                disabled={isSubmittingChain}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmittingChain ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSystemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              Add System Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Config Key
                </label>
                <input
                  type="text"
                  value={newSystemConfig.config_key}
                  onChange={(e) =>
                    setNewSystemConfig({
                      ...newSystemConfig,
                      config_key: e.target.value,
                    })
                  }
                  disabled={isSubmittingSystem}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Config Value
                </label>
                <div className="space-y-2">
                  {Object.entries(newSystemConfig.config_value || {}).map(
                    ([key, value], index) => (
                      <div key={index} className="flex space-x-2 items-center">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => {
                            const newValue = {
                              ...newSystemConfig.config_value,
                            };
                            delete newValue[key];
                            newValue[e.target.value] = value;
                            setNewSystemConfig({
                              ...newSystemConfig,
                              config_value: newValue,
                            });
                          }}
                          placeholder="Key"
                          disabled={isSubmittingSystem}
                          className="w-1/2 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                        />
                        <input
                          type="text"
                          value={JSON.stringify(value)}
                          onChange={(e) => {
                            try {
                              const parsedValue = JSON.parse(e.target.value);
                              setNewSystemConfig({
                                ...newSystemConfig,
                                config_value: {
                                  ...newSystemConfig.config_value,
                                  [key]: parsedValue,
                                },
                              });
                            } catch (err) {
                              console.warn(
                                `Invalid JSON input for key ${key}: ${e.target.value}`,
                              );
                            }
                          }}
                          placeholder="Value (JSON)"
                          disabled={isSubmittingSystem}
                          className="w-1/2 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                        />
                        <button
                          onClick={() => {
                            const newValue = {
                              ...newSystemConfig.config_value,
                            };
                            delete newValue[key];
                            setNewSystemConfig({
                              ...newSystemConfig,
                              config_value: newValue,
                            });
                          }}
                          disabled={isSubmittingSystem}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  )}
                  <button
                    onClick={() =>
                      setNewSystemConfig({
                        ...newSystemConfig,
                        config_value: {
                          ...newSystemConfig.config_value,
                          "": "",
                        },
                      })
                    }
                    disabled={isSubmittingSystem}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Field</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Description
                </label>
                <textarea
                  value={newSystemConfig.description}
                  onChange={(e) =>
                    setNewSystemConfig({
                      ...newSystemConfig,
                      description: e.target.value,
                    })
                  }
                  disabled={isSubmittingSystem}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 h-20 resize-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Brand (Optional)
                </label>
                <select
                  value={selectedBrandId || ""}
                  onChange={(e) => setSelectedBrandId(e.target.value || null)}
                  disabled={isSubmittingSystem}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Select a brand for brand-specific configuration
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSystemModal(false)}
                disabled={isSubmittingSystem}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50 border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => addNewConfig("system")}
                disabled={isSubmittingSystem}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmittingSystem ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDeleteModal && configToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete the {configToDelete.type}{" "}
              configuration "{configToDelete.name || configToDelete.id}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmDeleteModal(false);
                  setConfigToDelete(null);
                }}
                disabled={isDeletingConfig}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50 border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfig}
                disabled={isDeletingConfig}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isDeletingConfig ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFundTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              Move Funds to Hot Wallet
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Chain ID
                </label>
                <select
                  value={fundTransfer.chain_id}
                  onChange={(e) =>
                    setFundTransfer({
                      ...fundTransfer,
                      chain_id: e.target.value,
                      network: "",
                      crypto_currency: "",
                      hot_wallet: "",
                      cold_wallet: "",
                    })
                  }
                  disabled={isSubmittingFundTransfer}
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                >
                  <option value="">Select Chain</option>
                  {supportedChains.map((chain) => (
                    <option key={chain.chain_id} value={chain.chain_id}>
                      {chain.name}{" "}
                      {chain.is_testnet ? "(Testnet)" : "(Mainnet)"}
                    </option>
                  ))}
                </select>
              </div>

              {fundTransfer.chain_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Network
                  </label>
                  <select
                    value={fundTransfer.network}
                    onChange={(e) =>
                      setFundTransfer({
                        ...fundTransfer,
                        network: e.target.value,
                        crypto_currency: "",
                        hot_wallet: "",
                        cold_wallet: "",
                      })
                    }
                    disabled={isSubmittingFundTransfer}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                  >
                    <option value="">Select Network</option>
                    {supportedChains
                      .find((c) => c.chain_id === fundTransfer.chain_id)
                      ?.networks.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {fundTransfer.network && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Crypto Currency
                  </label>
                  <select
                    value={fundTransfer.crypto_currency}
                    onChange={(e) =>
                      setFundTransfer({
                        ...fundTransfer,
                        crypto_currency: e.target.value,
                        hot_wallet: "",
                        cold_wallet: "",
                      })
                    }
                    disabled={isSubmittingFundTransfer}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                  >
                    <option value="">Select Currency</option>
                    {supportedChains
                      .find((c) => c.chain_id === fundTransfer.chain_id)
                      ?.crypto_currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {fundTransfer.crypto_currency && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Hot Wallet
                    </label>
                    <select
                      value={fundTransfer.hot_wallet}
                      onChange={(e) =>
                        setFundTransfer({
                          ...fundTransfer,
                          hot_wallet: e.target.value,
                        })
                      }
                      disabled={isSubmittingFundTransfer}
                      className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                    >
                      <option value="">Select Hot Wallet</option>
                      {hotWalletData
                        .filter(
                          (wallet) =>
                            wallet.chain_id === fundTransfer.chain_id &&
                            wallet.currency === fundTransfer.crypto_currency,
                        )
                        .map((wallet) => (
                          <option key={wallet.address} value={wallet.address}>
                            {formatAddress(wallet.address)} (Balance:{" "}
                            {wallet.balance})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Cold Wallet
                    </label>
                    <select
                      value={fundTransfer.cold_wallet}
                      onChange={(e) =>
                        setFundTransfer({
                          ...fundTransfer,
                          cold_wallet: e.target.value,
                        })
                      }
                      disabled={isSubmittingFundTransfer}
                      className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                    >
                      <option value="">Select Cold Wallet</option>
                      {coldWalletData
                        .filter(
                          (wallet) =>
                            wallet.chain_id === fundTransfer.chain_id &&
                            wallet.currency === fundTransfer.crypto_currency,
                        )
                        .map((wallet) => (
                          <option key={wallet.address} value={wallet.address}>
                            {formatAddress(wallet.address)} (Balance:{" "}
                            {wallet.balance})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={fundTransfer.amount}
                      onChange={(e) =>
                        setFundTransfer({
                          ...fundTransfer,
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={isSubmittingFundTransfer}
                      className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 disabled:opacity-50"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowFundTransferModal(false)}
                disabled={isSubmittingFundTransfer}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl disabled:opacity-50 border border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={initiateFundTransfer}
                disabled={isSubmittingFundTransfer}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmittingFundTransfer ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit IP Rule Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-6">
              {editingRule ? "Edit Access Rule" : "Create New Access Rule"}
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Rule Type
                </label>
                <select
                  value={ruleFormData.type}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      type: e.target.value as "allow" | "block",
                    }))
                  }
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2"
                  required
                >
                  <option value="block">Block</option>
                  <option value="allow">Allow</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Target Type
                </label>
                <select
                  value={ruleFormData.target}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      target: e.target.value as "ip" | "range" | "country",
                      value: "",
                    }))
                  }
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2"
                  required
                >
                  <option value="ip">Single IP Address</option>
                  <option value="range">IP Range/Subnet</option>
                  <option value="country">Country</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {ruleFormData.target === "country"
                    ? "Country"
                    : ruleFormData.target === "range"
                      ? "IP Range (CIDR)"
                      : "IP Address"}
                </label>
                {ruleFormData.target === "country" ? (
                  <select
                    value={ruleFormData.value}
                    onChange={(e) =>
                      setRuleFormData((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2"
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={ruleFormData.value}
                    onChange={(e) =>
                      setRuleFormData((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2"
                    placeholder={
                      ruleFormData.target === "range"
                        ? "e.g., 192.168.1.0-192.168.1.255"
                        : "e.g., 192.168.1.100"
                    }
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Description
                </label>
                <textarea
                  value={ruleFormData.description}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 px-3 py-2 h-20 resize-none"
                  placeholder="Reason for this rule..."
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetRuleForm}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingIpRules}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl flex items-center space-x-2"
                >
                  {loadingIpRules && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {loadingIpRules
                      ? "Saving..."
                      : editingRule
                        ? "Update Rule"
                        : "Create Rule"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Modal */}
      {showDeleteRuleModal && ruleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Delete IP Filter
                </h3>
                <p className="text-slate-400 text-sm">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-300 mb-3">
                Are you sure you want to delete this IP filter?
              </p>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Type:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ruleToDelete.type === "block"
                        ? "bg-red-900 text-red-300"
                        : "bg-green-900 text-green-300"
                    }`}
                  >
                    {ruleToDelete.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Target:</span>
                  <span className="text-white text-sm font-mono">
                    {ruleToDelete.value}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Description:</span>
                  <span className="text-white text-sm">
                    {ruleToDelete.description || "No description"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteRuleModal(false);
                  setRuleToDelete(null);
                }}
                disabled={loadingIpRules}
                className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRule}
                disabled={loadingIpRules}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                {loadingIpRules && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loadingIpRules ? "Deleting..." : "Delete Rule"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
