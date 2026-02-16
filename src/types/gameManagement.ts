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
  photo: string;
  enabled: boolean;
  game_id: string;
  internal_name: string;
  integration_partner: string;
  provider: string;
  created_at: string;
  updated_at: string;
  rtp_percent?: string;
}

export interface CreateGameRequest {
  name: string;
  status: GameStatus;
  photo?: string;
  enabled: boolean;
  game_id?: string;
  internal_name?: string;
  integration_partner?: string;
  provider_id: string;
}

export interface UpdateGameRequest {
  name?: string;
  status?: GameStatus;
  photo?: string;
  enabled?: boolean;
  game_id?: string;
  internal_name?: string;
  integration_partner?: string;
  provider_id?: string;
}

// Payload returned in the API `data` field for game list endpoints
export interface GameListResponse {
  games: Game[];
  total_count: number;
  total?: number; // fallback for older responses
  page: number;
  per_page: number;
  total_pages: number;
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
