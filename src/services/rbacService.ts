import { ApiService } from "./apiService";
import {
  Permission,
  Role,
  CreateRoleRequest,
  UpdateRolePermissionsRequest,
  AssignRoleToUserRequest,
  RemoveRoleRequest,
  GetPermissionRequest,
  GetRoleRequest,
  UserRolesResponse,
  AssignRoleToUserResponse,
  UpdateRolePermissionsResponse,
  UpsertPermissionRequest,
  BulkUpdatePermissionsRequiresValueRequest,
  BulkUpdatePermissionsRequiresValueResponse,
} from "../types/rbac";

export class RBACService {
  constructor(private apiService: ApiService) {}

  // Permissions
  async getPermissions(request: GetPermissionRequest): Promise<Permission[]> {
    const response = await this.apiService.get<Permission[]>(
      `/permissions?page=${request.page}&per-page=${request.per_page}`,
    );
    return response.data || [];
  }

  async createPermission(
    request: UpsertPermissionRequest,
  ): Promise<Permission> {
    const response = await this.apiService.post<Permission>(
      "/permissions",
      request,
    );
    return response.data!;
  }

  async updatePermission(
    permissionId: string,
    request: UpsertPermissionRequest,
  ): Promise<Permission> {
    const response = await this.apiService.patch<Permission>(
      `/permissions/${permissionId}`,
      request,
    );
    return response.data!;
  }

  async deletePermission(permissionId: string): Promise<void> {
    await this.apiService.delete(`/permissions/${permissionId}`);
  }

  async bulkUpdatePermissionsRequiresValue(
    request: BulkUpdatePermissionsRequiresValueRequest,
  ): Promise<BulkUpdatePermissionsRequiresValueResponse> {
    const response =
      await this.apiService.patch<BulkUpdatePermissionsRequiresValueResponse>(
        "/permissions/requires-value",
        request,
      );
    return response.data!;
  }

  // Roles
  async getRoles(request: GetRoleRequest): Promise<Role[]> {
    const response = await this.apiService.get<Role[]>(
      `/roles?page=${request.page}&per-page=${request.per_page}`,
    );
    return response.data || [];
  }

  async createRole(request: CreateRoleRequest): Promise<Role> {
    const response = await this.apiService.post<Role>("/roles", request);
    return response.data!;
  }

  async updateRolePermissions(
    request: UpdateRolePermissionsRequest,
  ): Promise<UpdateRolePermissionsResponse> {
    const response = await this.apiService.patch<UpdateRolePermissionsResponse>(
      "/roles",
      request,
    );
    return response.data!;
  }

  async removeRole(request: RemoveRoleRequest): Promise<void> {
    await this.apiService.delete("/roles", request);
  }

  async getRoleUsers(roleId: string): Promise<UserRolesResponse> {
    const response = await this.apiService.get<UserRolesResponse>(
      `/roles/${roleId}/users`,
    );
    return response.data!;
  }

  // User Role Management
  async assignRoleToUser(
    request: AssignRoleToUserRequest,
  ): Promise<AssignRoleToUserResponse> {
    const response = await this.apiService.post<AssignRoleToUserResponse>(
      "/users/roles",
      request,
    );
    return response.data!;
  }

  async revokeUserRole(userId: string, roleId: string): Promise<void> {
    await this.apiService.delete("/users/roles", {
      user_id: userId,
      role_id: roleId,
    });
  }

  async getUserRoles(userId: string): Promise<UserRolesResponse> {
    const response = await this.apiService.get<UserRolesResponse>(
      `/users/${userId}/roles`,
    );
    return response.data!;
  }

  // User search functionality - only returns admin users for RBAC
  async searchUsers(searchTerm: string): Promise<any[]> {
    try {
      const response = await this.apiService.get<any[]>("/users_admin", {
        params: {
          page: 1,
          per_page: 50,
        },
      });

      console.log("Search admin users API response:", response); // Debug log

      // Handle different response structures
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn(
          "Unexpected search admin users response structure:",
          response,
        );
        return [];
      }
    } catch (error) {
      console.error("Search admin users API error:", error);
      return [];
    }
  }
}
