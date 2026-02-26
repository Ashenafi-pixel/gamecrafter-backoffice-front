import { adminSvc } from "./apiService";
import {
  Game,
  CreateGameRequest,
  UpdateGameRequest,
  GameListResponse,
  GameFilters,
} from "../types/gameManagement";

export class GameManagementService {
  async getGames(filters: GameFilters = {}): Promise<GameListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.per_page)
      params.append("per_page", filters.per_page.toString());
    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.provider) params.append("provider", filters.provider);
    if (filters.game_id) params.append("game_id", filters.game_id);
    if (filters.enabled !== undefined)
      params.append("enabled", filters.enabled.toString());
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_order) params.append("sort_order", filters.sort_order);

    const response = await adminSvc.get<GameListResponse>(
      `/game-management?${params.toString()}`,
    );
    return response;
  }

  async getGameById(
    id: string,
  ): Promise<{ success: boolean; data: Game; message: string }> {
    const response = await adminSvc.get<{
      success: boolean;
      data: Game;
      message: string;
    }>(`/game-management/${id}`);
    return response;
  }

  async createGame(
    gameData: CreateGameRequest,
  ): Promise<{ success: boolean; data: Game; message: string }> {
    const response = await adminSvc.post<{
      success: boolean;
      data: Game;
      message: string;
    }>("/game-management", gameData);
    return response;
  }

  async updateGame(
    id: string,
    gameData: UpdateGameRequest,
  ): Promise<{ success: boolean; data: Game; message: string }> {
    const response = await adminSvc.put<{
      success: boolean;
      data: Game;
      message: string;
    }>(`/game-management/${id}`, gameData);
    return response;
  }

  async deleteGame(id: string): Promise<{ success: boolean; message: string }> {
    const response = await adminSvc.delete<{
      success: boolean;
      message: string;
    }>(`/game-management/${id}`);
    return response;
  }

  async bulkUpdateGames(
    gameIds: string[],
    updates: UpdateGameRequest,
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminSvc.put<{ success: boolean; message: string }>(
      "/game-management/bulk",
      {
        game_ids: gameIds,
        updates,
      },
    );
    return response;
  }

  async bulkDeleteGames(
    gameIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminSvc.delete<{
      success: boolean;
      message: string;
    }>("/game-management/bulk", {
      data: { game_ids: gameIds },
    });
    return response;
  }

  async getGameStats(): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const response = await adminSvc.get<{
      success: boolean;
      data: any;
      message: string;
    }>("/game-management/stats");
    return response;
  }

  async bulkUpdateGameStatus(
    gameIds: string[],
    status: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminSvc.put<{ success: boolean; message: string }>(
      "/game-management/bulk-status",
      {
        game_ids: gameIds,
        status,
      },
    );
    return response;
  }
}

export const gameManagementService = new GameManagementService();
