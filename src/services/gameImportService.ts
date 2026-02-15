import { adminSvc } from "./apiService";
import {
  GameImportConfig,
  UpdateGameImportConfigRequest,
  GameImportTriggerResponse,
} from "../types/gameImport";

export class GameImportService {
  async getConfig(brandId: string): Promise<{
    success: boolean;
    data: GameImportConfig;
    message: string;
  }> {
    const response = await adminSvc.get<{
      success: boolean;
      data: GameImportConfig;
      message: string;
    }>(`/settings/game-import/config?brand_id=${brandId}`);
    return response;
  }

  async updateConfig(data: UpdateGameImportConfigRequest): Promise<{
    success: boolean;
    data: GameImportConfig;
    message: string;
  }> {
    const response = await adminSvc.put<{
      success: boolean;
      data: GameImportConfig;
      message: string;
    }>("/settings/game-import/config", data);
    return response;
  }

  async triggerImport(brandId: string): Promise<{
    success: boolean;
    data: GameImportTriggerResponse;
    message: string;
  }> {
    const response = await adminSvc.post<{
      success: boolean;
      data: GameImportTriggerResponse;
      message: string;
    }>(`/settings/game-import/trigger?brand_id=${brandId}`);
    return response;
  }
}

export const gameImportService = new GameImportService();
