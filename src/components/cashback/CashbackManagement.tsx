import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Star,
  Crown,
  Diamond,
  Trophy,
  Zap,
  Target,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  cashbackService,
  CashbackTier,
  CashbackTierUpdateRequest,
} from "../../services/cashbackService";

interface CashbackLevel {
  id: string;
  levelNumber: number;
  name: string;
  requiredGGR: number;
  rakebackPercentage: number;
  bonusMultiplier: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  icon: string;
  color: string;
  isActive: boolean;
  playersCount: number;
}

export const CashbackManagement: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CashbackLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    requiredGGR: "",
    rakebackPercentage: "",
    bonusMultiplier: "",
    dailyLimit: "",
    weeklyLimit: "",
    monthlyLimit: "",
    icon: "Star",
    color: "#8B5CF6",
    isActive: true,
  });

  // Real cashback levels data from API
  const [cashbackLevels, setCashbackLevels] = useState<CashbackLevel[]>([]);
  const [cashbackStats, setCashbackStats] = useState<any>(null);

  const iconOptions = [
    { name: "Star", component: Star },
    { name: "Crown", component: Crown },
    { name: "Diamond", component: Diamond },
    { name: "Trophy", component: Trophy },
    { name: "Zap", component: Zap },
    { name: "Target", component: Target },
  ];

  const colorOptions = [
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#F97316",
    "#84CC16",
    "#EC4899",
    "#CD7F32",
    "#C0C0C0",
    "#FFD700",
    "#E5E4E2",
    "#B9F2FF",
  ];

  // Load cashback tiers from API
  useEffect(() => {
    loadCashbackTiers();
    loadCashbackStats();
  }, []);

  const loadCashbackTiers = async () => {
    try {
      setLoading(true);
      setError(null);
      const tiers = await cashbackService.getCashbackTiers();

      // Convert API data to component format
      const convertedTiers: CashbackLevel[] = tiers.map(
        (tier: CashbackTier, index: number) => ({
          id: tier.id,
          levelNumber: tier.tier_level,
          name: tier.tier_name,
          requiredGGR: parseFloat(tier.min_expected_ggr_required),
          rakebackPercentage: parseFloat(tier.cashback_percentage),
          bonusMultiplier: parseFloat(tier.bonus_multiplier),
          dailyLimit: tier.daily_cashback_limit
            ? parseFloat(tier.daily_cashback_limit)
            : undefined,
          weeklyLimit: tier.weekly_cashback_limit
            ? parseFloat(tier.weekly_cashback_limit)
            : undefined,
          monthlyLimit: tier.monthly_cashback_limit
            ? parseFloat(tier.monthly_cashback_limit)
            : undefined,
          icon: getIconForTier(tier.tier_level),
          color: getColorForTier(tier.tier_level),
          isActive: tier.is_active,
          playersCount: tier.player_count, // Use real player count from API
        }),
      );

      setCashbackLevels(convertedTiers);
    } catch (err) {
      console.error("Failed to load cashback tiers:", err);
      setError("Failed to load cashback tiers");
    } finally {
      setLoading(false);
    }
  };

  const loadCashbackStats = async () => {
    try {
      const stats = await cashbackService.getCashbackStats();
      setCashbackStats(stats);
    } catch (err) {
      console.error("Failed to load cashback stats:", err);
    }
  };

  const getIconForTier = (level: number): string => {
    const icons = ["Star", "Trophy", "Crown", "Diamond", "Zap"];
    return icons[Math.min(level - 1, icons.length - 1)] || "Star";
  };

  const getColorForTier = (level: number): string => {
    const colors = ["#CD7F32", "#C0C0C0", "#FFD700", "#E5E4E2", "#B9F2FF"];
    return colors[Math.min(level - 1, colors.length - 1)] || "#8B5CF6";
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find((option) => option.name === iconName);
    return iconOption ? iconOption.component : Star;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const tierData: CashbackTierUpdateRequest = {
        tier_name: formData.name,
        min_ggr_required: formData.requiredGGR,
        cashback_percentage: formData.rakebackPercentage,
        bonus_multiplier: formData.bonusMultiplier || "1.0",
        daily_cashback_limit: formData.dailyLimit || undefined,
        weekly_cashback_limit: formData.weeklyLimit || undefined,
        monthly_cashback_limit: formData.monthlyLimit || undefined,
        special_benefits: {},
        is_active: formData.isActive,
      };

      if (editingLevel) {
        await cashbackService.updateCashbackTier(editingLevel.id, tierData);
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "RAKEBACK_TIER_UPDATE",
            category: "Rakeback",
            severity: "info",
            resource_type: "rakeback_tier",
            resource_id: editingLevel.id,
            description: `Updated cashback tier: ${editingLevel.name}`,
            details: tierData,
          });
        } catch {}
      } else {
        const created = await cashbackService.createCashbackTier(tierData);
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "RAKEBACK_TIER_CREATE",
            category: "Rakeback",
            severity: "info",
            resource_type: "rakeback_tier",
            resource_id: (created as any)?.data?.id || "",
            description: `Created cashback tier: ${formData.name}`,
            details: tierData,
          });
        } catch {}
      }

      // Reload data after successful operation
      await loadCashbackTiers();
      resetForm();
    } catch (err) {
      console.error("Failed to save cashback tier:", err);
      setError("Failed to save cashback tier");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      requiredGGR: "",
      rakebackPercentage: "",
      bonusMultiplier: "",
      dailyLimit: "",
      weeklyLimit: "",
      monthlyLimit: "",
      icon: "Star",
      color: "#8B5CF6",
      isActive: true,
    });
    setShowCreateModal(false);
    setEditingLevel(null);
  };

  const handleEdit = (level: CashbackLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      requiredGGR: level.requiredGGR.toString(),
      rakebackPercentage: level.rakebackPercentage.toString(),
      bonusMultiplier: level.bonusMultiplier.toString(),
      dailyLimit: level.dailyLimit ? level.dailyLimit.toString() : "",
      weeklyLimit: level.weeklyLimit ? level.weeklyLimit.toString() : "",
      monthlyLimit: level.monthlyLimit ? level.monthlyLimit.toString() : "",
      icon: level.icon,
      color: level.color,
      isActive: level.isActive,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (levelId: string) => {
    if (confirm("Are you sure you want to delete this rakeback level?")) {
      try {
        setSaving(true);
        await cashbackService.deleteCashbackTier(levelId);
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "RAKEBACK_TIER_DELETE",
            category: "Rakeback",
            severity: "warning",
            resource_type: "rakeback_tier",
            resource_id: levelId,
            description: "Deleted cashback tier",
          });
        } catch {}
        await loadCashbackTiers();
      } catch (err) {
        console.error("Failed to delete cashback tier:", err);
        setError("Failed to delete cashback tier");
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleLevelStatus = async (levelId: string) => {
    try {
      const level = cashbackLevels.find((l) => l.id === levelId);
      if (!level) return;

      const tierData: CashbackTierUpdateRequest = {
        tier_name: level.name,
        min_ggr_required: level.requiredGGR.toString(),
        cashback_percentage: level.rakebackPercentage.toString(),
        bonus_multiplier: level.bonusMultiplier.toString(),
        daily_cashback_limit: level.dailyLimit
          ? level.dailyLimit.toString()
          : undefined,
        weekly_cashback_limit: level.weeklyLimit
          ? level.weeklyLimit.toString()
          : undefined,
        monthly_cashback_limit: level.monthlyLimit
          ? level.monthlyLimit.toString()
          : undefined,
        is_active: !level.isActive,
      };

      await cashbackService.updateCashbackTier(levelId, tierData);
      try {
        const { adminActivityLogsService } =
          await import("../../services/adminActivityLogsService");
        await adminActivityLogsService.createActivityLog({
          action: "RAKEBACK_TIER_TOGGLE",
          category: "Rakeback",
          severity: !level.isActive ? "info" : "warning",
          resource_type: "rakeback_tier",
          resource_id: levelId,
          description: `${!level.isActive ? "Enabled" : "Disabled"} cashback tier`,
          details: { name: level.name, is_active: !level.isActive },
        });
      } catch {}

      await loadCashbackTiers();
    } catch (err) {
      console.error("Failed to toggle level status:", err);
      setError("Failed to update level status");
    }
  };

  const moveLevel = async (levelId: string, direction: "up" | "down") => {
    const currentIndex = cashbackLevels.findIndex(
      (level) => level.id === levelId,
    );
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= cashbackLevels.length) return;

    const newLevels = [...cashbackLevels];
    [newLevels[currentIndex], newLevels[newIndex]] = [
      newLevels[newIndex],
      newLevels[currentIndex],
    ];

    // Update level numbers
    newLevels.forEach((level, index) => {
      level.levelNumber = index + 1;
    });

    setCashbackLevels(newLevels);

    // Send reorder request to backend
    try {
      const tierOrder = newLevels.map((level) => level.id);
      await cashbackService.reorderCashbackTiers(tierOrder);
    } catch (err) {
      console.error("Failed to reorder tiers:", err);
      setError("Failed to reorder tiers");
      // Revert the change on error
      await loadCashbackTiers();
    }
  };

  // Sort levels by level number for display
  const sortedLevels = [...cashbackLevels].sort(
    (a, b) => a.levelNumber - b.levelNumber,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading cashback tiers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rakeback Management</h1>
          <p className="text-gray-400 mt-1">
            Create and manage rakeback levels and percentages
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Rakeback Level</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-400">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Cashback Levels Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          All Rakeback Levels
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Level #
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Level
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Name
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Theoretical GGR / House Edge ($)
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Rakeback (%)
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Players
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLevels.map((level, index) => {
                const IconComponent = getIconComponent(level.icon);
                return (
                  <tr
                    key={level.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4 text-white font-bold text-lg">
                      {level.levelNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="p-2 rounded"
                          style={{
                            backgroundColor: `${level.color}20`,
                            color: level.color,
                          }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="text-gray-400 font-mono text-sm">
                          {level.id}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {level.name}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      ${level.requiredGGR.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-green-400 text-right font-bold">
                      {level.rakebackPercentage}%
                    </td>
                    <td className="py-3 px-4 text-purple-400 text-right font-medium">
                      {(level.playersCount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          level.isActive
                            ? "text-green-400 bg-green-400/10"
                            : "text-gray-400 bg-gray-400/10"
                        }`}
                      >
                        {level.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveLevel(level.id, "up")}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveLevel(level.id, "down")}
                            disabled={index === sortedLevels.length - 1}
                            className="text-gray-400 hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleEdit(level)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(level.id)}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {editingLevel
                  ? "Edit Rakeback Level"
                  : "Create New Rakeback Level"}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Level Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="e.g., Platinum"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Theoretical GGR / House Edge ($)
                  </label>
                  <input
                    type="number"
                    value={formData.requiredGGR}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        requiredGGR: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="e.g., 50000"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Rakeback Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rakebackPercentage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rakebackPercentage: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="e.g., 12.5"
                    min="0"
                    max="100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Bonus Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.bonusMultiplier}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bonusMultiplier: e.target.value,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="e.g., 1.5"
                    min="1"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Daily Limit ($)
                    </label>
                    <input
                      type="number"
                      value={formData.dailyLimit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dailyLimit: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Optional"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Weekly Limit ($)
                    </label>
                    <input
                      type="number"
                      value={formData.weeklyLimit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          weeklyLimit: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Optional"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Monthly Limit ($)
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyLimit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          monthlyLimit: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                      placeholder="Optional"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-400"
                  >
                    Active
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {iconOptions.map((option) => {
                      const IconComponent = option.component;
                      return (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              icon: option.name,
                            }))
                          }
                          className={`p-3 rounded-lg border-2 flex items-center justify-center ${
                            formData.icon === option.name
                              ? "border-purple-500 bg-purple-500/20"
                              : "border-gray-600 bg-gray-700 hover:bg-gray-600"
                          }`}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color }))
                        }
                        className={`w-8 h-8 rounded-lg border-2 ${
                          formData.color === color
                            ? "border-white"
                            : "border-gray-600"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {editingLevel
                        ? "Update Rakeback Level"
                        : "Create Rakeback Level"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
