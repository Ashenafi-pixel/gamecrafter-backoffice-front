import axios from "axios";
import { config } from "../config/load-config";

const wmsApi = axios.create({
  baseURL: config.walletApiUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

wmsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

wmsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export interface WMSTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  description?: string;
  external_transaction_id?: string;
  payment_method?: string;
}

export interface WMSWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  wallet_address?: string;
  chain_id?: string;
  network?: string;
}

export interface WMSUser {
  id: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
  balance?: {
    currency: string;
    amount: number;
  }[];
}

export interface WMSManualFund {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  created_at: string;
  description?: string;
}

export interface TransactionsResponse {
  data: any[];
  total: number;
  total_deposits: number;
  total_deposits_usd: number;
  total_withdrawals: number;
  total_withdrawals_usd: number;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
}

export interface WalletBalanceInfo {
  currency_code: string;
  balance_amount: number;
  balance_usd_cents?: number;
  last_deposit_amount?: number;
  last_deposit_at?: string;
}

export interface WalletWithUserDetails {
  id: string;
  user_id: string;
  chain_id: string;
  address: string;
  vault_key_path: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
  user: UserInfo;
  balances: WalletBalanceInfo[];
}

export interface CurrencyStat {
  currency_code: string;
  chain_id?: string;
  total_balance: number;
  total_balance_usd_cents: number;
}

export interface WalletStats {
  currency_stats: CurrencyStat[];
  total_usd_cents: number;
  total_wallet_count: number;
}

export interface GetAllWalletsResponse {
  wallets: WalletWithUserDetails[];
  total_count: number;
  stats?: WalletStats;
}

export class WMSService {
  async getTransactions(
    params: {
      limit?: number;
      offset?: number;
      user_id?: string;
      transaction_type?: string | string[];
      status?: string | string[];
      date_from?: string;
      date_to?: string;
      network?: string[];
      crypto?: string[];
      search?: string;
      currency_code?: string | string[];
      protocol?: string | string[];
      amount_min?: number;
      amount_max?: number;
      brand_id?: string;
    } = {},
  ): Promise<TransactionsResponse> {
    try {
      // Convert arrays to comma-separated strings if needed
      const queryParams: any = {
        limit: params.limit,
        offset: params.offset,
      };

      if (params.user_id) queryParams.user_id = params.user_id;
      if (params.search) queryParams.search = params.search;
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;
      if (params.amount_min !== undefined)
        queryParams.amount_min = params.amount_min;
      if (params.amount_max !== undefined)
        queryParams.amount_max = params.amount_max;

      // Handle array parameters - API might expect comma-separated or array
      if (params.transaction_type) {
        queryParams.transaction_type = Array.isArray(params.transaction_type)
          ? params.transaction_type.join(",")
          : params.transaction_type;
      }
      if (params.status) {
        queryParams.status = Array.isArray(params.status)
          ? params.status.join(",")
          : params.status;
      }
      if (params.network && params.network.length > 0) {
        queryParams.network = params.network.join(",");
      }
      if (params.crypto && params.crypto.length > 0) {
        queryParams.crypto = params.crypto.join(",");
      }
      if (params.currency_code) {
        queryParams.currency_code = Array.isArray(params.currency_code)
          ? params.currency_code.join(",")
          : params.currency_code;
      }
      if (params.protocol) {
        queryParams.protocol = Array.isArray(params.protocol)
          ? params.protocol.join(",")
          : params.protocol;
      }
      if (params.brand_id) queryParams.brand_id = params.brand_id;

      const response = await wmsApi.get("/transactions", {
        params: queryParams,
      });

      const responseData = response.data?.data || {};
      const transactions = responseData.transactions || [];
      const total = responseData.total || 0;
      const total_deposits = responseData.total_deposits || 0;
      const total_deposits_usd =
        (responseData.total_deposits_usd_cents || 0) / 100;
      const total_withdrawals = responseData.total_withdrawals || 0;
      const total_withdrawals_usd =
        (responseData.total_withdrawals_usd_cents || 0) / 100;

      return {
        data: transactions,
        total,
        total_deposits,
        total_deposits_usd,
        total_withdrawals,
        total_withdrawals_usd,
      };
    } catch (error) {
      console.error("Failed to fetch transactions from WMS:", error);
      throw error;
    }
  }

