import axios, { AxiosInstance, AxiosResponse } from "axios";
import { config } from "../config/load-config";

interface AnalyticsServiceConfig {
  baseUrl: string;
  timeout?: number;
}

interface ApiResponse<T> {
  message: string;
  success: boolean;
  status: number;
  data?: T;
}

class AnalyticsService {
  private axiosInstance: AxiosInstance;
  private readonly ACCESS_TOKEN_KEY = "access_token";

  constructor(config: AnalyticsServiceConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 100000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem(this.ACCESS_TOKEN_KEY);
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  // Real-time Stats
  async getRealtimeStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        "/analytics/realtime/stats",
      );
      console.log("Raw API response:", response.data);
      return {
        success: response.data.success || true,
        message: "Real-time stats retrieved successfully",
        status: response.status,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error("Error fetching realtime stats:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get real-time stats",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Analytics
  async getUserAnalytics(accountId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/analytics`,
      );
      return {
        success: true,
        message: "User analytics retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get user analytics",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Transactions
  async getUserTransactions(
    accountId: string,
    params: {
      limit?: number;
      offset?: number;
      status?: string;
      transaction_type?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/transactions`,
        {
          params,
        },
      );
      return {
        success: true,
        message: "User transactions retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get user transactions",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Daily Report
  async getDailyReport(date: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        "/admin/analytics/reports/daily",
        {
          params: { date },
        },
      );
      return {
        success: true,
        message: "Daily report retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get daily report",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Enhanced Daily Report
  async getEnhancedDailyReport(
    date: string,
    is_test_account: boolean = false,
  ): Promise<ApiResponse<any>> {
    try {
      const adminApiUrl = config.adminApiUrl;
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const response = await axios.get(
        `${adminApiUrl}/analytics/reports/daily-enhanced`,
        {
          params: { date, is_test_account },
          timeout: 100000,
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      return {
        success: response.data.success || true,
        message: "Enhanced daily report retrieved successfully",
        status: response.status,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get enhanced daily report",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  async getWeeklyReport(
    params: {
      week_start?: string;
      is_test_account?: boolean;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const adminApiUrl = config.adminApiUrl;
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const response = await axios.get(
        `${adminApiUrl}/analytics/reports/weekly`,
        {
          params,
          timeout: 100000,
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      return {
        success: response.data.success || true,
        message: "Weekly report retrieved successfully",
        status: response.status,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get weekly report",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  async getDailyEnhancedTable(
    params: {
      date_from: string;
      date_to: string;
      is_test_account?: boolean;
    },
  ): Promise<ApiResponse<any>> {
    try {
      const adminApiUrl = config.adminApiUrl;
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const response = await axios.get(
        `${adminApiUrl}/analytics/reports/daily-enhanced/table`,
        {
          params,
          timeout: 100000,
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      return {
        success: response.data.success || true,
        message: "Daily enhanced table retrieved successfully",
        status: response.status,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get daily enhanced table",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Top Games
  async getTopGames(
    params: {
      limit?: number;
      date_from?: string;
      date_to?: string;
      is_test_account?: boolean;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      // Use VITE_ADMIN_API_URL for this endpoint only
      const adminApiUrl = config.adminApiUrl;
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);

      const response = await axios.get(
        `${adminApiUrl}/analytics/reports/top-games`,
        {
          params,
          timeout: 100000,
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      console.log("Raw top games response:", response.data);
      return {
        success: response.data.success || true,
        message: "Top games retrieved successfully",
        status: response.status,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error("Error fetching top games:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        window.location.href = "/login";
      }
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get top games",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Top Players
  async getTopPlayers(
    params: {
      limit?: number;
      date_from?: string;
      date_to?: string;
      is_test_account?: boolean;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      // Use VITE_ADMIN_API_URL for this endpoint only
      const adminApiUrl = config.adminApiUrl;
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);

      const response = await axios.get(
        `${adminApiUrl}/analytics/reports/top-players`,
        {
          params,
          timeout: 100000,
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      console.log("Raw top players response:", response.data);
      return {
        success: response.data.success || true,
        message: "Top players retrieved successfully",
        status: response.status,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error("Error fetching top players:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        window.location.href = "/login";
      }
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get top players",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Send Daily Report Email (Configured Recipients)
  async sendDailyReportEmailConfigured(
    date: string,
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.post(
        "/analytics/daily-report/send-configured",
        {
          date,
        },
      );
      return {
        success: true,
        message: "Daily report email sent successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to send daily report email",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Send Daily Report Email (Custom Recipients)
  async sendDailyReportEmailCustom(
    date: string,
    recipients: string[],
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.post(
        "/analytics/daily-report/send",
        {
          date,
          recipients,
        },
      );
      return {
        success: true,
        message: "Daily report email sent successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to send daily report email",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Send Yesterday's Report Email
  async sendYesterdayReportEmail(): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.post(
        "/analytics/daily-report/yesterday",
      );
      return {
        success: true,
        message: "Yesterday's report email sent successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to send yesterday's report email",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // Send Last Week's Reports Email
  async sendLastWeekReportsEmail(): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.post(
        "/analytics/daily-report/last-week",
      );
      return {
        success: true,
        message: "Last week's reports email sent successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to send last week's reports email",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Detailed Transactions
  async getUserDetailedTransactions(
    accountId: string,
    params: {
      limit?: number;
      offset?: number;
      transaction_type?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/detailed-transactions`,
        {
          params,
        },
      );
      return {
        success: true,
        message: "User detailed transactions retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get user detailed transactions",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Wagers
  async getUserWagers(
    accountId: string,
    params: {
      limit?: number;
      offset?: number;
      game_id?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/wagers`,
        {
          params,
        },
      );
      return {
        success: true,
        message: "User wagers retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get user wagers",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Results
  async getUserResults(
    accountId: string,
    params: {
      limit?: number;
      offset?: number;
      game_id?: string;
      date_from?: string;
      date_to?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/results`,
        {
          params,
        },
      );
      return {
        success: true,
        message: "User results retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get user results",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Cashback Analytics
  async getUserCashbackAnalytics(
    accountId: string,
    params: {
      date_from?: string;
      date_to?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/cashback-analytics`,
        {
          params,
        },
      );
      return {
        success: true,
        message: "User cashback analytics retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to get user cashback analytics",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }

  // User Tax Reporting
  async getUserTaxReporting(
    accountId: string,
    params: {
      year?: number;
      quarter?: number;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.axiosInstance.get(
        `/analytics/users/${accountId}/tax-reporting`,
        {
          params,
        },
      );
      return {
        success: true,
        message: "User tax reporting retrieved successfully",
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to get user tax reporting",
        status: error.response?.status || 500,
        data: null,
      };
    }
  }
}

// Create and export the analytics service instance
export const analyticsService = new AnalyticsService({
  baseUrl: config.clientBaseUrl,
  timeout: 100000,
});

export default analyticsService;
