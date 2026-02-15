import React, { useState } from "react";
import { X, Plus, Minus, DollarSign, FileText } from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import toast from "react-hot-toast";

interface Player {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  streetAddress: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  kycStatus: string;
  isEmailVerified: boolean;
  referalCode: string;
  referalType: string;
  referedByCode: string;
  userType: string;
  primaryWalletAddress: string;
  walletVerificationStatus: string;
  status: string;
  isAdmin: boolean;
  defaultCurrency: string;
  profilePicture: string;
  source: string;
  createdBy: string;
  createdAt: string;
  // Computed fields
  registrationDate: string;
  lastLogin: string;
  verified: boolean;
  totalDeposits: number;
  totalWithdrawals: number;
  currentBalance: number;
  totalWagered: number;
  netProfitLoss: number;
  sessionsCount: number;
  vipLevel: string;
  riskScore: string;
  transactions: Array<{
    id: string;
    type: string;
    crypto: string;
    amount: string;
    usd: string;
    status: string;
    date: string;
  }>;
}

interface FundManagementModalProps {
  player: Player;
  onClose: () => void;
  onFundManagement: (
    playerId: string,
    amount: number,
    type: "credit" | "debit",
    description: string,
  ) => void;
}

export const FundManagementModal: React.FC<FundManagementModalProps> = ({
  player,
  onClose,
  onFundManagement,
}) => {
  const { adminSvc } = useServices();

  const [formData, setFormData] = useState({
    amount: "",
    type: "credit" as "credit" | "debit",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      // Call the backend API for fund management
      const response = await adminSvc.post("/players/funding", {
        user_id: player.id,
        amount: amount,
        type: formData.type === "credit" ? "add_fund" : "remove_fund",
        reason: formData.description,
        note: formData.description,
      });

      if (response.success) {
        toast.success(`Funds ${formData.type}ed successfully`);
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action:
              formData.type === "credit"
                ? "PLAYER_FUNDS_CREDIT"
                : "PLAYER_FUNDS_DEBIT",
            category: "WalletManagement",
            severity: "info",
            resource_type: "user",
            resource_id: player.id,
            description: `${formData.type === "credit" ? "Credited" : "Debited"} ${amount} to player`,
            details: { amount, description: formData.description },
          });
        } catch {}
        onFundManagement(
          player.id,
          amount,
          formData.type,
          formData.description,
        );
        onClose();
      } else {
        toast.error(response.message || "Failed to process fund transaction");
      }
    } catch (error: any) {
      console.error("Fund management failed:", error);
      // Extract error message from ApiResponse or axios error
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to process fund transaction";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getNewBalance = () => {
    const amount = parseFloat(formData.amount) || 0;
    if (formData.type === "credit") {
      return player.currentBalance + amount;
    } else {
      return Math.max(0, player.currentBalance - amount);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Fund Management</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Player Info */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {player.firstName} {player.lastName}
            </h3>
            <p className="text-gray-300 text-sm mb-1">
              Username: {player.username}
            </p>
            <p className="text-gray-300 text-sm mb-1">ID: {player.id}</p>
            <p className="text-gray-300 text-sm mb-2">Email: {player.email}</p>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Current Balance:</span>
              <span className="text-white font-bold text-lg">
                ${player.currentBalance.toLocaleString()}{" "}
                {player.defaultCurrency}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("type", "credit")}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 ${
                    formData.type === "credit"
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <Plus className="h-5 w-5" />
                  <span>Credit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("type", "debit")}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 ${
                    formData.type === "debit"
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <Minus className="h-5 w-5" />
                  <span>Debit</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                  placeholder="Enter reason for this transaction..."
                  required
                />
              </div>
            </div>

            {/* Balance Preview */}
            {formData.amount && parseFloat(formData.amount) > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Balance Preview
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Current Balance:</span>
                    <span className="text-white">
                      ${player.currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {formData.type === "credit"
                        ? "Credit Amount:"
                        : "Debit Amount:"}
                    </span>
                    <span
                      className={
                        formData.type === "credit"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {formData.type === "credit" ? "+" : "-"}$
                      {parseFloat(formData.amount || "0").toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-gray-600 pt-1 mt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-300">New Balance:</span>
                      <span className="text-white">
                        ${getNewBalance().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.amount || !formData.description}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
              >
                {formData.type === "credit" ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>
                  {loading
                    ? "Processing..."
                    : `${formData.type === "credit" ? "Credit" : "Debit"} Funds`}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
