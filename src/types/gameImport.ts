export type ScheduleType = "daily" | "weekly" | "monthly" | "custom";

export const PROVIDER_NAMES = [
  "Hacksaw",
  "Bgaming",
  "Pragmatic Play",
  "Play'n GO",
  "NetEnt",
  "Evolution",
  "Smartsoft Gaming",
  "NoLimit City",
  "BetOnGames",
  "Playson",
] as const;

export interface GameImportConfig {
  id: string;
  brand_id: string;
  schedule_type: ScheduleType;
  schedule_cron: string | null;
  providers: string[] | null;
  directus_url: string | null;
  check_frequency_minutes: number | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateGameImportConfigRequest {
  brand_id: string;
  schedule_type: ScheduleType;
  schedule_cron?: string | null;
  providers?: string[] | null;
  directus_url?: string | null;
  check_frequency_minutes?: number | null;
  is_active: boolean;
}

export interface GameImportTriggerResponse {
  games_imported: number;
  house_edges_imported: number;
  total_fetched: number;
  filtered: number;
  duplicates_skipped: number;
  errors: string[];
  import_time: string;
}