  // Withdrawals
  async getWithdrawals(
    params: {
      limit?: number;
      offset?: number;
      user_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      network?: string;
      crypto?: string;
      brand_id?: string;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    total_withdrawals: number;
    total_withdrawals_usd: number;
    total_completed?: number;
    total_awaiting_admin_review?: number;
    total_awaiting_admin_review_usd?: number;
    total_failed?: number;
    total_failed_usd?: number;
  }> {
    try {
      const queryParams: any = { ...params };
      if (params.brand_id) queryParams.brand_id = params.brand_id;
      const response = await wmsApi.get("/withdrawals", {
        params: queryParams,
      });

      const responseData = response.data?.data || {};
      const withdrawals = responseData.withdrawals || [];
      const total = responseData.total || 0;
      const total_withdrawals = responseData.total_withdrawals || 0;
      const total_withdrawals_usd = responseData.total_withdrawals_usd || 0;
      const total_completed = responseData.total_completed || 0;
      const total_awaiting_admin_review =
        responseData.total_awaiting_admin_review || 0;
      const total_awaiting_admin_review_usd =
        responseData.total_awaiting_admin_review_usd || 0;
      const total_failed = responseData.total_failed || 0;
      const total_failed_usd = responseData.total_failed_usd || 0;

      console.log("WMS getWithdrawals response:", {
        hasWithdrawals: Array.isArray(withdrawals),
        withdrawalCount: withdrawals.length,
        total,
        total_withdrawals,
        total_withdrawals_usd,
        total_awaiting_admin_review,
        total_awaiting_admin_review_usd,
        total_failed,
        total_failed_usd,
      });

      return {
        data: withdrawals,
        total,
        total_withdrawals,
        total_withdrawals_usd,
        total_completed,
        total_awaiting_admin_review,
        total_awaiting_admin_review_usd,
        total_failed,
        total_failed_usd,
      };
    } catch (error) {
      console.error("Failed to fetch withdrawals from WMS:", error);
      throw error;
    }
  }

  async getDeposits(
    params: {
      limit?: number;
      offset?: number;
      user_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
      protocol?: string;
      crypto?: string;
      search?: string;
      amount_min?: number;
      amount_max?: number;
      brand_id?: string;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    total_deposits_usd_value_cents: number;
  }> {
    try {
      const queryParams: any = {};
      if (params.limit !== undefined)
        queryParams.limit = params.limit.toString();
      if (params.offset !== undefined)
        queryParams.offset = params.offset.toString();
      if (params.user_id) queryParams.user_id = params.user_id;
      if (params.status) queryParams.status = params.status;
      if (params.date_from) queryParams.date_from = params.date_from;
      if (params.date_to) queryParams.date_to = params.date_to;
      if (params.protocol) queryParams.protocol = params.protocol;
      if (params.crypto) queryParams.crypto = params.crypto;
      if (params.search) queryParams.search = params.search;
      if (params.amount_min !== undefined)
        queryParams.amount_min = params.amount_min.toString();
      if (params.amount_max !== undefined)
        queryParams.amount_max = params.amount_max.toString();
      if (params.brand_id) queryParams.brand_id = params.brand_id;

      const response = await wmsApi.get("/deposits", { params: queryParams });

      const responseData = response.data?.data || {};
      const deposits = responseData.deposits || [];
      const total = responseData.total_count || responseData.total || 0;
      const total_deposits_usd_value_cents =
        responseData.total_deposits_usd_value_cents || 0;

      return {
        data: deposits,
        total,
        total_deposits_usd_value_cents,
      };
    } catch (error) {
      console.error("Failed to fetch deposits from WMS:", error);
      throw error;
    }
  }

  async approveWithdrawal(withdrawalId: string): Promise<any> {
    try {
      const response = await wmsApi.post(
        `/withdrawals/${withdrawalId}/approve`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to approve withdrawal:", error);
      throw error;
    }
  }

  async cancelWithdrawal(withdrawalId: string): Promise<any> {
    try {
      const response = await wmsApi.post(`/withdrawals/${withdrawalId}/cancel`);
      return response.data;
    } catch (error) {
      console.error("Failed to cancel withdrawal:", error);
      throw error;
    }
  }

  // Users
  async getUsers(
    params: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
    } = {},
  ): Promise<{ data: WMSUser[]; total: number }> {
    try {
      const response = await wmsApi.get("/users", { params });
      const responseData = response.data?.data || {};
      return {
        data: responseData.users || [],
        total: responseData.total || 0,
      };
    } catch (error) {
      console.error("Failed to fetch users from WMS:", error);
      throw error;
    }
  }

  async getUserBalance(userId: string): Promise<any> {
    try {
      const response = await wmsApi.get(`/users/${userId}/balance`);
      return (
        response.data?.data?.balance || response.data?.balance || response.data
      );
    } catch (error) {
      console.error("Failed to fetch user balance:", error);
      throw error;
    }
  }

  async getUserTransactions(
    userId: string,
    params: {
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    total_deposits: number;
    total_deposits_usd: number;
    total_withdrawals: number;
    total_withdrawals_usd: number;
    net_flow_usd: number;
    total_transactions: number;
  }> {
    try {
      const response = await wmsApi.get(`/users/${userId}/transactions`, {
        params,
      });
      const responseData = response.data?.data || {};
      const transactions = responseData.transactions || [];
      const total_transactions = responseData.total_transactions || 0;
      const total_deposits = responseData.total_deposits || 0;
      // API returns cents, convert to dollars
      const total_deposits_usd_cents =
        responseData.total_deposits_usd_cents || 0;
      const total_deposits_usd = total_deposits_usd_cents / 100;
      const total_withdrawals = responseData.total_withdrawals || 0;
      // API returns cents, convert to dollars
      const total_withdrawals_usd_cents =
        responseData.total_withdrawals_usd_cents || 0;
      const total_withdrawals_usd = total_withdrawals_usd_cents / 100;
      // API returns cents, convert to dollars
      const net_flow_usd_cents = responseData.net_flow_usd_cents || 0;
      const net_flow_usd = net_flow_usd_cents / 100;
      // Use total_transactions if available, otherwise fall back to transactions array length
      const total = total_transactions || transactions.length;

      return {
        data: transactions,
        total,
        total_deposits,
        total_deposits_usd,
        total_withdrawals,
        total_withdrawals_usd,
        net_flow_usd,
        total_transactions,
      };
    } catch (error) {
      console.error("Failed to fetch user transactions:", error);
      throw error;
    }
  }

  // Manual Funds
  async getManualFunds(
    params: {
      limit?: number;
      offset?: number;
      user_id?: string;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    total_usd_value: number;
  }> {
    try {
      const response = await wmsApi.get("/manual-funds", { params });
      const responseData = response.data?.data || {};
      return {
        data: responseData.manual_funds || [],
        total: responseData.total || 0,
        total_usd_value: responseData.total_usd_value || 0,
      };
    } catch (error) {
      console.error("Failed to fetch manual funds from WMS:", error);
      throw error;
    }
  }

  async addManualFund(userId: string, formData: FormData): Promise<any> {
    try {
      const response = await wmsApi.post(
        `/users/add-fund?user_id=${userId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to add manual fund:", error);
      throw error;
    }
  }

  // Reports
  async getTransactionReport(
    params: {
      date_from?: string;
      date_to?: string;
      user_id?: string;
      transaction_type?: string;
      status?: string;
    } = {},
  ): Promise<any> {
    try {
      const response = await wmsApi.get("/transaction-report", { params });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch transaction report from WMS:", error);
      throw error;
    }
  }

  // Get Chain Configs
  async getChainConfigs(limit: number = 10, offset: number = 0): Promise<any> {
    try {
      const response = await wmsApi.get("/chain-configs", {
        params: { limit, offset },
      });
      return (
        response.data?.data?.chain_configs ||
        response.data?.chain_configs ||
        response.data ||
        []
      );
    } catch (error) {
      console.error("Failed to fetch chain configs from WMS:", error);
      throw error;
    }
  }

  // Supported Chains (deprecated, use getChainConfigs instead)
  async getSupportedChains(): Promise<any> {
    try {
      const response = await wmsApi.get("/chains/supported");
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error("Failed to fetch supported chains from WMS:", error);
      throw error;
    }
  }

  // Create Chain
  async createChain(data: any): Promise<any> {
    try {
      const response = await wmsApi.post("/chain-configs/create", data);
      return response.data;
    } catch (error) {
      console.error("Failed to create chain:", error);
      throw error;
    }
  }

  // Update Chain
  async updateChain(chainId: string, data: any): Promise<any> {
    try {
      const response = await wmsApi.post(`/chain-configs`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update chain:", error);
      throw error;
    }
  }

  // Delete Chain
  async deleteChain(chainId: string): Promise<any> {
    try {
      const response = await wmsApi.delete(`/chain-configs/${chainId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete chain:", error);
      throw error;
    }
  }

  // Supported Currencies
  async getSupportedCurrencies(): Promise<any> {
    try {
      const response = await wmsApi.get("/currencies/supported");
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error("Failed to fetch supported currencies from WMS:", error);
      throw error;
    }
  }

  // Create Currency
  async createCurrency(data: any): Promise<any> {
    try {
      const response = await wmsApi.post("/currencies", data);
      return response.data;
    } catch (error) {
      console.error("Failed to create currency:", error);
      throw error;
    }
  }

  // Update Currency
  async updateCurrency(currencyId: string, data: any): Promise<any> {
    try {
      const response = await wmsApi.put(`/currencies/${currencyId}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update currency:", error);
      throw error;
    }
  }

  // Delete Currency
  async deleteCurrency(currencyId: string): Promise<any> {
    try {
      const response = await wmsApi.delete(`/currencies/${currencyId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete currency:", error);
      throw error;
    }
  }

  // Get Currency Configs
  async getCurrencyConfigs(
    limit: number = 10,
    offset: number = 0,
  ): Promise<any> {
    try {
      const response = await wmsApi.get("/currency-configs", {
        params: { limit, offset },
      });
      return (
        response.data?.data?.currency_configs ||
        response.data?.currency_configs ||
        response.data ||
        []
      );
    } catch (error) {
      console.error("Failed to fetch currency configs from WMS:", error);
      throw error;
    }
  }

  // Create Currency Config
  async createCurrencyConfig(data: any): Promise<any> {
    try {
      const response = await wmsApi.post("/currency-configs/create", data);
      return response.data;
    } catch (error) {
      console.error("Failed to create currency config:", error);
      throw error;
    }
  }

  // Update Currency Config
  async updateCurrencyConfig(currencyId: string, data: any): Promise<any> {
    try {
      const response = await wmsApi.post(`/currency-configs`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update currency config:", error);
      throw error;
    }
  }

  // Delete Currency Config
  async deleteCurrencyConfig(currencyId: string): Promise<any> {
    try {
      const response = await wmsApi.delete(`/currency-configs/${currencyId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete currency config:", error);
      throw error;
    }
  }

  // Transfer Funds between wallets
  async transferFunds(data: {
    crypto_currency: string;
    chain_id: string;
    network: string;
    hot_wallet: string;
    cold_wallet: string;
    amount: number;
  }): Promise<any> {
    try {
      const response = await wmsApi.post("/wallets/move-funds-to-hot", data);
      return response.data;
    } catch (error) {
      console.error("Failed to transfer funds:", error);
      throw error;
    }
  }

  // Get Hot Wallet Data
  async getHotWalletData(): Promise<any> {
    try {
      const response = await wmsApi.get("/wallets/hot-wallet-data");
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error("Failed to fetch hot wallet data:", error);
      throw error;
    }
  }

  // Get Cold Wallet Data
  async getColdWalletData(): Promise<any> {
    try {
      const response = await wmsApi.get("/wallets/cold-storage-data");
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error("Failed to fetch cold wallet data:", error);
      throw error;
    }
  }

  // Sync Internal Wallets
  async syncInternalWallets(): Promise<any> {
    try {
      const response = await wmsApi.post("/wallets/sync-internal-wallets");
      return response.data;
    } catch (error) {
      console.error("Failed to sync internal wallets:", error);
      throw error;
    }
  }

  async toggleWithdrawalGlobalStatus(
    reason: string = "immediate action needed",
    brand_id?: string,
  ): Promise<any> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.post(
        "/withdrawals/toggle-global-status",
        { reason },
        { params },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to toggle withdrawal global status:", error);
      throw error;
    }
  }

  async getWithdrawalGlobalStatus(brand_id?: string): Promise<any> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/withdrawals/global-status", {
        params,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to fetch withdrawal global status:", error);
      throw error;
    }
  }

  // Get Withdrawal Stats
  async getWithdrawalStats(brand_id?: string): Promise<any> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/withdrawals/stats", { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to fetch withdrawal stats:", error);
      throw error;
    }
  }

  async getWithdrawalThresholds(brand_id?: string): Promise<any> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/withdrawals/tresholds", { params });
      const data = response.data?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      return data || {};
    } catch (error) {
      console.error("Failed to fetch withdrawal thresholds:", error);
      throw error;
    }
  }

  async updateWithdrawalThresholds(
    thresholds: Partial<any>,
    brand_id?: string,
  ): Promise<any> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put("/withdrawals/tresholds", thresholds, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update withdrawal thresholds:", error);
      throw error;
    }
  }

  // Fund Movements
  async getFundMovements(
    params: {
      limit?: number;
      offset?: number;
      chain_id?: string;
      currency_code?: string;
      status?: string;
      movement_type?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ): Promise<{
    data: any[];
    stats: {
      total_count: number;
      total_completed_amount: number;
      total_completed_count: number;
      total_pending_count: number;
      total_failed_count: number;
      total_to_cold_count: number;
      total_to_hot_count: number;
    };
  }> {
    try {
      const response = await wmsApi.get("/wallets/fund-movements", { params });
      const responseData = response.data?.data || {};
      const stats = responseData.stats || {};
      return {
        data: responseData.fund_movements || [],
        stats: {
          total_count: stats.total_count || 0,
          total_completed_amount: stats.total_completed_amount_usd_cents || 0,
          total_completed_count: stats.total_completed_count || 0,
          total_pending_count: stats.total_pending_count || 0,
          total_failed_count: stats.total_failed_count || 0,
          total_to_cold_count: stats.total_to_cold_count || 0,
          total_to_hot_count: stats.total_to_hot_count || 0,
        },
      };
    } catch (error) {
      console.error("Failed to fetch fund movements:", error);
      throw error;
    }
  }

  // KYC Threshold
  async getKYCThreshold(): Promise<{
    usd_amount_cents: number;
  }> {
    try {
      const response = await wmsApi.get("/kyc-threshold");
      const responseData = response.data?.data || response.data;
      return {
        usd_amount_cents: responseData.usd_amount_cents || 0,
      };
    } catch (error) {
      console.error("Failed to fetch KYC threshold:", error);
      throw error;
    }
  }

  async updateKYCThreshold(usdAmountCents: number): Promise<any> {
    try {
      const response = await wmsApi.put("/kyc-threshold", {
        usd_amount_cents: usdAmountCents,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update KYC threshold:", error);
      throw error;
    }
  }

  // Withdrawal Threshold
  async getWithdrawalThreshold(): Promise<{
    usd_amount_cents: number;
    auto_approve: boolean;
  }> {
    try {
      const response = await wmsApi.get("/withdrawal-threshold");
      const responseData = response.data?.data || response.data;
      return {
        usd_amount_cents: responseData.usd_amount_cents || 0,
        auto_approve: responseData.auto_approve || false,
      };
    } catch (error) {
      console.error("Failed to fetch withdrawal threshold:", error);
      throw error;
    }
  }

  async updateWithdrawalThreshold(
    usdAmountCents: number,
    autoApprove: boolean,
  ): Promise<any> {
    try {
      const response = await wmsApi.put("/withdrawal-threshold", {
        usd_amount_cents: usdAmountCents,
        auto_approve: autoApprove,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update withdrawal threshold:", error);
      throw error;
    }
  }

  async getWithdrawalLimits(chainId?: string, brand_id?: string): Promise<any> {
    try {
      const params: any = {};
      if (chainId) params.chain_id = chainId;
      if (brand_id) params.brand_id = brand_id;
      const response = await wmsApi.get("/withdrawals/limits", { params });
      const data = response.data?.data || response.data;
      return data || {};
    } catch (error) {
      console.error("Failed to fetch withdrawal limits:", error);
      throw error;
    }
  }

  async updateWithdrawalLimits(
    chainId: string,
    maxAmountCents: number,
    minAmountCents: number,
    brand_id?: string,
  ): Promise<any> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/withdrawals/limits",
        {
          chain_id: chainId,
          max_amount_cents: maxAmountCents,
          min_amount_cents: minAmountCents,
        },
        { params },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update withdrawal limits:", error);
      throw error;
    }
  }

  async toggleWithdrawalLimitValidation(
    enabled: boolean,
    brand_id?: string,
  ): Promise<{ enabled: boolean }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/withdrawal-limit-validation/toggle",
        { enabled },
        { params },
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message ||
          "Failed to toggle withdrawal limit validation",
      );
    } catch (error: any) {
      console.error("Failed to toggle withdrawal limit validation:", error);
      throw error;
    }
  }

  async getGlobalWithdrawalLimits(
    brand_id?: string,
  ): Promise<{
    min_amount_cents: number;
    max_amount_cents: number;
    enabled: boolean;
  }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/withdrawals/limits/global", {
        params,
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch global withdrawal limits",
      );
    } catch (error: any) {
      console.error("Failed to fetch global withdrawal limits:", error);
      throw error;
    }
  }

  async updateGlobalWithdrawalLimits(
    minAmountCents: number,
    maxAmountCents: number,
    enabled: boolean,
    brand_id?: string,
  ): Promise<{
    min_amount_cents: number;
    max_amount_cents: number;
    enabled: boolean;
  }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/withdrawals/limits/global",
        {
          min_amount_cents: minAmountCents,
          max_amount_cents: maxAmountCents,
          enabled,
        },
        { params },
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to update global withdrawal limits",
      );
    } catch (error: any) {
      console.error("Failed to update global withdrawal limits:", error);
      throw error;
    }
  }

  async getAllWallets(
    params: {
      limit?: number;
      offset?: number;
      chain_id?: string;
      user_id?: string;
      search?: string;
      is_active?: boolean;
      // Currency-specific filter (all three must be provided together)
      currency?: string;
      currency_amount_min?: number;
      currency_amount_max?: number;
      // Combined fiat filter (both must be provided together)
      total_fiat_amount_min?: number;
      total_fiat_amount_max?: number;
    } = {},
  ): Promise<GetAllWalletsResponse> {
    try {
      const queryParams: any = {};
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.offset !== undefined) queryParams.offset = params.offset;
      if (params.chain_id) queryParams.chain_id = params.chain_id;
      if (params.user_id) queryParams.user_id = params.user_id;
      if (params.search) queryParams.search = params.search;
      if (params.is_active !== undefined)
        queryParams.is_active = params.is_active;

      // Currency-specific filter (currency and min are required, max is optional)
      if (params.currency && params.currency_amount_min !== undefined) {
        queryParams.currency = params.currency;
        queryParams.currency_amount_min = params.currency_amount_min;
        if (params.currency_amount_max !== undefined) {
          queryParams.currency_amount_max = params.currency_amount_max;
        }
      }

      // Combined fiat filter (min and/or max can be provided)
      if (params.total_fiat_amount_min !== undefined) {
        queryParams.total_fiat_amount_min = params.total_fiat_amount_min;
      }
      if (params.total_fiat_amount_max !== undefined) {
        queryParams.total_fiat_amount_max = params.total_fiat_amount_max;
      }

      const response = await wmsApi.get("/wallets", { params: queryParams });
      const responseData = response.data?.data || {};

      return {
        wallets: responseData.wallets || [],
        total_count: responseData.total_count || 0,
        stats: responseData.stats,
      };
    } catch (error) {
      console.error("Failed to fetch all wallets:", error);
      throw error;
    }
  }

  async moveFundsFromWalletToHot(params: {
    wallet_address: string;
    chain_id: string;
    currency_code: string;
    amount: number;
  }): Promise<any> {
    try {
      const response = await wmsApi.post(
        "/wallets/move-funds-from-wallet-to-hot",
        params,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to move funds from wallet to hot:", error);
      throw error;
    }
  }

  async estimateTransferFee(params: {
    wallet_address: string;
    chain_id: string;
    currency_code: string;
    amount: number;
  }): Promise<{
    fee_native: number;
    fee_usd: number;
    fee_currency: string;
    rent_exempt_reserve?: number;
    rent_exempt_reserve_usd?: number;
    total_amount: number;
    total_usd: number;
    max_transferable: number;
  }> {
    try {
      const response = await wmsApi.post(
        "/wallets/estimate-transfer-fee",
        params,
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to estimate transfer fee:", error);
      throw error;
    }
  }

  async validateTransfer(params: {
    wallet_address: string;
    chain_id: string;
    currency_code: string;
    amount: number;
  }): Promise<{
    is_valid: boolean;
    available_balance: number;
    requested_amount: number;
    estimated_fee: number;
    rent_exempt_reserve?: number;
    total_required: number;
    max_transferable: number;
    can_transfer: boolean;
    error_message?: string;
  }> {
    try {
      const response = await wmsApi.post("/wallets/validate-transfer", params);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to validate transfer:", error);
      throw error;
    }
  }

  async triggerSweeper(): Promise<{
    message: string;
    success: boolean;
    status: number;
  }> {
    try {
      const response = await wmsApi.post("/wallets/trigger-sweeper");
      return response.data;
    } catch (error: any) {
      console.error("Failed to trigger sweeper:", error);
      throw error;
    }
  }

  async triggerBackfill(): Promise<{
    message: string;
    success: boolean;
    status: number;
  }> {
    try {
      const response = await wmsApi.post("/backfill/trigger");
      return response.data;
    } catch (error: any) {
      console.error("Failed to trigger backfill:", error);
      throw error;
    }
  }

  async syncWalletBalances(): Promise<{
    message: string;
    success: boolean;
    status: number;
  }> {
    try {
      const response = await wmsApi.post("/wallets/sync-balances");
      return response.data;
    } catch (error: any) {
      console.error("Failed to sync wallet balances:", error);
      throw error;
    }
  }

  async syncWalletBalance(
    walletId: string,
  ): Promise<{ message: string; success: boolean; status: number }> {
    try {
      const response = await wmsApi.post(
        `/wallets/sync-balance?id=${walletId}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Failed to sync wallet balance:", error);
      throw error;
    }
  }

  async moveFundsFromWalletsToHotBatch(params: {
    chain_id: string;
    currency_code: string;
    transfers: Array<{
      wallet_address: string;
      amount: number;
    }>;
  }): Promise<any> {
    try {
      const response = await wmsApi.post(
        "/wallets/move-funds-from-wallets-to-hot-batch",
        params,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to move funds from wallets to hot (batch):", error);
      throw error;
    }
  }

  async getChainCurrencies(chainId: string): Promise<any[]> {
    try {
      const response = await wmsApi.get(`/chains/${chainId}/currencies`);
      const responseData = response.data?.data || response.data || {};
      return responseData.currencies || [];
    } catch (error: any) {
      console.error("Failed to fetch chain currencies:", error);
      return [];
    }
  }

  async getRequireKYCOnFirstWithdrawal(
    brand_id?: string,
  ): Promise<{ enabled: boolean }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/require-kyc-on-first-withdrawal", {
        params,
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message ||
          "Failed to fetch KYC on first withdrawal setting",
      );
    } catch (error: any) {
      console.error("Failed to fetch require KYC on first withdrawal:", error);
      throw error;
    }
  }

  async updateRequireKYCOnFirstWithdrawal(
    enabled: boolean,
    brand_id?: string,
  ): Promise<{ enabled: boolean }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/require-kyc-on-first-withdrawal/toggle",
        { enabled },
        { params },
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message ||
          "Failed to update KYC on first withdrawal setting",
      );
    } catch (error: any) {
      console.error("Failed to update require KYC on first withdrawal:", error);
      throw error;
    }
  }

  async getDepositMarginPercent(
    brand_id?: string,
  ): Promise<{ percent: number }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/margin/deposit", { params });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch deposit margin percent",
      );
    } catch (error: any) {
      console.error("Failed to fetch deposit margin percent:", error);
      throw error;
    }
  }

  async updateDepositMarginPercent(
    percent: number,
    brand_id?: string,
  ): Promise<{ percent: number }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/margin/deposit",
        { percent },
        { params },
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to update deposit margin percent",
      );
    } catch (error: any) {
      console.error("Failed to update deposit margin percent:", error);
      throw error;
    }
  }

  async getWithdrawalMarginPercent(
    brand_id?: string,
  ): Promise<{ percent: number }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/margin/withdrawal", { params });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch withdrawal margin percent",
      );
    } catch (error: any) {
      console.error("Failed to fetch withdrawal margin percent:", error);
      throw error;
    }
  }

  async updateWithdrawalMarginPercent(
    percent: number,
    brand_id?: string,
  ): Promise<{ percent: number }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/margin/withdrawal",
        { percent },
        { params },
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to update withdrawal margin percent",
      );
    } catch (error: any) {
      console.error("Failed to update withdrawal margin percent:", error);
      throw error;
    }
  }

  // Get Transaction Stats Chart
  async getTransactionStatsChart(
    dateFrom: string,
    dateTo: string,
    interval: "daily" | "weekly" | "monthly",
    isTestTransaction?: boolean,
  ): Promise<
    Array<{
      date: string;
      total_deposits_usd_cents: number;
      total_withdrawals_usd_cents: number;
      count_deposits: number;
      count_withdrawals: number;
    }>
  > {
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        interval: interval,
      });

      if (isTestTransaction !== undefined) {
        params.append("is_test_transaction", String(isTestTransaction));
      }

      const response = await wmsApi.get(
        `/transactions/stats/chart?${params.toString()}`,
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch transaction stats chart",
      );
    } catch (error: any) {
      console.error("Failed to fetch transaction stats chart:", error);
      throw error;
    }
  }

  async getTVSProcessorStatus(): Promise<{
    running: boolean;
    healthy: boolean;
    started_at: string;
    stats?: {
      completed: number;
      pending: number;
      failed: number;
    };
  }> {
    try {
      const response = await wmsApi.get("/tvs/status/processor");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch processor status",
      );
    } catch (error: any) {
      console.error("Failed to fetch processor status:", error);
      throw error;
    }
  }

  async getTVSListenersStatus(): Promise<{
    running: boolean;
    listeners: Array<{
      chain_id: string;
      running: boolean;
      healthy: boolean;
      last_health_check: string;
      health_error: string;
      started_at: string;
    }>;
  }> {
    try {
      const response = await wmsApi.get("/tvs/status/listeners");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch listeners status",
      );
    } catch (error: any) {
      console.error("Failed to fetch listeners status:", error);
      throw error;
    }
  }

  async getTVSSweeperStatus(): Promise<{
    running: boolean;
    cycle_number: number;
    last_sweep_time: string;
    next_sweep_time: string;
    cron_expression: string;
  }> {
    try {
      const response = await wmsApi.get("/tvs/status/sweeper");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch sweeper status",
      );
    } catch (error: any) {
      console.error("Failed to fetch sweeper status:", error);
      throw error;
    }
  }

  async restartTVSProcessor(): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const response = await wmsApi.post("/tvs/restart/processor");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to restart processor");
    } catch (error: any) {
      console.error("Failed to restart processor:", error);
      throw error;
    }
  }

  async restartTVSAllListeners(): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const response = await wmsApi.post("/tvs/restart/listeners");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to restart listeners");
    } catch (error: any) {
      console.error("Failed to restart listeners:", error);
      throw error;
    }
  }

  async restartTVSListener(chainId: string): Promise<{
    status: string;
    message: string;
    chain_id?: string;
  }> {
    try {
      const response = await wmsApi.post(`/tvs/restart/listeners/${chainId}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to restart listener");
    } catch (error: any) {
      console.error("Failed to restart listener:", error);
      throw error;
    }
  }

  async triggerTVSSweeper(): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const response = await wmsApi.post("/tvs/sweeper/trigger");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to trigger sweeper");
    } catch (error: any) {
      console.error("Failed to trigger sweeper:", error);
      throw error;
    }
  }

  async getDepositEventRecords(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    chain_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    records: Array<{
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
    }>;
    total_count: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.offset)
        queryParams.append("offset", params.offset.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.chain_id) queryParams.append("chain_id", params.chain_id);
      if (params?.status) queryParams.append("status", params.status);
      if (params?.date_from) queryParams.append("date_from", params.date_from);
      if (params?.date_to) queryParams.append("date_to", params.date_to);

      const response = await wmsApi.get(
        `/deposit-events?${queryParams.toString()}`,
      );
      if (response.data?.success && response.data?.data) {
        const apiData = response.data.data;
        return {
          records: apiData.Records || apiData.records || [],
          total_count: apiData.TotalCount || apiData.total_count || 0,
        };
      }
      throw new Error(
        response.data?.message || "Failed to fetch deposit event records",
      );
    } catch (error: any) {
      console.error("Failed to fetch deposit event records:", error);
      throw error;
    }
  }

  async updateDepositEventRecord(
    id: string,
    updates: {
      chain_id?: string;
      tx_hash?: string;
      block_number?: number;
      from_address?: string;
      to_address?: string;
      currency_code?: string;
      amount?: string;
      amount_units?: number;
      usd_amount_cents?: number;
      exchange_rate?: number;
      status?: string;
      error_message?: string | null;
      retry_count?: number;
      last_retry_at?: string;
    },
  ): Promise<{
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
  }> {
    try {
      const response = await wmsApi.put(`/deposit-events/${id}`, updates);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to update deposit event record",
      );
    } catch (error: any) {
      console.error("Failed to update deposit event record:", error);
      throw error;
    }
  }

  async triggerDepositEventRetry(id: string): Promise<void> {
    try {
      const response = await wmsApi.post(`/deposit-events/${id}/trigger-retry`);
      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to trigger deposit event retry",
        );
      }
    } catch (error: any) {
      console.error("Failed to trigger deposit event retry:", error);
      throw error;
    }
  }

  async getWebhooks(params?: {
    chain_id?: string;
    is_active?: boolean;
  }): Promise<
    Array<{
      id: string;
      chain_id: string;
      webhook_id: string;
      webhook_url: string;
      network: string;
      address_count: number;
      signing_key: string;
      max_addresses: number;
      version: string;
      is_active: boolean;
      deactivation_reason: string | null;
      created_at: string;
      updated_at: string;
    }>
  > {
    try {
      const queryParams = new URLSearchParams();
      if (params?.chain_id) queryParams.append("chain_id", params.chain_id);
      if (params?.is_active !== undefined)
        queryParams.append("is_active", params.is_active.toString());

      const response = await wmsApi.get(`/webhooks?${queryParams.toString()}`);
      if (response.data?.success && response.data?.data) {
        return Array.isArray(response.data.data) ? response.data.data : [];
      }
      throw new Error(response.data?.message || "Failed to fetch webhooks");
    } catch (error: any) {
      console.error("Failed to fetch webhooks:", error);
      throw error;
    }
  }

  async getWebhookById(webhookId: string): Promise<{
    id: string;
    chain_id: string;
    webhook_id: string;
    webhook_url: string;
    network: string;
    address_count: number;
    signing_key: string;
    max_addresses: number;
    version: string;
    is_active: boolean;
    deactivation_reason: string | null;
    created_at: string;
    updated_at: string;
  }> {
    try {
      const response = await wmsApi.get(`/webhooks/${webhookId}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to fetch webhook");
    } catch (error: any) {
      console.error("Failed to fetch webhook:", error);
      throw error;
    }
  }

  async updateWebhook(
    webhookId: string,
    updates: {
      addresses_to_add?: string[];
      addresses_to_remove?: string[];
      is_active?: boolean;
      deactivation_reason?: string;
    },
  ): Promise<{
    id: string;
    chain_id: string;
    webhook_id: string;
    webhook_url: string;
    network: string;
    address_count: number;
    signing_key: string;
    max_addresses: number;
    version: string;
    is_active: boolean;
    deactivation_reason: string | null;
    created_at: string;
    updated_at: string;
  }> {
    try {
      const response = await wmsApi.put(`/webhooks/${webhookId}`, updates);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to update webhook");
    } catch (error: any) {
      console.error("Failed to update webhook:", error);
      throw error;
    }
  }

  async getWebhookAddresses(webhookId: string): Promise<string[]> {
    try {
      const response = await wmsApi.get(`/webhooks/${webhookId}/addresses`);
      if (response.data?.success && response.data?.data) {
        return Array.isArray(response.data.data) ? response.data.data : [];
      }
      throw new Error(
        response.data?.message || "Failed to fetch webhook addresses",
      );
    } catch (error: any) {
      console.error("Failed to fetch webhook addresses:", error);
      throw error;
    }
  }

  async syncAllWebhooks(): Promise<{
    message: string;
    success: boolean;
  }> {
    try {
      const response = await wmsApi.post("/webhooks/sync/all");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to sync webhooks");
    } catch (error: any) {
      console.error("Failed to sync all webhooks:", error);
      throw error;
    }
  }

  async syncWebhooksOnly(): Promise<{
    message: string;
    success: boolean;
  }> {
    try {
      const response = await wmsApi.post("/webhooks/sync/webhooks");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || "Failed to sync webhooks");
    } catch (error: any) {
      console.error("Failed to sync webhooks:", error);
      throw error;
    }
  }

  async syncWebhookAddressesOnly(): Promise<{
    message: string;
    success: boolean;
  }> {
    try {
      const response = await wmsApi.post("/webhooks/sync/addresses");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to sync webhook addresses",
      );
    } catch (error: any) {
      console.error("Failed to sync webhook addresses:", error);
      throw error;
    }
  }

  async getDuplicateAccountChecks(
    brand_id?: string,
  ): Promise<{ enabled: boolean }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.get("/duplicate-account-checks", {
        params,
      });
      if (response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch duplicate account checks:", error);
      throw error;
    }
  }

  async updateDuplicateAccountChecks(
    enabled: boolean,
    brand_id?: string,
  ): Promise<{ enabled: boolean }> {
    try {
      const params = brand_id ? { brand_id } : {};
      const response = await wmsApi.put(
        "/duplicate-account-checks",
        { enabled },
        { params },
      );
      if (response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error: any) {
      console.error("Failed to update duplicate account checks:", error);
      throw error;
    }
  }

  async getSweeperConfig(): Promise<{
    enabled: boolean;
    cooldown_hours: number;
    min_profit_usd: number;
    batch_page_size: number;
    cron_expression: string;
    min_eth_balance: string;
    min_sol_balance: string;
    lock_ttl_minutes: number;
    sweep_percentages: {
      btc: number;
      eth: number;
      sol: number;
      usdc: number;
      usdt: number;
    };
    balance_batch_size: number;
    min_eth_for_approval: string;
    gas_estimation_buffer: number;
    idempotency_ttl_hours: number;
    max_concurrent_sweeps: number;
    min_rent_exempt_lamports: number;
    min_btc_balance_threshold: string;
    min_eth_balance_threshold: string;
    min_sol_balance_threshold: string;
    min_usdc_balance_threshold: string;
    min_usdt_balance_threshold: string;
    min_sol_usdc_balance_threshold: string;
    min_sol_usdt_balance_threshold: string;
    native_token_auto_fund_enabled: boolean;
    native_token_auto_fund_daily_limit: number;
    native_token_auto_fund_per_wallet_limit: number;
  }> {
    try {
      const response = await wmsApi.get("/sweeper/config");
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch sweeper config",
      );
    } catch (error: any) {
      console.error("Failed to fetch sweeper config:", error);
      throw error;
    }
  }

  async updateSweeperConfig(
    updates: Partial<{
      enabled: boolean;
      cooldown_hours: number;
      min_profit_usd: number;
      batch_page_size: number;
      cron_expression: string;
      min_eth_balance: string;
      min_sol_balance: string;
      lock_ttl_minutes: number;
      sweep_percentages: {
        btc: number;
        eth: number;
        sol: number;
        usdc: number;
        usdt: number;
      };
      balance_batch_size: number;
      min_eth_for_approval: string;
      gas_estimation_buffer: number;
      idempotency_ttl_hours: number;
      max_concurrent_sweeps: number;
      min_rent_exempt_lamports: number;
      min_btc_balance_threshold: string;
      min_eth_balance_threshold: string;
      min_sol_balance_threshold: string;
      min_usdc_balance_threshold: string;
      min_usdt_balance_threshold: string;
      min_sol_usdc_balance_threshold: string;
      min_sol_usdt_balance_threshold: string;
      native_token_auto_fund_enabled: boolean;
      native_token_auto_fund_daily_limit: number;
      native_token_auto_fund_per_wallet_limit: number;
    }>,
  ): Promise<{
    enabled: boolean;
    cooldown_hours: number;
    min_profit_usd: number;
    batch_page_size: number;
    cron_expression: string;
    min_eth_balance: string;
    min_sol_balance: string;
    lock_ttl_minutes: number;
    sweep_percentages: {
      btc: number;
      eth: number;
      sol: number;
      usdc: number;
      usdt: number;
    };
    balance_batch_size: number;
    min_eth_for_approval: string;
    gas_estimation_buffer: number;
    idempotency_ttl_hours: number;
    max_concurrent_sweeps: number;
    min_rent_exempt_lamports: number;
    min_btc_balance_threshold: string;
    min_eth_balance_threshold: string;
    min_sol_balance_threshold: string;
    min_usdc_balance_threshold: string;
    min_usdt_balance_threshold: string;
    min_sol_usdc_balance_threshold: string;
    min_sol_usdt_balance_threshold: string;
    native_token_auto_fund_enabled: boolean;
    native_token_auto_fund_daily_limit: number;
    native_token_auto_fund_per_wallet_limit: number;
  }> {
    try {
      const response = await wmsApi.put("/sweeper/config", updates);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to update sweeper config",
      );
    } catch (error: any) {
      console.error("Failed to update sweeper config:", error);
      throw error;
    }
  }

  async getExchangeRates(
    params: {
      currency_code?: string;
      currency_codes?: string;
      fiat_currency?: string;
    } = {},
  ): Promise<
    Record<
      string,
      {
        crypto_currency: string;
        fiat_currency: string;
        rate: number;
        last_updated: string;
        price_usd: number;
        change_24hr: number;
      }
    >
  > {
    try {
      const queryParams: any = {};
      if (params.currency_code)
        queryParams.currency_code = params.currency_code;
      if (params.currency_codes)
        queryParams.currency_codes = params.currency_codes;
      if (params.fiat_currency)
        queryParams.fiat_currency = params.fiat_currency;

      const response = await wmsApi.get("/exchange-rates", {
        params: queryParams,
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || "Failed to fetch exchange rates",
      );
    } catch (error: any) {
      console.error("Failed to fetch exchange rates:", error);
      throw error;
    }
  }
}

export const wmsService = new WMSService();
