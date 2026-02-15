export interface FalconLiquidityData {
  id: string;
  user_id: string;
  transaction_id: string;
  message_type: "casino" | "sport";
  status: "pending" | "sent" | "failed" | "acknowledged";
  message_data: any;
  created_at: string;
  updated_at: string;
}

export interface FalconLiquidityListResponse {
  success: boolean;
  data: {
    messages: FalconLiquidityData[];
    total: number;
    limit: number;
    offset: number;
  };
  message: string;
}

export interface FalconLiquidityFilters {
  page?: number;
  per_page?: number;
  message_type?: "casino" | "sport";
  status?: "pending" | "sent" | "failed" | "acknowledged";
  transaction_id?: string;
  user_id?: string;
  message_id?: string;
  date_from?: string; // YYYY-MM-DD format
  date_to?: string; // YYYY-MM-DD format
  reconciliation_status?: string;
}

export interface FalconLiquiditySummary {
  total_messages: number;
  pending_messages: number;
  sent_messages: number;
  failed_messages: number;
  acknowledged_messages: number;
  casino_messages: number;
  sport_messages: number;
}
