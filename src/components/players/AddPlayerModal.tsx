import React, { useState, useEffect } from "react";
import { X, UserPlus } from "lucide-react";
import { brandService, Brand } from "../../services/brandService";
import { playerManagementService } from "../../services/playerManagementService";
import { CreatePlayerRequest } from "../../types/playerManagement";
import toast from "react-hot-toast";

interface AddPlayerModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  onClose,
  onCreated,
}) => {

  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    default_currency: "USD",
    date_of_birth: "",
    country: "US",
    state: "",
    city: "",
    street_address: "",
    postal_code: "",
    is_test_account: false,
    withdrawal_limit: "",
    withdrawal_all_time_limit: "",
    withdrawal_limit_enabled: false,
    brand_id: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch brands on mount
  useEffect(() => {
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
  }, []);

  const handleChange = (key: string, value: string | boolean | number | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validatePassword = (pwd: string) => {
    if (!pwd || pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[a-z]/.test(pwd)) return "Password must include a lowercase letter";
    if (!/[A-Z]/.test(pwd)) return "Password must include an uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must include a digit";
    return "";
  };

  const validatePhone = (phone: string) => {
    if (!phone) return "";
    // E.164 style with min 8 digits after optional +
    const normalized = phone.replace(/\s|-/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(normalized))
      return "Enter a valid phone number (E.164, min 8 digits)";
    return "";
  };

  const validateDob = (dob: string) => {
    if (!dob) return "";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "Enter a valid date of birth";
    const today = new Date();
    if (d > today) return "Date of birth cannot be in the future";
    // 18+ check
    const eighteen = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    if (d > eighteen) return "Player must be at least 18 years old";
    return "";
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    if (!form.email) newErrors.email = "Email is required";
    if (!form.username) newErrors.username = "Username is required";
    const pwdErr = validatePassword(form.password);
    if (pwdErr) newErrors.password = pwdErr;
    const phErr = validatePhone(form.phone_number);
    if (phErr) newErrors.phone_number = phErr;
    const dobErr = validateDob(form.date_of_birth);
    if (dobErr) newErrors.date_of_birth = dobErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);
    try {
      const payload: CreatePlayerRequest = {
        email: form.email,
        username: form.username,
        password: form.password,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        phone: form.phone_number || null,
        default_currency: form.default_currency,
        date_of_birth: form.date_of_birth,
        country: form.country,
        state: form.state || null,
        street_address: form.street_address || null,
        postal_code: form.postal_code || null,
        test_account: form.is_test_account,
        enable_withdrawal_limit: form.withdrawal_limit_enabled,
        brand_id: form.brand_id || null,
      };
      const res = await playerManagementService.createPlayer(payload);
      if (res?.success) {
        toast.success("Player created");
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "PLAYER_CREATE",
            category: "PlayerManagement",
            severity: "info",
            resource_type: "user",
            resource_id: res?.data?.id?.toString() || "",
            description: `Player created: ${form.username}`,
            details: { username: form.username, email: form.email },
          });
        } catch {}
        onCreated();
        onClose();
      } else {
        toast.error(res?.message || "Failed to create player");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create player");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-5 w-5 text-purple-400" />
            <h3 className="text-white font-semibold">Add Player</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email<span className="text-red-500">*</span>
              </label>
              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                type="email"
                required
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Username<span className="text-red-500">*</span>
              </label>
              <input
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                required
              />
              {errors.username && (
                <p className="text-red-400 text-xs mt-1">{errors.username}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Password<span className="text-red-500">*</span>
              </label>
              <input
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                type="password"
                required
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input
                value={form.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
              {errors.phone_number && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.phone_number}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                First Name
              </label>
              <input
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Last Name
              </label>
              <input
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Default Currency
              </label>
              <select
                value={form.default_currency}
                onChange={(e) =>
                  handleChange("default_currency", e.target.value)
                }
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Brand</label>
              <select
                value={form.brand_id || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange("brand_id", value ? Number(value) : null);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                disabled={loadingBrands}
              >
                <option value="">Select Brand (Optional)</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Date of Birth
              </label>
              <input
                value={form.date_of_birth}
                onChange={(e) => handleChange("date_of_birth", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                type="date"
                placeholder="Optional"
              />
              {errors.date_of_birth && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.date_of_birth}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Country
              </label>
              <input
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">State</label>
              <input
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Street Address
              </label>
              <input
                value={form.street_address}
                onChange={(e) => handleChange("street_address", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Postal Code
              </label>
              <input
                value={form.postal_code}
                onChange={(e) => handleChange("postal_code", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.is_test_account}
                  onChange={(e) =>
                    handleChange("is_test_account", e.target.checked)
                  }
                  className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-400">Test Account</span>
              </label>
            </div>
            <div className="md:col-span-2 border-t border-gray-700 pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={form.withdrawal_limit_enabled}
                  onChange={(e) =>
                    handleChange("withdrawal_limit_enabled", e.target.checked)
                  }
                  className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-400">
                  Enable Withdrawal Limit
                </span>
              </div>
              {form.withdrawal_limit_enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Daily Withdrawal Limit
                    </label>
                    <input
                      type="number"
                      value={form.withdrawal_limit}
                      onChange={(e) =>
                        handleChange("withdrawal_limit", e.target.value)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="e.g., 50000"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      All-Time Withdrawal Limit
                    </label>
                    <input
                      type="number"
                      value={form.withdrawal_all_time_limit}
                      onChange={(e) =>
                        handleChange(
                          "withdrawal_all_time_limit",
                          e.target.value,
                        )
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
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

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
