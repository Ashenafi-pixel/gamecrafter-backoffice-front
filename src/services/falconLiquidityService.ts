import axios from "axios";
import { config } from "../config/load-config";
import {
  FalconLiquidityData,
  FalconLiquidityListResponse,
  FalconLiquidityFilters,
  FalconLiquiditySummary,
} from "../types/falconLiquidity";

// Get base URL from admin API URL (remove /api/admin suffix to get base URL)
const baseUrl = config.adminApiUrl.replace("/api/admin", "");

// Create a separate axios instance for Falcon Liquidity
// Use the admin API base URL from environment config
const falconSvc = axios.create({
  baseURL: baseUrl,
  timeout: 30000, // 30 seconds
  withCredentials: true, // Enable cookies for auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for authentication
falconSvc.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log the full URL for debugging
    if (config.url?.includes("/falcon-liquidity/")) {
      const fullUrl = config.baseURL
        ? `${config.baseURL}${config.url}`
        : config.url;
      console.log("📡 Falcon Liquidity request:", {
        baseURL: config.baseURL,
        url: config.url,
        fullURL: fullUrl,
        method: config.method?.toUpperCase(),
      });
    }

    return config;
  },
  (error) => Promise.reject(error),
);

console.log("🔧 falconSvc configured with baseURL:", baseUrl);

export class FalconLiquidityService {
  async getAllData(
    filters: FalconLiquidityFilters = {},
  ): Promise<FalconLiquidityListResponse> {
    const params = new URLSearchParams();

    // Pagination (page-based)
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.per_page)
      params.append("per_page", filters.per_page.toString());

    // Filters
    if (filters.message_type)
      params.append("message_type", filters.message_type);
    if (filters.status) params.append("status", filters.status);
    if (filters.transaction_id)
      params.append("transaction_id", filters.transaction_id);
    if (filters.user_id) params.append("user_id", filters.user_id);
    if (filters.message_id) params.append("message_id", filters.message_id);
    if (filters.date_from) params.append("date_from", filters.date_from);
    if (filters.date_to) params.append("date_to", filters.date_to);
    if (filters.reconciliation_status)
      params.append("reconciliation_status", filters.reconciliation_status);

    const response = await falconSvc.get<any>(
      `/api/admin/falcon-liquidity/data?${params.toString()}`,
    );

    console.log("Falcon Liquidity API Response:", {
      fullResponse: response.data,
      pagination: response.data.pagination,
      messagesCount: response.data.messages?.length || 0,
      total: response.data.pagination?.total || response.data.total || 0,
    });

    // Transform the response to match the expected format
    const page = filters.page || 1;
    const perPage = filters.per_page || 50;
    const total = response.data.pagination?.total || response.data.total || 0;

    return {
      success: true,
      data: {
        messages: response.data.messages || [],
        total: total,
        limit: response.data.pagination?.limit || perPage,
        offset: response.data.pagination?.offset || (page - 1) * perPage,
      },
      message: "Success",
    };
  }

  async getDataByTransactionId(transactionId: string): Promise<{
    success: boolean;
    data: FalconLiquidityData[];
    message: string;
  }> {
    const response = await falconSvc.get<any>(
      `/api/admin/falcon-liquidity/transaction/${transactionId}`,
    );

    return {
      success: true,
      data: response.data.messages || [],
      message: "Success",
    };
  }

  async getDataByUserId(
    userId: string,
    filters: Omit<FalconLiquidityFilters, "transaction_id"> = {},
  ): Promise<FalconLiquidityListResponse> {
    const params = new URLSearchParams();

    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.offset) params.append("offset", filters.offset.toString());
    if (filters.message_type)
      params.append("message_type", filters.message_type);
    if (filters.status) params.append("status", filters.status);

    const response = await falconSvc.get<any>(
      `/api/admin/falcon-liquidity/user/${userId}?${params.toString()}`,
    );

    return {
      success: true,
      data: {
        messages: response.data.messages || [],
        total: response.data.pagination?.total || 0,
        limit: response.data.pagination?.limit || filters.limit || 50,
        offset: response.data.pagination?.offset || filters.offset || 0,
      },
      message: "Success",
    };
  }

  async getSummary(): Promise<{
    success: boolean;
    data: FalconLiquiditySummary;
    message: string;
  }> {
    const response = await falconSvc.get<any>(
      "/api/admin/falcon-liquidity/summary",
    );

    // Transform the response to match the expected format
    return {
      success: true,
      data: {
        total_messages: response.data.total_messages || 0,
        pending_messages: response.data.pending_messages || 0,
        sent_messages: response.data.sent_messages || 0,
        failed_messages: response.data.failed_messages || 0,
        acknowledged_messages: response.data.acknowledged_messages || 0,
        casino_messages: response.data.casino_messages || 0,
        sport_messages: response.data.sport_messages || 0,
      },
      message: "Success",
    };
  }
}

export const falconLiquidityService = new FalconLiquidityService();
