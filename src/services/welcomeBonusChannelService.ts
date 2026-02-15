import { adminSvc } from "./apiService";
import { WelcomeBonusChannelRule, WelcomeBonusChannelSettings } from "../types";

export class WelcomeBonusChannelService {
  /**
   * Get all welcome bonus channels for a brand
   */
  async getChannels(brandId: string): Promise<WelcomeBonusChannelSettings> {
    try {
      const response = await adminSvc.get<WelcomeBonusChannelSettings>(
        `/settings/welcome-bonus/channels?brand_id=${brandId}`,
      );
      return response.data || { channels: [] };
    } catch (error: any) {
      console.error("Failed to get welcome bonus channels:", error);
      throw error;
    }
  }

  /**
   * Create a new welcome bonus channel rule
   */
  async createChannel(
    brandId: string,
    channel: Omit<WelcomeBonusChannelRule, "id">,
  ): Promise<WelcomeBonusChannelRule> {
    try {
      const response = await adminSvc.post<WelcomeBonusChannelRule>(
        "/settings/welcome-bonus/channels",
        {
          brand_id: brandId,
          ...channel,
        },
      );
      return response.data!;
    } catch (error: any) {
      console.error("Failed to create welcome bonus channel:", error);
      throw error;
    }
  }

  /**
   * Update an existing welcome bonus channel rule
   */
  async updateChannel(
    channelId: string,
    brandId: string,
    channel: Omit<WelcomeBonusChannelRule, "id">,
  ): Promise<WelcomeBonusChannelRule> {
    try {
      const response = await adminSvc.put<WelcomeBonusChannelRule>(
        `/settings/welcome-bonus/channels/${channelId}`,
        {
          brand_id: brandId,
          ...channel,
        },
      );
      return response.data!;
    } catch (error: any) {
      console.error("Failed to update welcome bonus channel:", error);
      throw error;
    }
  }

  /**
   * Delete a welcome bonus channel rule
   */
  async deleteChannel(channelId: string): Promise<void> {
    try {
      await adminSvc.delete(`/settings/welcome-bonus/channels/${channelId}`);
    } catch (error: any) {
      console.error("Failed to delete welcome bonus channel:", error);
      throw error;
    }
  }
}

export const welcomeBonusChannelService = new WelcomeBonusChannelService();
