import { UUID } from "crypto";

export type TransactionType = "deposit" | "withdraw";

// Welcome Bonus Channel Settings Types
export interface WelcomeBonusChannelRule {
  id: string;
  channel: string;
  referrer_patterns: string[];
  enabled: boolean;
  bonus_type: "fixed" | "percentage";
  fixed_amount?: number;
  percentage?: number;
  max_bonus_percentage?: number;
  max_deposit_amount?: number;
  inherit_ip_policy: boolean;
  ip_restriction_enabled: boolean;
  allow_multiple_bonuses_per_ip: boolean;
}

export interface WelcomeBonusChannelSettings {
  channels: WelcomeBonusChannelRule[];
}

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "awaiting_admin_review";

export interface Transaction {
  id: string;
  user_id: string;
  username?: string;
  deposit_session_id: string;
  withdrawal_id: string;
  chain_id: string;
  currency_code: string;
  protocol: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: number;
  balance_before_cents: number;
  balance_after_cents: number;
  usd_amount_cents: number;
  exchange_rate: number;
  fee: number;
  block_number: number;
  block_hash: string;
  status: string;
  confirmations: number;
  timestamp: string;
  verified_at: string;
  processor: string;
  transaction_type: TransactionType;
  metadata: any | null;
  created_at: string;
  updated_at: string;
  // Computed/derived fields for UI compatibility
  network?: string;
  crypto_currency?: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  username?: string;
  withdrawal_id: string;
  chain_id: string;
  currency_code: string;
  protocol: string;
  usd_amount_cents: number;
  crypto_amount: number;
  exchange_rate: number;
  fee_cents: number;
  fee_usd_cents: number;
  to_address: string;
  tx_hash: string;
  status: WithdrawalStatus;
  requires_admin_review: boolean;
  processed_by_system: boolean;
  source_wallet_address: string;
  amount_reserved_cents: number;
  reservation_released: boolean;
  estimated_fee: number;
  created_at: string;
  updated_at: string;
  // Optional fields that may not be in API response
  admin_id?: string | null;
  admin_review_deadline?: string | null;
  admin_review_reason?: string | null;
  reservation_released_at?: string | null;
  metadata?: any;
  // Computed/derived fields for UI compatibility
  network?: string;
  crypto_currency?: string;
}

export interface Balance {
  id: string;
  user_id: string;
  currency_code: string;
  amount_cents: number;
  amount_units: string;
  reserved_cents: number;
  reserved_units: string;
  updated_at: string;
}

