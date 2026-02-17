import React, { useState, useEffect } from "react";
import {
  AlertConfiguration,
  AlertTrigger,
  AlertType,
  AlertStatus,
  CurrencyType,
  CreateAlertConfigurationRequest,
  UpdateAlertConfigurationRequest,
  GetAlertConfigurationsRequest,
  GetAlertTriggersRequest,
  AlertEmailGroup,
  CreateAlertEmailGroupRequest,
  UpdateAlertEmailGroupRequest,
} from "../../types";
import { alertService } from "../../services/alertService";
import { useAuth } from "../../contexts/AuthContext";
import {
  Bell,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  X,
  Save,
  RefreshCw,
  UserPlus,
  Sliders,
  History,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminActivityLogsService } from "../../services/adminActivityLogsService";

const AlertManagement: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "configurations" | "triggers" | "email-groups"
  >("configurations");

  // Alert Configurations state
  const [configurations, setConfigurations] = useState<AlertConfiguration[]>(
    [],
  );
  const [configurationsLoading, setConfigurationsLoading] = useState(false);
  const [configurationsError, setConfigurationsError] = useState<string | null>(
    null,
  );
  const [configurationsPage, setConfigurationsPage] = useState(1);
  const [configurationsTotalPages, setConfigurationsTotalPages] = useState(1);
  const [configurationsFilters, setConfigurationsFilters] =
    useState<GetAlertConfigurationsRequest>({
      page: 1,
      per_page: 20,
      search: "",
    });

  // Alert Triggers state
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [triggersError, setTriggersError] = useState<string | null>(null);
  const [triggersPage, setTriggersPage] = useState(1);
  const [triggersTotalPages, setTriggersTotalPages] = useState(1);
  const [triggersFilters, setTriggersFilters] =
    useState<GetAlertTriggersRequest>({
      page: 1,
      per_page: 20,
      search: "",
    });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedConfiguration, setSelectedConfiguration] =
    useState<AlertConfiguration | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<AlertTrigger | null>(
    null,
  );
  const [configToDelete, setConfigToDelete] =
    useState<AlertConfiguration | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateAlertConfigurationRequest>(
    {
      name: "",
      description: "",
      alert_type: "bets_count_less",
      threshold_amount: 0,
      time_window_minutes: 60,
      currency_code: "USD",
      email_notifications: false,
      webhook_url: "",
    },
  );

  // Local state for numeric inputs to allow empty field during editing
  const [thresholdInputValue, setThresholdInputValue] = useState<string>("");
  const [editThresholdInputValue, setEditThresholdInputValue] =
    useState<string>("");
  const [timeWindowInputValue, setTimeWindowInputValue] = useState<string>("");
  const [editTimeWindowInputValue, setEditTimeWindowInputValue] =
    useState<string>("");

  const [editForm, setEditForm] = useState<UpdateAlertConfigurationRequest>({});

  // Sample recipient data (no API) – used for Recipients tab
  const SAMPLE_EMAIL_GROUPS: AlertEmailGroup[] = [
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" as AlertEmailGroup["id"],
      name: "Management",
      description: "Primary contacts for alert notifications",
      emails: ["ashenafialemu66@gmail.com", "joshjones612@gmail.com"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  const [emailGroups, setEmailGroups] = useState<AlertEmailGroup[]>(SAMPLE_EMAIL_GROUPS);
  const [emailGroupsLoading, setEmailGroupsLoading] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AlertEmailGroup | null>(
    null,
  );
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [createGroupForm, setCreateGroupForm] =
    useState<CreateAlertEmailGroupRequest>({
      name: "",
      description: "",
      emails: [""],
    });
  const [editGroupForm, setEditGroupForm] =
    useState<UpdateAlertEmailGroupRequest>({});

  // Dropdown detection via CSS classes to support multiple rows

  // Alert types and options
  const alertTypes: { value: AlertType; label: string }[] = [
    { value: "bets_count_less", label: "Less than X bets in Y minutes" },
    { value: "bets_count_more", label: "More than X bets in Y minutes" },
    {
      value: "bets_amount_less",
      label: "Less than X USD in bets in Y minutes",
    },
    {
      value: "bets_amount_more",
      label: "More than X USD in bets in Y minutes",
    },
    {
      value: "deposits_total_less",
      label: "Less than X USD total deposits in Y minutes",
    },
    {
      value: "deposits_total_more",
      label: "More than X USD total deposits in Y minutes",
    },
    {
      value: "deposits_type_less",
      label: "Less than X USD deposits of type Z in Y minutes",
    },
    {
      value: "deposits_type_more",
      label: "More than X USD deposits of type Z in Y minutes",
    },
    {
      value: "withdrawals_total_less",
      label: "Less than X USD total withdrawals in Y minutes",
    },
    {
      value: "withdrawals_total_more",
      label: "More than X USD total withdrawals in Y minutes",
    },
    {
      value: "withdrawals_type_less",
      label: "Less than X USD withdrawals of type Z in Y minutes",
    },
    {
      value: "withdrawals_type_more",
      label: "More than X USD withdrawals of type Z in Y minutes",
    },
    { value: "ggr_total_less", label: "Less than X USD GGR in Y minutes" },
    { value: "ggr_total_more", label: "More than X USD GGR in Y minutes" },
    {
      value: "ggr_single_more",
      label: "More than X USD GGR in a single transaction",
    },
    {
      value: "multiple_accounts_same_ip",
      label: "More than X accounts created from same IP in Y minutes",
    },
  ];

  const currencyTypes: CurrencyType[] = [
    "USD",
    "BTC",
    "ETH",
    "SOL",
    "USDT",
    "USDC",
  ];

  // Load configurations
  const loadConfigurations = async () => {
    setConfigurationsLoading(true);
    setConfigurationsError(null);
    try {
      console.log(
        "Loading configurations with filters:",
        configurationsFilters,
      );
      const response = await alertService.getAlertConfigurations(
        configurationsFilters,
      );
      console.log("Configurations response:", response);
      if (response && response.success) {
        const data = response.data || [];
        setConfigurations(data);
        setConfigurationsTotalPages(
          Math.ceil(
            (response.total_count || 0) /
              (configurationsFilters.per_page || 20),
          ),
        );
        console.log("Configurations loaded:", data.length, "items");
      } else {
        const errorMessage =
          response?.message || "Failed to load configurations";
        setConfigurationsError(errorMessage);
        setConfigurations([]);
        console.log("Configurations load failed:", errorMessage);
      }
    } catch (error) {
      setConfigurationsError("Failed to load alert configurations");
      setConfigurations([]);
      console.error("Error loading configurations:", error);
    } finally {
      setConfigurationsLoading(false);
    }
  };

  // Load triggers
  const loadTriggers = async () => {
    setTriggersLoading(true);
    setTriggersError(null);
    try {
      console.log("Loading triggers with filters:", triggersFilters);
      const response = await alertService.getAlertTriggers(triggersFilters);
      console.log("Triggers response:", response);
      if (response && response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        console.log("Triggers data:", data, "Count:", data.length);
        setTriggers(data);
        setTriggersTotalPages(
          Math.ceil(
            (response.total_count || 0) / (triggersFilters.per_page || 20),
          ),
        );
        if (data.length === 0) {
          console.log("No triggers found in response");
        }
      } else {
        const errorMessage = response?.message || "Failed to load triggers";
        setTriggersError(errorMessage);
        setTriggers([]);
        console.error("Triggers load failed:", errorMessage, response);
      }
    } catch (error) {
      setTriggersError("Failed to load alert triggers");
      setTriggers([]);
      console.error("Error loading triggers:", error);
    } finally {
      setTriggersLoading(false);
    }
  };

  // Recipients use sample data only (no API)
  const loadEmailGroups = () => {
    setEmailGroups(SAMPLE_EMAIL_GROUPS);
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === "configurations") {
        loadConfigurations();
      } else if (activeTab === "triggers") {
        loadTriggers();
      } else if (activeTab === "email-groups") {
        loadEmailGroups();
      }
    }
  }, [isAuthenticated, activeTab, configurationsFilters, triggersFilters]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const inConfigDropdown = !!target.closest(".config-dropdown");
      const inTriggerDropdown = !!target.closest(".trigger-dropdown");

      if (!inConfigDropdown) setSelectedConfiguration(null);
      if (!inTriggerDropdown) setSelectedTrigger(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Email Group handlers
  const handleCreateGroup = async () => {
    try {
      setCreatingGroup(true);
      // Filter out empty emails
      const validEmails = createGroupForm.emails.filter(
        (email) => email.trim() !== "",
      );
      if (validEmails.length === 0) {
        toast.error("Please add at least one email address");
        return;
      }

      const response = await alertService.createEmailGroup({
        ...createGroupForm,
        emails: validEmails,
      });

      if (response.success) {
        toast.success("Email group created successfully");
        setShowCreateGroupModal(false);
        setCreateGroupForm({ name: "", description: "", emails: [""] });
        loadEmailGroups();
      } else {
        toast.error(response.message || "Failed to create email group");
      }
    } catch (error) {
      console.error("Error creating email group:", error);
      toast.error("Failed to create email group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup) return;

    try {
      setUpdatingGroup(true);

      // Get current emails from editGroupForm or fallback to selectedGroup
      const currentEmails =
        editGroupForm.emails !== undefined
          ? editGroupForm.emails
          : selectedGroup?.emails || [];

      // Filter out empty emails
      const validEmails = currentEmails.filter((email) => email.trim() !== "");

      if (validEmails.length === 0) {
        toast.error("Please add at least one email address");
        setUpdatingGroup(false);
        return;
      }

      // Prepare update request with valid emails
      const updateRequest: UpdateAlertEmailGroupRequest = {
        ...(editGroupForm.name !== undefined && { name: editGroupForm.name }),
        ...(editGroupForm.description !== undefined && {
          description: editGroupForm.description,
        }),
        emails: validEmails, // Always include emails array with valid emails
      };

      console.log("Updating email group with:", updateRequest);

      const response = await alertService.updateEmailGroup(
        selectedGroup.id,
        updateRequest,
      );
      if (response.success) {
        toast.success("Email group updated successfully");
        setShowEditGroupModal(false);
        setSelectedGroup(null);
        setEditGroupForm({});
        loadEmailGroups();
      } else {
        toast.error(response.message || "Failed to update email group");
      }
    } catch (error) {
      console.error("Error updating email group:", error);
      toast.error("Failed to update email group");
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      setDeletingGroup(id);
      const response = await alertService.deleteEmailGroup(id);
      if (response.success) {
        toast.success("Email group deleted successfully");
        loadEmailGroups();
      } else {
        toast.error(response.message || "Failed to delete email group");
      }
    } catch (error) {
      console.error("Error deleting email group:", error);
      toast.error("Failed to delete email group");
    } finally {
      setDeletingGroup(null);
    }
  };

  const addEmailToCreateForm = () => {
    setCreateGroupForm((prev) => ({
      ...prev,
      emails: [...prev.emails, ""],
    }));
  };

  const removeEmailFromCreateForm = (index: number) => {
    setCreateGroupForm((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index),
    }));
  };

  const updateEmailInCreateForm = (index: number, email: string) => {
    setCreateGroupForm((prev) => ({
      ...prev,
      emails: prev.emails.map((e, i) => (i === index ? email : e)),
    }));
  };

  // Helper functions for edit email group form
  const addEmailToEditForm = () => {
    // Always ensure we're working with editGroupForm.emails, initialize from selectedGroup if needed
    const currentEmails =
      editGroupForm.emails !== undefined
        ? editGroupForm.emails
        : selectedGroup?.emails || [];
    setEditGroupForm({ ...editGroupForm, emails: [...currentEmails, ""] });
  };

  const removeEmailFromEditForm = (index: number) => {
    // Always ensure we're working with editGroupForm.emails, initialize from selectedGroup if needed
    const currentEmails =
      editGroupForm.emails !== undefined
        ? editGroupForm.emails
        : selectedGroup?.emails || [];
    setEditGroupForm({
      ...editGroupForm,
      emails: currentEmails.filter((_, i) => i !== index),
    });
  };

  const updateEmailInEditForm = (index: number, email: string) => {
    // editGroupForm.emails should always be set when modal opens (group.emails || []), but fallback if needed
    const currentEmails = editGroupForm.emails || selectedGroup?.emails || [];
    const updatedEmails = [...currentEmails];
    updatedEmails[index] = email;
    // Always set emails array to ensure state is updated and triggers re-render
    setEditGroupForm({ ...editGroupForm, emails: updatedEmails });
  };

  // Handle create configuration
  const handleCreateConfiguration = async () => {
    try {
      setCreating(true);
      const response = await alertService.createAlertConfiguration(createForm);
      if (response.success) {
        toast.success("Alert configuration created");
        try {
          await adminActivityLogsService.createActivityLog({
            action: "ALERT_CREATE",
            category: "AlertManagement",
            severity: "info",
            resource_type: "alert_configuration",
            resource_id: (response.data as any)?.id,
            description: `Created alert: ${createForm.name}`,
            details: createForm,
          });
        } catch {}
        setShowCreateModal(false);
        setThresholdInputValue("");
        setTimeWindowInputValue("");
        setCreateForm({
          name: "",
          description: "",
          alert_type: "bets_count_less",
          threshold_amount: 0,
          time_window_minutes: 60,
          currency_code: "USD",
          email_notifications: false,
          webhook_url: "",
          email_group_ids: [],
        });
        loadConfigurations();
      } else {
        alert(response.message);
      }
    } catch (error) {
      alert("Failed to create alert configuration");
      console.error("Error creating configuration:", error);
    } finally {
      setCreating(false);
    }
  };

  // Handle update configuration
  const handleUpdateConfiguration = async () => {
    if (!selectedConfiguration) return;

    try {
      setUpdating(true);
      const response = await alertService.updateAlertConfiguration(
        selectedConfiguration.id,
        editForm,
      );
      if (response.success) {
        toast.success("Alert configuration updated");
        try {
          await adminActivityLogsService.createActivityLog({
            action: "ALERT_UPDATE",
            category: "AlertManagement",
            severity: "info",
            resource_type: "alert_configuration",
            resource_id: selectedConfiguration.id,
            description: `Updated alert: ${selectedConfiguration.name}`,
            details: editForm,
          });
        } catch {}
        // Delay closing to ensure the user sees the success message
        setTimeout(() => {
          setShowEditModal(false);
          setSelectedConfiguration(null);
          setEditForm({});
          setEditThresholdInputValue("");
          setEditTimeWindowInputValue("");
          loadConfigurations();
        }, 800);
      } else {
        toast.error(response.message || "Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update alert configuration");
      console.error("Error updating configuration:", error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle delete configuration
  const handleDeleteConfiguration = async (id: string) => {
    const target = configurations.find((c) => c.id === id) || null;
    setConfigToDelete(target);
    setShowDeleteModal(true);
  };

  const confirmDeleteConfiguration = async () => {
    if (!configToDelete) return;
    try {
      setDeleting(true);
      const response = await alertService.deleteAlertConfiguration(
        configToDelete.id as unknown as string,
      );
      if (response.success) {
        toast.success("Alert configuration deleted");
        try {
          await adminActivityLogsService.createActivityLog({
            action: "ALERT_DELETE",
            category: "AlertManagement",
            severity: "warning",
            resource_type: "alert_configuration",
            resource_id: configToDelete.id as unknown as string,
            description: `Deleted alert configuration: ${configToDelete.name}`,
          });
        } catch {}
        setShowDeleteModal(false);
        setConfigToDelete(null);
        loadConfigurations();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error("Failed to delete alert configuration");
      console.error("Error deleting configuration:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Handle acknowledge trigger
  const handleAcknowledgeTrigger = async (id: string) => {
    try {
      setAcknowledging(id);
      const response = await alertService.acknowledgeAlert(id, {
        acknowledged: true,
      });
      if (response.success) {
        try {
          await adminActivityLogsService.createActivityLog({
            action: "ALERT_ACKNOWLEDGE",
            category: "AlertManagement",
            severity: "info",
            resource_type: "alert_trigger",
            resource_id: id,
            description: "Acknowledged alert trigger",
          });
        } catch {}
        loadTriggers();
      } else {
        alert(response.message);
      }
    } catch (error) {
      alert("Failed to acknowledge alert");
      console.error("Error acknowledging trigger:", error);
    } finally {
      setAcknowledging(null);
    }
  };

  // Handle edit configuration click
  const handleEditConfiguration = async (config: AlertConfiguration) => {
    setSelectedConfiguration(config);
    setEditForm({
      name: config.name,
      description: config.description,
      status: config.status,
      threshold_amount: config.threshold_amount,
      time_window_minutes: config.time_window_minutes,
      currency_code: config.currency_code,
      email_notifications: config.email_notifications,
      webhook_url: config.webhook_url,
      email_group_ids: config.email_group_ids || [],
    });
    // Load email groups to show in dropdown
    await loadEmailGroups();
    setShowEditModal(true);
  };

  // Handle view trigger click
  const handleViewTrigger = (trigger: AlertTrigger) => {
    setSelectedTrigger(trigger);
    setShowTriggerModal(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-red-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access denied</h2>
          <p className="text-slate-400">
            Sign in to manage notification rules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg shadow-black/20">
              <Bell className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Notification rules
              </h1>
              <p className="mt-1 text-sm text-slate-400 max-w-xl">
                Define rules and monitor triggers for betting, deposits, withdrawals, and GGR.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await loadEmailGroups();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <Plus className="h-4 w-4" />
            Create rule
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/95 shadow-xl shadow-black/10 flex flex-col md:flex-row min-h-[520px] backdrop-blur-sm">
          <aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r border-slate-700/80 bg-slate-800/30">
            <nav className="p-3 space-y-6" aria-label="Notification rules sections">
              <div>
                <h2 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rules & notifications
                </h2>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveTab("configurations")}
                    className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-medium text-sm text-left transition-colors ${
                      activeTab === "configurations"
                        ? "bg-red-500/15 text-red-500"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <Sliders className="h-4 w-4 shrink-0" />
                    Rules ({configurations.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("triggers")}
                    className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-medium text-sm text-left transition-colors ${
                      activeTab === "triggers"
                        ? "bg-red-500/15 text-red-500"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <History className="h-4 w-4 shrink-0" />
                    Trigger history ({triggers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("email-groups")}
                    className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-medium text-sm text-left transition-colors ${
                      activeTab === "email-groups"
                        ? "bg-red-500/15 text-red-500"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                    }`}
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    Recipients ({emailGroups.length})
                  </button>
                </div>
              </div>
            </nav>
          </aside>

          <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        {activeTab === "configurations" && (
          <div className="flex flex-col h-full">
            <div className="shrink-0 border-b border-slate-700/80 bg-slate-800/30 px-4 py-4 sm:px-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Rules
              </h3>
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-0 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search rules..."
                    value={configurationsFilters.search || ""}
                    onChange={(e) =>
                      setConfigurationsFilters({
                        ...configurationsFilters,
                        search: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <div className="relative min-w-0 flex-1 min-w-[160px]">
                  <select
                    value={configurationsFilters.alert_type || ""}
                    onChange={(e) =>
                      setConfigurationsFilters({
                        ...configurationsFilters,
                        alert_type: e.target.value as AlertType,
                        page: 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="">All types</option>
                    {alertTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative min-w-0 flex-1 min-w-[140px]">
                  <select
                    value={configurationsFilters.status || ""}
                    onChange={(e) =>
                      setConfigurationsFilters({
                        ...configurationsFilters,
                        status: e.target.value as AlertStatus,
                        page: 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="triggered">Triggered</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/80">
                <thead className="bg-slate-800/40">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                      Name
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                      Type
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                      Threshold
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                      Time window
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 bg-slate-900/30">
                  {configurationsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center sm:px-6">
                        <div className="inline-flex items-center gap-2 text-slate-400">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-red-500" />
                          <span className="text-sm">Loading rules…</span>
                        </div>
                      </td>
                    </tr>
                  ) : configurationsError ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-red-400 sm:px-6"
                      >
                        {configurationsError}
                      </td>
                    </tr>
                  ) : !configurations || configurations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-slate-400 sm:px-6"
                      >
                        {configurationsFilters.search ||
                        configurationsFilters.alert_type ||
                        configurationsFilters.status
                          ? "No rules match your filters."
                          : "No rules yet. Create one to get started."}
                      </td>
                    </tr>
                  ) : (
                    (configurations || []).map((config) => (
                      <tr
                        key={config.id}
                        className="transition-colors hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {config.name}
                            </div>
                            {config.description && (
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                {config.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-200 sm:px-6">
                          {alertService.getAlertTypeLabel(config.alert_type)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-200 sm:px-6">
                          {alertService.formatCurrency(
                            config.threshold_amount,
                            config.currency_code || "USD",
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-200 sm:px-6">
                          {alertService.formatTimeWindow(
                            config.time_window_minutes,
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${alertService.getStatusColor(config.status)}`}
                          >
                            {config.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right sm:px-6">
                          <div className="relative config-dropdown inline-block">
                            <button
                              onClick={() => setSelectedConfiguration(config)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700/60 hover:text-white"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {selectedConfiguration?.id === config.id && (
                              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-700/80 bg-slate-800 py-1 shadow-xl">
                                <button
                                  onClick={() => {
                                    handleEditConfiguration(config);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700/60 hover:text-white"
                                >
                                  <Edit className="h-4 w-4 shrink-0" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteConfiguration(config.id);
                                    setSelectedConfiguration(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition hover:bg-slate-700/60 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4 shrink-0" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {configurationsTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Page {configurationsPage} of {configurationsTotalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        setConfigurationsFilters({
                          ...configurationsFilters,
                          page: configurationsPage - 1,
                        })
                      }
                      disabled={configurationsPage === 1}
                      className="px-3 py-1 border border-gray-600 rounded-md text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setConfigurationsFilters({
                          ...configurationsFilters,
                          page: configurationsPage + 1,
                        })
                      }
                      disabled={configurationsPage === configurationsTotalPages}
                      className="px-3 py-1 border border-gray-600 rounded-md text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Triggers Tab */}
        {activeTab === "triggers" && (
          <div>
            <div className="px-6 py-4 border-b border-slate-700/80">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
                Trigger history
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="relative min-w-0 flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search triggers..."
                    value={triggersFilters.search || ""}
                    onChange={(e) =>
                      setTriggersFilters({
                        ...triggersFilters,
                        search: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <div className="relative min-w-0 flex-1">
                  <select
                    value={
                      triggersFilters.acknowledged === undefined
                        ? ""
                        : triggersFilters.acknowledged.toString()
                    }
                    onChange={(e) =>
                      setTriggersFilters({
                        ...triggersFilters,
                        acknowledged:
                          e.target.value === ""
                            ? undefined
                            : e.target.value === "true",
                        page: 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="false">Unacknowledged</option>
                    <option value="true">Acknowledged</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Triggers Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Alert Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Triggered At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {triggersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : triggersError ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-red-400"
                      >
                        {triggersError}
                      </td>
                    </tr>
                  ) : !triggers || triggers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-gray-400"
                      >
                        {triggersFilters.search ||
                        triggersFilters.acknowledged !== undefined
                          ? "No alert triggers match your filters"
                          : "No alert triggers found"}
                      </td>
                    </tr>
                  ) : (
                    (triggers || []).map((trigger) => (
                      <tr
                        key={trigger.id}
                        className="hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {trigger.alert_configuration?.name ||
                              "Unknown Alert"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {trigger.username ? (
                              `${trigger.username}${trigger.user_email ? ` (${trigger.user_email})` : ""}`
                            ) : trigger.user_email ? (
                              trigger.user_email
                            ) : trigger.user_id ? (
                              `User ID: ${trigger.user_id}`
                            ) : (
                              <span className="text-gray-400 italic">
                                System Alert
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {trigger.amount_usd
                              ? alertService.formatCurrency(trigger.amount_usd)
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {new Date(trigger.triggered_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              trigger.acknowledged
                                ? "text-green-300 bg-green-900"
                                : "text-red-300 bg-red-900"
                            }`}
                          >
                            {trigger.acknowledged
                              ? "Acknowledged"
                              : "Unacknowledged"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="relative trigger-dropdown">
                            <button
                              onClick={() => setSelectedTrigger(trigger)}
                              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {selectedTrigger?.id === trigger.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 border border-gray-600">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      handleViewTrigger(trigger);
                                      setSelectedTrigger(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-3" />
                                    View Details
                                  </button>
                                  {!trigger.acknowledged && (
                                    <button
                                      onClick={() => {
                                        handleAcknowledgeTrigger(trigger.id);
                                        setSelectedTrigger(null);
                                      }}
                                      disabled={acknowledging === trigger.id}
                                      className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${acknowledging === trigger.id ? "text-green-500 opacity-70 cursor-not-allowed" : "text-green-400 hover:bg-gray-600 hover:text-green-300"}`}
                                    >
                                      {acknowledging === trigger.id ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 mr-3 animate-spin" />
                                          Acknowledging...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-3" />
                                          Acknowledge Alert
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {triggersTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Page {triggersPage} of {triggersTotalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        setTriggersFilters({
                          ...triggersFilters,
                          page: triggersPage - 1,
                        })
                      }
                      disabled={triggersPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setTriggersFilters({
                          ...triggersFilters,
                          page: triggersPage + 1,
                        })
                      }
                      disabled={triggersPage === triggersTotalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Groups Tab */}
        {activeTab === "email-groups" && (
          <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                  Recipients
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Email groups for alert notifications
                </p>
              </div>

              {!Array.isArray(emailGroups) || emailGroups.length === 0 ? (
                <div className="rounded-2xl border border-slate-700/80 bg-slate-800/30 p-12 text-center">
                  <Mail className="h-14 w-14 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">No recipients</p>
                  <p className="text-slate-500 text-sm">Sample recipients will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(emailGroups || []).map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-slate-700/80 bg-slate-800/40 overflow-hidden transition-colors hover:border-slate-600/80"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-stretch">
                        <div className="flex items-center gap-4 p-5 sm:p-6 sm:border-r border-slate-700/80 sm:w-52 shrink-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                            <Users className="h-6 w-6 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-white truncate">
                              {group.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {group.emails?.length ?? 0} recipient{group.emails?.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex-1 p-5 sm:p-6">
                          {group.description && (
                            <p className="text-sm text-slate-400 mb-4">{group.description}</p>
                          )}
                          <div className="flex flex-col gap-2">
                            {group.emails && group.emails.length > 0 ? (
                              group.emails.map((email, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 rounded-xl bg-slate-900/60 border border-slate-700/60 px-4 py-3"
                                >
                                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                                  <span className="text-sm font-medium text-slate-200 truncate">
                                    {email}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 italic">No emails</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
          </div>
        </div>

        {/* Create Configuration Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setShowCreateModal(false);
              }
            }}
          >
            <div
              className="relative top-20 mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-md bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-3">
                <h3 className="text-lg font-medium text-white mb-4">
                  Create Alert Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter alert name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Description
                    </label>
                    <textarea
                      value={createForm.description || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter alert description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Alert Type
                    </label>
                    <select
                      value={createForm.alert_type}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          alert_type: e.target.value as AlertType,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {alertTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Threshold Amount (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        thresholdInputValue !== ""
                          ? thresholdInputValue
                          : createForm.threshold_amount || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty field during typing
                        setThresholdInputValue(value);

                        // Remove leading zeros when typing (e.g., "01" -> "1", "001" -> "1")
                        if (value === "" || value === "-") {
                          setCreateForm({ ...createForm, threshold_amount: 0 });
                          return;
                        }
                        const cleanedValue = value.replace(/^0+(?=\d)/, "");
                        const parsed = parseFloat(cleanedValue);
                        if (!isNaN(parsed)) {
                          setCreateForm({
                            ...createForm,
                            threshold_amount: parsed,
                          });
                        }
                      }}
                      onFocus={(e) => {
                        // When focused, show the current value (or empty if 0)
                        setThresholdInputValue(
                          createForm.threshold_amount === 0
                            ? ""
                            : String(createForm.threshold_amount),
                        );
                      }}
                      onBlur={(e) => {
                        // If empty on blur, set to 0 and clear input state
                        if (e.target.value === "" || e.target.value === "-") {
                          setCreateForm({ ...createForm, threshold_amount: 0 });
                          setThresholdInputValue("");
                        } else {
                          setThresholdInputValue("");
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter threshold amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Time Window (minutes)
                    </label>
                    <input
                      type="number"
                      value={
                        timeWindowInputValue !== ""
                          ? timeWindowInputValue
                          : createForm.time_window_minutes || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty field during typing
                        setTimeWindowInputValue(value);

                        // Remove leading zeros when typing (e.g., "01" -> "1", "001" -> "1")
                        if (value === "" || value === "-") {
                          setCreateForm({
                            ...createForm,
                            time_window_minutes: 60,
                          });
                          return;
                        }
                        const cleanedValue = value.replace(/^0+(?=\d)/, "");
                        const parsed = parseInt(cleanedValue);
                        if (!isNaN(parsed)) {
                          setCreateForm({
                            ...createForm,
                            time_window_minutes: parsed,
                          });
                        }
                      }}
                      onFocus={(e) => {
                        // When focused, show the current value (or empty if default)
                        setTimeWindowInputValue(
                          createForm.time_window_minutes === 60
                            ? ""
                            : String(createForm.time_window_minutes),
                        );
                      }}
                      onBlur={(e) => {
                        // If empty on blur, set to 60 and clear input state
                        if (e.target.value === "" || e.target.value === "-") {
                          setCreateForm({
                            ...createForm,
                            time_window_minutes: 60,
                          });
                          setTimeWindowInputValue("");
                        } else {
                          setTimeWindowInputValue("");
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter time window in minutes"
                    />
                  </div>

                  {(createForm.alert_type.includes("type_") ||
                    createForm.alert_type === "ggr_single_more") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Currency Type
                      </label>
                      <select
                        value={createForm.currency_code || "USD"}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            currency_code: e.target.value as CurrencyType,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {currencyTypes.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="email_notifications"
                      checked={createForm.email_notifications}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCreateForm({
                          ...createForm,
                          email_notifications: e.target.checked,
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label
                      htmlFor="email_notifications"
                      className="ml-2 block text-sm text-gray-300 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Email Notifications
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Webhook URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={createForm.webhook_url || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          webhook_url: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter webhook URL"
                    />
                  </div>

                  {createForm.email_notifications && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Groups
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-md p-2 bg-gray-700">
                        {emailGroups.length === 0 ? (
                          <p className="text-xs text-gray-400">
                            No email groups available. Create one in the Email
                            Groups tab.
                          </p>
                        ) : (
                          emailGroups.map((group) => (
                            <label
                              key={group.id}
                              className="flex items-center mb-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={(
                                  createForm.email_group_ids || []
                                ).includes(group.id)}
                                onChange={(e) => {
                                  const currentIds =
                                    createForm.email_group_ids || [];
                                  if (e.target.checked) {
                                    setCreateForm({
                                      ...createForm,
                                      email_group_ids: [
                                        ...currentIds,
                                        group.id,
                                      ],
                                    });
                                  } else {
                                    setCreateForm({
                                      ...createForm,
                                      email_group_ids: currentIds.filter(
                                        (id) => id !== group.id,
                                      ),
                                    });
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                              />
                              <span className="ml-2 text-sm text-gray-300">
                                {group.name} ({group.emails?.length || 0}{" "}
                                emails)
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateConfiguration}
                    disabled={creating}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2 ${creating ? "bg-blue-700 opacity-70 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {creating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Configuration Modal */}
        {showEditModal && selectedConfiguration && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the modal content
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setSelectedConfiguration(null);
              }
            }}
          >
            <div
              className="relative top-20 mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-md bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-3">
                <h3 className="text-lg font-medium text-white mb-4">
                  Edit Alert Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={
                        editForm.name !== undefined
                          ? editForm.name
                          : selectedConfiguration.name
                      }
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Description
                    </label>
                    <textarea
                      value={
                        editForm.description !== undefined
                          ? editForm.description
                          : selectedConfiguration.description || ""
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Status
                    </label>
                    <select
                      value={editForm.status || selectedConfiguration.status}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          status: e.target.value as AlertStatus,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="triggered">Triggered</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Threshold Amount (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        editThresholdInputValue !== ""
                          ? editThresholdInputValue
                          : (editForm.threshold_amount !== undefined
                              ? editForm.threshold_amount
                              : selectedConfiguration.threshold_amount) || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty field during typing
                        setEditThresholdInputValue(value);

                        // Remove leading zeros when typing (e.g., "01" -> "1", "001" -> "1")
                        if (value === "" || value === "-") {
                          setEditForm({
                            ...editForm,
                            threshold_amount:
                              selectedConfiguration.threshold_amount,
                          });
                          return;
                        }
                        const cleanedValue = value.replace(/^0+(?=\d)/, "");
                        const parsed = parseFloat(cleanedValue);
                        if (!isNaN(parsed)) {
                          setEditForm({
                            ...editForm,
                            threshold_amount: parsed,
                          });
                        }
                      }}
                      onFocus={(e) => {
                        // When focused, show the current value (or empty if 0)
                        const currentValue =
                          editForm.threshold_amount !== undefined
                            ? editForm.threshold_amount
                            : selectedConfiguration.threshold_amount;
                        setEditThresholdInputValue(
                          currentValue === 0 ? "" : String(currentValue),
                        );
                      }}
                      onBlur={(e) => {
                        // If empty on blur, set to original value and clear input state
                        if (e.target.value === "" || e.target.value === "-") {
                          setEditForm({
                            ...editForm,
                            threshold_amount:
                              selectedConfiguration.threshold_amount,
                          });
                          setEditThresholdInputValue("");
                        } else {
                          setEditThresholdInputValue("");
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Time Window (minutes)
                    </label>
                    <input
                      type="number"
                      value={
                        editTimeWindowInputValue !== ""
                          ? editTimeWindowInputValue
                          : (editForm.time_window_minutes !== undefined
                              ? editForm.time_window_minutes
                              : selectedConfiguration.time_window_minutes) || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty field during typing
                        setEditTimeWindowInputValue(value);

                        // Remove leading zeros when typing (e.g., "01" -> "1", "001" -> "1")
                        if (value === "" || value === "-") {
                          setEditForm({
                            ...editForm,
                            time_window_minutes:
                              selectedConfiguration.time_window_minutes,
                          });
                          return;
                        }
                        const cleanedValue = value.replace(/^0+(?=\d)/, "");
                        const parsed = parseInt(cleanedValue);
                        if (!isNaN(parsed)) {
                          setEditForm({
                            ...editForm,
                            time_window_minutes: parsed,
                          });
                        }
                      }}
                      onFocus={(e) => {
                        // When focused, show the current value (or empty if default)
                        const currentValue =
                          editForm.time_window_minutes !== undefined
                            ? editForm.time_window_minutes
                            : selectedConfiguration.time_window_minutes;
                        setEditTimeWindowInputValue(
                          currentValue === 60 ? "" : String(currentValue),
                        );
                      }}
                      onBlur={(e) => {
                        // If empty on blur, set to original value and clear input state
                        if (e.target.value === "" || e.target.value === "-") {
                          setEditForm({
                            ...editForm,
                            time_window_minutes:
                              selectedConfiguration.time_window_minutes,
                          });
                          setEditTimeWindowInputValue("");
                        } else {
                          setEditTimeWindowInputValue("");
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_email_notifications"
                      checked={
                        editForm.email_notifications !== undefined
                          ? editForm.email_notifications
                          : selectedConfiguration.email_notifications
                      }
                      onChange={(e) => {
                        e.stopPropagation();
                        setEditForm({
                          ...editForm,
                          email_notifications: e.target.checked,
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label
                      htmlFor="edit_email_notifications"
                      className="ml-2 block text-sm text-gray-300 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Email Notifications
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Webhook URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={
                        editForm.webhook_url !== undefined
                          ? editForm.webhook_url
                          : selectedConfiguration.webhook_url || ""
                      }
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          webhook_url: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {(editForm.email_notifications !== undefined
                    ? editForm.email_notifications
                    : selectedConfiguration.email_notifications) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Groups
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-md p-2 bg-gray-700">
                        {emailGroups.length === 0 ? (
                          <p className="text-xs text-gray-400">
                            No email groups available. Create one in the Email
                            Groups tab.
                          </p>
                        ) : (
                          emailGroups.map((group) => {
                            const currentIds =
                              editForm.email_group_ids !== undefined
                                ? editForm.email_group_ids
                                : selectedConfiguration.email_group_ids || [];
                            return (
                              <label
                                key={group.id}
                                className="flex items-center mb-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={currentIds.includes(group.id)}
                                  onChange={(e) => {
                                    const ids =
                                      editForm.email_group_ids !== undefined
                                        ? editForm.email_group_ids
                                        : selectedConfiguration.email_group_ids ||
                                          [];
                                    if (e.target.checked) {
                                      setEditForm({
                                        ...editForm,
                                        email_group_ids: [...ids, group.id],
                                      });
                                    } else {
                                      setEditForm({
                                        ...editForm,
                                        email_group_ids: ids.filter(
                                          (id) => id !== group.id,
                                        ),
                                      });
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                                />
                                <span className="ml-2 text-sm text-gray-300">
                                  {group.name} ({group.emails?.length || 0}{" "}
                                  emails)
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedConfiguration(null);
                      setEditThresholdInputValue("");
                      setEditTimeWindowInputValue("");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateConfiguration}
                    disabled={updating}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2 ${updating ? "bg-blue-700 opacity-70 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {updating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : null}
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && configToDelete && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-1/3 mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-md bg-gray-800">
              <div className="mt-1">
                <h3 className="text-lg font-medium text-white mb-2">
                  Delete Alert Configuration
                </h3>
                <p className="text-gray-300 mb-4">
                  Are you sure you want to delete "{configToDelete.name}"?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setConfigToDelete(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteConfiguration}
                    disabled={deleting}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center gap-2 ${deleting ? "bg-red-700 opacity-70 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                  >
                    {deleting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : null}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Trigger Modal */}
        {showTriggerModal && selectedTrigger && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-700 w-96 shadow-lg rounded-md bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-white mb-4">
                  Alert Trigger Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Alert Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTrigger.alert_configuration?.name ||
                        "Unknown Alert"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      User
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTrigger.username ? (
                        `${selectedTrigger.username}${selectedTrigger.user_email ? ` (${selectedTrigger.user_email})` : ""}`
                      ) : selectedTrigger.user_email ? (
                        selectedTrigger.user_email
                      ) : selectedTrigger.user_id ? (
                        `User ID: ${selectedTrigger.user_id}`
                      ) : (
                        <span className="text-gray-500 italic">
                          System Alert (Aggregate)
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Transaction ID
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTrigger.transaction_id || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTrigger.amount_usd
                        ? alertService.formatCurrency(
                            selectedTrigger.amount_usd,
                          )
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Trigger Value
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {alertService.formatCurrency(
                        selectedTrigger.trigger_value,
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Threshold Value
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {alertService.formatCurrency(
                        selectedTrigger.threshold_value,
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Triggered At
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTrigger.triggered_at).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTrigger.acknowledged
                          ? "text-green-600 bg-green-100"
                          : "text-red-600 bg-red-100"
                      }`}
                    >
                      {selectedTrigger.acknowledged
                        ? "Acknowledged"
                        : "Unacknowledged"}
                    </span>
                  </div>

                  {selectedTrigger.context_data && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Context Data
                      </label>
                      <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {selectedTrigger.context_data}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowTriggerModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                  {!selectedTrigger.acknowledged && (
                    <button
                      onClick={() => {
                        handleAcknowledgeTrigger(selectedTrigger.id);
                        setShowTriggerModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Create Email Group Modal */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-700 w-[600px] shadow-lg rounded-md bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-white mb-4">
                  Create Email Group
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={createGroupForm.name}
                      onChange={(e) =>
                        setCreateGroupForm({
                          ...createGroupForm,
                          name: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter group name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Description
                    </label>
                    <textarea
                      value={createGroupForm.description || ""}
                      onChange={(e) =>
                        setCreateGroupForm({
                          ...createGroupForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Email Addresses
                      </label>
                      <button
                        type="button"
                        onClick={addEmailToCreateForm}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Email
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {createGroupForm.emails.map((email, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                              updateEmailInCreateForm(index, e.target.value)
                            }
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="email@example.com"
                          />
                          {createGroupForm.emails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEmailFromCreateForm(index)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setCreateGroupForm({
                        name: "",
                        description: "",
                        emails: [""],
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={creatingGroup}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2 ${creatingGroup ? "bg-blue-700 opacity-70 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {creatingGroup ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Email Group Modal */}
        {showEditGroupModal && selectedGroup && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-700 w-[600px] shadow-lg rounded-md bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-white mb-4">
                  Edit Email Group
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={
                        editGroupForm.name !== undefined
                          ? editGroupForm.name
                          : selectedGroup.name
                      }
                      onChange={(e) =>
                        setEditGroupForm({
                          ...editGroupForm,
                          name: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Description
                    </label>
                    <textarea
                      value={
                        editGroupForm.description !== undefined
                          ? editGroupForm.description
                          : selectedGroup.description || ""
                      }
                      onChange={(e) =>
                        setEditGroupForm({
                          ...editGroupForm,
                          description: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Email Addresses
                      </label>
                      <button
                        type="button"
                        onClick={addEmailToEditForm}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Email
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(() => {
                        // Ensure we always have at least one email input
                        const emailsToShow =
                          editGroupForm.emails !== undefined
                            ? editGroupForm.emails.length > 0
                              ? editGroupForm.emails
                              : [""]
                            : selectedGroup?.emails &&
                                selectedGroup.emails.length > 0
                              ? selectedGroup.emails
                              : [""];
                        return emailsToShow.map((email, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="email"
                              value={email || ""}
                              onChange={(e) =>
                                updateEmailInEditForm(index, e.target.value)
                              }
                              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="email@example.com"
                            />
                            {emailsToShow.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEmailFromEditForm(index)}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditGroupModal(false);
                      setSelectedGroup(null);
                      setEditGroupForm({});
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditGroup}
                    disabled={updatingGroup}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center gap-2 ${updatingGroup ? "bg-blue-700 opacity-70 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {updatingGroup ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AlertManagement;
