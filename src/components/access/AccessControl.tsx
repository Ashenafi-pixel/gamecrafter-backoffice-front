import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Globe,
  Shield,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
  Users,
  Key,
  UserCheck,
  Search,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
  Eye,
  MoreVertical,
  Filter,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRolePermissionsRequest,
  AssignRoleToUserRequest,
  PermissionWithValue,
} from "../../types/rbac";
import { toast } from "react-hot-toast";
import { TwoFactorAuthSettings } from "../settings/TwoFactorSettings";
import { PageAccessManagement } from "./PageAccessManagement";
import { brandService, Brand } from "../../services/brandService";

interface IPRule {
  id: string;
  type: "allow" | "block";
  target: "ip" | "range" | "country";
  value: string;
  description: string;
  isActive: boolean;
  createdDate: string;
  createdBy: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  postal_code: string;
  state: string;
  country: string;
  kyc_status: string;
  is_email_verified: boolean;
  default_currency: string;
  wallet_verification_status: string;
  status: string;
  is_admin: boolean;
  user_type: string;
  created_at: string;
  roles: Array<{
    role_id: string;
    name: string;
  }>;
}

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  state?: string;
  country?: string;
  kyc_status?: string;
  is_email_verified?: boolean;
  default_currency?: string;
  wallet_verification_status?: string;
  status?: string;
  is_admin: boolean;
  user_type: string;
  brand_id?: string;
}

interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_admin?: boolean;
  user_type?: string;
  status?: string;
}

