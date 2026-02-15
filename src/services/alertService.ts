import {
  AlertConfiguration,
  AlertTrigger,
  CreateAlertConfigurationRequest,
  UpdateAlertConfigurationRequest,
  GetAlertConfigurationsRequest,
  GetAlertTriggersRequest,
  AlertConfigurationResponse,
  AlertConfigurationsResponse,
  AlertTriggerResponse,
  AlertTriggersResponse,
  AcknowledgeAlertRequest,
  AlertEmailGroup,
  CreateAlertEmailGroupRequest,
  UpdateAlertEmailGroupRequest,
  AlertEmailGroupResponse,
  AlertEmailGroupsResponse,
} from "../types";
import { adminSvc } from "./apiService";

class AlertService {
  private basePath = "/system-config/alerts";
  private emailGroupsPath = "/alerts/email-groups";

  // Alert Configuration methods
  async getAlertConfigurations(
    params?: GetAlertConfigurationsRequest,
  ): Promise<AlertConfigurationsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    if (params?.alert_type) queryParams.append("alert_type", params.alert_type);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    const url = `${this.basePath}/configurations${queryString ? `?${queryString}` : ""}`;

    const response = await adminSvc.get(url);

    // Ensure data is always an array, even if API returns null
    if (response.success && response.data === null) {
      response.data = [];
    }

