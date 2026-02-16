import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { config } from "../config/load-config";

interface ApiServiceConfig {
  baseUrl: string;
  timeout?: number;
}

export interface ApiResponse<T> {
  meta?: any; // Pagination metadata (total, page, page_size, pages)
  message: string;
  success: boolean;
  status: number;
  data?: T;
}

class ApiService {
  public axiosInstance: AxiosInstance;
  private readonly ACCESS_TOKEN_KEY = "access_token";
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor(config: ApiServiceConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: 100000,
      withCredentials: true, // Enable cookies for refresh token
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

        // Log the full URL for debugging (only for analytics requests)
        if (config.url?.includes("/analytics/")) {
          const fullUrl = config.baseURL
            ? `${config.baseURL}${config.url}`
            : config.url;
          console.log("📡 Analytics request:", {
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

    // Response interceptor for token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshUrl = `${config.adminApiUrl.replace("/api/admin", "")}/refresh`;

            const response = await axios.post(
              refreshUrl,
              {},
              {
                withCredentials: true,
              },
            );

            if (response.data.access_token) {
              const { access_token } = response.data;
              localStorage.setItem(this.ACCESS_TOKEN_KEY, access_token);

              // Process failed queue
              this.processQueue(null);

              // Retry original request
              return this.axiosInstance(originalRequest);
            } else {
              throw new Error("Token refresh failed");
            }
          } catch (refreshError) {
            this.processQueue(refreshError);
            // Only clear auth data and redirect if it's not a permission error
            // Check if the original request was to a permission-protected endpoint
            const isPermissionError =
              originalRequest.url?.includes("/users") ||
              originalRequest.url?.includes("/admin/") ||
              error.response?.status === 403;

            if (!isPermissionError) {
              this.clearAuthData();
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // For non-401 errors, preserve the original error with backend message
        return Promise.reject(error);
      },
    );
  }

  private processQueue(error: any) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    this.failedQueue = [];
  }

  private clearAuthData() {
    console.warn(
      "ApiService: clearAuthData() called - clearing all localStorage!",
    );
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("remember_me");
    localStorage.removeItem("user");

    // Clear cookies
    document.cookie =
      "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "remember_me=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Dispatch custom event to notify AuthContext
    window.dispatchEvent(new CustomEvent("auth-cleared"));
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance({
        method,
        url,
        data,
        ...config,
      });

      // Handle different response formats
      let responseData: any;
      let responseMeta: any;
      let isSuccess: boolean;
      let message: string;

      // Check if response is in standard API format {success, data, message, meta}
      if (
        response.data &&
        typeof response.data === "object" &&
        "success" in response.data
      ) {
        responseData = response.data.data || response.data;
        responseMeta = response.data.meta; // Extract meta from response
        isSuccess = response.data.success;
        message = response.data.message || "Success";
      }
      // If response is directly the data (like {access_token: "..."} from /refresh)
      else {
        responseData = response.data;
        responseMeta = undefined;
        isSuccess = response.status >= 200 && response.status < 300;
        message = "Success";
      }

      return {
        data: responseData,
        meta: responseMeta, // Include meta in the response
        status: response.status,
        success: isSuccess,
        message: message,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred";
      const status = error.response?.status || 500;
      const apiResponse: ApiResponse<T> = {
        message,
        success: false,
        status,
      };
      throw apiResponse;
    }
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", url, undefined, config);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", url, data, config);
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", url, data, config);
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", url, data, config);
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", url, undefined, config);
  }
}

export const createApiService = (
  baseUrl: string,
  timeout?: number,
): ApiService => {
  return new ApiService({ baseUrl, timeout });
};

export const walletManagementSvc = createApiService(
  config.walletApiUrl,
  100000,
);

export const adminSvc = createApiService(config.adminApiUrl, 100000);

const baseUrl = config.adminApiUrl.replace("/api/admin", "");
console.log("🔧 baseApiSvc configured with URL:", baseUrl);

export const baseApiSvc = createApiService(baseUrl, 100000);

export const analyticsSvc = createApiService(
  config.clientBaseUrl,
  100000,
);

// Client service - pointing to the client base URL for external APIs
export const clientSvc = createApiService(config.clientBaseUrl, 100000);
