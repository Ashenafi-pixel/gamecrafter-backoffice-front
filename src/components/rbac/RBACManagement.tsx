import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Settings,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRolePermissionsRequest,
  AssignRoleToUserRequest,
} from "../../types/rbac";
import { toast } from "react-hot-toast";
import { RBACExample } from "./RBACExample";

export const RBACManagement: React.FC = () => {
  const { rbacSvc } = useServices();
  const [activeTab, setActiveTab] = useState<
    "roles" | "permissions" | "assignments" | "example"
  >("roles");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form states
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const [assignmentForm, setAssignmentForm] = useState({
    userId: "",
    roleId: "",
  });

  // User search state
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadUsers();
  }, []);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter roles based on search term
  useEffect(() => {
    if (searchTerm) {
      setFilteredRoles(
        roles.filter(
          (role) =>
            role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description?.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    } else {
      setFilteredRoles(roles);
    }
  }, [roles, searchTerm]);

  // Filter users based on search term
  useEffect(() => {
    if (userSearchTerm) {
      const filtered = users.filter(
        (user) =>
          user.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.phoneNumber
            ?.toLowerCase()
            .includes(userSearchTerm.toLowerCase()),
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, userSearchTerm]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await rbacSvc.getRoles({ page: 1, per_page: 100 });
      setRoles(rolesData);
    } catch (error) {
      console.error("Failed to load roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const permissionsData = await rbacSvc.getPermissions({
        page: 1,
        per_page: 400,
      });
      setPermissions(permissionsData);
    } catch (error) {
      console.error("Failed to load permissions:", error);
      toast.error("Failed to load permissions");
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersData = await rbacSvc.searchUsers(""); // Empty search to get all users
      console.log("Users API response:", usersData); // Debug log

      // Ensure usersData is an array
      if (Array.isArray(usersData)) {
        setUsers(usersData);
      } else if (usersData && Array.isArray(usersData.data)) {
        setUsers(usersData.data);
      } else {
        console.warn("Unexpected users data structure:", usersData);
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
      setUsers([]); // Set empty array on error
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const request: CreateRoleRequest = {
        name: roleForm.name,
        permissions: roleForm.permissions,
      };

      const newRole = await rbacSvc.createRole(request);
      setRoles((prev) => [...prev, newRole]);
      resetRoleForm();
      setShowRoleModal(false);
      toast.success("Role created successfully");
    } catch (error) {
      console.error("Failed to create role:", error);
      toast.error("Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRolePermissions = async (
    roleId: string,
    newPermissions: string[],
  ) => {
    try {
      setLoading(true);
      const request: UpdateRolePermissionsRequest = {
        role_id: roleId,
        permissions: newPermissions,
      };

      await rbacSvc.updateRolePermissions(request);
      await loadRoles(); // Reload to get updated data
      toast.success("Role permissions updated successfully");
    } catch (error) {
      console.error("Failed to update role permissions:", error);
      toast.error("Failed to update role permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      setLoading(true);
      await rbacSvc.removeRole({ role_id: roleId });
      setRoles((prev) => prev.filter((role) => role.id !== roleId));
      toast.success("Role deleted successfully");
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const request: AssignRoleToUserRequest = {
        user_id: assignmentForm.userId,
        role_id: assignmentForm.roleId,
      };

      await rbacSvc.assignRoleToUser(request);
      resetAssignmentForm();
      setShowAssignmentModal(false);
      toast.success("Role assigned successfully");
    } catch (error) {
      console.error("Failed to assign role:", error);
      toast.error("Failed to assign role");
    } finally {
      setLoading(false);
    }
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: "",
      description: "",
      permissions: [],
    });
    setEditingRole(null);
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      userId: "",
      roleId: "",
    });
    setSelectedUser(null);
    setUserSearchTerm("");
    setShowUserDropdown(false);
  };

  const toggleRoleExpansion = (roleId: string) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const togglePermission = (permissionId: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setAssignmentForm((prev) => ({ ...prev, userId: user.id }));
    setUserSearchTerm(`${user.username} - ${user.email}`);
    setShowUserDropdown(false);
  };

  const getPermissionName = (permissionId: string) => {
    const permission = permissions.find((p) => p.id === permissionId);
    return permission?.name || permissionId;
  };

  const getPermissionDescription = (permissionId: string) => {
    const permission = permissions.find((p) => p.id === permissionId);
    return permission?.description || "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">RBAC Management</h1>
          <p className="text-gray-400 mt-1">
            Manage roles, permissions, and user assignments
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowRoleModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Role</span>
          </button>
          <button
            onClick={() => setShowAssignmentModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <UserCheck className="h-4 w-4" />
            <span>Assign Role to Admin</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Roles</p>
              <p className="text-2xl font-bold text-white mt-1">
                {roles.length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Permissions</p>
              <p className="text-2xl font-bold text-white mt-1">
                {permissions.length}
              </p>
            </div>
            <Key className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Assignments</p>
              <p className="text-2xl font-bold text-white mt-1">-</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Status</p>
              <p className="text-2xl font-bold text-green-400 mt-1">Active</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("roles")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "roles"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Roles & Permissions
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "permissions"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Key className="h-4 w-4 inline mr-2" />
              All Permissions
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "assignments"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              User Assignments
            </button>
            <button
              onClick={() => setActiveTab("example")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "example"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Usage Examples
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-2"
              />
            </div>
          </div>

          {/* Roles Tab */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-400 mt-2">Loading roles...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      className="bg-gray-700 border border-gray-600 rounded-lg"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => toggleRoleExpansion(role.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              {expandedRoles.has(role.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <Shield className="h-5 w-5 text-purple-500" />
                            <div>
                              <h3 className="text-white font-medium">
                                {role.name}
                              </h3>
                              {role.description && (
                                <p className="text-gray-400 text-sm">
                                  {role.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400 text-sm">
                              {role.permissions?.length || 0} permissions
                            </span>
                            <button
                              onClick={() => {
                                setEditingRole(role);
                                setRoleForm({
                                  name: role.name,
                                  description: role.description || "",
                                  permissions:
                                    role.permissions?.map((p) => p.id) || [],
                                });
                                setShowPermissionModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedRoles.has(role.id) && (
                        <div className="border-t border-gray-600 p-4 bg-gray-600/30">
                          <h4 className="text-white font-medium mb-3">
                            Permissions
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {role.permissions?.map((permission) => (
                              <div
                                key={permission.id}
                                className="bg-gray-600 rounded px-3 py-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <Key className="h-3 w-3 text-blue-400" />
                                  <span className="text-white text-sm">
                                    {permission.name}
                                  </span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1">
                                  {permission.description}
                                </p>
                              </div>
                            )) || (
                              <p className="text-gray-400 text-sm">
                                No permissions assigned
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === "permissions" && (
            <div className="space-y-4 max-h-96 overflow-y-auto scroll-container">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <Key className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">
                          {permission.name}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">
                  Admin User Role Assignments
                </h3>
                <p className="text-gray-400 mb-4">
                  Manage role assignments for admin users only. Regular players
                  cannot be assigned roles.
                </p>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <p className="text-blue-300 text-sm">
                    <strong>Note:</strong> Only users with admin privileges can
                    be assigned roles. This ensures proper access control and
                    security.
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Assign Role to Admin User
                </button>
              </div>
            </div>
          )}

          {/* Example Tab */}
          {activeTab === "example" && <RBACExample />}
        </div>
      </div>

      {/* Create Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">
              Create New Role
            </h3>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Role Name
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="Enter role name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-20 resize-none"
                  placeholder="Enter role description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Permissions
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg p-3 bg-gray-700">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start space-x-3 p-2 hover:bg-gray-600 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={roleForm.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 rounded border-gray-500"
                      />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">
                          {permission.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {permission.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false);
                    resetRoleForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {showPermissionModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">
              Edit Role Permissions: {editingRole.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Permissions
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg p-3 bg-gray-700">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start space-x-3 p-2 hover:bg-gray-600 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={roleForm.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 rounded border-gray-500"
                      />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">
                          {permission.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {permission.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setEditingRole(null);
                    resetRoleForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateRolePermissions(
                      editingRole.id,
                      roleForm.permissions,
                    );
                    setShowPermissionModal(false);
                    setEditingRole(null);
                    resetRoleForm();
                  }}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-6">
              Assign Role to Admin User
            </h3>

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Search User
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 pr-10"
                      placeholder="Search admin users by username, email, or phone..."
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Searchable Dropdown */}
                  {showUserDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {loadingUsers ? (
                        <div className="p-3 text-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto"></div>
                          <p className="text-gray-400 text-sm mt-1">
                            Loading users...
                          </p>
                        </div>
                      ) : Array.isArray(filteredUsers) &&
                        filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            className="p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {user.username?.charAt(0).toUpperCase() ||
                                    "U"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="text-white font-medium">
                                  {user.username}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {user.email}
                                </div>
                                {user.phoneNumber && (
                                  <div className="text-gray-400 text-sm">
                                    {user.phoneNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center">
                          <p className="text-gray-400 text-sm">
                            No users found
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected User Display */}
                {selectedUser && (
                  <div className="mt-2 p-3 bg-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {selectedUser.username?.charAt(0).toUpperCase() ||
                            "U"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {selectedUser.username}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {selectedUser.email}
                        </div>
                        {selectedUser.phoneNumber && (
                          <div className="text-gray-400 text-sm">
                            {selectedUser.phoneNumber}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setAssignmentForm((prev) => ({
                            ...prev,
                            userId: "",
                          }));
                          setUserSearchTerm("");
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Role
                </label>
                <select
                  value={assignmentForm.roleId}
                  onChange={(e) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      roleId: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    resetAssignmentForm();
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Assigning..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