    return response;
  }

  async getAlertConfiguration(id: string): Promise<AlertConfigurationResponse> {
    const response = await adminSvc.get(
      `${this.basePath}/configurations/${id}`,
    );
    return response;
  }

  async createAlertConfiguration(
    data: CreateAlertConfigurationRequest,
  ): Promise<AlertConfigurationResponse> {
    const response = await adminSvc.post(
      `${this.basePath}/configurations`,
      data,
    );
    return response;
  }

  async updateAlertConfiguration(
    id: string,
    data: UpdateAlertConfigurationRequest,
  ): Promise<AlertConfigurationResponse> {
    const response = await adminSvc.put(
      `${this.basePath}/configurations/${id}`,
      data,
    );
    return response;
  }

  async deleteAlertConfiguration(
    id: string,
  ): Promise<AlertConfigurationResponse> {
    const response = await adminSvc.delete(
      `${this.basePath}/configurations/${id}`,
    );
    return response;
  }

  // Alert Trigger methods
  async getAlertTriggers(
    params?: GetAlertTriggersRequest,
  ): Promise<AlertTriggersResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page)
      queryParams.append("per_page", params.per_page.toString());
    if (params?.alert_configuration_id)
      queryParams.append(
        "alert_configuration_id",
        params.alert_configuration_id,
      );
    if (params?.user_id) queryParams.append("user_id", params.user_id);
    if (params?.acknowledged !== undefined)
      queryParams.append("acknowledged", params.acknowledged.toString());
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);
    if (params?.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    const url = `${this.basePath}/triggers${queryString ? `?${queryString}` : ""}`;

    const response = await adminSvc.get<AlertTriggersResponse>(url);

    console.log("Raw triggers response from adminSvc:", response);

    // Handle different response structures
    if (response && response.success) {
      // If data is directly in response
      if (Array.isArray(response.data)) {
        return {
          success: response.success,
          message: response.message || "Success",
          data: response.data,
          total_count: response.total_count || response.data.length,
          page: response.page || params?.page || 1,
          per_page: response.per_page || params?.per_page || 20,
        };
      }

      // If data is null or undefined, return empty array
      if (response.data === null || response.data === undefined) {
        return {
          success: response.success,
          message: response.message || "No triggers found",
          data: [],
          total_count: 0,
          page: params?.page || 1,
          per_page: params?.per_page || 20,
        };
      }

      // If response.data is the full AlertTriggersResponse structure
      if (typeof response.data === "object" && "data" in response.data) {
        const nestedData = response.data as any;
        return {
          success: nestedData.success ?? response.success,
          message: nestedData.message || response.message || "Success",
          data: Array.isArray(nestedData.data) ? nestedData.data : [],
          total_count: nestedData.total_count || 0,
          page: nestedData.page || params?.page || 1,
          per_page: nestedData.per_page || params?.per_page || 20,
        };
      }
    }

    // Fallback for error cases
    return {
      success: false,
      message: response?.message || "Failed to load alert triggers",
      data: [],
      total_count: 0,
      page: params?.page || 1,
      per_page: params?.per_page || 20,
    };
  }

  async getAlertTrigger(id: string): Promise<AlertTriggerResponse> {
    const response = await adminSvc.get(`${this.basePath}/triggers/${id}`);
    return response;
  }

  async acknowledgeAlert(
    id: string,
    data: AcknowledgeAlertRequest,
  ): Promise<AlertTriggerResponse> {
    const response = await adminSvc.put(
      `${this.basePath}/triggers/${id}/acknowledge`,
      data,
    );
    return response;
  }

  // Helper methods for alert types
  getAlertTypeLabel(alertType: string): string {
    const labels: Record<string, string> = {
      bets_count_less: "Less than X bets in Y minutes",
      bets_count_more: "More than X bets in Y minutes",
      bets_amount_less: "Less than X USD in bets in Y minutes",
      bets_amount_more: "More than X USD in bets in Y minutes",
      deposits_total_less: "Less than X USD total deposits in Y minutes",
      deposits_total_more: "More than X USD total deposits in Y minutes",
      deposits_type_less: "Less than X USD deposits of type Z in Y minutes",
      deposits_type_more: "More than X USD deposits of type Z in Y minutes",
      withdrawals_total_less: "Less than X USD total withdrawals in Y minutes",
      withdrawals_total_more: "More than X USD total withdrawals in Y minutes",
      withdrawals_type_less:
        "Less than X USD withdrawals of type Z in Y minutes",
      withdrawals_type_more:
        "More than X USD withdrawals of type Z in Y minutes",
      ggr_total_less: "Less than X USD GGR in Y minutes",
      ggr_total_more: "More than X USD GGR in Y minutes",
      ggr_single_more: "More than X USD GGR in a single transaction",
      multiple_accounts_same_ip:
        "More than X accounts created from same IP in Y minutes",
    };
    return labels[alertType] || alertType;
  }

  getAlertTypeDescription(alertType: string): string {
    const descriptions: Record<string, string> = {
      bets_count_less:
        "Triggers when the number of bets is below the threshold within the time window",
      bets_count_more:
        "Triggers when the number of bets exceeds the threshold within the time window",
      bets_amount_less:
        "Triggers when the total bet amount in USD is below the threshold within the time window",
      bets_amount_more:
        "Triggers when the total bet amount in USD exceeds the threshold within the time window",
      deposits_total_less:
        "Triggers when total deposits in USD are below the threshold within the time window",
      deposits_total_more:
        "Triggers when total deposits in USD exceed the threshold within the time window",
      deposits_type_less:
        "Triggers when deposits of a specific currency type are below the threshold within the time window",
      deposits_type_more:
        "Triggers when deposits of a specific currency type exceed the threshold within the time window",
      withdrawals_total_less:
        "Triggers when total withdrawals in USD are below the threshold within the time window",
      withdrawals_total_more:
        "Triggers when total withdrawals in USD exceed the threshold within the time window",
      withdrawals_type_less:
        "Triggers when withdrawals of a specific currency type are below the threshold within the time window",
      withdrawals_type_more:
        "Triggers when withdrawals of a specific currency type exceed the threshold within the time window",
      ggr_total_less:
        "Triggers when total GGR in USD is below the threshold within the time window",
      ggr_total_more:
        "Triggers when total GGR in USD exceeds the threshold within the time window",
      ggr_single_more:
        "Triggers when a single transaction GGR exceeds the threshold",
      multiple_accounts_same_ip:
        "Triggers when more than the threshold number of accounts are created from the same IP address within the time window",
    };
    return descriptions[alertType] || "No description available";
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: "text-green-600 bg-green-100",
      inactive: "text-gray-600 bg-gray-100",
      triggered: "text-red-600 bg-red-100",
    };
    return colors[status] || "text-gray-600 bg-gray-100";
  }

  formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  formatTimeWindow(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? "s" : ""}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}` : ""}`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days} day${days !== 1 ? "s" : ""}${remainingHours > 0 ? ` ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}` : ""}`;
    }
  }

  // Email Group methods
  async getAllEmailGroups(): Promise<AlertEmailGroupsResponse> {
    const response = await adminSvc.get(this.emailGroupsPath);

    // Handle wrapped response structure
    if (response.success && response.data) {
      // If data contains the full response structure
      if (
        typeof response.data === "object" &&
        "data" in response.data &&
        Array.isArray(response.data.data)
      ) {
        return {
          success: response.data.success ?? true,
          message: response.data.message || response.message || "Success",
          data: response.data.data,
          total_count:
            response.data.total_count || response.data.data.length || 0,
        };
      }
      // If data is directly the array
      if (Array.isArray(response.data)) {
        return {
          success: response.success,
          message: response.message || "Success",
          data: response.data,
          total_count: response.data.length,
        };
      }
    }

    // Default fallback
    return {
      success: response.success || false,
      message: response.message || "Failed to load email groups",
      data: [],
      total_count: 0,
    };
  }

  async getEmailGroup(id: string): Promise<AlertEmailGroupResponse> {
    const response = await adminSvc.get(`${this.emailGroupsPath}/${id}`);
    return response;
  }

  async createEmailGroup(
    data: CreateAlertEmailGroupRequest,
  ): Promise<AlertEmailGroupResponse> {
    const response = await adminSvc.post(this.emailGroupsPath, data);
    return response;
  }

  async updateEmailGroup(
    id: string,
    data: UpdateAlertEmailGroupRequest,
  ): Promise<AlertEmailGroupResponse> {
    const response = await adminSvc.put(`${this.emailGroupsPath}/${id}`, data);
    return response;
  }

  async deleteEmailGroup(id: string): Promise<AlertEmailGroupResponse> {
    const response = await adminSvc.delete(`${this.emailGroupsPath}/${id}`);
    return response;
  }
}

export const alertService = new AlertService();
