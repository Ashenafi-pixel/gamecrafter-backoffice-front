import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Shield,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  History,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  kycService,
  KYCDocument,
  KYCSubmission,
  KYCStatusChange,
} from "../../services/kycService";
import toast from "react-hot-toast";

interface KYCManagementProps {
  userId: string;
  currentKYCStatus: string;
  onStatusUpdate: (newStatus: string) => void;
}

export const KYCManagement: React.FC<KYCManagementProps> = ({
  userId,
  currentKYCStatus,
  onStatusUpdate,
}) => {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [statusChanges, setStatusChanges] = useState<KYCStatusChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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

  const kycStatusOptions = [
    { value: "NO_KYC", label: "No KYC", color: "text-gray-400" },
    { value: "ID_VERIFIED", label: "ID Verified", color: "text-blue-400" },
    {
      value: "ID_SOF_VERIFIED",
      label: "ID + SOF Verified",
      color: "text-green-400",
    },
    { value: "KYC_FAILED", label: "KYC Failed", color: "text-red-400" },
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
    loadKYCData();
  }, [userId]);

  const loadKYCData = async () => {
    try {
      setLoading(true);
      const [documentsRes, submissionsRes, statusChangesRes] =
        await Promise.all([
          kycService.getDocuments(userId),
          kycService.getSubmissions(userId),
          kycService.getStatusChanges(userId),
        ]);

      if (documentsRes.success) {
        // Ensure data is always an array
        const documentsData = Array.isArray(documentsRes.data)
          ? documentsRes.data
          : documentsRes.data?.documents || documentsRes.data?.data || [];
        setDocuments(documentsData);
      } else {
        setDocuments([]);
      }
      if (submissionsRes.success) {
        // Ensure data is always an array
        const submissionsData = Array.isArray(submissionsRes.data)
          ? submissionsRes.data
          : submissionsRes.data?.submissions || submissionsRes.data?.data || [];
        setSubmissions(submissionsData);
      } else {
        setSubmissions([]);
      }
      if (statusChangesRes.success) {
        // Ensure data is always an array
        const statusChangesData = Array.isArray(statusChangesRes.data)
          ? statusChangesRes.data
          : statusChangesRes.data?.status_changes ||
            statusChangesRes.data?.data ||
            [];
        setStatusChanges(statusChangesData);
      } else {
        setStatusChanges([]);
      }
    } catch (error) {
      console.error("Failed to load KYC data:", error);
      toast.error("Failed to load KYC data");
      // Ensure arrays are set even on error
      setDocuments([]);
      setSubmissions([]);
      setStatusChanges([]);
    } finally {
      setLoading(false);
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
        loadKYCData();
      }
    } catch (error) {
      console.error("Failed to update document status:", error);
      toast.error("Failed to update document status");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      const oldStatus = currentKYCStatus;
      const response = await kycService.updateUserKYCStatus({
        user_id: userId,
        new_status: newStatus,
        reason: statusReason,
      });

      if (response.success) {
        toast.success("KYC status updated successfully");
        setShowStatusModal(false);
        onStatusUpdate(newStatus);
        loadKYCData();

        // Log admin activity for KYC status change
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "KYC_STATUS_UPDATE",
            category: "KYC",
            severity: "info",
            resource_type: "user",
            resource_id: userId,
            description: `KYC status changed from ${oldStatus} to ${newStatus}`,
            details: {
              user_id: userId,
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
    try {
      setUpdating(true);
      const response = await kycService.blockWithdrawals({
        user_id: userId,
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
            resource_id: userId,
            description: "Withdrawals blocked due to KYC",
            details: { user_id: userId, reason: blockReason },
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
    try {
      setUpdating(true);
      const response = await kycService.unblockWithdrawals(userId);

      if (response.success) {
        toast.success("Withdrawals unblocked successfully");
        loadKYCData();

        // Log admin activity for unblocking withdrawals
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "WITHDRAWALS_UNBLOCKED",
            category: "KYC",
            severity: "info",
            resource_type: "user",
            resource_id: userId,
            description: "Withdrawals unblocked after KYC review",
            details: { user_id: userId },
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

  const getDocumentStatusIcon = (status: string) => {
    const option = documentStatusOptions.find((opt) => opt.value === status);
    return option?.icon || Clock;
  };

  const getDocumentStatusColor = (status: string) => {
    const option = documentStatusOptions.find((opt) => opt.value === status);
    return option?.color || "text-gray-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        <span className="ml-2 text-gray-400">Loading KYC data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              onClick={loadKYCData}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div
            className={`text-lg font-medium ${getStatusColor(currentKYCStatus)}`}
          >
            {kycStatusOptions.find((opt) => opt.value === currentKYCStatus)
              ?.label || currentKYCStatus}
          </div>
          {currentKYCStatus === "NO_KYC" && (
            <div className="flex items-center text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              KYC Required
            </div>
          )}
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
          KYC Documents ({documents.length})
        </h3>

        {!Array.isArray(documents) || documents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
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
                      <strong>Rejection Reason:</strong> {doc.rejection_reason}
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
          Status Change History ({statusChanges.length})
        </h3>

        {!Array.isArray(statusChanges) || statusChanges.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No status changes recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {statusChanges.map((change) => (
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

      {/* Document Review Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Review Document
            </h3>

            <div className="mb-4">
              <div className="text-white font-medium mb-2">
                {documentTypes[
                  selectedDocument.document_type as keyof typeof documentTypes
                ] || selectedDocument.document_type}
              </div>
              <div className="text-sm text-gray-400 mb-4">
                {selectedDocument.file_name}
              </div>

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
            </div>

            <div className="flex items-center justify-end space-x-3">
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
};