export interface DepositSession {
  id: string;
  session_id: string;
  user_id: string;
  username?: string;
  chain_id: string;
  network: string;
  crypto_currency: string;
  amount: number;
  usd_amount_cents: number;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "expired";
  wallet_address: string;
  qr_code_data?: string;
  payment_link?: string;
  metadata?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  tx_hash?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface ManualFund {
  id: UUID;
  user_id: UUID;
  username?: string;
  admin_id: UUID;
  admin_name?: string;
  transaction_id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";
  amount_cents: number;
  currency_code: string;
  note: string;
  reason: string;
  created_at: string;
}

export interface AdminActivityLog {
  id: UUID;
  admin_user_id: UUID;
  action: string;
  resource_type: string;
  resource_id?: UUID | null;
  description: string;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  severity: "low" | "info" | "warning" | "error" | "critical";
  category: string;
  created_at: string;
  updated_at: string;
  admin_username?: string;
  admin_email?: string;
}

export interface AdminActivityCategory {
  id: UUID;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminActivityAction {
  id: UUID;
  name: string;
  description?: string | null;
  category_id: UUID;
  is_active: boolean;
  created_at: string;
}

export interface AdminActivityStats {
  total_logs: number;
  logs_by_category: Record<string, number>;
  logs_by_severity: Record<string, number>;
  recent_activity: AdminActivityLog[];
}

export interface AdminActivityLogsResponse {
  success: boolean;
  data: {
    logs: AdminActivityLog[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  error?: string;
}

export interface AdminActivityFilters {
  admin_user_id?: UUID;
  action?: string;
  resource_type?: string;
  category?: string;
  severity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Alert System Types
export type AlertType =
  | "bets_count_less"
  | "bets_count_more"
  | "bets_amount_less"
  | "bets_amount_more"
  | "deposits_total_less"
  | "deposits_total_more"
  | "deposits_type_less"
  | "deposits_type_more"
  | "withdrawals_total_less"
  | "withdrawals_total_more"
  | "withdrawals_type_less"
  | "withdrawals_type_more"
  | "ggr_total_less"
  | "ggr_total_more"
  | "ggr_single_more"
  | "multiple_accounts_same_ip";

export type AlertStatus = "active" | "inactive" | "triggered";

export type CurrencyType = "USD" | "BTC" | "ETH" | "SOL" | "USDT" | "USDC";

export interface AlertConfiguration {
  id: UUID;
  name: string;
  description?: string;
  alert_type: AlertType;
  status: AlertStatus;
  threshold_amount: number;
  time_window_minutes: number;
  currency_code?: CurrencyType;
  email_notifications: boolean;
  webhook_url?: string;
  email_group_ids?: UUID[];
  created_by?: UUID;
  created_at: string;
  updated_at: string;
  updated_by?: UUID;
}

export interface AlertTrigger {
  id: UUID;
  alert_configuration_id: UUID;
  triggered_at: string;
  trigger_value: number;
  threshold_value: number;
  user_id?: UUID;
  transaction_id?: string;
  amount_usd?: number;
  currency_code?: CurrencyType;
  context_data?: string;
  acknowledged: boolean;
  acknowledged_by?: UUID;
  acknowledged_at?: string;
  created_at: string;

  // Joined fields
  alert_configuration?: AlertConfiguration;
  username?: string;
  user_email?: string;
}

export interface CreateAlertConfigurationRequest {
  name: string;
  description?: string;
  alert_type: AlertType;
  threshold_amount: number;
  time_window_minutes: number;
  currency_code?: CurrencyType;
  email_notifications: boolean;
  webhook_url?: string;
  email_group_ids?: UUID[];
}

export interface UpdateAlertConfigurationRequest {
  name?: string;
  description?: string;
  status?: AlertStatus;
  threshold_amount?: number;
  time_window_minutes?: number;
  currency_code?: CurrencyType;
  email_notifications?: boolean;
  webhook_url?: string;
  email_group_ids?: UUID[];
}

export interface GetAlertConfigurationsRequest {
  page?: number;
  per_page?: number;
  alert_type?: AlertType;
  status?: AlertStatus;
  search?: string;
}

export interface GetAlertTriggersRequest {
  page?: number;
  per_page?: number;
  alert_configuration_id?: UUID;
  user_id?: UUID;
  acknowledged?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AlertConfigurationResponse {
  success: boolean;
  message: string;
  data?: AlertConfiguration;
  error?: string;
}

export interface AlertConfigurationsResponse {
  success: boolean;
  message: string;
  data: AlertConfiguration[];
  total_count: number;
  page: number;
  per_page: number;
  error?: string;
}

export interface AlertTriggerResponse {
  success: boolean;
  message: string;
  data?: AlertTrigger;
  error?: string;
}

export interface AlertTriggersResponse {
  success: boolean;
  message: string;
  data: AlertTrigger[];
  total_count: number;
  page: number;
  per_page: number;
  error?: string;
}

export interface AcknowledgeAlertRequest {
  acknowledged: boolean;
}

// Email Group Types
export interface AlertEmailGroup {
  id: UUID;
  name: string;
  description?: string;
  created_by?: UUID;
  created_at: string;
  updated_at: string;
  updated_by?: UUID;
  emails?: string[];
}

export interface CreateAlertEmailGroupRequest {
  name: string;
  description?: string;
  emails: string[];
}

export interface UpdateAlertEmailGroupRequest {
  name?: string;
  description?: string;
  emails?: string[];
}

export interface AlertEmailGroupResponse {
  success: boolean;
  message: string;
  data?: AlertEmailGroup;
  error?: string;
}

export interface AlertEmailGroupsResponse {
  success: boolean;
  message: string;
  data: AlertEmailGroup[];
  total_count: number;
  error?: string;
}

export interface WithdrawalStats {
  pending_review: number;
  approved_today: number;
  rejected_today: number;
  total_withdrawals: number;
  completed_withdrawals: number;
  total_amount_cents: number;
  today_amount_cents: number;
  hourly_amount_cents: number;
}

export interface AdminWithdrawalTresholdField {
  amount_cents: number;
  currency_code: string;
  check_enabled: boolean;
}

export interface AdminWithdrawalTresholds {
  hourly_volume: AdminWithdrawalTresholdField;
  daily_volume: AdminWithdrawalTresholdField;
  weekly_volume: AdminWithdrawalTresholdField;
  monthly_volume: AdminWithdrawalTresholdField;
  yearly_volume: AdminWithdrawalTresholdField;
}

export interface WithdrawalGlobalStatus {
  enabled: boolean;
  reason?: string;
  paused_by?: string;
  paused_at?: string;
}
