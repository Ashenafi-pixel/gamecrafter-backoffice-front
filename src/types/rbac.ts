export interface Permission {
  id: string;
  name: string;
  description: string;
  requires_value?: boolean; // Whether this permission needs a value/limit
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  // Returned by backend for role edit forms so we can prefill value/limit fields
  permissions_with_value?: PermissionWithValue[];
}

export interface UserRole {
  user_id: string;
  role_id: string;
}

export interface UserRolesResponse {
  user_id: string;
  roles: Role[];
}

export interface PermissionWithValue {
  permission_id: string;
  value?: number | null; // NULL = unlimited, number = specific limit
  limit_type?: "daily" | "weekly" | "monthly" | null; // Type of limit period
  limit_period?: number | null; // Number of periods (e.g., 1 for "1 daily", 2 for "2 weekly")
}

export interface CreateRoleRequest {
  name: string;
  permissions: PermissionWithValue[];
}

export interface UpdateRolePermissionsRequest {
  role_id: string;
  permissions: PermissionWithValue[];
}

export interface UpdateRolePermissionsResponse {
  message: string;
  role: Role;
}

export interface AssignRoleToUserRequest {
  role_id: string;
  user_id: string;
}

export interface AssignRoleToUserResponse {
  user_id: string;
  roles: Role[];
}

export interface RemoveRoleRequest {
  role_id: string;
}

export interface GetPermissionRequest {
  page: number;
  per_page: number;
}

export interface UpsertPermissionRequest {
  name: string;
  description: string;
  requires_value: boolean;
}

export interface BulkUpdatePermissionsRequiresValueRequest {
  permission_ids: string[];
  requires_value: boolean;
}

export interface BulkUpdatePermissionsRequiresValueResponse {
  updated_count: number;
}

export interface GetRoleRequest {
  page: number;
  per_page: number;
}

export interface PermissionToRoute {
  id: string;
  endpoint: string;
  name: string;
  method: string;
  description: string;
}

export interface GetPermissionData {
  permission: Permission;
  roles: Role[];
}

export interface GetPermissionResponse {
  message: string;
  data: GetPermissionData;
}

export interface RolePermission {
  role_id: string;
  permissions: string[];
}

export interface AssignPermissionToRoleData {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface AssignPermissionToRoleResponse {
  message: string;
  data: AssignPermissionToRoleData;
}
