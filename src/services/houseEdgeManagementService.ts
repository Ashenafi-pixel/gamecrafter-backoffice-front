import { adminSvc, clientSvc } from "./apiService";
import {
  HouseEdge,
  CreateHouseEdgeRequest,
  UpdateHouseEdgeRequest,
  HouseEdgeListResponse,
  HouseEdgeFilters,
  HouseEdgeStats,
} from "../types/houseEdgeManagement";

export class HouseEdgeManagementService {
  async getHouseEdges(
    filters: HouseEdgeFilters = {},
  ): Promise<HouseEdgeListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.per_page)
      params.append("per_page", filters.per_page.toString());
    if (filters.search) params.append("search", filters.search);
    if (filters.game_id) params.append("game_id", filters.game_id);
    if (filters.game_type) params.append("game_type", filters.game_type);
    if (filters.game_variant)
      params.append("game_variant", filters.game_variant);
    if (filters.is_active !== undefined)
      params.append("is_active", filters.is_active.toString());
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_order) params.append("sort_order", filters.sort_order);

    const response = await adminSvc.get<HouseEdgeListResponse>(
      `/house-edge-management?${params.toString()}`,
    );
    return response;
  }

  async getHouseEdgeById(
    id: string,
  ): Promise<{ success: boolean; data: HouseEdge; message: string }> {
    const response = await clientSvc.get<{
      success: boolean;
      data: HouseEdge;
      message: string;
    }>(`/api/admin/house-edge-management/${id}`);
    return response;
  }

  async createHouseEdge(
    houseEdgeData: CreateHouseEdgeRequest,
  ): Promise<{ success: boolean; data: HouseEdge; message: string }> {
    const response = await clientSvc.post<{
      success: boolean;
      data: HouseEdge;
      message: string;
    }>("/api/admin/house-edge-management", houseEdgeData);
    return response;
  }

  async updateHouseEdge(
    id: string,
    houseEdgeData: UpdateHouseEdgeRequest,
  ): Promise<{ success: boolean; data: HouseEdge; message: string }> {
    const response = await clientSvc.put<{
      success: boolean;
      data: HouseEdge;
      message: string;
    }>(`/api/admin/house-edge-management/${id}`, houseEdgeData);
    return response;
  }

  async deleteHouseEdge(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await clientSvc.delete<{
      success: boolean;
      message: string;
    }>(`/api/admin/house-edge-management/${id}`);
    return response;
  }

  async bulkUpdateHouseEdges(
    houseEdgeIds: string[],
    updates: UpdateHouseEdgeRequest,
  ): Promise<{ success: boolean; message: string }> {
    const response = await clientSvc.put<{ success: boolean; message: string }>(
      "/api/admin/house-edge-management/bulk",
      {
        house_edge_ids: houseEdgeIds,
        updates,
      },
    );
    return response;
  }

  async bulkDeleteHouseEdges(
    houseEdgeIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    const response = await clientSvc.delete<{
      success: boolean;
      message: string;
    }>("/api/admin/house-edge-management/bulk", {
      data: { house_edge_ids: houseEdgeIds },
    });
    return response;
  }

  async getHouseEdgeStats(): Promise<{
    success: boolean;
    data: HouseEdgeStats;
    message: string;
  }> {
    const response = await clientSvc.get<{
      success: boolean;
      data: HouseEdgeStats;
      message: string;
    }>("/api/admin/house-edge-management/stats");
    return response;
  }

  async getHouseEdgesByGameType(
    gameType: string,
  ): Promise<{ success: boolean; data: HouseEdge[]; message: string }> {
    const response = await clientSvc.get<{
      success: boolean;
      data: HouseEdge[];
      message: string;
    }>(`/api/admin/house-edge-management/by-game-type/${gameType}`);
    return response;
  }

  async getHouseEdgesByGameVariant(
    gameType: string,
    gameVariant: string,
  ): Promise<{ success: boolean; data: HouseEdge[]; message: string }> {
    const response = await clientSvc.get<{
      success: boolean;
      data: HouseEdge[];
      message: string;
    }>(
      `/api/admin/house-edge-management/by-game-variant/${gameType}/${gameVariant}`,
    );
    return response;
  }

  async bulkUpdateHouseEdgeStatus(
    houseEdgeIds: string[],
    isActive: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const response = await clientSvc.put<{ success: boolean; message: string }>(
      "/api/admin/house-edge-management/bulk-status",
      {
        house_edge_ids: houseEdgeIds,
        is_active: isActive,
      },
    );
    return response;
  }

  async bulkCreateHouseEdges(data: {
    game_ids: string[];
    game_type: string;
    game_variant?: string;
    house_edge: string;
    min_bet: string;
    max_bet?: string;
    is_active: boolean;
    effective_from?: string;
    effective_until?: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const response = await clientSvc.post<{
      success: boolean;
      data: any;
      message: string;
    }>("/api/admin/house-edge-management/bulk", data);
    return response;
  }

  async applyAllHouseEdges(data: {
    add_all: number;
    game_type: string;
    game_variant: string;
    house_edge: string;
    min_bet: string;
    max_bet: string;
    is_active: boolean;
    effective_from: string;
    effective_until: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const response = await clientSvc.post<{
      success: boolean;
      data: any;
      message: string;
    }>("/api/admin/house-edge-management/apply-all", data);
    return response;
  }

  async removeAllHouseEdges(data: {
    remove_all: number;
    game_type: string;
    game_variant: string;
    house_edge: string;
    min_bet: string;
    max_bet: string;
    is_active: boolean;
    effective_from: string;
    effective_until: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const response = await clientSvc.post<{
      success: boolean;
      data: any;
      message: string;
    }>("/api/admin/house-edge-management/apply-all", data);
    return response;
  }
}

export const houseEdgeManagementService = new HouseEdgeManagementService();
