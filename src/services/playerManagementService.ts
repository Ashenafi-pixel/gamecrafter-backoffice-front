import { adminSvc } from "./apiService";
import {
  CreatePlayerRequest,
  CreatePlayerResponse,
  UpdatePlayerRequest,
  UpdatePlayerResponse,
  GetPlayerResponse,
  GetPlayersResponse,
  PlayerFilters,
} from "../types/playerManagement";

export class PlayerManagementService {
  async getPlayers(
    filters: PlayerFilters,
  ): Promise<{ success: boolean; data: GetPlayersResponse; message: string }> {
    const params = new URLSearchParams();

    params.append("page", filters.page.toString());
    params.append("per-page", filters["per-page"].toString());

    if (filters.search) params.append("search", filters.search);
    if (filters.brand_id) params.append("brand_id", filters.brand_id);
    if (filters.country) params.append("country", filters.country);
    if (filters.test_account !== undefined)
      params.append("test_account", filters.test_account.toString());

    const url = `/player-management?${params.toString()}`;
    console.log("🔵 PlayerManagementService - Calling GET:", url);
    console.log("🔵 Full URL will be:", `${adminSvc.axiosInstance.defaults.baseURL}${url}`);
    
    const response = await adminSvc.get<GetPlayersResponse>(url);
    
    console.log("🔵 PlayerManagementService - Response:", response);
    
    return {
      success: response.success,
      data: response.data!,
      message: response.message,
    };
  }

  async getPlayerById(
    id: number,
  ): Promise<{ success: boolean; data: GetPlayerResponse; message: string }> {
    const response = await adminSvc.get<GetPlayerResponse>(`/player-management/${id}`);
    return {
      success: response.success,
      data: response.data!,
      message: response.message,
    };
  }

  async createPlayer(
    playerData: CreatePlayerRequest,
  ): Promise<{ success: boolean; data: CreatePlayerResponse; message: string }> {
    const response = await adminSvc.post<CreatePlayerResponse>(
      "/player-management",
      playerData,
    );
    return {
      success: response.success,
      data: response.data!,
      message: response.message,
    };
  }

  async updatePlayer(
    id: number,
    playerData: UpdatePlayerRequest,
  ): Promise<{ success: boolean; data: UpdatePlayerResponse; message: string }> {
    const response = await adminSvc.patch<UpdatePlayerResponse>(
      `/player-management/${id}`,
      playerData,
    );
    return {
      success: response.success,
      data: response.data!,
      message: response.message,
    };
  }

  async deletePlayer(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminSvc.delete<{ success: boolean; message: string }>(
      `/player-management/${id}`,
    );
    return {
      success: response.success,
      message: response.message,
    };
  }
}

export const playerManagementService = new PlayerManagementService();

