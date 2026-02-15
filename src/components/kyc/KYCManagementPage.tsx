import React, { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  AlertTriangle,
  RefreshCw,
  History,
  UserCheck,
  UserX,
  Search,
  Filter,
  Download,
  Upload,
  Users,
} from "lucide-react";
import {
  kycService,
  KYCDocument,
  KYCSubmission,
  KYCStatusChange,
} from "../../services/kycService";
import toast from "react-hot-toast";

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  kyc_status: string;
  created_at: string;
}

export const KYCManagementPage: React.FC = () => {
  const [queue, setQueue] = useState<(KYCSubmission & { user?: User })[]>([]);
  const [filteredQueue, setFilteredQueue] = useState<
    (KYCSubmission & { user?: User })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // User details state
  const [userDocuments, setUserDocuments] = useState<KYCDocument[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<KYCSubmission[]>([]);
  const [userStatusChanges, setUserStatusChanges] = useState<KYCStatusChange[]>(
    [],
  );
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [withdrawalBlocked, setWithdrawalBlocked] = useState<boolean>(false);

  // Document review modal state
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(
    null,
  );
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Status update modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");

  // Withdrawal block state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const kycStatusOptions = [
    {
      value: "NO_KYC",
      label: "No KYC",
      color: "text-gray-400",
      bgColor: "bg-gray-400/10",
    },
    {
      value: "ID_VERIFIED",
      label: "ID Verified",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      value: "ID_SOF_VERIFIED",
      label: "ID + SOF Verified",
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      value: "KYC_FAILED",
      label: "KYC Failed",
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
  ];

  const documentStatusOptions = [
    {
      value: "PENDING",
      label: "Pending",
      color: "text-yellow-400",
      icon: Clock,
    },
    {
      value: "APPROVED",
      label: "Approved",
      color: "text-green-400",
      icon: CheckCircle,
    },
    {
      value: "REJECTED",
      label: "Rejected",
      color: "text-red-400",
      icon: XCircle,
    },
  ];

  const documentTypes = {
    ID_FRONT: "ID Front",
    ID_BACK: "ID Back",
    PROOF_OF_ADDRESS: "Proof of Address",
    SELFIE_WITH_ID: "Selfie with ID",
    BANK_STATEMENT: "Bank Statement",
    SOF_DOCUMENT: "Source of Funds",
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    filterQueue();
  }, [queue, searchTerm, statusFilter]);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await kycService.getAllSubmissions({
        status: statusFilter || undefined,
        page: 1,
        per_page: 50,
      });
      if (res.success) {
        const items = (res?.data?.items ?? []) as KYCSubmission[];
        // Extract user info from notes field if present
        const enriched = items.map((item) => {
          const notes = item.notes || "";
          const match = notes.match(
            /__USER_INFO__:(.+?):(.+?):(.+?):(.+?):(.+?)(\||$)/,
          );
          if (match) {
            return {
              ...item,
              user: {
                username: match[1] || "",
                first_name: match[2] || "",
                last_name: match[3] || "",
                email: match[4] || "",
                phone_number: match[5] || "",
              },
            };
          }
          return { ...item };
        });
        setQueue(Array.isArray(enriched) ? enriched : []);
      } else {
        setQueue([]);
      }
    } catch (error) {
      console.error("Failed to load KYC queue:", error);
      toast.error("Failed to load KYC queue");
    } finally {
      setLoading(false);
    }
  };

  const filterQueue = () => {
    let filtered = queue;
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const u = item as any;
        const full =
          `${u.user?.first_name || ""} ${u.user?.last_name || ""}`.toLowerCase();
        return (
          (u.user?.username || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (u.user?.email || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          full.includes(searchTerm.toLowerCase()) ||
          (item.overall_status || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        );
      });
    }
    if (statusFilter) {
      filtered = filtered.filter(
        (item) => item.overall_status === statusFilter,
      );
    }
    setFilteredQueue(filtered);
  };

  const loadUserDetails = async (user: User) => {
    try {
      setUserDetailsLoading(true);
      setSelectedUser(user);

      const [documentsRes, submissionsRes, statusChangesRes, blockRes] =
        await Promise.all([
          kycService.getDocuments(user.id),
          kycService.getSubmissions(user.id),
          kycService.getStatusChanges(user.id),
          kycService.getWithdrawalBlockStatus(user.id),
        ]);

      if (documentsRes.success) {
        setUserDocuments(
          Array.isArray(documentsRes.data) ? documentsRes.data : [],
        );
      }
      if (submissionsRes.success) {
        setUserSubmissions(
          Array.isArray(submissionsRes.data) ? submissionsRes.data : [],
        );
      }
      if (statusChangesRes.success) {
        setUserStatusChanges(
          Array.isArray(statusChangesRes.data) ? statusChangesRes.data : [],
        );
      }
      if (blockRes.success) {
        const isBlocked = !!(
          blockRes.data &&
          (blockRes.data.is_blocked ||
            (blockRes.data.data && blockRes.data.data.is_blocked))
        );
        setWithdrawalBlocked(isBlocked);
      }

      setShowUserDetails(true);
    } catch (error) {
      console.error("Failed to load user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleDocumentReview = async () => {
    if (!selectedDocument) return;

    try {
      setUpdating(true);
      const response = await kycService.updateDocumentStatus({
        document_id: selectedDocument.id,
        status: reviewStatus,
        rejection_reason:
          reviewStatus === "REJECTED" ? rejectionReason : undefined,
      });

      if (response.success) {
        toast.success("Document status updated successfully");
        setShowDocumentModal(false);
        setSelectedDocument(null);
        if (selectedUser) {
          loadUserDetails(selectedUser);
        }

        // Log admin activity for document review
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "KYC_DOCUMENT_REVIEW",
            category: "KYC",
            severity: reviewStatus === "REJECTED" ? "warning" : "info",
            resource_type: "user",
            resource_id: selectedUser?.id,
            description: `Document ${selectedDocument.document_type} set to ${reviewStatus}`,
            details: {
              user_id: selectedUser?.id,
              document_id: selectedDocument.id,
              document_type: selectedDocument.document_type,
              status: reviewStatus,
              rejection_reason:
                reviewStatus === "REJECTED" ? rejectionReason : undefined,
            },
          });
        } catch (e) {
          console.warn(
            "Failed to create admin activity log for document review:",
            e,
          );
        }
      }
    } catch (error) {
      console.error("Failed to update document status:", error);
      toast.error("Failed to update document status");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      const oldStatus =
        userStatusChanges?.[0]?.new_status || selectedUser?.kyc_status;
      const response = await kycService.updateUserKYCStatus({
        user_id: selectedUser.id,
        new_status: newStatus,
        reason: statusReason,
      });

      if (response.success) {
        toast.success("KYC status updated successfully");
        setShowStatusModal(false);
        loadQueue(); // Refresh the queue
        if (selectedUser) {
          loadUserDetails(selectedUser);
        }

        // Log admin activity for KYC status change
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "KYC_STATUS_UPDATE",
            category: "KYC",
            severity: "info",
            resource_type: "user",
            resource_id: selectedUser.id,
            description: `KYC status changed from ${oldStatus} to ${newStatus}`,
            details: {
              user_id: selectedUser.id,
              old_status: oldStatus,
              new_status: newStatus,
              reason: statusReason || undefined,
            },
          });
        } catch (e) {
          console.warn(
            "Failed to create admin activity log for KYC status update:",
            e,
          );
        }
      }
    } catch (error) {
      console.error("Failed to update KYC status:", error);
      toast.error("Failed to update KYC status");
    } finally {
      setUpdating(false);
    }
  };

  const handleBlockWithdrawals = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      const response = await kycService.blockWithdrawals({
        user_id: selectedUser.id,
        reason: blockReason,
      });

      if (response.success) {
        toast.success("Withdrawals blocked successfully");
        setShowBlockModal(false);
        setBlockReason("");

        // Log admin activity for blocking withdrawals
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "WITHDRAWALS_BLOCKED",
            category: "KYC",
            severity: "warning",
            resource_type: "user",
            resource_id: selectedUser?.id,
            description: "Withdrawals blocked due to KYC",
            details: { user_id: selectedUser?.id, reason: blockReason },
          });
        } catch (e) {
          console.warn(
            "Failed to create admin activity log for withdrawals block:",
            e,
          );
        }
      }
    } catch (error) {
      console.error("Failed to block withdrawals:", error);
      toast.error("Failed to block withdrawals");
    } finally {
      setUpdating(false);
    }
  };

  const handleUnblockWithdrawals = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      const response = await kycService.unblockWithdrawals(selectedUser.id);

      if (response.success) {
        toast.success("Withdrawals unblocked successfully");
        if (selectedUser) {
          loadUserDetails(selectedUser);
        }

        // Log admin activity for unblocking withdrawals
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "WITHDRAWALS_UNBLOCKED",
            category: "KYC",
            severity: "info",
            resource_type: "user",
            resource_id: selectedUser?.id,
            description: "Withdrawals unblocked after KYC review",
            details: { user_id: selectedUser?.id },
          });
        } catch (e) {
          console.warn(
            "Failed to create admin activity log for withdrawals unblock:",
            e,
          );
        }
      }
    } catch (error) {
      console.error("Failed to unblock withdrawals:", error);
      toast.error("Failed to unblock withdrawals");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const option = kycStatusOptions.find((opt) => opt.value === status);
    return option?.color || "text-gray-400";
  };

  const getStatusBgColor = (status: string) => {
    const option = kycStatusOptions.find((opt) => opt.value === status);
    return option?.bgColor || "bg-gray-400/10";
  };

  const getDocumentStatusIcon = (status: string) => {
    const option = documentStatusOptions.find((opt) => opt.value === status);
    return option?.icon || Clock;
  };

  const getDocumentStatusColor = (status: string) => {
    const option = documentStatusOptions.find((opt) => opt.value === status);
    return option?.color || "text-gray-400";
  };

  if (showUserDetails && selectedUser) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUserDetails(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {selectedUser.first_name} {selectedUser.last_name}
              </h1>
              <p className="text-gray-400 mt-1">
                Username: {selectedUser.username} | Email: {selectedUser.email}
              </p>
            </div>
          </div>
        </div>

        {/* KYC Status Overview */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              KYC Status
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowStatusModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Update Status
              </button>
              <button
                onClick={() => loadUserDetails(selectedUser)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div
              className={`text-lg font-medium ${getStatusColor(selectedUser.kyc_status)}`}
            >
              {kycStatusOptions.find(
                (opt) => opt.value === selectedUser.kyc_status,
              )?.label || selectedUser.kyc_status}
            </div>
            {selectedUser.kyc_status === "NO_KYC" && (
              <div className="flex items-center text-yellow-400 text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                KYC Required
              </div>
            )}
            <div
              className={`text-sm px-2 py-1 rounded border ${withdrawalBlocked ? "text-red-400 border-red-500" : "text-green-400 border-green-500"}`}
            >
              Withdrawals: {withdrawalBlocked ? "Blocked" : "Allowed"}
            </div>
          </div>

          {/* Withdrawal Block Controls */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-400">
                <Shield className="h-4 w-4 mr-2" />
                Withdrawal Controls
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Block Withdrawals
                </button>
                <button
                  onClick={handleUnblockWithdrawals}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm flex items-center disabled:opacity-50"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Unblock Withdrawals
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            KYC Documents ({userDocuments.length})
          </h3>

          {userDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
              <span className="ml-2 text-gray-400">Loading documents...</span>
            </div>
          ) : userDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userDocuments.map((doc) => {
                const StatusIcon = getDocumentStatusIcon(doc.status);
                return (
                  <div
                    key={doc.id}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIcon
                          className={`h-5 w-5 ${getDocumentStatusColor(doc.status)}`}
                        />
                        <div>
                          <div className="text-white font-medium">
                            {documentTypes[
                              doc.document_type as keyof typeof documentTypes
                            ] || doc.document_type}
                          </div>
                          <div className="text-sm text-gray-400">
                            {doc.file_name} •{" "}
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-sm font-medium ${getDocumentStatusColor(doc.status)}`}
                        >
                          {
                            documentStatusOptions.find(
                              (opt) => opt.value === doc.status,
                            )?.label
                          }
                        </span>
                        <button
                          onClick={() => {
                            setSelectedDocument(doc);
                            setReviewStatus(doc.status);
                            setRejectionReason(doc.rejection_reason || "");
                            setShowDocumentModal(true);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </button>
                      </div>
                    </div>
                    {doc.rejection_reason && (
                      <div className="mt-2 text-sm text-red-400">
                        <strong>Rejection Reason:</strong>{" "}
                        {doc.rejection_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Changes Audit Trail */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <History className="h-5 w-5 mr-2" />
            Status Change History ({userStatusChanges.length})
          </h3>

          {userStatusChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No status changes recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userStatusChanges.map((change) => (
                <div
                  key={change.id}
                  className="bg-gray-700 border border-gray-600 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-white font-medium">
                        {kycStatusOptions.find(
                          (opt) => opt.value === change.old_status,
                        )?.label || change.old_status}
                        <span className="text-gray-400 mx-2">→</span>
                        {kycStatusOptions.find(
                          (opt) => opt.value === change.new_status,
                        )?.label || change.new_status}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(change.change_date).toLocaleString()}
                    </div>
                  </div>
                  {change.reason && (
                    <div className="mt-2 text-sm text-gray-400">
                      <strong>Reason:</strong> {change.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals - Same as in KYCManagement component */}
        {/* Document Review Modal */}
        {showDocumentModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-4">
                Review Document
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* Document Image */}
                <div>
                  <div className="text-white font-medium mb-2">
                    {documentTypes[
                      selectedDocument.document_type as keyof typeof documentTypes
                    ] || selectedDocument.document_type}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    {selectedDocument.file_name}
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mb-4">
                    {selectedDocument.file_url ? (
                      <img
                        src={selectedDocument.file_url}
                        alt={selectedDocument.file_name}
                        className="w-full h-auto rounded-lg border border-gray-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%%25" y="50%%25" text-anchor="middle" dy=".3em" fill="gray"%3ENo Preview%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-48 text-gray-400">
                        No image URL provided
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Form */}
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Document Status
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    >
                      {documentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reviewStatus === "REJECTED" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Rejection Reason
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                        rows={3}
                        placeholder="Enter rejection reason..."
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowDocumentModal(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDocumentReview}
                      disabled={updating}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {updating ? "Updating..." : "Update Status"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                Update KYC Status
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="">Select status...</option>
                  {kycStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Enter reason for status change..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || !newStatus}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Withdrawals Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                Block Withdrawals
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Reason for Blocking
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Enter reason for blocking withdrawals..."
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockWithdrawals}
                  disabled={updating || !blockReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {updating ? "Blocking..." : "Block Withdrawals"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Shield className="h-6 w-6 mr-3" />
            KYC Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage user KYC verification and compliance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadQueue}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-2"
              />
            </div>
          </div>
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
            >
              <option value="">All Submissions</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* KYC Queue */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              KYC Submissions ({filteredQueue.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
              <span className="ml-2 text-gray-400">Loading users...</span>
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
              {searchTerm || statusFilter ? (
                <p className="text-sm mt-2">
                  Try adjusting your search criteria
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((sub) => {
                return (
                  <div
                    key={sub.id}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:bg-gray-700/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {(sub as any)?.user?.first_name?.charAt(0)}
                            {(sub as any)?.user?.last_name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {(sub as any)?.user
                              ? `${(sub as any).user.first_name || ""} ${(sub as any).user.last_name || ""}`.trim() ||
                                ((sub as any).user.username
                                  ? `@${(sub as any).user.username}`
                                  : (sub as any).user.email || "User")
                              : "User"}
                          </div>
                          <div className="text-sm text-gray-400">
                            {(sub as any)?.user?.username
                              ? `@${(sub as any).user.username}`
                              : ""}
                            {(sub as any)?.user?.email
                              ? ` • ${(sub as any).user.email}`
                              : ""}
                            {(sub as any)?.user?.phone_number
                              ? ` • ${(sub as any).user.phone_number}`
                              : ""}
                            {!(sub as any)?.user?.username &&
                            !(sub as any)?.user?.email &&
                            !(sub as any)?.user?.phone_number
                              ? sub.user_id
                              : ""}
                            {" • "}
                            {new Date(sub.submission_date).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Status: {sub.overall_status}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() =>
                            loadUserDetails({
                              id: sub.user_id,
                              username: (sub as any)?.user?.username || "",
                              email: (sub as any)?.user?.email || "",
                              first_name: (sub as any)?.user?.first_name || "",
                              last_name: (sub as any)?.user?.last_name || "",
                              kyc_status: "",
                              created_at: new Date().toISOString(),
                            } as User)
                          }
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