export const AccessControl: React.FC = () => {
  const { rbacSvc, adminSvc } = useServices();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "security";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab") || "security";
    setActiveTab(tab);
  }, [searchParams]);

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    ipWhitelistEnabled: false,
    rateLimitEnabled: true,
    rateLimitRequests: 100,
  });
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [selectedSecurityBrandId, setSelectedSecurityBrandId] =
    useState<string>("");
  // Brands (used by Security Settings brand dropdown + brand_id query param)
  // Must be declared before ensureSecurityBrandId() references it.
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // KYC Settings state (from kyc_settings table)
  const [kycSettingsList, setKycSettingsList] = useState<any[]>([]);
  const [isLoadingKycSettings, setIsLoadingKycSettings] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<{
    setting_value: string;
    description: string;
    is_active: boolean;
  } | null>(null);
  const [isSavingKycSetting, setIsSavingKycSetting] = useState(false);

  const updateSecuritySetting = useCallback((key: string, value: any) => {
    setSecuritySettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const ensureSecurityBrandId = useCallback(async (): Promise<
    string | null
  > => {
    // Prefer currently selected brand
    if (selectedSecurityBrandId) return selectedSecurityBrandId;

    // If brands are already loaded, pick the first as default
    if (brands.length > 0) {
      const first = brands[0].id;
      setSelectedSecurityBrandId(first);
      return first;
    }

    // Load brands (used elsewhere in this component too)
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({
        page: 1,
        "per-page": 100,
      });
      const list =
        response.success && response.data ? response.data.brands || [] : [];
      setBrands(list);
      if (list.length > 0) {
        setSelectedSecurityBrandId(list[0].id);
        return list[0].id;
      }
      return null;
    } catch (err) {
      console.error("Failed to load brands for security settings:", err);
      return null;
    } finally {
      setLoadingBrands(false);
    }
  }, [brands, selectedSecurityBrandId]);

  const loadSecuritySettings = useCallback(async () => {
    try {
      setIsLoadingSecurity(true);
      const brandId = await ensureSecurityBrandId();
      if (!brandId) {
        toast.error("No brand found. Please create/select a brand first.");
        return;
      }
      const response = await adminSvc.get<any>(
        `/settings/security?brand_id=${brandId}`,
      );
      if (response.success && response.data) {
        const data = response.data as any;
        setSecuritySettings({
          sessionTimeout: data.session_timeout || 30,
          maxLoginAttempts: data.max_login_attempts || 5,
          lockoutDuration: data.lockout_duration || 15,
          twoFactorRequired: data.two_factor_required || false,
          passwordMinLength: data.password_min_length || 8,
          passwordRequireSpecial:
            data.password_require_special !== undefined
              ? data.password_require_special
              : true,
          ipWhitelistEnabled: data.ip_whitelist_enabled || false,
          rateLimitEnabled:
            data.rate_limit_enabled !== undefined
              ? data.rate_limit_enabled
              : true,
          rateLimitRequests: data.rate_limit_requests || 100,
        });
      }
    } catch (error) {
      console.error("Failed to load security settings:", error);
    } finally {
      setIsLoadingSecurity(false);
    }
  }, [adminSvc, ensureSecurityBrandId]);

  const saveSecuritySettings = useCallback(async () => {
    try {
      setIsSavingSecurity(true);
      const brandId = await ensureSecurityBrandId();
      if (!brandId) {
        toast.error("No brand found. Please create/select a brand first.");
        return;
      }
      const payload = {
        session_timeout: securitySettings.sessionTimeout,
        max_login_attempts: securitySettings.maxLoginAttempts,
        lockout_duration: securitySettings.lockoutDuration,
        two_factor_required: securitySettings.twoFactorRequired,
        password_min_length: securitySettings.passwordMinLength,
        password_require_special: securitySettings.passwordRequireSpecial,
        ip_whitelist_enabled: securitySettings.ipWhitelistEnabled,
        rate_limit_enabled: securitySettings.rateLimitEnabled,
        rate_limit_requests: securitySettings.rateLimitRequests,
      };
      const response = await adminSvc.put(
        `/settings/security?brand_id=${brandId}`,
        payload,
      );
      if (response.success) {
        toast.success("Security settings saved successfully");
      }
    } catch (error) {
      console.error("Failed to save security settings:", error);
      toast.error("Failed to save security settings");
    } finally {
      setIsSavingSecurity(false);
    }
  }, [adminSvc, ensureSecurityBrandId, securitySettings]);

  // Load security settings
  useEffect(() => {
    if (activeTab === "security") {
      loadSecuritySettings();
    }
  }, [activeTab, loadSecuritySettings]);

  const handleEditKycSetting = (setting: any) => {
    setEditingSetting(setting);
    setEditFormData({
      setting_value: JSON.stringify(setting.setting_value, null, 2),
      description: setting.description || "",
      is_active: setting.is_active,
    });
  };

  const handleCancelEdit = () => {
    setEditingSetting(null);
    setEditFormData(null);
  };

  // Load KYC settings from kyc_settings table
  const loadKycSettingsList = useCallback(async () => {
    try {
      setIsLoadingKycSettings(true);
      const response = await adminSvc.get<any>("/kyc/settings");
      if (response.success && response.data) {
        setKycSettingsList(response.data);
        console.log("KYC Settings loaded:", response.data);
      }
    } catch (error) {
      console.error("Failed to load KYC settings:", error);
      toast.error("Failed to load KYC settings");
    } finally {
      setIsLoadingKycSettings(false);
    }
  }, [adminSvc]);

  const saveKycSetting = useCallback(async () => {
    if (!editingSetting || !editFormData) return;

    try {
      setIsSavingKycSetting(true);

      // Parse the JSON setting_value
      let parsedSettingValue: any;
      try {
        parsedSettingValue = JSON.parse(editFormData.setting_value);
      } catch (error) {
        toast.error("Invalid JSON format in setting value");
        return;
      }

      const payload = {
        id: editingSetting.id,
        setting_value: parsedSettingValue,
        description: editFormData.description.trim() || null,
        is_active: editFormData.is_active,
      };

      const response = await adminSvc.put("/kyc/settings", payload);
      if (response.success) {
        toast.success("KYC setting updated successfully");
        await loadKycSettingsList();
        handleCancelEdit();
      }
    } catch (error: any) {
      console.error("Failed to save KYC setting:", error);
      toast.error(error.message || "Failed to save KYC setting");
    } finally {
      setIsSavingKycSetting(false);
    }
  }, [adminSvc, editingSetting, editFormData, loadKycSettingsList]);

  // Load KYC settings
  useEffect(() => {
    if (activeTab === "kyc-settings") {
      loadKycSettingsList();
    }
  }, [activeTab, loadKycSettingsList]);

  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showDeleteRuleModal, setShowDeleteRuleModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<IPRule | null>(null);
  const [editingRule, setEditingRule] = useState<IPRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    type: "block" as "allow" | "block",
    target: "ip" as "ip" | "range" | "country",
    value: "",
    description: "",
  });

  // Admin user management state
  const [admins, setAdmins] = useState<User[]>([]);
  const [newAdminUserId, setNewAdminUserId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    street_address: "",
    city: "",
    postal_code: "",
    state: "",
    country: "",
    kyc_status: "",
    is_email_verified: false,
    default_currency: "",
    wallet_verification_status: "",
    status: "ACTIVE",
    is_admin: true,
    user_type: "ADMIN",
    brand_id: "",
  });
  const [editForm, setEditForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    date_of_birth: "",
    street_address: "",
    city: "",
    postal_code: "",
    state: "",
    country: "",
    kyc_status: "",
    is_email_verified: false,
    default_currency: "",
    wallet_verification_status: "",
    status: "ACTIVE",
    is_admin: true,
    user_type: "ADMIN",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "suspended"
  >("all");
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    email?: string;
  }>({});

  // Debug editForm changes
  useEffect(() => {
    console.log("editForm changed:", editForm);
  }, [editForm]);
  const [filteredAdmins, setFilteredAdmins] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] =
    useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendNote, setSuspendNote] = useState("");

  // RBAC state
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
    permissions: [] as PermissionWithValue[],
  });

  // Permission search state
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(
    [],
  );

  // Permission management state
  const [showPermissionManagementModal, setShowPermissionManagementModal] =
    useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [permissionFormData, setPermissionFormData] = useState({
    name: "",
    description: "",
    requires_value: false,
  });
  const [isSavingPermission, setIsSavingPermission] = useState(false);
  const [showDeletePermissionModal, setShowDeletePermissionModal] =
    useState(false);
  const [permissionToDelete, setPermissionToDelete] =
    useState<Permission | null>(null);
  const [isDeletingPermission, setIsDeletingPermission] = useState(false);

  // Permission search and bulk selection state
  const [permissionSearchQuery, setPermissionSearchQuery] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [isApplyingBulkUpdate, setIsApplyingBulkUpdate] = useState(false);

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
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // IP/Geo rules data - now connected to backend
  const [ipRules, setIpRules] = useState<IPRule[]>([]);
  const [loadingIpRules, setLoadingIpRules] = useState(false);

  // Country codes for dropdown
  const countries = [
    { code: "US", name: "United States" },
    { code: "CN", name: "China" },
    { code: "RU", name: "Russia" },
    { code: "IR", name: "Iran" },
    { code: "KP", name: "North Korea" },
    { code: "SY", name: "Syria" },
    { code: "CU", name: "Cuba" },
    { code: "SD", name: "Sudan" },
    { code: "MM", name: "Myanmar" },
    { code: "BY", name: "Belarus" },
  ];

  // Geo-blocking settings - now connected to backend
  const [geoSettings, setGeoSettings] = useState({
    enableGeoBlocking: true,
    defaultAction: "allow" as "allow" | "block",
    vpnDetection: true,
    proxyDetection: true,
    torBlocking: true,
    logAttempts: true,
    blockedCountries: [] as string[],
    allowedCountries: [] as string[],
    bypassCountries: [] as string[],
  });
  const [loadingGeoSettings, setLoadingGeoSettings] = useState(false);

  // Load initial RBAC data
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

  // Filter permissions based on search term
  useEffect(() => {
    if (permissionSearchTerm) {
      const filtered = permissions.filter(
        (permission) =>
          permission.name
            .toLowerCase()
            .includes(permissionSearchTerm.toLowerCase()) ||
          permission.description
            ?.toLowerCase()
            .includes(permissionSearchTerm.toLowerCase()),
      );
      setFilteredPermissions(filtered);
    } else {
      setFilteredPermissions(permissions);
    }
  }, [permissions, permissionSearchTerm]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRule) {
      await updateIpFilter(editingRule.id, ruleFormData);
    } else {
      await createIpFilter(ruleFormData);
    }
  };

  const resetRuleForm = () => {
    setRuleFormData({
      type: "block",
      target: "ip",
      value: "",
      description: "",
    });
    setShowCreateRuleModal(false);
    setEditingRule(null);
  };

  const handleEditRule = (rule: IPRule) => {
    setEditingRule(rule);
    setRuleFormData({
      type: rule.type,
      target: rule.target,
      value: rule.value,
      description: rule.description,
    });
    setShowCreateRuleModal(true);
  };

  const handleDeleteRule = (rule: IPRule) => {
    setRuleToDelete(rule);
    setShowDeleteRuleModal(true);
  };

  const confirmDeleteRule = async () => {
    if (ruleToDelete) {
      await deleteIpFilter(ruleToDelete.id);
      setShowDeleteRuleModal(false);
      setRuleToDelete(null);
    }
  };

  const cancelDeleteRule = () => {
    setShowDeleteRuleModal(false);
    setRuleToDelete(null);
  };

  const toggleRuleStatus = (ruleId: string) => {
    setIpRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule,
      ),
    );
  };

  const getTypeColor = (type: string) => {
    return type === "allow"
      ? "text-green-400 bg-green-400/10"
      : "text-red-400 bg-red-400/10";
  };

  const getTargetIcon = (target: string) => {
    switch (target) {
      case "country":
        return <Globe className="h-4 w-4" />;
      case "range":
        return <Shield className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const updateGeoSetting = (key: string, value: any) => {
    setGeoSettings((prev) => ({ ...prev, [key]: value }));
  };

  // RBAC Functions
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

  // Filter permissions based on search query
  const getFilteredPermissions = useCallback(() => {
    if (!permissionSearchQuery.trim()) {
      return permissions;
    }
    const query = permissionSearchQuery.toLowerCase();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)),
    );
  }, [permissions, permissionSearchQuery]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersData = await rbacSvc.searchUsers("");

      if (Array.isArray(usersData)) {
        setUsers(usersData);
      } else if (usersData && Array.isArray(usersData.data)) {
        setUsers(usersData.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
      setUsers([]);
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
    newPermissions: PermissionWithValue[],
  ) => {
    try {
      setLoading(true);
      const request: UpdateRolePermissionsRequest = {
        role_id: roleId,
        permissions: newPermissions,
      };

      await rbacSvc.updateRolePermissions(request);
      await loadRoles();
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
      // Refresh both users and admins lists to show updated data
      await Promise.all([fetchAdmins(), loadUsers()]);
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
    setPermissionSearchTerm("");
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
    setRoleForm((prev) => {
      const existingIndex = prev.permissions.findIndex(
        (p) => p.permission_id === permissionId,
      );
      if (existingIndex >= 0) {
        // Remove permission
        return {
          ...prev,
          permissions: prev.permissions.filter(
            (p) => p.permission_id !== permissionId,
          ),
        };
      } else {
        // Add permission with no value (unlimited)
        return {
          ...prev,
          permissions: [
            ...prev.permissions,
            {
              permission_id: permissionId,
              value: null,
              limit_type: null,
              limit_period: null,
            },
          ],
        };
      }
    });
  };

  const updatePermissionValue = (
    permissionId: string,
    value: number | null,
  ) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.permission_id === permissionId
          ? {
              ...p,
              value:
                value === undefined || value === null || isNaN(value)
                  ? null
                  : value,
            }
          : p,
      ),
    }));
  };

  const updatePermissionLimitType = (
    permissionId: string,
    limitType: "daily" | "weekly" | "monthly" | null,
  ) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.permission_id === permissionId
          ? {
              ...p,
              limit_type: limitType,
              limit_period: limitType ? p.limit_period || 1 : null,
            }
          : p,
      ),
    }));
  };

  const updatePermissionLimitPeriod = (
    permissionId: string,
    limitPeriod: number | null,
  ) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.permission_id === permissionId
          ? {
              ...p,
              limit_period:
                limitPeriod === undefined ||
                limitPeriod === null ||
                isNaN(limitPeriod)
                  ? null
                  : limitPeriod,
            }
          : p,
      ),
    }));
  };

  const isPermissionSelected = (permissionId: string) => {
    return roleForm.permissions.some((p) => p.permission_id === permissionId);
  };

  const getPermissionValue = (permissionId: string) => {
    const perm = roleForm.permissions.find(
      (p) => p.permission_id === permissionId,
    );
    return perm?.value ?? null;
  };

  const getPermissionLimitType = (permissionId: string) => {
    const perm = roleForm.permissions.find(
      (p) => p.permission_id === permissionId,
    );
    return perm?.limit_type ?? null;
  };

  const getPermissionLimitPeriod = (permissionId: string) => {
    const perm = roleForm.permissions.find(
      (p) => p.permission_id === permissionId,
    );
    return perm?.limit_period ?? null;
  };

  const toggleSelectAll = () => {
    // Check if all filtered permissions are selected
    const allSelected = filteredPermissions.every((perm) =>
      isPermissionSelected(perm.id),
    );

    if (allSelected) {
      // Deselect all filtered permissions
      setRoleForm((prev) => ({
        ...prev,
        permissions: prev.permissions.filter(
          (p) => !filteredPermissions.some((fp) => fp.id === p.permission_id),
        ),
      }));
    } else {
      // Select all filtered permissions that aren't already selected
      setRoleForm((prev) => {
        const newPermissions = [...prev.permissions];
        filteredPermissions.forEach((perm) => {
          if (!isPermissionSelected(perm.id)) {
            newPermissions.push({
              permission_id: perm.id,
              value: null,
              limit_type: null,
              limit_period: null,
            });
          }
        });
        return {
          ...prev,
          permissions: newPermissions,
        };
      });
    }
  };

  const areAllFilteredSelected = () => {
    if (filteredPermissions.length === 0) return false;
    return filteredPermissions.every((perm) => isPermissionSelected(perm.id));
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setAssignmentForm((prev) => ({ ...prev, userId: user.id }));
    setUserSearchTerm(`${user.username} - ${user.email}`);
    setShowUserDropdown(false);
  };

  // Admin user management functions
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await adminSvc.get("/users_admin?page=1&per_page=50");
      if (res.success && res.data) {
        const list = (res.data as any).map((u: any) => ({
          id: u.id,
          username: u.username || "",
          email: u.email || "",
          phone_number: u.phone_number || "",
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          date_of_birth: u.date_of_birth || "",
          street_address: u.street_address || "",
          city: u.city || "",
          postal_code: u.postal_code || "",
          state: u.state || "",
          country: u.country || "",
          kyc_status: u.kyc_status || "",
          is_email_verified: u.is_email_verified || false,
          default_currency: u.default_currency || "",
          wallet_verification_status: u.wallet_verification_status || "",
          status: u.status || "ACTIVE",
          is_admin: u.is_admin || false,
          user_type: u.user_type || "ADMIN",
          roles: u.roles || [],
          created_at: u.created_at || "",
          // Legacy fields for backward compatibility
          role:
            u.roles && u.roles.length > 0
              ? u.roles.map((r: any) => r.name).join(", ")
              : "--",
          createdDate: u.created_at
            ? new Date(u.created_at).toLocaleDateString()
            : "",
          phone: u.phone_number || "", // Keep for backward compatibility
        }));
        setAdmins(list);
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

  // Fetch brands and refresh admin list when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      const fetchBrands = async () => {
        try {
          setLoadingBrands(true);
          const response = await brandService.getBrands({
            page: 1,
            "per-page": 100,
          });
          if (response.success && response.data) {
            setBrands(response.data.brands || []);
          }
        } catch (error) {
          console.error("Error fetching brands:", error);
        } finally {
          setLoadingBrands(false);
        }
      };
      fetchBrands();
      // Refresh admin list to ensure we have the latest data for validation
      fetchAdmins();
      // Clear validation errors when modal opens
      setValidationErrors({});
    }
  }, [showCreateModal]);

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

  const handleCreateUser = async () => {
    if (
      !createForm.username ||
      !createForm.email ||
      !createForm.password ||
      !createForm.brand_id
    ) {
      toast.error(
        "Please fill in all required fields (Username, Email, Password, and Brand)",
      );
      return;
    }

    // Validate username and email uniqueness
    const errors: { username?: string; email?: string } = {};

    // Check if username already exists
    const usernameExists = admins.some(
      (admin) =>
        admin.username.toLowerCase() ===
        createForm.username.toLowerCase().trim(),
    );
    if (usernameExists) {
      errors.username = "Username is already taken";
    }

    // Check if email already exists
    const emailExists = admins.some(
      (admin) =>
        admin.email.toLowerCase() === createForm.email.toLowerCase().trim(),
    );
    if (emailExists) {
      errors.email = "Email is already registered";
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    // Clear validation errors if validation passes
    setValidationErrors({});

    // Format phone number to remove spaces, parentheses, and dashes to fit 15 char limit
    const formatPhoneNumber = (phone: string) => {
      if (!phone) return "";
      // Remove all non-digit characters except +
      const cleaned = phone.replace(/[^\d+]/g, "");
      // If it starts with +, keep it, otherwise truncate to 15 chars
      return cleaned.startsWith("+")
        ? cleaned.substring(0, 15)
        : cleaned.substring(0, 15);
    };

    setCreating(true);
    try {
      const adminUserData = {
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        first_name: createForm.first_name || "",
        last_name: createForm.last_name || "",
        phone: formatPhoneNumber(createForm.phone || ""),
        // Include all fields from createForm, even if they're empty
        date_of_birth: createForm.date_of_birth || "",
        street_address: createForm.street_address || "",
        city: createForm.city || "",
        postal_code: createForm.postal_code || "",
        state: createForm.state || "",
        country: createForm.country || "",
        kyc_status: createForm.kyc_status || "",
        is_email_verified: createForm.is_email_verified || false,
        default_currency: createForm.default_currency || "",
        wallet_verification_status: createForm.wallet_verification_status || "",
        status: createForm.status || "ACTIVE",
        is_admin: createForm.is_admin,
        user_type: createForm.user_type,
        brand_id: createForm.brand_id || undefined,
      };

      console.log("Sending admin user data:", adminUserData);

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
          date_of_birth: "",
          street_address: "",
          city: "",
          postal_code: "",
          state: "",
          country: "",
          kyc_status: "",
          is_email_verified: false,
          default_currency: "",
          wallet_verification_status: "",
          status: "ACTIVE",
          is_admin: true,
          user_type: "ADMIN",
          brand_id: "",
        });
        setValidationErrors({});
        // Refresh both users and admins lists to show the new user
        await Promise.all([fetchAdmins(), loadUsers()]);
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

  const handleEditUser = async () => {
    if (!editingUser) return;

    setUpdating(true);
    try {
      // Send all fields from the edit form
      const updateData: any = {
        user_id: editingUser.id,
        username: editingUser.username, // Include username from editingUser
        email: editForm.email,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone_number: editForm.phone_number,
        date_of_birth: editForm.date_of_birth,
        street_address: editForm.street_address,
        city: editForm.city,
        postal_code: editForm.postal_code,
        state: editForm.state,
        country: editForm.country,
        kyc_status: editForm.kyc_status,
        is_email_verified: editForm.is_email_verified,
        default_currency: editForm.default_currency,
        status: editForm.status,
      };

      // Only include wallet_verification_status if it's a valid value
      if (
        editForm.wallet_verification_status !== "" &&
        ["none", "pending", "verified", "failed"].includes(
          editForm.wallet_verification_status,
        )
      ) {
        updateData.wallet_verification_status =
          editForm.wallet_verification_status;
      }

      // Check if there are any changes by comparing form values with original user values
      const hasChanges =
        editForm.email !== editingUser.email ||
        editForm.first_name !== editingUser.first_name ||
        editForm.last_name !== editingUser.last_name ||
        editForm.phone_number !== editingUser.phone_number ||
        editForm.date_of_birth !== editingUser.date_of_birth ||
        editForm.street_address !== editingUser.street_address ||
        editForm.city !== editingUser.city ||
        editForm.postal_code !== editingUser.postal_code ||
        editForm.state !== editingUser.state ||
        editForm.country !== editingUser.country ||
        editForm.kyc_status !== editingUser.kyc_status ||
        editForm.is_email_verified !== editingUser.is_email_verified ||
        editForm.default_currency !== editingUser.default_currency ||
        editForm.status !== editingUser.status ||
        (editForm.wallet_verification_status !==
          editingUser.wallet_verification_status &&
          editForm.wallet_verification_status !== "" &&
          ["none", "pending", "verified", "failed"].includes(
            editForm.wallet_verification_status,
          ));

      if (!hasChanges) {
        toast.success("No changes to update");
        setShowEditModal(false);
        setEditingUser(null);
        setUpdating(false);
        return;
      }

      console.log("Final updateData being sent:", updateData);
      const response = await adminSvc.patch("/users", updateData);

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

  const handleResetPassword = async () => {
    if (!resettingPasswordUser) return;

    try {
      setIsResettingPassword(true);
      const response = await adminSvc.post("/users/password/auto-reset", {
        user_id: resettingPasswordUser.id,
      });

      if (response.success) {
        toast.success(
          "Password reset successfully! New password has been sent to the admin user's email.",
        );
        setResettingPasswordUser(null);
      } else {
        toast.error(response.message || "Failed to reset password");
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

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

  const handleToggleStatus = async (user: User) => {
    const newStatus =
      user.status === "Active" || user.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";
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

  const openEditModal = (user: User) => {
    console.log("Opening edit modal for user:", user);
    console.log("User status:", user.status);
    console.log("User email:", user.email);
    console.log("User first_name:", user.first_name);
    setEditingUser(user);
    setEditForm({
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone_number: user.phone_number || "",
      date_of_birth: user.date_of_birth ? user.date_of_birth.split("T")[0] : "",
      street_address: user.street_address || "",
      city: user.city || "",
      postal_code: user.postal_code || "",
      state: user.state || "",
      country: user.country || "",
      kyc_status: user.kyc_status || "",
      is_email_verified: user.is_email_verified || false,
      default_currency: user.default_currency || "",
      wallet_verification_status: user.wallet_verification_status || "",
      status: user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      is_admin: user.is_admin || true,
      user_type: user.user_type || "ADMIN",
    });
    console.log("Edit form set to:", {
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone_number: user.phone_number || "",
      date_of_birth: user.date_of_birth ? user.date_of_birth.split("T")[0] : "",
      street_address: user.street_address || "",
      city: user.city || "",
      postal_code: user.postal_code || "",
      state: user.state || "",
      country: user.country || "",
      kyc_status: user.kyc_status || "",
      is_email_verified: user.is_email_verified || false,
      default_currency: user.default_currency || "",
      wallet_verification_status: user.wallet_verification_status || "",
      status: user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      is_admin: user.is_admin || true,
      user_type: user.user_type || "ADMIN",
    });
    setShowEditModal(true);
    console.log("Edit modal state set to true");
  };

  const openViewModal = (user: User) => {
    console.log("Opening view modal for user:", user);
    setViewingUser(user);
    setShowViewModal(true);
    console.log("View modal state set to true");
  };

  const openDeleteModal = (user: User) => {
    console.log("Opening delete modal for user:", user);
    setUserToDelete(user);
    setShowDeleteModal(true);
    console.log("Delete modal state set to true");
  };

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
  const handleSuspendUser = async () => {
    if (!suspendingUser) return;

    if (!suspendReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }

    try {
      const response = await adminSvc.post(
        `/users_admin/${suspendingUser.id}/suspend`,
        {
          reason: suspendReason.trim(),
          note: suspendNote.trim() || undefined,
        },
      );
      if (response.success) {
        toast.success("Admin user suspended successfully");
        setSuspendingUser(null);
        setSuspendReason("");
        setSuspendNote("");
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
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        // Check if the click is outside the dropdown
        const target = event.target as Element;
        if (!target.closest(".dropdown-container")) {
          setOpenDropdown(null);
        }
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

  // Refresh admins list when switching to admin-users tab
  useEffect(() => {
    if (activeTab === "admin-users") {
      fetchAdmins();
    }
  }, [activeTab]);

  // Load users when switching to rbac-assignments tab
  useEffect(() => {
    if (activeTab === "rbac-assignments") {
      loadUsers();
    }
  }, [activeTab]);

  // Load users when assignment modal opens
  useEffect(() => {
    if (showAssignmentModal) {
      loadUsers();
    }
  }, [showAssignmentModal]);

  // IP Filter Functions
  const loadIpFilters = async () => {
    try {
      setLoadingIpRules(true);
      const response = await adminSvc.get("/ipfilters?page=1&per-page=100");
      if (response.success && response.data) {
        // Handle case where ip_filters is null or empty
        const ipFilters = response.data.ip_filters || [];
        const filters = ipFilters.map((filter: any) => ({
          id: filter.id,
          type: filter.type === "allow" ? "allow" : "block",
          target: filter.end_ip && filter.end_ip.trim() ? "range" : "ip",
          value:
            filter.end_ip && filter.end_ip.trim()
              ? `${filter.start_ip}-${filter.end_ip}`
              : filter.start_ip,
          description: filter.description || "",
          isActive: true, // Backend doesn't have isActive field, assume all are active
          createdDate: new Date(filter.created_at || new Date())
            .toISOString()
            .split("T")[0],
          createdBy: filter.created_by
            ? `${filter.created_by.first_name} ${filter.created_by.last_name}`.trim() ||
              filter.created_by.email
            : "Unknown",
        }));
        setIpRules(filters);
      }
    } catch (error) {
      console.error("Failed to load IP filters:", error);
      toast.error("Failed to load IP filters");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const createIpFilter = async (ruleData: any) => {
    try {
      setLoadingIpRules(true);
      const [startIp, endIp] = ruleData.value.includes("-")
        ? ruleData.value.split("-")
        : [ruleData.value, ""];

      const payload = {
        start_ip: startIp,
        end_ip: endIp || "",
        type: ruleData.type === "block" ? "deny" : "allow",
        description: ruleData.description,
      };

      const response = await adminSvc.post("/ipfilters", payload);
      if (response.success) {
        toast.success("IP filter created successfully");
        await loadIpFilters();
        setShowCreateRuleModal(false);
        setRuleFormData({
          type: "block",
          target: "ip",
          value: "",
          description: "",
        });
      }
    } catch (error) {
      console.error("Failed to create IP filter:", error);
      toast.error("Failed to create IP filter");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const updateIpFilter = async (ruleId: string, ruleData: any) => {
    try {
      setLoadingIpRules(true);

      // Since backend doesn't support update, we'll delete and recreate
      // First delete the old filter
      const deleteResponse = await adminSvc.delete("/ipfilters", {
        data: { id: ruleId },
      });

      if (!deleteResponse.success) {
        throw new Error("Failed to delete old IP filter");
      }

      // Then create the new one
      const [startIp, endIp] = ruleData.value.includes("-")
        ? ruleData.value.split("-")
        : [ruleData.value, ""];

      const payload = {
        start_ip: startIp,
        end_ip: endIp || "",
        type: ruleData.type === "block" ? "deny" : "allow",
        description: ruleData.description,
      };

      const createResponse = await adminSvc.post("/ipfilters", payload);
      if (createResponse.success) {
        toast.success("IP filter updated successfully");
        await loadIpFilters();
        setShowCreateRuleModal(false);
        setEditingRule(null);
        setRuleFormData({
          type: "block",
          target: "ip",
          value: "",
          description: "",
        });
      }
    } catch (error) {
      console.error("Failed to update IP filter:", error);
      toast.error("Failed to update IP filter");
    } finally {
      setLoadingIpRules(false);
    }
  };

  const deleteIpFilter = async (ruleId: string) => {
    try {
      setLoadingIpRules(true);
      const response = await adminSvc.delete("/ipfilters", {
        data: { id: ruleId },
      });
      if (response.success) {
        toast.success("IP filter deleted successfully");
        await loadIpFilters();
      }
    } catch (error) {
      console.error("Failed to delete IP filter:", error);
      toast.error("Failed to delete IP filter");
    } finally {
      setLoadingIpRules(false);
    }
  };

  // Load IP filters when component mounts
  useEffect(() => {
    if (activeTab === "ip-blocking") {
      loadIpFilters();
    }
  }, [activeTab]);

  // Geo Blocking Functions
  const loadGeoBlockingSettings = async () => {
    try {
      setLoadingGeoSettings(true);
      const response = await adminSvc.get("/settings/geo-blocking");
      if (response.success && response.data) {
        const data = response.data;
        setGeoSettings({
          enableGeoBlocking: data.enable_geo_blocking || false,
          defaultAction: data.default_action || "allow",
          vpnDetection: data.vpn_detection || false,
          proxyDetection: data.proxy_detection || false,
          torBlocking: data.tor_blocking || false,
          logAttempts: data.log_attempts || false,
          blockedCountries: data.blocked_countries || [],
          allowedCountries: data.allowed_countries || [],
          bypassCountries: data.bypass_countries || [],
        });
      }
    } catch (error) {
      console.error("Failed to load geo blocking settings:", error);
      toast.error("Failed to load geo blocking settings");
    } finally {
      setLoadingGeoSettings(false);
    }
  };

  const saveGeoBlockingSettings = async () => {
    try {
      setLoadingGeoSettings(true);
      const payload = {
        enable_geo_blocking: geoSettings.enableGeoBlocking,
        default_action: geoSettings.defaultAction,
        vpn_detection: geoSettings.vpnDetection,
        proxy_detection: geoSettings.proxyDetection,
        tor_blocking: geoSettings.torBlocking,
        log_attempts: geoSettings.logAttempts,
        blocked_countries: geoSettings.blockedCountries,
        allowed_countries: geoSettings.allowedCountries,
        bypass_countries: geoSettings.bypassCountries,
      };

      const response = await adminSvc.put("/settings/geo-blocking", payload);
      if (response.success) {
        toast.success("Geo blocking settings saved successfully");
      }
    } catch (error) {
      console.error("Failed to save geo blocking settings:", error);
      toast.error("Failed to save geo blocking settings");
    } finally {
      setLoadingGeoSettings(false);
    }
  };

  // Load geo blocking settings when component mounts
  useEffect(() => {
    if (activeTab === "settings") {
      loadGeoBlockingSettings();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Back Office Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Manage security, authentication, roles, permissions, and admin users
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRoleModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => {
                setActiveTab("security");
                setSearchParams({ tab: "security" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "security"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Security
            </button>
            <button
              onClick={() => {
                setActiveTab("twofactor");
                setSearchParams({ tab: "twofactor" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "twofactor"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-4 w-4 inline mr-2" />
              Two-Factor Auth
            </button>
            <button
              onClick={() => {
                setActiveTab("rbac-roles");
                setSearchParams({ tab: "rbac-roles" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "rbac-roles"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Roles & Permissions
            </button>
            <button
              onClick={() => {
                setActiveTab("rbac-permissions");
                setSearchParams({ tab: "rbac-permissions" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "rbac-permissions"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Key className="h-4 w-4 inline mr-2" />
              All Permissions
            </button>
            <button
              onClick={() => {
                setActiveTab("admin-users");
                setSearchParams({ tab: "admin-users" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "admin-users"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Users
            </button>
            <button
              onClick={() => {
                setActiveTab("rbac-assignments");
                setSearchParams({ tab: "rbac-assignments" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "rbac-assignments"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              User Assignments
            </button>
            <button
              onClick={() => {
                setActiveTab("kyc-settings");
                setSearchParams({ tab: "kyc-settings" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "kyc-settings"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              KYC Settings
            </button>
            <button
              onClick={() => {
                setActiveTab("page-access");
                setSearchParams({ tab: "page-access" });
              }}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "page-access"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Page Access
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">
                  Security Settings
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Brand:</span>
                  <select
                    value={selectedSecurityBrandId || ""}
                    onChange={(e) => setSelectedSecurityBrandId(e.target.value)}
                    disabled={
                      loadingBrands || isLoadingSecurity || isSavingSecurity
                    }
                    className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 min-w-[220px] disabled:opacity-50"
                  >
                    {brands.length === 0 && (
                      <option value="" disabled>
                        {loadingBrands ? "Loading brands..." : "Select a brand"}
                      </option>
                    )}
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadSecuritySettings}
                    disabled={isLoadingSecurity || isSavingSecurity}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoadingSecurity ? "animate-spin" : ""}`}
                    />
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) =>
                      updateSecuritySetting(
                        "sessionTimeout",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    disabled={isLoadingSecurity || isSavingSecurity}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) =>
                      updateSecuritySetting(
                        "maxLoginAttempts",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    disabled={isLoadingSecurity || isSavingSecurity}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.lockoutDuration}
                    onChange={(e) =>
                      updateSecuritySetting(
                        "lockoutDuration",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    disabled={isLoadingSecurity || isSavingSecurity}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Password Min Length
                  </label>
                  <input
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) =>
                      updateSecuritySetting(
                        "passwordMinLength",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    disabled={isLoadingSecurity || isSavingSecurity}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Rate Limit (requests/minute)
                  </label>
                  <input
                    type="number"
                    value={securitySettings.rateLimitRequests}
                    onChange={(e) =>
                      updateSecuritySetting(
                        "rateLimitRequests",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    disabled={isLoadingSecurity || isSavingSecurity}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-white font-medium">
                  Security Features (for site settings)
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorRequired}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "twoFactorRequired",
                          e.target.checked,
                        )
                      }
                      disabled={isLoadingSecurity || isSavingSecurity}
                      className="rounded border-gray-500 disabled:opacity-50"
                    />
                    <span className="text-white">
                      Require Two-Factor Authentication
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.passwordRequireSpecial}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "passwordRequireSpecial",
                          e.target.checked,
                        )
                      }
                      disabled={isLoadingSecurity || isSavingSecurity}
                      className="rounded border-gray-500 disabled:opacity-50"
                    />
                    <span className="text-white">
                      Require Special Characters in Password
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.ipWhitelistEnabled}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "ipWhitelistEnabled",
                          e.target.checked,
                        )
                      }
                      disabled={isLoadingSecurity || isSavingSecurity}
                      className="rounded border-gray-500 disabled:opacity-50"
                    />
                    <span className="text-white">Enable IP Whitelisting</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={securitySettings.rateLimitEnabled}
                      onChange={(e) =>
                        updateSecuritySetting(
                          "rateLimitEnabled",
                          e.target.checked,
                        )
                      }
                      disabled={isLoadingSecurity || isSavingSecurity}
                      className="rounded border-gray-500 disabled:opacity-50"
                    />
                    <span className="text-white">Enable Rate Limiting</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={saveSecuritySettings}
                  disabled={isLoadingSecurity || isSavingSecurity}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSavingSecurity && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {isSavingSecurity ? "Saving..." : "Save Security Settings"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "twofactor" && (
            <TwoFactorAuthSettings
              userEmail="admin@tucanbit.com"
              userPhone="+1234567890"
            />
          )}

          {/* RBAC Roles Tab */}

          {activeTab === "rbac-roles" && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div>
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
                              onClick={async () => {
                                setEditingRole(role);
                                // Initialize with permission IDs + saved values/limits (if backend provides them)
                                setRoleForm({
                                  name: role.name,
                                  description: role.description || "",
                                  permissions:
                                    role.permissions_with_value?.map((p) => ({
                                      permission_id: p.permission_id,
                                      value: p.value ?? null,
                                      limit_type: p.limit_type ?? null,
                                      limit_period: p.limit_period ?? null,
                                    })) ||
                                    role.permissions?.map((p) => ({
                                      permission_id: p.id,
                                      value: null,
                                    })) ||
                                    [],
                                });
                                setPermissionSearchTerm("");
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

          {/* RBAC Permissions Tab */}
          {activeTab === "rbac-permissions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Permissions Management
                </h3>
                <button
                  onClick={() => {
                    setEditingPermission(null);
                    setPermissionFormData({
                      name: "",
                      description: "",
                      requires_value: false,
                    });
                    setShowPermissionManagementModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Permission</span>
                </button>
              </div>

              {/* Search and Bulk Actions Bar */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  {/* Search */}
                  <div className="flex-1 w-full md:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={permissionSearchQuery}
                        onChange={(e) =>
                          setPermissionSearchQuery(e.target.value)
                        }
                        placeholder="Search permissions by name or description..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const filtered = getFilteredPermissions();
                          if (selectedPermissions.size === filtered.length) {
                            setSelectedPermissions(new Set());
                          } else {
                            setSelectedPermissions(
                              new Set(filtered.map((p) => p.id)),
                            );
                          }
                        }}
                        className="text-sm text-gray-300 hover:text-white px-3 py-1.5 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        {selectedPermissions.size ===
                          getFilteredPermissions().length &&
                        getFilteredPermissions().length > 0
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                      <span className="text-sm text-gray-400">
                        {selectedPermissions.size} selected
                      </span>
                    </div>
                    {selectedPermissions.size > 0 && (
                      <div className="flex items-center space-x-2 border-l border-gray-600 pl-3">
                        <button
                          onClick={async () => {
                            if (selectedPermissions.size === 0) {
                              toast.error(
                                "Please select at least one permission",
                              );
                              return;
                            }

                            try {
                              setIsApplyingBulkUpdate(true);
                              await rbacSvc.bulkUpdatePermissionsRequiresValue({
                                permission_ids: Array.from(selectedPermissions),
                                requires_value: true,
                              });
                              toast.success(
                                `Updated ${selectedPermissions.size} permission(s)`,
                              );
                              await loadPermissions();
                              setSelectedPermissions(new Set());
                            } catch (error: any) {
                              console.error(
                                "Failed to bulk update permissions:",
                                error,
                              );
                              toast.error(
                                error.message || "Failed to update permissions",
                              );
                            } finally {
                              setIsApplyingBulkUpdate(false);
                            }
                          }}
                          disabled={
                            isApplyingBulkUpdate ||
                            selectedPermissions.size === 0
                          }
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          title="Set requires_value to true for selected permissions"
                        >
                          {isApplyingBulkUpdate && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          )}
                          <span>Set Requires Value = Yes</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (selectedPermissions.size === 0) {
                              toast.error(
                                "Please select at least one permission",
                              );
                              return;
                            }

                            try {
                              setIsApplyingBulkUpdate(true);
                              await rbacSvc.bulkUpdatePermissionsRequiresValue({
                                permission_ids: Array.from(selectedPermissions),
                                requires_value: false,
                              });
                              toast.success(
                                `Updated ${selectedPermissions.size} permission(s)`,
                              );
                              await loadPermissions();
                              setSelectedPermissions(new Set());
                            } catch (error: any) {
                              console.error(
                                "Failed to bulk update permissions:",
                                error,
                              );
                              toast.error(
                                error.message || "Failed to update permissions",
                              );
                            } finally {
                              setIsApplyingBulkUpdate(false);
                            }
                          }}
                          disabled={
                            isApplyingBulkUpdate ||
                            selectedPermissions.size === 0
                          }
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          title="Set requires_value to false for selected permissions"
                        >
                          {isApplyingBulkUpdate && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          )}
                          <span>Set Requires Value = No</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedPermissions.size ===
                                getFilteredPermissions().length &&
                              getFilteredPermissions().length > 0
                            }
                            onChange={(e) => {
                              const filtered = getFilteredPermissions();
                              if (e.target.checked) {
                                setSelectedPermissions(
                                  new Set(filtered.map((p) => p.id)),
                                );
                              } else {
                                setSelectedPermissions(new Set());
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">
                          Permission Name
                        </th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">
                          Description
                        </th>
                        <th className="px-4 py-3 text-center text-gray-300 font-medium">
                          Requires Value
                        </th>
                        <th className="px-4 py-3 text-center text-gray-300 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {getFilteredPermissions().map((permission) => (
                        <tr
                          key={permission.id}
                          className="hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission.id)}
                              onChange={(e) => {
                                const newSelected = new Set(
                                  selectedPermissions,
                                );
                                if (e.target.checked) {
                                  newSelected.add(permission.id);
                                } else {
                                  newSelected.delete(permission.id);
                                }
                                setSelectedPermissions(newSelected);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <Key className="h-4 w-4 text-blue-500" />
                              <span className="text-white font-medium">
                                {permission.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-400 text-sm">
                              {permission.description || "No description"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {permission.requires_value ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-400/10 text-gray-400">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingPermission(permission);
                                  setPermissionFormData({
                                    name: permission.name,
                                    description: permission.description || "",
                                    requires_value:
                                      permission.requires_value || false,
                                  });
                                  setShowPermissionManagementModal(true);
                                }}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                                title="Edit permission"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setPermissionToDelete(permission);
                                  setShowDeletePermissionModal(true);
                                }}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="Delete permission"
                                disabled={permission.name === "super"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredPermissions().length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      {permissionSearchQuery
                        ? "No permissions found matching your search"
                        : "No permissions available"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RBAC Assignments Tab */}
          {activeTab === "rbac-assignments" && (
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

          {/* KYC Settings Tab */}
          {activeTab === "kyc-settings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  KYC Settings
                </h3>
                <button
                  onClick={loadKycSettingsList}
                  disabled={isLoadingKycSettings}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50 text-sm"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingKycSettings ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Display KYC Settings from kyc_settings table */}
              {isLoadingKycSettings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <span className="ml-3 text-gray-400">
                    Loading KYC settings...
                  </span>
                </div>
              ) : kycSettingsList.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No KYC settings found
                </div>
              ) : (
                <div className="space-y-4">
                  {kycSettingsList.map((setting, index) => (
                    <div
                      key={setting.id || index}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-6"
                    >
                      {editingSetting?.id === setting.id && editFormData ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium text-lg">
                              {setting.setting_key}
                            </h4>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-400 hover:text-white"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Setting Value (JSON)
                            </label>
                            <textarea
                              value={editFormData.setting_value}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  setting_value: e.target.value,
                                })
                              }
                              disabled={isSavingKycSetting}
                              className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50 font-mono text-sm"
                              rows={10}
                              placeholder='{"key": "value"}'
                            />
                            <p className="text-gray-500 text-xs mt-1">
                              Enter valid JSON format
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Description
                            </label>
                            <input
                              type="text"
                              value={editFormData.description}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  description: e.target.value,
                                })
                              }
                              disabled={isSavingKycSetting}
                              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 disabled:opacity-50"
                              placeholder="Setting description"
                            />
                          </div>

                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={editFormData.is_active}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  is_active: e.target.checked,
                                })
                              }
                              disabled={isSavingKycSetting}
                              className="rounded border-gray-500 disabled:opacity-50"
                            />
                            <span className="text-white">Active</span>
                          </div>

                          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSavingKycSetting}
                              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveKycSetting}
                              disabled={isSavingKycSetting}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                            >
                              {isSavingKycSetting && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              )}
                              <span>
                                {isSavingKycSetting
                                  ? "Saving..."
                                  : "Save Changes"}
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-white font-medium text-lg mb-1">
                                {setting.setting_key}
                              </h4>
                              {setting.description && (
                                <p className="text-gray-400 text-sm">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  setting.is_active
                                    ? "text-green-400 bg-green-400/10"
                                    : "text-gray-400 bg-gray-400/10"
                                }`}
                              >
                                {setting.is_active ? "Active" : "Inactive"}
                              </span>
                              <button
                                onClick={() => handleEditKycSetting(setting)}
                                className="text-blue-400 hover:text-blue-300 p-1"
                                title="Edit setting"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <h5 className="text-white font-medium mb-3">
                              Setting Values:
                            </h5>
                            <div className="bg-gray-900 rounded-lg p-4">
                              <pre className="text-gray-300 text-sm overflow-x-auto">
                                {JSON.stringify(setting.setting_value, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                            <div>
                              <span>
                                Created:{" "}
                                {setting.created_at
                                  ? new Date(
                                      setting.created_at,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                              {setting.updated_at && (
                                <span className="ml-4">
                                  Updated:{" "}
                                  {new Date(
                                    setting.updated_at,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="text-purple-400 font-mono text-xs">
                              ID: {setting.id}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "page-access" && <PageAccessManagement />}

          {activeTab === "admin-users" && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Users</p>
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
                          e.target.value as
                            | "all"
                            | "active"
                            | "inactive"
                            | "suspended",
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
                    Users{" "}
                    {loading
                      ? "(...)"
                      : `(${filteredAdmins.length} of ${admins.length})`}
                  </h4>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create User</span>
                  </button>
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
                          <td className="py-3 px-4 text-gray-300">
                            {user.email}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-blue-400 text-sm">
                            {user.roles && user.roles.length > 0
                              ? user.roles.map((r: any) => r.name).join(", ")
                              : (user as any).role || "--"}
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
                            {(user as any).createdDate || user.created_at
                              ? new Date(
                                  (user as any).createdDate || user.created_at,
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end">
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    console.log(
                                      "Dropdown clicked for user:",
                                      user.id,
                                      "Current open:",
                                      openDropdown,
                                    );
                                    setOpenDropdown(
                                      openDropdown === user.id ? null : user.id,
                                    );
                                  }}
                                  className="p-1 text-gray-400 hover:text-white transition-colors"
                                  title="Actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {openDropdown === user.id && (
                                  <div
                                    className="dropdown-container absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-[100]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          console.log(
                                            "View button clicked for user:",
                                            user,
                                          );
                                          openViewModal(user);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer text-left"
                                      >
                                        <Eye className="h-4 w-4 mr-3" />
                                        View Details
                                      </button>
                                      <button
                                        onClick={() => {
                                          console.log(
                                            "Edit button clicked for user:",
                                            user,
                                          );
                                          openEditModal(user);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer text-left"
                                      >
                                        <Edit2 className="h-4 w-4 mr-3" />
                                        Edit User
                                      </button>
                                      {user.status?.toUpperCase() ===
                                      "SUSPENDED" ? (
                                        <button
                                          onClick={() => {
                                            handleUnsuspendUser(user);
                                            setOpenDropdown(null);
                                          }}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-green-400 transition-colors cursor-pointer text-left"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-3" />
                                          Unsuspend User
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setSuspendingUser(user);
                                            setSuspendReason("");
                                            setSuspendNote("");
                                            setOpenDropdown(null);
                                          }}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-orange-400 transition-colors cursor-pointer text-left"
                                        >
                                          <Ban className="h-4 w-4 mr-3" />
                                          Suspend User
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          console.log(
                                            "Reset password clicked for user:",
                                            user,
                                          );
                                          setResettingPasswordUser(user);
                                          setOpenDropdown(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-700 hover:text-white transition-colors cursor-pointer text-left"
                                      >
                                        <Key className="h-4 w-4 mr-3" />
                                        Reset Password
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
                          <td
                            colSpan={7}
                            className="py-8 text-center text-gray-400"
                          >
                            {searchTerm || statusFilter !== "all"
                              ? "No users found matching your criteria"
                              : "No users found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Rule Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-6">
              {editingRule ? "Edit Access Rule" : "Create New Access Rule"}
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Rule Type
                </label>
                <select
                  value={ruleFormData.type}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      type: e.target.value as "allow" | "block",
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  required
                >
                  <option value="block">Block</option>
                  <option value="allow">Allow</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Target Type
                </label>
                <select
                  value={ruleFormData.target}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      target: e.target.value as "ip" | "range" | "country",
                      value: "",
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  required
                >
                  <option value="ip">Single IP Address</option>
                  <option value="range">IP Range/Subnet</option>
                  <option value="country">Country</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {ruleFormData.target === "country"
                    ? "Country"
                    : ruleFormData.target === "range"
                      ? "IP Range (CIDR)"
                      : "IP Address"}
                </label>
                {ruleFormData.target === "country" ? (
                  <select
                    value={ruleFormData.value}
                    onChange={(e) =>
                      setRuleFormData((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={ruleFormData.value}
                    onChange={(e) =>
                      setRuleFormData((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder={
                      ruleFormData.target === "range"
                        ? "e.g., 192.168.1.0/24"
                        : "e.g., 192.168.1.100"
                    }
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={ruleFormData.description}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-20 resize-none"
                  placeholder="Reason for this rule..."
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetRuleForm}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingIpRules}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  {loadingIpRules && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {loadingIpRules
                      ? "Creating..."
                      : editingRule
                        ? "Update Rule"
                        : "Create Rule"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-400">
                    Permissions
                  </label>
                  {filteredPermissions.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      {areAllFilteredSelected() ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="mb-3 relative">
                  <input
                    type="text"
                    value={permissionSearchTerm}
                    onChange={(e) => setPermissionSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 pr-10"
                    placeholder="Search permissions by name or description..."
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg p-3 bg-gray-700">
                  {filteredPermissions.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center py-4">
                      No permissions found
                    </div>
                  ) : (
                    filteredPermissions.map((permission) => {
                      const isSelected = isPermissionSelected(permission.id);
                      const permissionValue = getPermissionValue(permission.id);

                      return (
                        <div
                          key={permission.id}
                          className="p-2 hover:bg-gray-600 rounded mb-2"
                        >
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
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

                              {/* Value Input for selected permissions that require values */}
                              {isSelected && permission.requires_value && (
                                <div className="mt-3 space-y-2 p-2 bg-gray-800 rounded border border-gray-600">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 w-24">
                                      Value:
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={permissionValue ?? ""}
                                      onChange={(e) => {
                                        const val =
                                          e.target.value === ""
                                            ? null
                                            : parseFloat(e.target.value);
                                        updatePermissionValue(
                                          permission.id,
                                          val,
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 bg-gray-900 text-white border border-gray-500 rounded px-2 py-1 text-sm"
                                      placeholder="Enter limit value"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 w-24">
                                      Limit Type:
                                    </label>
                                    <select
                                      value={
                                        getPermissionLimitType(permission.id) ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const val =
                                          e.target.value === ""
                                            ? null
                                            : (e.target.value as
                                                | "daily"
                                                | "weekly"
                                                | "monthly");
                                        updatePermissionLimitType(
                                          permission.id,
                                          val,
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 bg-gray-900 text-white border border-gray-500 rounded px-2 py-1 text-sm"
                                    >
                                      <option value="">Select type</option>
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                    </select>
                                  </div>
                                  {getPermissionLimitType(permission.id) && (
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-gray-400 w-24">
                                        Period Count:
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={
                                          getPermissionLimitPeriod(
                                            permission.id,
                                          ) ?? 1
                                        }
                                        onChange={(e) => {
                                          const val =
                                            e.target.value === ""
                                              ? null
                                              : parseInt(e.target.value);
                                          updatePermissionLimitPeriod(
                                            permission.id,
                                            val,
                                          );
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 bg-gray-900 text-white border border-gray-500 rounded px-2 py-1 text-sm"
                                        placeholder="1"
                                      />
                                      <span className="text-xs text-gray-500">
                                        {getPermissionLimitType(
                                          permission.id,
                                        ) === "daily"
                                          ? "day(s)"
                                          : getPermissionLimitType(
                                                permission.id,
                                              ) === "weekly"
                                            ? "week(s)"
                                            : "month(s)"}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        (window size)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })
                  )}
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-400">
                    Permissions
                  </label>
                  {filteredPermissions.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      {areAllFilteredSelected() ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="mb-3 relative">
                  <input
                    type="text"
                    value={permissionSearchTerm}
                    onChange={(e) => setPermissionSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 pr-10"
                    placeholder="Search permissions by name or description..."
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-gray-600 rounded-lg p-3 bg-gray-700">
                  {filteredPermissions.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center py-4">
                      No permissions found
                    </div>
                  ) : (
                    filteredPermissions.map((permission) => {
                      const isSelected = isPermissionSelected(permission.id);
                      const permissionValue = getPermissionValue(permission.id);

                      return (
                        <div
                          key={permission.id}
                          className="p-2 hover:bg-gray-600 rounded mb-2"
                        >
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
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

                              {/* Value Input for selected permissions that require values */}
                              {isSelected && permission.requires_value && (
                                <div className="mt-3 space-y-2 p-2 bg-gray-800 rounded border border-gray-600">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 w-24">
                                      Value:
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={permissionValue ?? ""}
                                      onChange={(e) => {
                                        const val =
                                          e.target.value === ""
                                            ? null
                                            : parseFloat(e.target.value);
                                        updatePermissionValue(
                                          permission.id,
                                          val,
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 bg-gray-900 text-white border border-gray-500 rounded px-2 py-1 text-sm"
                                      placeholder="Enter limit value"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 w-24">
                                      Limit Type:
                                    </label>
                                    <select
                                      value={
                                        getPermissionLimitType(permission.id) ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const val =
                                          e.target.value === ""
                                            ? null
                                            : (e.target.value as
                                                | "daily"
                                                | "weekly"
                                                | "monthly");
                                        updatePermissionLimitType(
                                          permission.id,
                                          val,
                                        );
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 bg-gray-900 text-white border border-gray-500 rounded px-2 py-1 text-sm"
                                    >
                                      <option value="">Select type</option>
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                    </select>
                                  </div>
                                  {getPermissionLimitType(permission.id) && (
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-gray-400 w-24">
                                        Period Count:
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={
                                          getPermissionLimitPeriod(
                                            permission.id,
                                          ) ?? 1
                                        }
                                        onChange={(e) => {
                                          const val =
                                            e.target.value === ""
                                              ? null
                                              : parseInt(e.target.value);
                                          updatePermissionLimitPeriod(
                                            permission.id,
                                            val,
                                          );
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 bg-gray-900 text-white border border-gray-500 rounded px-2 py-1 text-sm"
                                        placeholder="1"
                                      />
                                      <span className="text-xs text-gray-500">
                                        {getPermissionLimitType(
                                          permission.id,
                                        ) === "daily"
                                          ? "day(s)"
                                          : getPermissionLimitType(
                                                permission.id,
                                              ) === "weekly"
                                            ? "week(s)"
                                            : "month(s)"}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        (window size)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingRole) {
                      handleUpdateRolePermissions(
                        editingRole.id,
                        roleForm.permissions,
                      );
                    }
                  }}
                  disabled={loading || !editingRole}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Management Modal (Create/Edit) */}
      {showPermissionManagementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  {editingPermission ? "Edit Permission" : "Create Permission"}
                </h3>
                <button
                  onClick={() => {
                    setShowPermissionManagementModal(false);
                    setEditingPermission(null);
                    setPermissionFormData({
                      name: "",
                      description: "",
                      requires_value: false,
                    });
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!permissionFormData.name.trim()) {
                    toast.error("Permission name is required");
                    return;
                  }

                  try {
                    setIsSavingPermission(true);
                    if (editingPermission) {
                      await rbacSvc.updatePermission(editingPermission.id, {
                        name: permissionFormData.name,
                        description: permissionFormData.description,
                        requires_value: permissionFormData.requires_value,
                      });
                      toast.success("Permission updated successfully");
                    } else {
                      await rbacSvc.createPermission({
                        name: permissionFormData.name,
                        description: permissionFormData.description,
                        requires_value: permissionFormData.requires_value,
                      });
                      toast.success("Permission created successfully");
                    }
                    await loadPermissions();
                    setShowPermissionManagementModal(false);
                    setEditingPermission(null);
                    setPermissionFormData({
                      name: "",
                      description: "",
                      requires_value: false,
                    });
                  } catch (error: any) {
                    console.error("Failed to save permission:", error);
                    toast.error(error.message || "Failed to save permission");
                  } finally {
                    setIsSavingPermission(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Permission Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={permissionFormData.name}
                    onChange={(e) =>
                      setPermissionFormData({
                        ...permissionFormData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., view dashboard"
                    required
                    disabled={!!editingPermission}
                  />
                  {editingPermission && (
                    <p className="mt-1 text-xs text-gray-400">
                      Permission name cannot be changed after creation
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={permissionFormData.description}
                    onChange={(e) =>
                      setPermissionFormData({
                        ...permissionFormData,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what this permission allows"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissionFormData.requires_value}
                      onChange={(e) =>
                        setPermissionFormData({
                          ...permissionFormData,
                          requires_value: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">
                      Requires Value
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    If checked, this permission requires a value/limit when
                    assigned to a role (e.g., amount limits)
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPermissionManagementModal(false);
                      setEditingPermission(null);
                      setPermissionFormData({
                        name: "",
                        description: "",
                        requires_value: false,
                      });
                    }}
                    disabled={isSavingPermission}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSavingPermission || !permissionFormData.name.trim()
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSavingPermission && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>
                      {isSavingPermission
                        ? "Saving..."
                        : editingPermission
                          ? "Update"
                          : "Create"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Permission Modal */}
      {showDeletePermissionModal && permissionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
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
                    Delete Permission
                  </h3>
                  <p className="text-sm text-gray-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-3">
                  Are you sure you want to delete this permission? This will
                  remove it from all roles that have it assigned.
                </p>
                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {permissionToDelete.name}
                    </div>
                    <div>
                      <span className="font-medium">Description:</span>{" "}
                      {permissionToDelete.description || "No description"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeletePermissionModal(false);
                    setPermissionToDelete(null);
                  }}
                  disabled={isDeletingPermission}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsDeletingPermission(true);
                      await rbacSvc.deletePermission(permissionToDelete.id);
                      toast.success("Permission deleted successfully");
                      await loadPermissions();
                      setShowDeletePermissionModal(false);
                      setPermissionToDelete(null);
                    } catch (error: any) {
                      console.error("Failed to delete permission:", error);
                      toast.error(
                        error.message || "Failed to delete permission",
                      );
                    } finally {
                      setIsDeletingPermission(false);
                    }
                  }}
                  disabled={isDeletingPermission}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDeletingPermission && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {isDeletingPermission ? "Deleting..." : "Delete Permission"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  User Details
                </h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingUser(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                    <p className="text-white">
                      {viewingUser.phone_number || "N/A"}
                    </p>
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
                      Created Date
                    </label>
                    <p className="text-white">
                      {(viewingUser as any).createdDate ||
                      viewingUser.created_at
                        ? new Date(
                            (viewingUser as any).createdDate ||
                              viewingUser.created_at,
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  {viewingUser.roles && viewingUser.roles.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Roles
                      </label>
                      <p className="text-white">
                        {viewingUser.roles.map((r: any) => r.name).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingUser(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Edit User</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone_number}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          phone_number: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
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
                    <span>{updating ? "Updating..." : "Update User"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Create User
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      username: "",
                      email: "",
                      password: "",
                      first_name: "",
                      last_name: "",
                      phone: "",
                      date_of_birth: "",
                      street_address: "",
                      city: "",
                      postal_code: "",
                      state: "",
                      country: "",
                      kyc_status: "",
                      is_email_verified: false,
                      default_currency: "",
                      wallet_verification_status: "",
                      status: "ACTIVE",
                      is_admin: true,
                      user_type: "ADMIN",
                      brand_id: "",
                    });
                    setValidationErrors({});
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

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
                      Username <span className="text-red-400">*</span>
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
                      required
                    />
                    {validationErrors.username && (
                      <p className="text-red-400 text-xs mt-1">
                        {validationErrors.username}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email <span className="text-red-400">*</span>
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
                      required
                    />
                    {validationErrors.email && (
                      <p className="text-red-400 text-xs mt-1">
                        {validationErrors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password <span className="text-red-400">*</span>
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
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Brand <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={createForm.brand_id}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          brand_id: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loadingBrands}
                    >
                      <option value="">Select a brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
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
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateForm({
                        username: "",
                        email: "",
                        password: "",
                        first_name: "",
                        last_name: "",
                        phone: "",
                        date_of_birth: "",
                        street_address: "",
                        city: "",
                        postal_code: "",
                        state: "",
                        country: "",
                        kyc_status: "",
                        is_email_verified: false,
                        default_currency: "",
                        wallet_verification_status: "",
                        status: "ACTIVE",
                        is_admin: true,
                        user_type: "ADMIN",
                        brand_id: "",
                      });
                      setValidationErrors({});
                    }}
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
                    <span>{creating ? "Creating..." : "Create User"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Assign Role to User
                </h3>
                <button
                  onClick={() => {
                    resetAssignmentForm();
                    setShowAssignmentModal(false);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAssignRole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    User
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Search for user..."
                      className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {showUserDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingUsers ? (
                          <div className="p-4 text-center text-gray-400">
                            Loading users...
                          </div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="p-4 text-center text-gray-400">
                            No users found
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleUserSelect(user)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm"
                            >
                              <div className="font-medium">{user.username}</div>
                              <div className="text-gray-400 text-xs">
                                {user.email}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedUser && (
                    <p className="mt-2 text-sm text-gray-400">
                      Selected: {selectedUser.username} ({selectedUser.email})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
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
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetAssignmentForm();
                      setShowAssignmentModal(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !assignmentForm.userId ||
                      !assignmentForm.roleId
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>{loading ? "Assigning..." : "Assign Role"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Key className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-400">
                    A new password will be sent to the user's email.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-3">
                  Are you sure you want to reset the password for this admin
                  user?
                </p>
                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Username:</span>{" "}
                      {resettingPasswordUser.username}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {resettingPasswordUser.email}
                    </div>
                    <div>
                      <span className="font-medium">User ID:</span>{" "}
                      {resettingPasswordUser.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setResettingPasswordUser(null);
                  }}
                  disabled={isResettingPassword}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isResettingPassword && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {isResettingPassword ? "Resetting..." : "Reset Password"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {suspendingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Ban className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-white">
                      Suspend Admin User
                    </h3>
                    <p className="text-sm text-gray-400">
                      This will prevent the user from logging in.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSuspendingUser(null);
                    setSuspendReason("");
                    setSuspendNote("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="p-3 bg-gray-700 rounded-lg mb-4">
                  <div className="text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Username:</span>{" "}
                      {suspendingUser.username}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {suspendingUser.email}
                    </div>
                    <div>
                      <span className="font-medium">User ID:</span>{" "}
                      {suspendingUser.id}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for Suspension{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter reason for suspension"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Additional Note (Optional)
                  </label>
                  <textarea
                    value={suspendNote}
                    onChange={(e) => setSuspendNote(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent h-20 resize-none"
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSuspendingUser(null);
                    setSuspendReason("");
                    setSuspendNote("");
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspendUser}
                  disabled={!suspendReason.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Ban className="h-4 w-4" />
                  <span>Suspend User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
