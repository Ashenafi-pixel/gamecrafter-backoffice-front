import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Ban,
  Shield,
  DollarSign,
  Gamepad2,
} from "lucide-react";
import { toast } from "react-hot-toast";

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

interface SuspendPlayerModalProps {
  player: Player | null;
  onClose: () => void;
  onSuspend: (
    playerId: string,
    blockType: string,
    reason: string,
    note: string,
  ) => void;
}

const BLOCK_TYPES = [
  {
    value: "complete",
    label: "Complete Block",
    description: "Block all account activities (login, gaming, financial)",
    icon: Ban,
    color: "text-red-400",
  },
  {
    value: "login",
    label: "Login Block",
    description: "Block user from logging in",
    icon: Shield,
    color: "text-orange-400",
  },
  {
    value: "gaming",
    label: "Gaming Block",
    description: "Block user from playing games",
    icon: Gamepad2,
    color: "text-yellow-400",
  },
  {
    value: "financial",
    label: "Financial Block",
    description: "Block financial transactions (deposits/withdrawals)",
    icon: DollarSign,
    color: "text-blue-400",
  },
];

export const SuspendPlayerModal: React.FC<SuspendPlayerModalProps> = ({
  player,
  onClose,
  onSuspend,
}) => {
  const [formData, setFormData] = useState({
    blockType: "complete",
    reason: "",
    note: "",
  });

  const [loading, setLoading] = useState(false);

  if (!player) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }

    setLoading(true);

    try {
      await onSuspend(
        player.id,
        formData.blockType,
        formData.reason,
        formData.note,
      );
      onClose();
    } catch (error) {
      console.error("Suspension failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-400 bg-green-400/10";
      case "suspended":
        return "text-red-400 bg-red-400/10";
      case "inactive":
        return "text-gray-400 bg-gray-400/10";
      default:
        return "text-yellow-400 bg-yellow-400/10";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Suspend Player</h2>
              <p className="text-gray-400 text-sm">
                Block player account activities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Player Information */}
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
              <span className="text-gray-400">Current Status:</span>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(player.status)}`}
              >
                {player.status}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Block Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Block Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BLOCK_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <label
                      key={type.value}
                      className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.blockType === type.value
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="blockType"
                        value={type.value}
                        checked={formData.blockType === type.value}
                        onChange={(e) =>
                          handleChange("blockType", e.target.value)
                        }
                        className="sr-only"
                      />
                      <div className="flex items-start space-x-3">
                        <IconComponent
                          className={`h-5 w-5 mt-0.5 ${type.color}`}
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">
                            {type.label}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Suspension *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                placeholder="Enter the reason for suspending this player..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                rows={3}
                required
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
                placeholder="Any additional information or instructions..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.reason.trim()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Suspending...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    <span>Suspend Player</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
