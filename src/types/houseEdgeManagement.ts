export type GameType =
  | "slot"
  | "sports"
  | "table"
  | "live"
  | "crash"
  | "plinko"
  | "wheel";
export type GameVariant =
  | "classic"
  | "v1"
  | "v2"
  | "demo"
  | "real"
  | "mobile"
  | "desktop";

export const GAME_TYPES: { value: GameType; label: string }[] = [
  { value: "slot", label: "Slot" },
  { value: "sports", label: "Sports" },
  { value: "table", label: "Table" },
  { value: "live", label: "Live" },
  { value: "crash", label: "Crash" },
  { value: "plinko", label: "Plinko" },
  { value: "wheel", label: "Wheel" },
];

export const GAME_VARIANTS: { value: GameVariant; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "v1", label: "Version 1" },
  { value: "v2", label: "Version 2" },
  { value: "demo", label: "Demo" },
  { value: "real", label: "Real" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
];

export interface HouseEdge {
  id: string;
  game_id?: string;
  game_name?: string;
  game_type: GameType;
  game_variant: GameVariant;
  house_edge: string;
  house_edge_percent?: string;
  min_bet: string;
  max_bet: string;
  is_active: boolean;
  effective_from: string;
  effective_until: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHouseEdgeRequest {
  game_id?: string;
  game_type: GameType;
  game_variant: GameVariant;
  house_edge: string;
  min_bet: string;
  max_bet: string;
  is_active: boolean;
  effective_from?: string;
  effective_until?: string;
}

export interface UpdateHouseEdgeRequest {
  game_id?: string;
  game_type?: GameType;
  game_variant?: GameVariant;
  house_edge?: string;
  min_bet?: string;
  max_bet?: string;
  is_active?: boolean;
  effective_from?: string;
  effective_until?: string;
}

export interface BulkCreateHouseEdgeRequest {
  game_ids: string[];
  game_type: string;
  game_variant?: string;
  house_edge: string;
  min_bet: string;
  max_bet?: string;
  is_active: boolean;
  effective_from?: string;
  effective_until?: string;
}

export interface HouseEdgeListResponse {
  success: boolean;
  data: {
    house_edges: HouseEdge[];
    total_count: number;
    total?: number; // fallback
    page: number;
    per_page: number;
    total_pages: number;
  };
  message: string;
}

export interface HouseEdgeFilters {
  page?: number;
  per_page?: number;
  search?: string; // Search by game_id and game name
  game_id?: string; // Specific game ID search
  game_type?: string;
  game_variant?: string;
  is_active?: boolean;
  sort_by?:
    | "game_type"
    | "game_variant"
    | "house_edge"
    | "created_at"
    | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface HouseEdgeStats {
  total_house_edges: number;
  active_house_edges: number;
  inactive_house_edges: number;
  unique_game_types: number;
  unique_game_variants: number;
}
