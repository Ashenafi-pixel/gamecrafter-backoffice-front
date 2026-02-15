import React, { useState, useEffect } from "react";
import {
  Zap,
  ToggleLeft,
  ToggleRight,
  Save,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Info,
} from "lucide-react";
import {
  rakebackOverrideService,
  GlobalRakebackOverride,
  CreateOrUpdateRakebackOverrideReq,
} from "../../services/rakebackOverrideService";
import toast from "react-hot-toast";

export const RakebackOverrideManagement: React.FC = () => {
  const [override, setOverride] = useState<GlobalRakebackOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    is_active: false,
    rakeback_percentage: "" as number | string,
    start_time: "", // HH:MM format (time only, repeats daily)
    end_time: "", // HH:MM format (time only, repeats daily)
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for display purposes only
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Removed auto-disable logic - backend now handles time window checking

  // Check if Happy Hour should be active based on time window (daily repetition)
  // Compares only the time portion (HH:MM) regardless of date
  const isWithinTimeWindow = (): boolean => {
    if (!formData.start_time && !formData.end_time) {
      return false;
    }

    // Get current time in UTC
    const now = new Date();
    const currentHours = now.getUTCHours();
    const currentMinutes = now.getUTCMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    let startTimeMinutes: number | null = null;
    let endTimeMinutes: number | null = null;

    // Parse start time (HH:MM format)
    if (formData.start_time) {
      const [hours, minutes] = formData.start_time.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        startTimeMinutes = hours * 60 + minutes;
      }
    }

    // Parse end time (HH:MM format)
    if (formData.end_time) {
      const [hours, minutes] = formData.end_time.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        endTimeMinutes = hours * 60 + minutes;
      }
    }

    // Check if current time is within the daily time window
    if (startTimeMinutes !== null && endTimeMinutes !== null) {
      // Handle case where end time is next day (e.g., 22:00 to 02:00)
      if (endTimeMinutes <= startTimeMinutes) {
        // Time window spans midnight
        return (
          currentTimeMinutes >= startTimeMinutes ||
          currentTimeMinutes <= endTimeMinutes
        );
      } else {
        // Normal time window (same day)
        return (
          currentTimeMinutes >= startTimeMinutes &&
          currentTimeMinutes <= endTimeMinutes
        );
      }
    } else if (startTimeMinutes !== null) {
      return currentTimeMinutes >= startTimeMinutes;
    } else if (endTimeMinutes !== null) {
      return currentTimeMinutes <= endTimeMinutes;
    }

    return false;
  };

  // Calculate if Happy Hour is currently active based on time window
  const isHappyHourActive = (): boolean => {
    // If time window is configured and we're within it, check is_active flag
    if (formData.start_time || formData.end_time) {
      const withinWindow = isWithinTimeWindow();
      // Happy Hour is active if within time window AND is_active is true
      return withinWindow && formData.is_active;
    }

    // No time constraints, use is_active flag directly
    return formData.is_active;
  };

  const happyHourActive = isHappyHourActive();
  const withinTimeWindow = isWithinTimeWindow();

  useEffect(() => {
    loadOverride();
  }, []);

  // Update current time when formData changes to recalculate active status
  useEffect(() => {
    setCurrentTime(new Date());
  }, [formData.start_time, formData.end_time, formData.is_active]);

  const loadOverride = async () => {
    try {
      setLoading(true);
      const data = await rakebackOverrideService.getOverride();
      console.log("Loaded override data:", data); // Debug log
      if (data) {
        setOverride(data);
        // Convert rakeback_percentage to number (handle both string and number)
        const percentage =
          typeof data.rakeback_percentage === "string"
            ? parseFloat(data.rakeback_percentage)
            : data.rakeback_percentage;

        // Extract time (HH:MM) from datetime string for time input
        const extractTimeFromDateTime = (
          dateStr: string | null | undefined,
        ): string => {
          if (!dateStr) return "";
          try {
            const date = new Date(dateStr);
            // Check if date is valid
            if (isNaN(date.getTime())) {
              console.error("Invalid date:", dateStr);
              return "";
            }
            // Format as HH:MM for time input (using UTC time)
            const hours = String(date.getUTCHours()).padStart(2, "0");
            const minutes = String(date.getUTCMinutes()).padStart(2, "0");
            return `${hours}:${minutes}`;
          } catch (e) {
            console.error("Error extracting time:", e, dateStr);
            return "";
          }
        };

        setFormData({
          is_active: data.is_active,
          rakeback_percentage:
            isNaN(percentage) || percentage === 0 ? "" : percentage,
          start_time: extractTimeFromDateTime(data.start_time),
          end_time: extractTimeFromDateTime(data.end_time),
        });
        console.log("Form data set:", {
          is_active: data.is_active,
          rakeback_percentage:
            isNaN(percentage) || percentage === 0 ? "" : percentage,
          start_time: extractTimeFromDateTime(data.start_time),
          end_time: extractTimeFromDateTime(data.end_time),
        }); // Debug log
      } else {
        // No override exists, reset to defaults
        setFormData({
          is_active: false,
          rakeback_percentage: "",
          start_time: "",
          end_time: "",
        });
      }
    } catch (error: any) {
      console.error("Failed to load rakeback override:", error);
      toast.error(
        error?.response?.data?.message || "Failed to load rakeback override",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate percentage (0-100, up to 2 decimal places)
      const percentage =
        typeof formData.rakeback_percentage === "string"
          ? formData.rakeback_percentage === ""
            ? 0
            : parseFloat(formData.rakeback_percentage)
          : formData.rakeback_percentage;

      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast.error("Rakeback percentage must be between 0 and 100");
        return;
      }

      // Use the user's explicit is_active choice - backend will handle time window checking
      const shouldBeActive = formData.is_active;

      // Convert time-only values (HH:MM) to full datetime strings for backend
      // Use today's date in UTC, but the backend should handle daily repetition
      const now = new Date();
      const todayUTC = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );

      let startTimeISO: string | undefined = undefined;
      let endTimeISO: string | undefined = undefined;

      if (formData.start_time) {
        const [hours, minutes] = formData.start_time.split(":").map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const startDate = new Date(todayUTC);
          startDate.setUTCHours(hours, minutes, 0, 0);
          startTimeISO = startDate.toISOString();
        }
      }

      if (formData.end_time) {
        const [hours, minutes] = formData.end_time.split(":").map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const endDate = new Date(todayUTC);
          endDate.setUTCHours(hours, minutes, 0, 0);
          endTimeISO = endDate.toISOString();
        }
      }

      const req: CreateOrUpdateRakebackOverrideReq = {
        is_active: shouldBeActive,
        rakeback_percentage: parseFloat(percentage.toFixed(2)),
        start_time: startTimeISO,
        end_time: endTimeISO,
      };

      const updated = await rakebackOverrideService.createOrUpdateOverride(req);
      setOverride(updated);

      // Update formData with the actual saved state from server
      setFormData((prev) => ({
        ...prev,
        is_active: updated.is_active,
        rakeback_percentage:
          typeof updated.rakeback_percentage === "string"
            ? parseFloat(updated.rakeback_percentage)
            : updated.rakeback_percentage,
      }));

      toast.success("Rakeback override saved successfully");
    } catch (error: any) {
      console.error("Failed to save rakeback override:", error);
      toast.error(
        error?.response?.data?.message || "Failed to save rakeback override",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (isActive: boolean) => {
    try {
      setSaving(true);
      await rakebackOverrideService.toggleOverride(isActive);
      // Reload the override data from server to get the actual state
      await loadOverride();
      toast.success(`Rakeback override ${isActive ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("Failed to toggle rakeback override:", error);
      toast.error(
        error?.response?.data?.message || "Failed to toggle rakeback override",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          Global Rakeback Override (Happy Hour)
        </h1>
        <p className="text-gray-400 mt-2">
          Temporarily override all VIP rakeback levels with a single global
          percentage for marketing events
        </p>
      </div>

      {/* Status Card */}
      <div
        className={`mb-6 p-4 rounded-lg border-2 ${
          withinTimeWindow
            ? "bg-green-900/20 border-green-500"
            : "bg-gray-800 border-gray-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {withinTimeWindow ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <h3 className="font-semibold text-lg text-white">
                {withinTimeWindow ? "Happy Hour Active" : "Happy Hour Inactive"}
              </h3>
              <p className="text-sm text-gray-400">
                {withinTimeWindow
                  ? formData.is_active
                    ? `All users are receiving ${typeof formData.rakeback_percentage === "string" && formData.rakeback_percentage === "" ? "0" : formData.rakeback_percentage}% rakeback`
                    : `Time window is active! ${typeof formData.rakeback_percentage === "string" && formData.rakeback_percentage === "" ? "0" : formData.rakeback_percentage}% rakeback will be applied when enabled. Click "Enable" to activate.`
                  : "VIP-level rakeback rates are currently active"}
              </p>
              {/* Show time window info if configured */}
              {(formData.start_time || formData.end_time) && (
                <div className="mt-2 text-xs text-gray-500">
                  {formData.start_time && (
                    <span>Starts daily at: {formData.start_time} UTC</span>
                  )}
                  {formData.start_time && formData.end_time && <span> • </span>}
                  {formData.end_time && (
                    <span>Ends daily at: {formData.end_time} UTC</span>
                  )}
                  <span className="ml-2">
                    (Current:{" "}
                    {currentTime.toLocaleTimeString("en-US", {
                      timeZone: "UTC",
                      hour12: false,
                    })}{" "}
                    UTC)
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => handleToggle(!formData.is_active)}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              formData.is_active
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {formData.is_active ? (
              <>
                <ToggleRight className="w-5 h-5" />
                Disable
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                Enable
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Configuration</h2>

        <div className="space-y-4">
          {/* Rakeback Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Global Rakeback Percentage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  formData.rakeback_percentage === 0 ||
                  formData.rakeback_percentage === ""
                    ? ""
                    : formData.rakeback_percentage
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setFormData((prev) => ({
                      ...prev,
                      rakeback_percentage: "",
                    }));
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                      setFormData((prev) => ({
                        ...prev,
                        rakeback_percentage: numValue,
                      }));
                    }
                  }
                }}
                onKeyDown={(e) => {
                  // Handle arrow keys for spinner
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const current =
                      typeof formData.rakeback_percentage === "number"
                        ? formData.rakeback_percentage
                        : 0;
                    const newValue = Math.min(100, current + 0.01);
                    setFormData((prev) => ({
                      ...prev,
                      rakeback_percentage: newValue,
                    }));
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const current =
                      typeof formData.rakeback_percentage === "number"
                        ? formData.rakeback_percentage
                        : 0;
                    const newValue = Math.max(0, current - 0.01);
                    setFormData((prev) => ({
                      ...prev,
                      rakeback_percentage: newValue,
                    }));
                  }
                }}
                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                placeholder="0.00"
              />
              <span className="text-gray-400 font-medium">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Enter a value between 0 and 100 (supports up to 2 decimal places)
            </p>
          </div>

          {/* Start Time (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Time (Optional){" "}
              <span className="text-gray-400 text-xs">
                (UTC, repeats daily)
              </span>
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, start_time: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Schedule automatic activation daily at this time (UTC timezone)
            </p>
          </div>

          {/* End Time (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Time (Optional){" "}
              <span className="text-gray-400 text-xs">
                (UTC, repeats daily)
              </span>
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, end_time: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Schedule automatic deactivation daily at this time (UTC timezone).
              Can be next day (e.g., 22:00 to 02:00)
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  When enabled, all users receive the global rakeback percentage
                  regardless of their VIP tier
                </li>
                <li>
                  When disabled, the system reverts to standard VIP-based
                  rakeback rates
                </li>
                <li>All admin actions are logged with timestamp and user ID</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audit Info */}
      {override && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Last Updated
          </h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(override.updated_at).toLocaleString()}
            </p>
            {override.created_at && (
              <p>Created: {new Date(override.created_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
