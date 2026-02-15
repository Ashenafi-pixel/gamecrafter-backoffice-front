import { adminSvc } from "./apiService";

export interface SystemConfig {
  id: string;
  name: string;
  value: string;
  created_at: string;
}

export interface ConfigsResponse {
  success: boolean;
  data: {
    configs: SystemConfig[];
    total: number;
  };
  message: string;
}

export interface UpdateConfigRequest {
  id: string;
  value: string;
}

export interface UpdateConfigResponse {
  success: boolean;
  data: SystemConfig;
  message: string;
}

class ConfigService {
  private readonly BASE_PATH = "/system-configs";

  async getAllConfigs(brandId?: string): Promise<SystemConfig[]> {
    try {
      const params = brandId ? `?brand_id=${brandId}` : "";
      const response = await adminSvc.get<{
        configs: SystemConfig[];
        total: number;
      }>(`${this.BASE_PATH}${params}`);
      // The response.data from adminSvc already contains the parsed server response
      if (response.data?.configs) {
        return response.data.configs;
      }
      throw new Error("Failed to fetch configs");
    } catch (error: any) {
      console.error("Error fetching configs:", error);
      throw error;
    }
  }

  async updateConfig(id: string, value: string): Promise<SystemConfig> {
    try {
      const response = await adminSvc.put<SystemConfig>(this.BASE_PATH, {
        id,
        value,
      });
      if (response.data) {
        return response.data;
      }
      throw new Error("Failed to update config");
    } catch (error: any) {
      console.error("Error updating config:", error);
      throw error;
    }
  }
}

export const configService = new ConfigService();
