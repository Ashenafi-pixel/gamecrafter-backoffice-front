import { adminSvc } from "./apiService";

export interface CashbackTier {
  id: string;
  tier_name: string;
  tier_level: number;
  min_expected_ggr_required: string;
  cashback_percentage: string;
  bonus_multiplier: string;
  daily_cashback_limit?: string;
  weekly_cashback_limit?: string;
  monthly_cashback_limit?: string;
  special_benefits?: Record<string, any>;
  is_active: boolean;
  player_count: number;
  created_at: string;
  updated_at: string;
}

export interface CashbackTierUpdateRequest {
  tier_name: string;
  min_ggr_required: string;
  cashback_percentage: string;
  bonus_multiplier: string;
  daily_cashback_limit?: string;
  weekly_cashback_limit?: string;
  monthly_cashback_limit?: string;
  special_benefits?: Record<string, any>;
  is_active: boolean;
}

export interface CashbackStats {
  total_users_with_cashback: number;
  total_cashback_earned: string;
  total_cashback_claimed: string;
  total_cashback_pending: string;
  average_cashback_rate: string;
  tier_distribution: Record<string, number>;
  daily_cashback_claims: string;
  weekly_cashback_claims: string;
  monthly_cashback_claims: string;
}

class CashbackService {
  // Get all cashback tiers
  async getCashbackTiers(): Promise<CashbackTier[]> {
    try {
      const response = await adminSvc.get("/cashback/tiers");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch cashback tiers:", error);
      throw error;
    }
  }

  // Get cashback statistics (admin only)
  async getCashbackStats(): Promise<CashbackStats> {
    try {
      const response = await adminSvc.get("/cashback/stats");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch cashback stats:", error);
      throw error;
    }
  }

  // Create new cashback tier (admin only)
  async createCashbackTier(
    data: CashbackTierUpdateRequest,
  ): Promise<CashbackTier> {
    try {
      const response = await adminSvc.post("/cashback/tiers", data);
      return response.data;
    } catch (error) {
      console.error("Failed to create cashback tier:", error);
      throw error;
    }
  }

  // Update cashback tier (admin only)
  async updateCashbackTier(
    tierId: string,
    data: CashbackTierUpdateRequest,
  ): Promise<CashbackTier> {
    try {
      const response = await adminSvc.put(`/cashback/tiers/${tierId}`, data);
      return response.data;
    } catch (error) {
      console.error("Failed to update cashback tier:", error);
      throw error;
    }
  }

  // Delete cashback tier (admin only)
  async deleteCashbackTier(tierId: string): Promise<void> {
    try {
      await adminSvc.delete(`/cashback/tiers/${tierId}`);
    } catch (error) {
      console.error("Failed to delete cashback tier:", error);
      throw error;
    }
  }

  // Get user cashback summary
  async getUserCashbackSummary(): Promise<any> {
    try {
      const response = await adminSvc.get("/user/cashback");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user cashback summary:", error);
      throw error;
    }
  }

  // Claim cashback
  async claimCashback(amount: string): Promise<any> {
    try {
      const response = await adminSvc.post("/user/cashback/claim", { amount });
      return response.data;
    } catch (error) {
      console.error("Failed to claim cashback:", error);
      throw error;
    }
  }

  // Get user cashback earnings
  async getUserCashbackEarnings(): Promise<any[]> {
    try {
      const response = await adminSvc.get("/user/cashback/earnings");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user cashback earnings:", error);
      throw error;
    }
  }

  // Get user cashback claims
  async getUserCashbackClaims(): Promise<any[]> {
    try {
      const response = await adminSvc.get("/user/cashback/claims");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch user cashback claims:", error);
      throw error;
    }
  }

  // Reorder cashback tiers (admin only)
  async reorderCashbackTiers(tierOrder: string[]): Promise<void> {
    try {
      await adminSvc.post("/cashback/tiers/reorder", { tier_order: tierOrder });
    } catch (error) {
      console.error("Failed to reorder cashback tiers:", error);
      throw error;
    }
  }

  // Process single user level progression (admin only)
  async processSingleLevelProgression(userId: string): Promise<any> {
    try {
      const response = await adminSvc.post("/cashback/level-progression", {
        user_id: userId,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to process single level progression:", error);
      throw error;
    }
  }

  // Process bulk level progression (admin only)
  async processBulkLevelProgression(userIds: string[]): Promise<any> {
    try {
      const response = await adminSvc.post("/cashback/bulk-level-progression", {
        user_ids: userIds,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to process bulk level progression:", error);
      throw error;
    }
  }

  // Get level progression info for a user (admin only)
  async getLevelProgressionInfo(userId: string): Promise<any> {
    try {
      // Use admin endpoint to get level progression for any user
      const response = await adminSvc.get(
        `/cashback/level-progression-info?user_id=${userId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch level progression info:", error);
      throw error;
    }
  }
}

export const cashbackService = new CashbackService();
