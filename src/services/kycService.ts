// KYC API Service
import { adminSvc } from "./apiService";

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  upload_date: string;
  status: string;
  rejection_reason?: string;
  reviewed_by?: string;
  review_date?: string;
  created_at: string;
  updated_at: string;
}

export interface KYCSubmission {
  id: string;
  user_id: string;
  submission_date: string;
  overall_status: string;
  notes?: string;
  reviewed_by?: string;
  review_date?: string;
  created_at: string;
  updated_at: string;
}

export interface KYCStatusChange {
  id: string;
  user_id: string;
  old_status: string;
  new_status: string;
  changed_by?: string;
  change_date: string;
  reason?: string;
  created_at: string;
}

export interface CreateKYCDocumentRequest {
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
}

export interface UpdateDocumentStatusRequest {
  document_id: string;
  status: string;
  rejection_reason?: string;
}

export interface UpdateUserKYCStatusRequest {
  user_id: string;
  new_status: string;
  reason?: string;
}

export interface BlockWithdrawalsRequest {
  user_id: string;
  reason: string;
}

export const kycService = {
  // Document operations
  createDocument: async (data: CreateKYCDocumentRequest) => {
    return adminSvc.post("/kyc/document/create", data);
  },

  getDocuments: async (userId: string) => {
    return adminSvc.get(`/kyc/documents/${userId}`);
  },

  updateDocumentStatus: async (data: UpdateDocumentStatusRequest) => {
    return adminSvc.put("/kyc/document/status", data);
  },

  // User KYC status operations
  updateUserKYCStatus: async (data: UpdateUserKYCStatusRequest) => {
    return adminSvc.put("/kyc/user/status", data);
  },

  getUserKYCStatus: async (userId: string) => {
    return adminSvc.get(`/kyc/user/${userId}/status`);
  },

  getWithdrawalBlockStatus: async (userId: string) => {
    return adminSvc.get(`/kyc/user/${userId}/withdrawal-block`);
  },

  // Withdrawal operations
  blockWithdrawals: async (data: BlockWithdrawalsRequest) => {
    return adminSvc.post("/kyc/user/block-withdrawals", data);
  },

  unblockWithdrawals: async (userId: string) => {
    return adminSvc.post(`/kyc/user/${userId}/unblock-withdrawals`);
  },

  // Submissions and audit trail
  getSubmissions: async (userId: string) => {
    return adminSvc.get(`/kyc/submissions/${userId}`);
  },

  getStatusChanges: async (userId: string) => {
    return adminSvc.get(`/kyc/status-changes/${userId}`);
  },

  // All submissions (queue)
  getAllSubmissions: async (
    params: { status?: string; page?: number; per_page?: number } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return adminSvc.get(`/kyc/submissions${suffix}`);
  },
};
