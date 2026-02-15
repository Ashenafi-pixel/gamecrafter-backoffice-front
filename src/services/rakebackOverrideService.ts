import { adminSvc } from "./apiService";

export interface GlobalRakebackOverride {
  id: string;
  is_active: boolean;
  rakeback_percentage: number | string; // Backend may return as string
  start_time?: string | null;
  end_time?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_by?: string | null;
  updated_at: string;
}

export interface CreateOrUpdateRakebackOverrideReq {
  is_active: boolean;
  rakeback_percentage: number;
  start_time?: string;
  end_time?: string;
}

class RakebackOverrideService {
  private readonly BASE_PATH = "/rakeback-override";

  async getActiveOverride(): Promise<GlobalRakebackOverride | null> {
    const response = await adminSvc.get<GlobalRakebackOverride | null>(
      `${this.BASE_PATH}/active`,
    );
    // apiService already extracts the data field from backend response
    return response.data || null;
  }

  async getOverride(): Promise<GlobalRakebackOverride | null> {
    const response = await adminSvc.get<GlobalRakebackOverride | null>(
      this.BASE_PATH,
    );
    // apiService already extracts the data field from backend response
    return response.data || null;
  }

  async createOrUpdateOverride(
    req: CreateOrUpdateRakebackOverrideReq,
  ): Promise<GlobalRakebackOverride> {
    const response = await adminSvc.post<GlobalRakebackOverride>(
      this.BASE_PATH,
      req,
    );
    // apiService already extracts the data field from backend response
    return response.data!;
  }

  async toggleOverride(isActive: boolean): Promise<void> {
    await adminSvc.patch(`${this.BASE_PATH}/toggle`, { is_active: isActive });
  }
}

export const rakebackOverrideService = new RakebackOverrideService();
