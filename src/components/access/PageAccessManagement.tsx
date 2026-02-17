import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  Users,
  Globe,
  Shield,
  User,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { toast } from "react-hot-toast";
import { Page } from "../../types/page";
import { adminSvc } from "../../services/apiService";
import { Role } from "../../types/rbac";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  status: string;
  user_type: string;
  is_admin: boolean;
}

type AccessMode = "user" | "role";

export const PageAccessManagement: React.FC = () => {
  const { adminSvc, rbacSvc } = useServices();
  const [accessMode, setAccessMode] = useState<AccessMode>("user");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userPages, setUserPages] = useState<Page[]>([]);
  const [rolePages, setRolePages] = useState<Page[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    console.log("PageAccessManagement mounted, loading data...");
    loadAllPages();
    if (accessMode === "user") {
      loadAdminUsers();
    } else {
      loadRoles();
    }
  }, [accessMode]);

  useEffect(() => {
    if (accessMode === "user" && selectedUser) {
      loadUserPages(selectedUser.id);
    } else if (accessMode === "role" && selectedRole) {
      loadRolePages(selectedRole.id);
    } else {
      setSelectedPageIds(new Set());
      setUserPages([]);
      setRolePages([]);
    }
  }, [selectedUser, selectedRole, accessMode]);

  const loadAdminUsers = async () => {
    try {
      console.log("Loading admin users...");
      setLoading(true);
      const response = await adminSvc.get("/users_admin?page=1&per_page=1000");
      console.log("Admin users response:", response);
      if (response.success && response.data) {
        const users = Array.isArray(response.data) ? response.data : [];
        const filtered = users.filter((u: any) => u.is_admin === true);
        console.log("Filtered admin users:", filtered);
        setAdminUsers(filtered);
      } else {
        console.warn("No admin users in response:", response);
        setAdminUsers([]);
      }
    } catch (error: any) {
      console.error("Failed to load admin users:", error);
      toast.error(
        "Failed to load admin users: " + (error.message || "Unknown error"),
      );
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      console.log("Loading roles...");
      setRolesLoading(true);
      const rolesData = await rbacSvc.getRoles({ page: 1, per_page: 100 });
      console.log("Roles loaded:", rolesData);
      setRoles(rolesData);
    } catch (error: any) {
      console.error("Failed to load roles:", error);
      toast.error(
        "Failed to load roles: " + (error.message || "Unknown error"),
      );
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadAllPages = async () => {
    try {
      console.log("Loading all pages...");
      setPagesLoading(true);
      const response: any = await adminSvc.get("/pages");
      console.log("Pages API response:", response); // Debug log
      if (response.success && response.data) {
        if (response.data.pages && Array.isArray(response.data.pages)) {
          console.log(
            "Pages loaded (from pages property):",
            response.data.pages.length,
          );
          setAllPages(response.data.pages);
        } else if (Array.isArray(response.data)) {
          console.log("Pages loaded (direct array):", response.data.length);
          setAllPages(response.data);
        } else {
          console.warn("Unexpected pages response structure:", response);
          setAllPages([]);
        }
      } else {
        console.warn("No pages in response:", response);
        setAllPages([]);
      }
    } catch (error: any) {
      console.error("Failed to load pages:", error);
      toast.error(
        "Failed to load pages: " + (error.message || "Unknown error"),
      );
      setAllPages([]);
    } finally {
      setPagesLoading(false);
    }
  };

  const loadUserPages = async (userId: string) => {
    try {
      setLoading(true);
      const response: any = await adminSvc.get(`/users/${userId}/pages`);
      console.log("User pages API response:", response); // Debug log
      let pages: Page[] = [];
      if (response.success && response.data) {
        if (response.data.pages && Array.isArray(response.data.pages)) {
          pages = response.data.pages;
        } else if (Array.isArray(response.data)) {
          pages = response.data;
        }
      }
      setUserPages(pages);
      setSelectedPageIds(new Set(pages.map((p: Page) => p.id)));
    } catch (error: any) {
      console.error("Failed to load user pages:", error);
      toast.error(
        "Failed to load user pages: " + (error.message || "Unknown error"),
      );
      setUserPages([]);
      setSelectedPageIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const loadRolePages = async (roleId: string) => {
    try {
      setLoading(true);
      // TODO: Backend endpoint needed: GET /api/admin/roles/:id/pages
      // For now, we'll try the endpoint and handle gracefully if it doesn't exist
      const response: any = await adminSvc.get(`/roles/${roleId}/pages`);
      console.log("Role pages API response:", response); // Debug log
      let pages: Page[] = [];
      if (response.success && response.data) {
        if (response.data.pages && Array.isArray(response.data.pages)) {
          pages = response.data.pages;
        } else if (Array.isArray(response.data)) {
          pages = response.data;
        }
      }
      setRolePages(pages);
      setSelectedPageIds(new Set(pages.map((p: Page) => p.id)));
    } catch (error: any) {
      console.error("Failed to load role pages:", error);
      // If endpoint doesn't exist yet, show a helpful message
      if (
        error.message?.includes("404") ||
        error.message?.includes("Not Found")
      ) {
        toast.error(
          "Role-based page access is not yet available. Backend endpoint needs to be implemented.",
          { duration: 5000 },
        );
      } else {
        toast.error(
          "Failed to load role pages: " + (error.message || "Unknown error"),
        );
      }
      setRolePages([]);
      setSelectedPageIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handlePageToggle = (pageId: string) => {
    setSelectedPageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIds.size === filteredPages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const handleSave = async () => {
    if (accessMode === "user" && !selectedUser) return;
    if (accessMode === "role" && !selectedRole) return;

    try {
      setSaving(true);
      const pageIds = Array.from(selectedPageIds);

      if (accessMode === "user") {
        await adminSvc.put(`/users/${selectedUser!.id}/pages`, {
          page_ids: pageIds,
        });
        toast.success("User page access updated successfully");
        await loadUserPages(selectedUser!.id);
      } else {
        // TODO: Backend endpoint needed: PUT /api/admin/roles/:id/pages
        await adminSvc.put(`/roles/${selectedRole!.id}/pages`, {
          page_ids: pageIds,
        });
        toast.success("Role page access updated successfully");
        await loadRolePages(selectedRole!.id);
      }
    } catch (error: any) {
      if (
        error.message?.includes("404") ||
        error.message?.includes("Not Found")
      ) {
        toast.error(
          "Role-based page access is not yet available. Backend endpoint needs to be implemented.",
          { duration: 5000 },
        );
      } else {
        toast.error(
          "Failed to update page access: " + (error.message || "Unknown error"),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredPages = allPages.filter(
    (page) =>
      page.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.path.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const parentPages = filteredPages.filter((p) => !p.parent_id);
  const getChildPages = (parentId: string) =>
    filteredPages.filter((p) => p.parent_id === parentId);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
          <div>
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Page access
            </h3>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage which pages users or roles can access
            </p>
          </div>
          <button
            onClick={() => {
              if (accessMode === "user") loadAdminUsers();
              else loadRoles();
            }}
            disabled={loading || rolesLoading}
            className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-5 w-5 ${loading || rolesLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-6">
      {/* Mode Selection */}
      <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
        <label className="block text-sm font-medium text-slate-400 mb-3">
          Access mode
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setAccessMode("user");
              setSelectedUser(null);
              setSelectedRole(null);
              setSelectedPageIds(new Set());
            }}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
              accessMode === "user"
                ? "border-red-500 bg-red-500/15 text-red-500"
                : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-300"
            }`}
          >
            <User className="h-5 w-5" />
            <span>User-based</span>
          </button>
          <button
            onClick={() => {
              setAccessMode("role");
              setSelectedUser(null);
              setSelectedRole(null);
              setSelectedPageIds(new Set());
            }}
            className={`flex-1 px-4 py-3 rounded-xl border-2 transition-colors flex items-center justify-center gap-2 ${
              accessMode === "role"
                ? "border-red-500 bg-red-500/15 text-red-500"
                : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-300"
            }`}
          >
            <Shield className="h-5 w-5" />
            <span>Role-based</span>
          </button>
        </div>
      </div>

      {/* User/Role Selection */}
      <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          {accessMode === "user" ? "Select admin user" : "Select role"}
        </label>
        {accessMode === "user" ? (
          <select
            value={selectedUser?.id || ""}
            onChange={(e) => {
              const user = adminUsers.find((u) => u.id === e.target.value);
              setSelectedUser(user || null);
            }}
            className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          >
            <option value="">-- Select a user --</option>
            {adminUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.email})
              </option>
            ))}
          </select>
        ) : (
          <select
            value={selectedRole?.id || ""}
            onChange={(e) => {
              const role = roles.find((r) => r.id === e.target.value);
              setSelectedRole(role || null);
            }}
            className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:opacity-50"
            disabled={rolesLoading}
          >
            <option value="">-- Select a role --</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} {role.description ? `- ${role.description}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading &&
        ((accessMode === "user" && !selectedUser) ||
          (accessMode === "role" && !selectedRole)) && (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        )}

      {!loading && accessMode === "user" && adminUsers.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">
            No admin users found. Please ensure you have admin users in the system.
          </p>
        </div>
      )}

      {!rolesLoading && accessMode === "role" && roles.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">
            No roles found. Please create roles first in the Roles section.
          </p>
        </div>
      )}

      {((accessMode === "user" && selectedUser) ||
        (accessMode === "role" && selectedRole)) && (
        <>
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500"
                />
              </div>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shrink-0"
              >
                {selectedPageIds.size === filteredPages.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4">
              {pagesLoading ? (
                <p className="text-slate-400 text-center py-8 text-sm">Loading pages...</p>
              ) : parentPages.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">
                  No pages found. Please run the seed script to populate pages.
                </p>
              ) : (
                parentPages.map((parentPage) => {
                  const childPages = getChildPages(parentPage.id);
                  const allPageIds = [parentPage.id, ...childPages.map((cp) => cp.id)];
                  const allSelected = allPageIds.every((id) => selectedPageIds.has(id));
                  const someSelected = allPageIds.some((id) => selectedPageIds.has(id));

                  return (
                    <div
                      key={parentPage.id}
                      className="border border-slate-700/80 rounded-xl p-4 bg-slate-900/30"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => {
                            if (allSelected) {
                              allPageIds.forEach((id) => selectedPageIds.delete(id));
                            } else {
                              allPageIds.forEach((id) => selectedPageIds.add(id));
                            }
                            setSelectedPageIds(new Set(selectedPageIds));
                          }}
                          className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                            allSelected
                              ? "bg-red-500 border-red-500"
                              : someSelected
                                ? "bg-red-500/50 border-red-500"
                                : "border-slate-500"
                          }`}
                        >
                          {allSelected && <CheckCircle className="h-3 w-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="font-medium text-white">{parentPage.label}</span>
                          </div>
                          <span className="text-xs text-slate-400">{parentPage.path}</span>
                        </div>
                      </div>
                      {childPages.length > 0 && (
                        <div className="ml-8 mt-2 space-y-2">
                          {childPages.map((childPage) => (
                            <div key={childPage.id} className="flex items-center gap-3">
                              <button
                                onClick={() => handlePageToggle(childPage.id)}
                                className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  selectedPageIds.has(childPage.id)
                                    ? "bg-red-500 border-red-500"
                                    : "border-slate-500"
                                }`}
                              >
                                {selectedPageIds.has(childPage.id) && (
                                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-slate-300">{childPage.label}</span>
                                <span className="text-xs text-slate-500 ml-2">{childPage.path}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium disabled:opacity-50 inline-flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              Current access summary
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Total pages selected</p>
                <p className="text-2xl font-bold text-white">{selectedPageIds.size}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total available pages</p>
                <p className="text-2xl font-bold text-white">{allPages.length}</p>
              </div>
            </div>
            {accessMode === "user" && selectedUser && (
              <div className="mt-4 pt-4 border-t border-slate-700/80">
                <p className="text-slate-400 text-sm">
                  Managing access for: <span className="text-white font-medium">{selectedUser.username}</span>
                </p>
              </div>
            )}
            {accessMode === "role" && selectedRole && (
              <div className="mt-4 pt-4 border-t border-slate-700/80">
                <p className="text-slate-400 text-sm">
                  Managing access for role: <span className="text-white font-medium">{selectedRole.name}</span>
                </p>
              </div>
            )}
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
};
