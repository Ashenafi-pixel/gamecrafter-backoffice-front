import { adminSvc } from "./apiService";
import { ApiResponse } from "./apiService";

export interface Brand {
  id: string;
  name: string;
  code: string;
  domain?: string;
  description?: string;
  api_url?: string;
  webhook_url?: string;
  integration_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandRequest {
  name: string;
  code: string;
  domain?: string;
  description?: string;
  api_url?: string;
  webhook_url?: string;
  integration_type?: string;
  is_active?: boolean;
  signature?: string;
}

export interface UpdateBrandRequest {
  name?: string;
  code?: string;
  domain?: string;
  description?: string;
  api_url?: string;
  webhook_url?: string;
  integration_type?: string;
  is_active?: boolean;
}

export interface GetBrandsRequest {
  page: number;
  "per-page": number;
  search?: string;
  is_active?: boolean;
}

export interface GetBrandsResponse {
  brands: Brand[];
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

class BrandService {
  private readonly BASE_PATH = "/brands";

  async getBrands(
    params: GetBrandsRequest,
  ): Promise<ApiResponse<GetBrandsResponse>> {
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

      const response = await adminSvc.get<GetBrandsResponse>(
        `${this.BASE_PATH}?${queryParams.toString()}`,
      );
      return response;
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      throw error;
    }
  }

  async getBrandById(id: string): Promise<ApiResponse<Brand>> {
    try {
      const response = await adminSvc.get<Brand>(`${this.BASE_PATH}/${id}`);
      return response;
    } catch (error: any) {
      console.error("Error fetching brand:", error);
      throw error;
    }
  }

  async createBrand(data: CreateBrandRequest): Promise<ApiResponse<Brand>> {
    try {
      const response = await adminSvc.post<Brand>(this.BASE_PATH, data);
      return response;
    } catch (error: any) {
      console.error("Error creating brand:", error);
      throw error;
    }
  }

  async updateBrand(
    id: string,
    data: UpdateBrandRequest,
  ): Promise<ApiResponse<Brand>> {
    try {
      const response = await adminSvc.patch<Brand>(
        `${this.BASE_PATH}/${id}`,
        data,
      );
      return response;
    } catch (error: any) {
      console.error("Error updating brand:", error);
      throw error;
    }
  }

  async deleteBrand(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await adminSvc.delete<void>(`${this.BASE_PATH}/${id}`);
      return response;
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      throw error;
    }
  }
}

export const brandService = new BrandService();
