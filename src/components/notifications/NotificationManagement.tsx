import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Send,
  Upload,
  X,
  Users,
  MessageSquare,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { toast } from "react-hot-toast";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  metadata: any;
  read: boolean;
  delivered: boolean;
  created_by: string;
  created_at: string;
  read_at?: string;
}

interface Campaign {
  id: string;
  title: string;
  message_type:
    | "payments"
    | "bonus"
    | "general"
    | "security"
    | "promotional"
    | "kyc"
    | "welcome"
    | "system"
    | "alert";
  subject: string;
  content: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  created_at: string;
  updated_at: string;
}

interface Segment {
  segment_type: "criteria" | "csv" | "all_users";
  segment_name?: string;
  criteria?: {
    days_since_last_activity?: number;
    user_level?: string;
    min_balance?: number;
    max_balance?: number;
    kyc_status?: string;
    country?: string;
    currency?: string;
  };
  csv_data?: string;
}

export const NotificationManagement: React.FC = () => {
  const { adminSvc } = useServices();
  const [activeTab, setActiveTab] = useState<"notifications" | "campaigns">(
    "campaigns",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(
    null,
  );

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "success" | "error",
    audience: "all" as "all" | "specific",
    targetUsers: [] as string[],
    scheduleDate: "",
    scheduleTime: "",
  });

  const [campaignFormData, setCampaignFormData] = useState({
    title: "",
    message_type: "general" as Campaign["message_type"],
    subject: "",
    content: "",
    scheduled_at: "",
    segments: [] as Segment[],
  });

  // Real notifications data
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalUserCount, setTotalUserCount] = useState<number>(0);
  const [notificationsTotal, setNotificationsTotal] = useState<number>(0);
  const [notificationsTotalPages, setNotificationsTotalPages] =
    useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [deliveredCount, setDeliveredCount] = useState<number>(0);
  const [readCount, setReadCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage] = useState<number>(10);

  // Campaigns pagination state
  const [campaignsPage, setCampaignsPage] = useState<number>(1);
  const [campaignsPerPage] = useState<number>(10);
  const [campaignsTotal, setCampaignsTotal] = useState<number>(0);
  const [campaignsTotalPages, setCampaignsTotalPages] = useState<number>(0);

  // Mock user list for audience selection
  const availableUsers = [
    "CryptoKing92",
    "BitcoinWhale",
    "EthereumMaster",
    "DogePlayer",
    "LitecoinLover",
    "CardanoTrader",
    "SolanaGamer",
    "PolygonPlayer",
    "UnverifiedUser1",
    "UnverifiedUser2",
  ];

  const messageTypes = [
    {
      value: "payments",
      label: "Payments",
      icon: AlertCircle,
      color: "text-blue-400 bg-blue-400/10",
    },
    {
      value: "bonus",
      label: "Bonus",
      icon: CheckCircle,
      color: "text-green-400 bg-green-400/10",
    },
    {
      value: "general",
      label: "General",
      icon: Info,
      color: "text-gray-400 bg-gray-400/10",
    },
    {
      value: "security",
      label: "Security",
      icon: AlertTriangle,
      color: "text-red-400 bg-red-400/10",
    },
    {
      value: "promotional",
      label: "Promotional",
      icon: MessageSquare,
      color: "text-purple-400 bg-purple-400/10",
    },
    {
      value: "kyc",
      label: "KYC",
      icon: CheckCircle,
      color: "text-yellow-400 bg-yellow-400/10",
    },
    {
      value: "welcome",
      label: "Welcome",
      icon: CheckCircle,
      color: "text-green-400 bg-green-400/10",
    },
    {
      value: "system",
      label: "System",
      icon: Info,
      color: "text-blue-400 bg-blue-400/10",
    },
    {
      value: "alert",
      label: "Alert",
      icon: AlertTriangle,
      color: "text-red-400 bg-red-400/10",
    },
  ];

  // Load campaigns and notifications on component mount
  useEffect(() => {
    loadCampaigns(1);
    loadNotifications(1);
    loadTotalUserCount();
  }, []);

  // Reload campaigns when page changes
  useEffect(() => {
    if (activeTab === "campaigns") {
      loadCampaigns(campaignsPage);
    }
  }, [campaignsPage, activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openDropdown && !target.closest(".dropdown-menu")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  const loadCampaigns = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await adminSvc.get(
        `/campaigns?page=${page}&per_page=${campaignsPerPage}`,
      );
      console.log("Loaded campaigns:", response.data);
      const apiData = response.data;
      setCampaigns(apiData.campaigns || []);
      setCampaignsTotal(apiData.total || 0);
      setCampaignsTotalPages(apiData.total_pages || 0);
      setCampaignsPage(apiData.page || page);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (page: number = 1) => {
    try {
      const response = await adminSvc.get(
        `/campaignNotifications?page=${page}&per_page=${perPage}`,
      );
      console.log("Loaded notifications:", response.data);

      // Handle the API response structure
      const apiData = response.data;
      const apiNotifications = apiData.notifications || [];

      setNotifications(apiNotifications);
      setNotificationsTotal(apiData.total || 0);
      setNotificationsTotalPages(
        apiData.total_pages || Math.ceil((apiData.total || 0) / perPage),
      );
      setUnreadCount(apiData.unread_count || 0);
      setDeliveredCount(apiData.delivered_count || 0);
      setReadCount(apiData.read_count || 0);
      setCurrentPage(apiData.page || page);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      toast.error("Failed to load notifications: " + (error as any).message);
    }
  };

  const loadTotalUserCount = async () => {
    try {
      // Get total user count from the users endpoint
      const response = await adminSvc.post("/users", {
        page: 1,
        per_page: 1, // We only need the total count
        filter: {}, // No filters to get all users
      });
      console.log("Loaded user count:", response.data);
      setTotalUserCount((response.data as any).total_count || 0);
    } catch (error) {
      console.error("Failed to load user count:", error);
      // Fallback to 0 if API fails
      setTotalUserCount(0);
    }
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const campaignData = {
        title: campaignFormData.title,
        message_type: campaignFormData.message_type,
        subject: campaignFormData.subject,
        content: campaignFormData.content,
        scheduled_at: campaignFormData.scheduled_at || null,
        segments: campaignFormData.segments,
      };

      const response = await adminSvc.post("/campaigns", campaignData);
      toast.success("Campaign created successfully");
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "NOTIFICATION_CAMPAIGN_CREATE",
          category: "Notifications",
          severity: "info",
          resource_type: "campaign",
          resource_id: (response.data as any)?.id || "",
          description: `Created campaign: ${campaignData.title}`,
          details: campaignData,
        });
      } catch {}
      resetCampaignForm();
      setShowCampaignModal(false); // Close the modal
      loadCampaigns(campaignsPage); // Refresh the campaigns list
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    try {
      setLoading(true);
      const response = await adminSvc.post(`/campaigns/${campaignId}/send`);
      console.log("Send campaign response:", response.data);
      toast.success("Campaign sent successfully");
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "NOTIFICATION_CAMPAIGN_SEND",
          category: "Notifications",
          severity: "info",
          resource_type: "campaign",
          resource_id: campaignId,
          description: "Sent campaign",
        });
      } catch {}
      loadCampaigns(campaignsPage); // Reload to get updated status
    } catch (error) {
      console.error("Failed to send campaign:", error);
      toast.error("Failed to send campaign");
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (campaign) {
      setCampaignToDelete(campaign);
    }
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;

    try {
      setLoading(true);
      const response = await adminSvc.delete(
        `/campaigns/${campaignToDelete.id}`,
      );
      toast.success("Campaign deleted successfully");
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "NOTIFICATION_CAMPAIGN_DELETE",
          category: "Notifications",
          severity: "warning",
          resource_type: "campaign",
          resource_id: campaignToDelete.id,
          description: `Deleted campaign: ${campaignToDelete.title}`,
        });
      } catch {}
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignToDelete.id));
      setCampaignToDelete(null);
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      toast.error("Failed to delete campaign");
    } finally {
      setLoading(false);
    }
  };

  const resetCampaignForm = () => {
    setCampaignFormData({
      title: "",
      message_type: "general",
      subject: "",
      content: "",
      scheduled_at: "",
      segments: [],
    });
    setShowCampaignModal(false);
    setShowSegmentModal(false);
  };

  const addSegment = (segment: Segment) => {
    setCampaignFormData((prev) => ({
      ...prev,
      segments: [...prev.segments, segment],
    }));
    setShowSegmentModal(false);
    toast.success("Segment added successfully");
    (async () => {
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "NOTIFICATION_SEGMENT_ADD",
          category: "Notifications",
          severity: "info",
          resource_type: "campaign",
          resource_id: selectedCampaign?.id || "",
          description: "Added segment to campaign",
          details: segment,
        });
      } catch {}
    })();
  };

  const removeSegment = (index: number) => {
    setCampaignFormData((prev) => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index),
    }));
    toast.success("Segment removed successfully");
    (async () => {
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "NOTIFICATION_SEGMENT_REMOVE",
          category: "Notifications",
          severity: "warning",
          resource_type: "campaign",
          resource_id: selectedCampaign?.id || "",
          description: "Removed segment from campaign",
        });
      } catch {}
    })();
  };

  const handleCreateNotification = (e: React.FormEvent) => {
    e.preventDefault();

    const newNotification: Notification = {
      id: `N${String(notifications.length + 1).padStart(3, "0")}`,
      title: formData.title,
      message: formData.message,
      type: formData.type,
      audience: formData.audience,
      targetUsers: formData.targetUsers,
      totalRecipients:
        formData.audience === "all"
          ? totalUserCount
          : formData.targetUsers.length,
      status: formData.scheduleDate ? "scheduled" : "draft",
      createdDate: new Date().toISOString().split("T")[0],
      createdBy: "current_user",
    };

    setNotifications((prev) => [newNotification, ...prev]);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      type: "info",
      audience: "all",
      targetUsers: [],
      scheduleDate: "",
      scheduleTime: "",
    });
    setShowCreateModal(false);
    setShowAudienceModal(false);
    setCsvFile(null);
    setUserInput("");
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Mock CSV processing - in real app, you'd parse the CSV
      const mockUsers = ["User1", "User2", "User3", "User4", "User5"];
      setFormData((prev) => ({ ...prev, targetUsers: mockUsers }));
    }
  };

  const handleUserInputAdd = () => {
    if (userInput.trim() && !formData.targetUsers.includes(userInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        targetUsers: [...prev.targetUsers, userInput.trim()],
      }));
      setUserInput("");
    }
  };

  const removeUser = (userToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      targetUsers: prev.targetUsers.filter((user) => user !== userToRemove),
    }));
  };

  const sendNotification = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId
          ? {
              ...notif,
              status: "sent" as const,
              sentDate: new Date().toLocaleString(),
            }
          : notif,
      ),
    );
  };

  const getTypeIcon = (type: string) => {
    const messageType = messageTypes.find((t) => t.value === type);
    return messageType ? messageType.icon : Info;
  };

  const getTypeColor = (type: string) => {
    const messageType = messageTypes.find((t) => t.value === type);
    return messageType ? messageType.color : "text-blue-400 bg-blue-400/10";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "text-green-400 bg-green-400/10";
      case "draft":
        return "text-gray-400 bg-gray-400/10";
      case "scheduled":
        return "text-blue-400 bg-blue-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Message Management</h1>
          <p className="text-gray-400 mt-1">
            Create and manage campaigns and notifications
          </p>
        </div>
        <button
          onClick={() => setShowCampaignModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "campaigns"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "notifications"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Notifications
        </button>
      </div>

      {/* Campaign Stats */}
      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Campaigns</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {campaignsTotal.toLocaleString()}
                </p>
              </div>
              <Bell className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Sent Today</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {
                    campaigns.filter(
                      (c) =>
                        c.status === "sent" &&
                        c.sent_at?.includes(
                          new Date().toISOString().split("T")[0],
                        ),
                    ).length
                  }
                </p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Draft Campaigns</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">
                  {campaigns.filter((c) => c.status === "draft").length}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Recipients</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {campaigns
                    .reduce((sum, c) => sum + c.total_recipients, 0)
                    .toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Notification Stats */}
      {activeTab === "notifications" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Notifications</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {notificationsTotal.toLocaleString()}
                </p>
              </div>
              <Bell className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Unread</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {unreadCount.toLocaleString()}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Delivered</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {deliveredCount.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Read</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {readCount.toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      {activeTab === "campaigns" && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">All Campaigns</h3>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">
                Showing {campaigns.length} of {campaignsTotal.toLocaleString()}{" "}
                campaigns
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCampaignsPage(campaignsPage - 1)}
                  disabled={campaignsPage <= 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  Page {campaignsPage} of {campaignsTotalPages || 1}
                </span>
                <button
                  onClick={() => setCampaignsPage(campaignsPage + 1)}
                  disabled={campaignsPage >= campaignsTotalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    Recipients
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    Delivered
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    Read
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
                {campaigns.map((campaign, index) => {
                  const messageType = messageTypes.find(
                    (t) => t.value === campaign.message_type,
                  );
                  const TypeIcon = messageType ? messageType.icon : Info;
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30"
                    >
                      <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                        {campaign.title}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`p-1 rounded ${messageType?.color || "text-blue-400 bg-blue-400/10"}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                          </div>
                          <span className="text-white capitalize">
                            {campaign.message_type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-blue-400 text-right font-medium">
                        {campaign.total_recipients.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-green-400 text-right font-medium">
                        {campaign.delivered_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-purple-400 text-right font-medium">
                        {campaign.read_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenDropdown(
                                  openDropdown === campaign.id
                                    ? null
                                    : campaign.id,
                                )
                              }
                              className="p-1 hover:bg-gray-600 rounded-full transition-colors"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </button>

                            {openDropdown === campaign.id && (
                              <div className="dropdown-menu absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 transform -translate-x-2 overflow-visible">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setSelectedCampaign(campaign);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span>View Details</span>
                                  </button>

                                  {campaign.status === "draft" && (
                                    <button
                                      onClick={() => {
                                        sendCampaign(campaign.id);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                                    >
                                      <Send className="h-4 w-4" />
                                      <span>Send Campaign</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      deleteCampaign(campaign.id);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notifications Table */}
      {activeTab === "notifications" && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              All Notifications
            </h3>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-sm">
                Showing {notifications.length} of {notificationsTotal}{" "}
                notifications
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadNotifications(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  Page {currentPage} of{" "}
                  {notificationsTotalPages ||
                    Math.ceil(notificationsTotal / perPage)}
                </span>
                <button
                  onClick={() => loadNotifications(currentPage + 1)}
                  disabled={
                    currentPage >=
                    (notificationsTotalPages ||
                      Math.ceil(notificationsTotal / perPage))
                  }
                  className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    User ID
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Title
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Delivered
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Read At
                  </th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification, index) => {
                  const TypeIcon = getTypeIcon(notification.type);
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30"
                    >
                      <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                        {notification.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-blue-400 font-mono text-sm">
                        {notification.user_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                        {notification.title}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`p-1 rounded ${getTypeColor(notification.type)}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                          </div>
                          <span className="text-white capitalize">
                            {notification.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            notification.read
                              ? "text-green-400 bg-green-400/10"
                              : "text-red-400 bg-red-400/10"
                          }`}
                        >
                          {notification.read ? "Read" : "Unread"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            notification.delivered
                              ? "text-green-400 bg-green-400/10"
                              : "text-yellow-400 bg-yellow-400/10"
                          }`}
                        >
                          {notification.delivered ? "Delivered" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {notification.read_at
                          ? new Date(notification.read_at).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">
              Create New Campaign
            </h3>

            <form onSubmit={createCampaign} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    value={campaignFormData.title}
                    onChange={(e) =>
                      setCampaignFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="Campaign title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Message Type
                  </label>
                  <select
                    value={campaignFormData.message_type}
                    onChange={(e) =>
                      setCampaignFormData((prev) => ({
                        ...prev,
                        message_type: e.target
                          .value as Campaign["message_type"],
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    required
                  >
                    {messageTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={campaignFormData.subject}
                  onChange={(e) =>
                    setCampaignFormData((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="Message subject"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Message Content
                </label>
                <textarea
                  value={campaignFormData.content}
                  onChange={(e) =>
                    setCampaignFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-32 resize-none"
                  placeholder="Enter your message content..."
                  required
                />
              </div>

              {/* Segments */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Target Segments
                </label>
                <div className="space-y-3">
                  {campaignFormData.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="bg-gray-700 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">
                          {segment.segment_name || segment.segment_type}
                        </span>
                        <span className="text-gray-400 text-sm">
                          ({segment.segment_type})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSegment(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowSegmentModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Segment</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Schedule (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={campaignFormData.scheduled_at}
                  onChange={(e) =>
                    setCampaignFormData((prev) => ({
                      ...prev,
                      scheduled_at: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCampaignForm}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || campaignFormData.segments.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  {loading ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Segment Modal */}
      {showSegmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-white mb-6">
              Add Target Segment
            </h3>

            <SegmentForm
              onAdd={addSegment}
              onCancel={() => setShowSegmentModal(false)}
            />
          </div>
        </div>
      )}

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">
              Create New Notification
            </h3>

            <form onSubmit={handleCreateNotification} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="Notification title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Message Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    required
                  >
                    {messageTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-24 resize-none"
                  placeholder="Enter your notification message..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Audience
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="audience"
                      value="all"
                      checked={formData.audience === "all"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          audience: e.target.value as any,
                          targetUsers: [],
                        }))
                      }
                      className="text-purple-600"
                    />
                    <span className="text-white">
                      All Players ({totalUserCount} total)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="audience"
                      value="specific"
                      checked={formData.audience === "specific"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          audience: e.target.value as any,
                        }))
                      }
                      className="text-purple-600"
                    />
                    <span className="text-white">Specific Players</span>
                  </label>
                </div>
              </div>

              {formData.audience === "specific" && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowAudienceModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Users className="h-4 w-4" />
                      <span>Select Players</span>
                    </button>

                    <div className="flex-1">
                      <label className="block text-sm text-gray-400 mb-1">
                        Upload CSV
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {formData.targetUsers.length > 0 && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Selected Players ({formData.targetUsers.length})
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {formData.targetUsers.map((user, index) => (
                          <span
                            key={index}
                            className="bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <span>{user}</span>
                            <button
                              type="button"
                              onClick={() => removeUser(user)}
                              className="hover:text-red-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Schedule Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.scheduleDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduleDate: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Schedule Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduleTime: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Create Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audience Selection Modal */}
      {showAudienceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-6">
              Select Players
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Add Player
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="Enter username"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleUserInputAdd()
                    }
                  />
                  <button
                    type="button"
                    onClick={handleUserInputAdd}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Available Players
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableUsers.map((user) => (
                    <label
                      key={user}
                      className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-700 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetUsers.includes(user)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              targetUsers: [...prev.targetUsers, user],
                            }));
                          } else {
                            removeUser(user);
                          }
                        }}
                        className="rounded border-gray-500"
                      />
                      <span className="text-white text-sm">{user}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAudienceModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowAudienceModal(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
              >
                Done ({formData.targetUsers.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">
                Campaign Details
              </h3>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Campaign Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Title
                  </label>
                  <p className="text-white font-medium">
                    {selectedCampaign.title}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Type
                  </label>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`p-1 rounded ${messageTypes.find((t) => t.value === selectedCampaign.message_type)?.color || "text-blue-400 bg-blue-400/10"}`}
                    >
                      {React.createElement(
                        messageTypes.find(
                          (t) => t.value === selectedCampaign.message_type,
                        )?.icon || Info,
                        { className: "h-3 w-3" },
                      )}
                    </div>
                    <span className="text-white capitalize">
                      {selectedCampaign.message_type}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Subject
                  </label>
                  <p className="text-white">{selectedCampaign.subject}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Status
                  </label>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedCampaign.status)}`}
                  >
                    {selectedCampaign.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Content
                </label>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-white whitespace-pre-wrap">
                    {selectedCampaign.content}
                  </p>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedCampaign.total_recipients.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Recipients</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {selectedCampaign.delivered_count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Delivered</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {selectedCampaign.read_count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Read</div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Created
                  </label>
                  <p className="text-white">
                    {new Date(selectedCampaign.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Last Updated
                  </label>
                  <p className="text-white">
                    {new Date(selectedCampaign.updated_at).toLocaleString()}
                  </p>
                </div>
                {selectedCampaign.scheduled_at && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Scheduled For
                    </label>
                    <p className="text-white">
                      {new Date(selectedCampaign.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedCampaign.sent_at && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Sent At
                    </label>
                    <p className="text-white">
                      {new Date(selectedCampaign.sent_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
              {selectedCampaign.status === "draft" && (
                <button
                  onClick={() => {
                    sendCampaign(selectedCampaign.id);
                    setSelectedCampaign(null);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Campaign</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Delete Campaign
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete this campaign?
              </p>
              <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-white font-medium">
                  {campaignToDelete.title}
                </p>
                <p className="text-gray-400 text-sm capitalize">
                  {campaignToDelete.message_type} • {campaignToDelete.status}
                </p>
              </div>
              <p className="text-red-400 text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setCampaignToDelete(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCampaign}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Segment Form Component
interface SegmentFormProps {
  onAdd: (segment: Segment) => void;
  onCancel: () => void;
}

const SegmentForm: React.FC<SegmentFormProps> = ({ onAdd, onCancel }) => {
  const [segmentType, setSegmentType] = useState<
    "criteria" | "csv" | "all_users"
  >("all_users");
  const [segmentName, setSegmentName] = useState("");
  const [csvData, setCsvData] = useState("");
  const [criteria, setCriteria] = useState({
    days_since_last_activity: "",
    user_level: "",
    min_balance: "",
    max_balance: "",
    kyc_status: "",
    country: "",
    currency: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const segment: Segment = {
      segment_type: segmentType,
      segment_name: segmentName || undefined,
    };

    if (segmentType === "criteria") {
      segment.criteria = {
        days_since_last_activity: criteria.days_since_last_activity
          ? parseInt(criteria.days_since_last_activity)
          : undefined,
        user_level: criteria.user_level || undefined,
        min_balance: criteria.min_balance
          ? parseFloat(criteria.min_balance)
          : undefined,
        max_balance: criteria.max_balance
          ? parseFloat(criteria.max_balance)
          : undefined,
        kyc_status: criteria.kyc_status || undefined,
        country: criteria.country || undefined,
        currency: criteria.currency || undefined,
      };
    } else if (segmentType === "csv") {
      segment.csv_data = csvData;
    }

    onAdd(segment);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Segment Type
        </label>
        <select
          value={segmentType}
          onChange={(e) =>
            setSegmentType(e.target.value as Segment["segment_type"])
          }
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
        >
          <option value="all_users">All Users</option>
          <option value="criteria">Criteria-based</option>
          <option value="csv">CSV Upload</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Segment Name (Optional)
        </label>
        <input
          type="text"
          value={segmentName}
          onChange={(e) => setSegmentName(e.target.value)}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
          placeholder="e.g., VIP Users, New Users"
        />
      </div>

      {segmentType === "criteria" && (
        <div className="space-y-3">
          <h4 className="text-white font-medium">Targeting Criteria</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Days Since Last Activity
              </label>
              <input
                type="number"
                value={criteria.days_since_last_activity}
                onChange={(e) =>
                  setCriteria((prev) => ({
                    ...prev,
                    days_since_last_activity: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="e.g., 30"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                User Level
              </label>
              <input
                type="text"
                value={criteria.user_level}
                onChange={(e) =>
                  setCriteria((prev) => ({
                    ...prev,
                    user_level: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="e.g., VIP, Premium"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Min Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={criteria.min_balance}
                onChange={(e) =>
                  setCriteria((prev) => ({
                    ...prev,
                    min_balance: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Max Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={criteria.max_balance}
                onChange={(e) =>
                  setCriteria((prev) => ({
                    ...prev,
                    max_balance: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="e.g., 10000"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                KYC Status
              </label>
              <select
                value={criteria.kyc_status}
                onChange={(e) =>
                  setCriteria((prev) => ({
                    ...prev,
                    kyc_status: e.target.value,
                  }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="">Any</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Country
              </label>
              <input
                type="text"
                value={criteria.country}
                onChange={(e) =>
                  setCriteria((prev) => ({ ...prev, country: e.target.value }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                placeholder="e.g., US, UK"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Currency
              </label>
              <select
                value={criteria.currency}
                onChange={(e) =>
                  setCriteria((prev) => ({ ...prev, currency: e.target.value }))
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
              >
                <option value="">Any</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {segmentType === "csv" && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            CSV Data
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-24"
            placeholder="Enter usernames separated by commas: user1,user2,user3"
          />
          <p className="text-gray-400 text-sm mt-1">
            Enter usernames separated by commas
          </p>
        </div>
      )}

      <div className="flex items-center justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          Add Segment
        </button>
      </div>
    </form>
  );
};
