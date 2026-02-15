import React, { useEffect, useState } from "react";
import {
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  AlertTriangle,
  MoreVertical,
  Ban,
  CheckCircle,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { toast } from "react-hot-toast";

// Role management removed in favor of RBAC page

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  lastLogin: string;
  status: string;
  createdDate: string;
  is_admin?: boolean;
  user_type?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_admin: boolean;
  user_type: string;
}

interface UpdateUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_admin?: boolean;
  user_type?: string;
  status?: string;
}

export const SecurityManagement: React.FC = () => {
  const { adminSvc } = useServices();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<User[]>([]);
  const [newAdminUserId, setNewAdminUserId] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    is_admin: true,
    user_type: "ADMIN",
  });

  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    is_admin: true,
    user_type: "ADMIN",
    status: "ACTIVE",
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "suspended"
  >("all");
  const [filteredAdmins, setFilteredAdmins] = useState<User[]>([]);

  // Loading states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Dropdown menu state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await adminSvc.get("/users_admin?page=1&per_page=50");
      if (res.success && res.data) {
        const list = (res.data as any).map((u: any) => ({
          id: u.id,
          email: u.email || "",
          role:
            u.roles && u.roles.length > 0
              ? u.roles.map((r: any) => r.name).join(", ")
              : "Admin",
          status:
            (u.status || "ACTIVE").toUpperCase() === "ACTIVE"
              ? "Active"
              : "Inactive",
          createdDate: u.created_at
            ? new Date(u.created_at).toLocaleDateString()
            : "",
          is_admin: u.is_admin,
          user_type: u.user_type,
          phone: u.phone_number || "",
          first_name: u.first_name || "",
          last_name: u.last_name || "",
        }));
        setAdmins(list);
        console.log(
          `Fetched ${list.length} admin users from dedicated endpoint`,
        );
      } else {
        setAdmins([]);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to fetch admin users");
    } finally {
      setLoading(false);
    }
  };

  // Filter admins based on search and status
  useEffect(() => {
    let filtered = admins;

    if (searchTerm) {
      filtered = filtered.filter(
        (admin) =>
          admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (admin.first_name &&
            admin.first_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (admin.last_name &&
            admin.last_name.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((admin) => {
        const statusUpper = admin.status?.toUpperCase() || "";
        switch (statusFilter) {
          case "active":
            return statusUpper === "ACTIVE";
          case "inactive":
            return statusUpper === "INACTIVE";
          case "suspended":
            return statusUpper === "SUSPENDED";
          default:
            return true;
        }
      });
    }

    setFilteredAdmins(filtered);
  }, [admins, searchTerm, statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const promoteToAdmin = async () => {
    if (!newAdminUserId) return;
    setLoading(true);
    try {
      await adminSvc.patch("/users", {
        user_id: newAdminUserId,
        is_admin: true,
        user_type: "ADMIN",
      });
      setNewAdminUserId("");
      await fetchAdmins();
      toast.success("User promoted to admin successfully");
    } catch (error) {
      console.error("Error promoting user:", error);
      toast.error("Failed to promote user to admin");
    } finally {
      setLoading(false);
    }
  };

  // Create new admin user
  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.email || !createForm.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const adminUserData = {
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        phone: createForm.phone,
      };

      const response = await adminSvc.post("/users_admin", adminUserData);
      if (response.success) {
        toast.success("Admin user created successfully");
        setShowCreateModal(false);
        setCreateForm({
          username: "",
          email: "",
          password: "",
          first_name: "",
          last_name: "",
          phone: "",
          is_admin: true,
          user_type: "ADMIN",
        });
        await fetchAdmins();
      } else {
        toast.error(response.message || "Failed to create admin user");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setCreating(false);
    }
  };

  // Edit admin user
  const handleEditUser = async () => {
    if (!editingUser) return;

    setUpdating(true);
    try {
      // Ensure admin status is maintained
      const adminUpdateData = {
        ...editForm,
        is_admin: true,
        user_type: "ADMIN",
      };

      const response = await adminSvc.put(
        `/users_admin/${editingUser.id}`,
        adminUpdateData,
      );
      if (response.success) {
        toast.success("Admin user updated successfully");
        setShowEditModal(false);
        setEditingUser(null);
        await fetchAdmins();
      } else {
        toast.error(response.message || "Failed to update admin user");
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update admin user");
    } finally {
      setUpdating(false);
    }
  };

  // Delete admin user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const response = await adminSvc.delete(`/users_admin/${userToDelete.id}`);
      if (response.success) {
        toast.success("Admin user deleted successfully");
        setShowDeleteModal(false);
        setUserToDelete(null);
        await fetchAdmins();
      } else {
        toast.error(response.message || "Failed to delete admin user");
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete admin user");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "Active" ? "INACTIVE" : "ACTIVE";
    try {
      const response = await adminSvc.patch(`/users/${user.id}`, {
        status: newStatus,
      });
      if (response.success) {
        toast.success(
          `User ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`,
        );
        await fetchAdmins();
      } else {
        toast.error(response.message || "Failed to update user status");
      }
    } catch (error: any) {
      console.error("Error updating user status:", error);
      toast.error(error.message || "Failed to update user status");
    }
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      is_admin: user.is_admin || true,
      user_type: user.user_type || "ADMIN",
      status: user.status === "Active" ? "ACTIVE" : "INACTIVE",
    });
    setShowEditModal(true);
  };

  // Open view modal
  const openViewModal = (user: User) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };
  // Roles UI removed; RBAC is handled elsewhere

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "text-green-400 bg-green-400/10";
      case "INACTIVE":
        return "text-gray-400 bg-gray-400/10";
      case "SUSPENDED":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  // Suspend admin user
  const handleSuspendUser = async (user: User) => {
    try {
      const response = await adminSvc.post(`/users_admin/${user.id}/suspend`, {
        reason: "Suspended by admin",
        note: "Account suspended",
      });
      if (response.success) {
        toast.success("Admin user suspended successfully");
        await fetchAdmins();
      } else {
        toast.error(response.message || "Failed to suspend admin user");
      }
    } catch (error: any) {
      console.error("Error suspending user:", error);
      toast.error(error.message || "Failed to suspend admin user");
    }
  };

  // Unsuspend admin user
  const handleUnsuspendUser = async (user: User) => {
    try {
      const response = await adminSvc.post(`/users_admin/${user.id}/unsuspend`);
      if (response.success) {
        toast.success("Admin user unsuspended successfully");
        await fetchAdmins();
      } else {
        toast.error(response.message || "Failed to unsuspend admin user");
      }
    } catch (error: any) {
      console.error("Error unsuspending user:", error);
      toast.error(error.message || "Failed to unsuspend admin user");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Management</h1>
          <p className="text-gray-400 mt-1">
            Manage admin users and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Admin</span>
          </button>
        </div>
      </div>

      {/* Quick Promote Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Quick Promote to Admin</h3>
        <div className="flex items-center gap-2">
          <input
            placeholder="Enter User ID to promote"
            value={newAdminUserId}
            onChange={(e) => setNewAdminUserId(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white flex-1"
          />
          <button
            disabled={!newAdminUserId || loading}
            onClick={promoteToAdmin}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Promote</span>
          </button>
        </div>
      </div>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Admin Users</p>
              <p className="text-2xl font-bold text-white mt-1">
                {admins.length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white mt-1">
                {admins.filter((u) => u.status === "Active").length}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by username, email, ID, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "inactive" | "suspended",
                )
              }
              className="px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              onClick={fetchAdmins}
              disabled={loading}
              className="px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Users Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">
            Admin Users{" "}
            {loading
              ? "(...)"
              : `(${filteredAdmins.length} of ${admins.length})`}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  User ID
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Created
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((user, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30"
                >
                  <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                    {user.id}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{user.email}</td>
                  <td className="py-3 px-4 text-gray-300">
                    {user.first_name || user.last_name
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : "N/A"}
                  </td>
                  <td className="py-3 px-4 text-blue-400 text-sm">
                    {user.role}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getStatusColor(user.status)} hover:opacity-80`}
                    >
                      {user.status}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-400 text-sm">
                    {user.createdDate
                      ? new Date(user.createdDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenDropdown(
                              openDropdown === user.id ? null : user.id,
                            )
                          }
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openDropdown === user.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  openViewModal(user);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                              >
                                <Eye className="h-4 w-4 mr-3" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  openEditModal(user);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit User
                              </button>
                              {user.status?.toUpperCase() === "SUSPENDED" ? (
                                <button
                                  onClick={() => {
                                    handleUnsuspendUser(user);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-green-400 transition-colors"
                                >
                                  <CheckCircle className="h-4 w-4 mr-3" />
                                  Unsuspend User
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleSuspendUser(user);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-orange-400 transition-colors"
                                >
                                  <Ban className="h-4 w-4 mr-3" />
                                  Suspend User
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  openDeleteModal(user);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Delete User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    {searchTerm || statusFilter !== "all"
                      ? "No admin users found matching your criteria"
                      : "No admin users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Create New Admin User
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateUser();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={createForm.first_name}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={createForm.last_name}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {creating && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{creating ? "Creating..." : "Create Admin"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Edit Admin User
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditUser();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: e.target.value as "ACTIVE" | "INACTIVE",
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {updating && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{updating ? "Updating..." : "Update Admin"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">
                Admin User Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      User ID
                    </label>
                    <p className="text-white font-mono text-sm">
                      {viewingUser.id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Username
                    </label>
                    <p className="text-white">{viewingUser.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Email
                    </label>
                    <p className="text-white">{viewingUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Phone
                    </label>
                    <p className="text-white">{viewingUser.phone || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Full Name
                    </label>
                    <p className="text-white">
                      {viewingUser.first_name || viewingUser.last_name
                        ? `${viewingUser.first_name || ""} ${viewingUser.last_name || ""}`.trim()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Status
                    </label>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewingUser.status)}`}
                    >
                      {viewingUser.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      User Type
                    </label>
                    <p className="text-white">
                      {viewingUser.user_type || "ADMIN"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Is Admin
                    </label>
                    <p className="text-white">
                      {viewingUser.is_admin ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Last Login
                    </label>
                    <p className="text-white">
                      {viewingUser.lastLogin
                        ? new Date(viewingUser.lastLogin).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Created Date
                    </label>
                    <p className="text-white">
                      {viewingUser.createdDate
                        ? new Date(viewingUser.createdDate).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">
                    Delete Admin User
                  </h3>
                  <p className="text-sm text-gray-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300">
                  Are you sure you want to delete this admin user?
                </p>
                <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Username:</span>{" "}
                      {userToDelete.username}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {userToDelete.email}
                    </div>
                    <div>
                      <span className="font-medium">User ID:</span>{" "}
                      {userToDelete.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{deleting ? "Deleting..." : "Delete Admin"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
