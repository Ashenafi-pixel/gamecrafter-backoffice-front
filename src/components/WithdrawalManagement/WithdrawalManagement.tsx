import React, { useState, useEffect } from "react";
import {
  Pause,
  Play,
  Check,
  X,
  AlertTriangle,
  Clock,
  DollarSign,
  Filter,
  Search,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";

interface PausedWithdrawal {
  id: string;
  user_id: string;
  withdrawal_id: string;
  usd_amount_cents: number;
  crypto_amount: string;
  currency_code: string;
  status: string;
  pause_reason: string;
  paused_at: string;
  requires_manual_review: boolean;
  created_at: string;
  updated_at: string;
  username?: string;
  email?: string;
}

interface WithdrawalStats {
  total_paused: number;
  pending_review: number;
  approved_today: number;
  rejected_today: number;
}

const WithdrawalManagement: React.FC = () => {
  const { adminSvc } = useServices();
  const [withdrawals, setWithdrawals] = useState<PausedWithdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<PausedWithdrawal | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "pause" | "unpause"
  >("approve");
  const [actionNotes, setActionNotes] = useState("");

  useEffect(() => {
    fetchPausedWithdrawals();
    fetchStats();
  }, []);

  const fetchPausedWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminSvc.get<{
        withdrawals: PausedWithdrawal[];
        pagination: {
          total: number;
          limit: number;
          offset: number;
        };
      }>("/withdrawal-management/paused");

      if (response.success && response.data) {
        setWithdrawals(response.data.withdrawals);
      } else {
        setError(response.message || "Failed to fetch paused withdrawals");
      }
    } catch (err: any) {
      setError("Network error occurred");
      console.error("Error fetching paused withdrawals:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminSvc.get<WithdrawalStats>(
        "/withdrawal-management/stats",
      );
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleAction = (
    withdrawal: PausedWithdrawal,
    action: "approve" | "reject" | "pause" | "unpause",
  ) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setActionNotes("");
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedWithdrawal) return;

    try {
      let endpoint = "";
      let payload: any = {};

      switch (actionType) {
        case "approve":
          endpoint = `/withdrawal-management/approve/${selectedWithdrawal.withdrawal_id}`;
          break;
        case "reject":
          endpoint = `/withdrawal-management/reject/${selectedWithdrawal.withdrawal_id}`;
          break;
        case "pause":
          endpoint = `/withdrawal-management/pause/${selectedWithdrawal.withdrawal_id}`;
          payload = { reason: actionNotes };
          break;
        case "unpause":
          endpoint = `/withdrawal-management/unpause/${selectedWithdrawal.withdrawal_id}`;
          break;
      }

      const response = await adminSvc.post(endpoint, payload);

      if (response.success) {
        // Remove the withdrawal from the list or update its status
        setWithdrawals((prev) =>
          prev.filter(
            (w) => w.withdrawal_id !== selectedWithdrawal.withdrawal_id,
          ),
        );
        setActionDialogOpen(false);
        setSelectedWithdrawal(null);
        setActionNotes("");

        // Refresh stats
        fetchStats();
      } else {
        setError(response.message || "Failed to perform action");
      }
    } catch (err: any) {
      setError(err.message || "Failed to perform action");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paused":
        return "text-yellow-400 bg-yellow-400/10";
      case "pending":
        return "text-blue-400 bg-blue-400/10";
      case "approved":
        return "text-green-400 bg-green-400/10";
      case "rejected":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading paused withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Paused Withdrawals Management
          </h1>
          <p className="text-gray-400 mt-1">
            Review and manage paused withdrawal transactions
          </p>
        </div>
        <button
          onClick={fetchPausedWithdrawals}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Search className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Pause className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Paused
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.total_paused}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.pending_review}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Approved Today
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.approved_today}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Rejected Today
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.rejected_today}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-600/10 border border-red-600 text-red-400 p-4 rounded-lg flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Withdrawals Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Paused Withdrawals
        </h3>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8">
            <Pause className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No paused withdrawals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Withdrawal ID
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Pause Reason
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Paused At
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr
                    key={withdrawal.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                      {withdrawal.withdrawal_id}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">
                          {withdrawal.username || "Unknown User"}
                        </p>
                        {withdrawal.email && (
                          <p className="text-sm text-gray-400">
                            {withdrawal.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-white">
                          {formatCurrency(withdrawal.usd_amount_cents / 100)}
                        </p>
                        <p className="text-sm text-gray-400">
                          {withdrawal.crypto_amount} {withdrawal.currency_code}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(withdrawal.status)}`}
                      >
                        {withdrawal.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {withdrawal.pause_reason || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(withdrawal.paused_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAction(withdrawal, "approve")}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleAction(withdrawal, "reject")}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Confirmation Dialog */}
      {actionDialogOpen && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {actionType === "approve" && "Approve Withdrawal"}
                {actionType === "reject" && "Reject Withdrawal"}
                {actionType === "pause" && "Pause Withdrawal"}
                {actionType === "unpause" && "Unpause Withdrawal"}
              </h2>
              <button
                onClick={() => setActionDialogOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Withdrawal ID</p>
                <p className="font-mono text-white">
                  {selectedWithdrawal.withdrawal_id}
                </p>
                <p className="text-sm text-gray-400 mt-2">Amount</p>
                <p className="text-white font-semibold">
                  {formatCurrency(selectedWithdrawal.usd_amount_cents / 100)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {actionType === "pause" ? "Pause Reason" : "Notes (Optional)"}
                </label>
                <textarea
                  placeholder={
                    actionType === "pause"
                      ? "Enter reason for pausing this withdrawal..."
                      : "Enter any notes about this action..."
                  }
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setActionDialogOpen(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-4 py-2 rounded-lg text-white ${
                    actionType === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  {actionType === "approve" && "Approve"}
                  {actionType === "reject" && "Reject"}
                  {actionType === "pause" && "Pause"}
                  {actionType === "unpause" && "Unpause"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalManagement;
