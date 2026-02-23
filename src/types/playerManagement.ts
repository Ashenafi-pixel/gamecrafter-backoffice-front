export interface Player {
  id: number;
  email: string;
  username: string;
  password?: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  default_currency: string;
  brand?: string | null;
  date_of_birth: string; // ISO date string
  country: string;
  state?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  test_account: boolean;
  enable_withdrawal_limit: boolean;
  brand_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlayerRequest {
  email: string;
  username: string;
  password: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  default_currency: string;
  brand?: string | null;
  date_of_birth: string; // ISO date string
  country: string;
  state?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  test_account?: boolean;
  enable_withdrawal_limit?: boolean;
  brand_id?: number | null;
}

export interface CreatePlayerResponse {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface UpdatePlayerRequest {
  id?: number;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  default_currency?: string | null;
  brand?: string | null;
  date_of_birth?: string | null; // ISO date string
  country?: string | null;
  state?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  test_account?: boolean | null;
  enable_withdrawal_limit?: boolean | null;
  brand_id?: number | null;
}

export interface UpdatePlayerResponse {
  player: Player;
}

export interface GetPlayerResponse {
  player: Player;
}

export interface PlayerFilters {
  page: number;
  "per-page": number;
  search?: string;
  brand_id?: number;
  country?: string;
  test_account?: boolean;
}

export interface GetPlayersResponse {
  players: Player[];
  total_count: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

