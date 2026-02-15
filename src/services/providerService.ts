import { adminSvc } from "./apiService";
import { ApiResponse } from "./apiService";

export interface Provider {
  id: string;
  name: string;
  code: string;
  description?: string;
  api_url?: string;
  webhook_url?: string;
  is_active: boolean;
  integration_type?: string;
  supported_currencies?: string[];
  game_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProviderRequest {
  name: string;
  code: string;
  description?: string;
  api_url?: string;
  webhook_url?: string;
  is_active?: boolean;
  integration_type?: string;
  supported_currencies?: string[];
}

export interface UpdateProviderRequest {
  name?: string;
  code?: string;
  description?: string;
  api_url?: string;
  webhook_url?: string;
  is_active?: boolean;
  integration_type?: string;
  supported_currencies?: string[];
}

export interface GetProvidersRequest {
  page: number;
  "per-page": number;
  search?: string;
  is_active?: boolean;
}

export interface GetProvidersResponse {
  providers: Provider[];
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

class ProviderService {
  private readonly BASE_PATH = "/providers";

  async getProviders(
    params: GetProvidersRequest,
  ): Promise<ApiResponse<GetProvidersResponse>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(params.page));
      queryParams.set("per-page", String(params["per-page"]));
      if (params.search) {
        queryParams.set("search", params.search);
      }
      if (params.is_active !== undefined) {
        queryParams.set("is_active", String(params.is_active));
      }

      const response = await adminSvc.get<GetProvidersResponse>(
        `${this.BASE_PATH}?${queryParams.toString()}`,
      );
      return response;
    } catch (error: any) {
      console.error("Error fetching providers:", error);
      throw error;
    }
  }

  async getProviderById(id: string): Promise<ApiResponse<Provider>> {
    try {
      const response = await adminSvc.get<Provider>(`${this.BASE_PATH}/${id}`);
      return response;
    } catch (error: any) {
      console.error("Error fetching provider:", error);
      throw error;
    }
  }

  async createProvider(
    data: CreateProviderRequest,
  ): Promise<ApiResponse<Provider>> {
    try {
      const response = await adminSvc.post<Provider>(this.BASE_PATH, data);
      return response;
    } catch (error: any) {
      console.error("Error creating provider:", error);
      throw error;
    }
  }

  async updateProvider(
    id: string,
    data: UpdateProviderRequest,
  ): Promise<ApiResponse<Provider>> {
    try {
      const response = await adminSvc.patch<Provider>(
        `${this.BASE_PATH}/${id}`,
        data,
      );
      return response;
    } catch (error: any) {
      console.error("Error updating provider:", error);
      throw error;
    }
  }

  async deleteProvider(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await adminSvc.delete<void>(`${this.BASE_PATH}/${id}`);
      return response;
    } catch (error: any) {
      console.error("Error deleting provider:", error);
      throw error;
    }
  }
}

export const providerService = new ProviderService();
