import { adminSvc } from "./apiService";

export interface RakebackSchedule {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  percentage: number | string;
  scope_type: "all" | "provider" | "game";
  scope_value?: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  created_by?: string;
  activated_at?: string;
  deactivated_at?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  time_remaining?: string;
  time_until_start?: string;
}

export interface CreateRakebackScheduleRequest {
  name: string;
  description?: string;
  start_time: string; // ISO 8601 format (UTC)
  end_time: string; // ISO 8601 format (UTC)
  percentage: number;
  scope_type: "all" | "provider" | "game";
  scope_value?: string;
}

export interface UpdateRakebackScheduleRequest {
  name?: string;
  description?: string;
  start_time?: string; // ISO 8601 format (UTC)
  end_time?: string; // ISO 8601 format (UTC)
  percentage?: number;
  scope_type?: "all" | "provider" | "game";
  scope_value?: string;
}

export interface ListRakebackSchedulesResponse {
  schedules: RakebackSchedule[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class RakebackScheduleService {
  private readonly BASE_PATH = "/cashback/schedules";

  async listSchedules(
    params: {
      status?: string;
      page?: number;
      page_size?: number;
    } = {},
  ): Promise<ListRakebackSchedulesResponse> {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.page_size)
      queryParams.append("page_size", params.page_size.toString());

    const response = await adminSvc.get<ListRakebackSchedulesResponse>(
      `${this.BASE_PATH}?${queryParams.toString()}`,
    );
    return response.data!;
  }

  async getSchedule(id: string): Promise<RakebackSchedule> {
    const response = await adminSvc.get<RakebackSchedule>(
      `${this.BASE_PATH}/${id}`,
    );
    return response.data!;
  }

  async createSchedule(
    request: CreateRakebackScheduleRequest,
  ): Promise<RakebackSchedule> {
    const response = await adminSvc.post<RakebackSchedule>(
      this.BASE_PATH,
      request,
    );
    return response.data!;
  }

  async updateSchedule(
    id: string,
    request: UpdateRakebackScheduleRequest,
  ): Promise<RakebackSchedule> {
    const response = await adminSvc.put<RakebackSchedule>(
      `${this.BASE_PATH}/${id}`,
      request,
    );
    return response.data!;
  }

  async deleteSchedule(id: string): Promise<void> {
    await adminSvc.delete(`${this.BASE_PATH}/${id}`);
  }
}

export const rakebackScheduleService = new RakebackScheduleService();
