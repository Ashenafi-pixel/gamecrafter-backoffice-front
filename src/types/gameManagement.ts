export type GameStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export const GAME_STATUSES: { value: GameStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export interface Game {
  id: string;
  name: string;
  status: GameStatus;
  timestamp: string;
  photo?: string | null;
  price?: string | null;
  enabled: boolean;
  game_id?: string | null;
  internal_name?: string | null;
  integration_partner?: string | null;
  provider?: string | null;
  provider_id: string; // UUID
  created_at: string;
  updated_at: string;
  rtp_percent?: string;
}

export interface CreateGameRequest {
  name: string;
  status: GameStatus;
  photo?: string | null;
  price?: string | null;
  enabled: boolean;
  game_id?: string | null;
  internal_name?: string | null;
  integration_partner?: string | null;
  provider?: string | null;
  provider_id: string; // UUID, required
}

export interface UpdateGameRequest {
  name?: string;
  status?: GameStatus;
  photo?: string | null;
  price?: string | null;
  enabled?: boolean;
  game_id?: string | null;
  internal_name?: string | null;
  integration_partner?: string | null;
  provider?: string | null;
  provider_id?: string; // UUID
}

export interface GameListResponse {
  success: boolean;
  data: {
    games: Game[];
    total_count: number;
    total?: number; // fallback
    page: number;
    per_page: number;
    total_pages: number;
  };
  message: string;
}

export interface GameFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: GameStatus;
  provider?: string;
  game_id?: string; // Filter by game ID
  enabled?: boolean;
  sort_by?: "name" | "status" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
}
