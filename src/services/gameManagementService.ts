import { adminSvc, ApiResponse } from "./apiService";
import {
  Game,
  CreateGameRequest,
  UpdateGameRequest,
  GameListResponse,
  GameFilters,
} from "../types/gameManagement";

export class GameManagementService {
  async getGames(
    filters: GameFilters = {},
  ): Promise<ApiResponse<GameListResponse>> {
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

  async getGameById(id: string): Promise<ApiResponse<Game>> {
    const response = await adminSvc.get<Game>(`/game-management/${id}`);
    return response;
  }

  async createGame(
    gameData: CreateGameRequest,
  ): Promise<ApiResponse<Game>> {
    const response = await adminSvc.post<Game>("/game-management", gameData);
    return response;
  }

  async updateGame(
    id: string,
    gameData: UpdateGameRequest,
  ): Promise<ApiResponse<Game>> {
    const response = await adminSvc.put<Game>(
      `/game-management/${id}`,
      gameData,
    );
    return response;
  }

  async deleteGame(id: string): Promise<ApiResponse<void>> {
    const response = await adminSvc.delete<void>(`/game-management/${id}`);
    return response;
  }

  async bulkUpdateGames(
    gameIds: string[],
    updates: UpdateGameRequest,
  ): Promise<ApiResponse<void>> {
    const response = await adminSvc.put<void>(
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
  ): Promise<ApiResponse<void>> {
    const response = await adminSvc.delete<void>("/game-management/bulk", {
      data: { game_ids: gameIds },
    });
    return response;
  }

  async getGameStats(): Promise<ApiResponse<any>> {
    const response = await adminSvc.get<any>("/game-management/stats");
    return response;
  }

  async bulkUpdateGameStatus(
    gameIds: string[],
    status: string,
  ): Promise<ApiResponse<void>> {
    const response = await adminSvc.put<void>(
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
