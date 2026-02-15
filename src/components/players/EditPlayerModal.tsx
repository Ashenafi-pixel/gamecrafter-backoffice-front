import React, { useState } from "react";
import { X, Save, User, Mail, Phone, MapPin, Shield } from "lucide-react";
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
  // Test account and balance info
  isTestAccount?: boolean;
  // Withdrawal limits
  withdrawalLimit?: number | string;
  withdrawalAllTimeLimit?: number | string;
  withdrawalLimitEnabled?: boolean;
}

interface EditPlayerModalProps {
  player: Player;
  onClose: () => void;
  onSave: (updatedPlayer: Player) => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  onClose,
  onSave,
}) => {
  const { adminSvc } = useServices();

  const [formData, setFormData] = useState({
    username: player.username,
    email: player.email,
    firstName: player.firstName,
    lastName: player.lastName,
    phoneNumber: player.phoneNumber,
    country: player.country,
    state: player.state,
    city: player.city,
    postalCode: player.postalCode,
    streetAddress: player.streetAddress,
    dateOfBirth: player.dateOfBirth,
    status: player.status,
    kycStatus: player.kycStatus || "NO_KYC",
    isEmailVerified: player.isEmailVerified,
    defaultCurrency: player.defaultCurrency,
    walletVerificationStatus: player.walletVerificationStatus,
    isTestAccount: player.isTestAccount || false,
    withdrawalLimit:
      player.withdrawalLimit !== undefined && player.withdrawalLimit !== null
        ? String(player.withdrawalLimit)
        : "",
    withdrawalAllTimeLimit:
      player.withdrawalAllTimeLimit !== undefined &&
      player.withdrawalAllTimeLimit !== null
        ? String(player.withdrawalAllTimeLimit)
        : "",
    withdrawalLimitEnabled:
      player.withdrawalLimitEnabled !== undefined
        ? Boolean(player.withdrawalLimitEnabled)
        : false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateAge = (dateOfBirth: string): boolean => {
    if (!dateOfBirth) return true; // Allow empty date

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred this year
    const actualAge =
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? age - 1
        : age;

    return actualAge >= 18;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Allow empty phone
    // Basic phone validation - at least 10 digits
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateRequiredFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    // For updates, no required fields; only validate formats if provided
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }
    if (formData.dateOfBirth && !validateAge(formData.dateOfBirth)) {
      newErrors.dateOfBirth = "Age must be 18 years or older";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!validateRequiredFields()) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const response = await adminSvc.patch("/users", {
        user_id: player.id,
        username: formData.username, // Include username
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        postal_code: formData.postalCode,
        street_address: formData.streetAddress,
        date_of_birth: formData.dateOfBirth,
        status: formData.status,
        kyc_status: formData.kycStatus,
        is_email_verified: formData.isEmailVerified,
        default_currency: formData.defaultCurrency,
        wallet_verification_status: formData.walletVerificationStatus,
        is_test_account: formData.isTestAccount,
        withdrawal_limit:
          formData.withdrawalLimitEnabled && formData.withdrawalLimit
            ? parseFloat(formData.withdrawalLimit)
            : undefined,
        withdrawal_all_time_limit:
          formData.withdrawalLimitEnabled && formData.withdrawalAllTimeLimit
            ? parseFloat(formData.withdrawalAllTimeLimit)
            : undefined,
        withdrawal_limit_enabled: formData.withdrawalLimitEnabled,
      });

      if (response.success) {
        // Use response data if available, otherwise use formData
        const responseData = (response as any).data?.data || (response as any).data;
        const updatedPlayer: Player = {
          ...player,
          // Map response data back to camelCase if response uses snake_case
          username: responseData?.username || formData.username,
          email: responseData?.email || formData.email,
          firstName:
            responseData?.first_name ||
            responseData?.firstName ||
            formData.firstName,
          lastName:
            responseData?.last_name ||
            responseData?.lastName ||
            formData.lastName,
          phoneNumber:
            responseData?.phone_number ||
            responseData?.phoneNumber ||
            formData.phoneNumber,
          country: responseData?.country || formData.country,
          state: responseData?.state || formData.state,
          city: responseData?.city || formData.city,
          postalCode:
            responseData?.postal_code ||
            responseData?.postalCode ||
            formData.postalCode,
          streetAddress:
            responseData?.street_address ||
            responseData?.streetAddress ||
            formData.streetAddress,
          dateOfBirth:
            responseData?.date_of_birth ||
            responseData?.dateOfBirth ||
            formData.dateOfBirth,
          status: responseData?.status || formData.status,
          kycStatus:
            responseData?.kyc_status ||
            responseData?.kycStatus ||
            formData.kycStatus,
          isEmailVerified:
            responseData?.is_email_verified !== undefined
              ? responseData.is_email_verified
              : responseData?.isEmailVerified !== undefined
                ? responseData.isEmailVerified
                : formData.isEmailVerified,
          defaultCurrency:
            responseData?.default_currency ||
            responseData?.defaultCurrency ||
            formData.defaultCurrency,
          walletVerificationStatus:
            responseData?.wallet_verification_status ||
            responseData?.walletVerificationStatus ||
            formData.walletVerificationStatus,
          ...(responseData?.is_test_account !== undefined && {
            isTestAccount: responseData.is_test_account,
          }),
          ...(responseData?.isTestAccount !== undefined && {
            isTestAccount: responseData.isTestAccount,
          }),
          ...(responseData?.withdrawal_limit !== undefined && {
            withdrawalLimit: String(responseData.withdrawal_limit),
          }),
          ...(responseData?.withdrawalLimit !== undefined && {
            withdrawalLimit: String(responseData.withdrawalLimit),
          }),
          ...(responseData?.withdrawal_all_time_limit !== undefined && {
            withdrawalAllTimeLimit: String(
              responseData.withdrawal_all_time_limit,
            ),
          }),
          ...(responseData?.withdrawalAllTimeLimit !== undefined && {
            withdrawalAllTimeLimit: String(responseData.withdrawalAllTimeLimit),
          }),
          ...(responseData?.withdrawal_limit_enabled !== undefined && {
            withdrawalLimitEnabled: responseData.withdrawal_limit_enabled,
          }),
          ...(responseData?.withdrawalLimitEnabled !== undefined && {
            withdrawalLimitEnabled: responseData.withdrawalLimitEnabled,
          }),
        };

        toast.success("Player updated successfully");
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "PLAYER_UPDATE",
            category: "PlayerManagement",
            severity: "info",
            resource_type: "user",
            resource_id: player.id,
            description: `Player updated: ${player.username}`,
            details: {
              fields_changed: Object.keys(formData).filter((k) => {
                const formValue = (formData as any)[k];
                const playerValue = (player as any)[k];
                return formValue !== playerValue;
              }),
              kyc_status: formData.kycStatus,
            },
          });
        } catch (err) {
          console.error("Failed to log activity:", err);
        }
        onSave(updatedPlayer);
        onClose();
      } else {
        toast.error(response.message || "Failed to update player");
      }
    } catch (error: any) {
      console.error("Failed to update player:", error);

      // Extract error message from different possible error structures
      let errorMessage = "Failed to update player";

      // Handle ApiResponse error structure (from apiService)
      if (error.message && typeof error.message === "string") {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Edit Player</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    // Prevent spaces and only allow alphanumeric characters
                    const value = e.target.value
                      .replace(/\s/g, "")
                      .replace(/[^a-zA-Z0-9_]/g, "");
                    handleChange("username", value);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  readOnly
                  title="Username cannot be changed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                    errors.email ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Optional"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                    errors.firstName ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Optional"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                    errors.lastName ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Optional"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                    errors.phoneNumber ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Optional"
                />
                {errors.phoneNumber && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  max={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 18),
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                    errors.dateOfBirth ? "border-red-500" : "border-gray-600"
                  }`}
                  placeholder="Optional"
                />
                {errors.dateOfBirth && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.dateOfBirth}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Must be 18 years or older
                </p>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-white flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Address Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) =>
                      handleChange("streetAddress", e.target.value)
                    }
                    className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                      errors.streetAddress
                        ? "border-red-500"
                        : "border-gray-600"
                    }`}
                    placeholder="Optional"
                  />
                  {errors.streetAddress && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.streetAddress}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                      errors.city ? "border-red-500" : "border-gray-600"
                    }`}
                    placeholder="Optional"
                  />
                  {errors.city && (
                    <p className="text-red-400 text-xs mt-1">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                      errors.postalCode ? "border-red-500" : "border-gray-600"
                    }`}
                    placeholder="Optional"
                  />
                  {errors.postalCode && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.postalCode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                      errors.country ? "border-red-500" : "border-gray-600"
                    }`}
                    placeholder="Optional"
                  />
                  {errors.country && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.country}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Currency
                  </label>
                  <select
                    value={formData.defaultCurrency}
                    onChange={(e) =>
                      handleChange("defaultCurrency", e.target.value)
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Account Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  KYC Status
                </label>
                <select
                  value={formData.kycStatus}
                  onChange={(e) => handleChange("kycStatus", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="NO_KYC">No KYC</option>
                  <option value="PENDING">Pending</option>
                  <option value="ID_VERIFIED">ID Verified</option>
                  <option value="ID_SOF_VERIFIED">ID SOF Verified</option>
                  <option value="KYC_FAILED">KYC Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Verification Status
                </label>
                <select
                  value={formData.walletVerificationStatus}
                  onChange={(e) =>
                    handleChange("walletVerificationStatus", e.target.value)
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="none">None</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isEmailVerified"
                  checked={formData.isEmailVerified}
                  onChange={(e) =>
                    handleChange("isEmailVerified", e.target.checked)
                  }
                  className="rounded border-gray-500"
                  placeholder="Optional"
                />
                <label
                  htmlFor="isEmailVerified"
                  className="text-sm text-gray-300"
                >
                  Email Verified
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isTestAccount"
                  checked={formData.isTestAccount}
                  onChange={(e) =>
                    handleChange("isTestAccount", e.target.checked)
                  }
                  className="rounded border-gray-500"
                  placeholder="Optional"
                />
                <label
                  htmlFor="isTestAccount"
                  className="text-sm text-gray-300"
                >
                  Test Account
                </label>
              </div>

              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="withdrawalLimitEnabled"
                    checked={formData.withdrawalLimitEnabled}
                    onChange={(e) =>
                      handleChange("withdrawalLimitEnabled", e.target.checked)
                    }
                    className="rounded border-gray-500"
                  />
                  <label
                    htmlFor="withdrawalLimitEnabled"
                    className="text-sm text-gray-300"
                  >
                    Enable Withdrawal Limit
                  </label>
                </div>
                {formData.withdrawalLimitEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Daily Withdrawal Limit
                      </label>
                      <input
                        type="number"
                        value={formData.withdrawalLimit}
                        onChange={(e) =>
                          handleChange("withdrawalLimit", e.target.value)
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g., 50000"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        All-Time Withdrawal Limit
                      </label>
                      <input
                        type="number"
                        value={formData.withdrawalAllTimeLimit}
                        onChange={(e) =>
                          handleChange("withdrawalAllTimeLimit", e.target.value)
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g., 100000"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Amounts in USD. When enabled, player can withdraw up to
                      these amounts regardless of manual review settings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

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
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
