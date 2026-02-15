import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Info,
  Globe,
} from "lucide-react";
import { welcomeBonusChannelService } from "../../services/welcomeBonusChannelService";
import { WelcomeBonusChannelRule } from "../../types";
import toast from "react-hot-toast";

interface WelcomeBonusChannelsProps {
  brandId: string | null;
}

export const WelcomeBonusChannels: React.FC<WelcomeBonusChannelsProps> = ({
  brandId,
}) => {
  const [channels, setChannels] = useState<WelcomeBonusChannelRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] =
    useState<WelcomeBonusChannelRule | null>(null);
  const [formData, setFormData] = useState<Omit<WelcomeBonusChannelRule, "id">>(
    {
      channel: "",
      referrer_patterns: [],
      enabled: true,
      bonus_type: "fixed",
      fixed_amount: 0,
      percentage: 0,
      max_deposit_amount: 0,
      inherit_ip_policy: true,
      ip_restriction_enabled: false,
      allow_multiple_bonuses_per_ip: false,
    },
  );
  const [referrerPatternInput, setReferrerPatternInput] = useState("");

  useEffect(() => {
    if (brandId) {
      loadChannels();
    } else {
      setChannels([]);
    }
  }, [brandId]);

  const loadChannels = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const data = await welcomeBonusChannelService.getChannels(brandId);
      setChannels(data.channels || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      channel: "",
      referrer_patterns: [],
      enabled: true,
      bonus_type: "fixed",
      fixed_amount: 0,
      percentage: 0,
      max_deposit_amount: 0,
      inherit_ip_policy: true,
      ip_restriction_enabled: false,
      allow_multiple_bonuses_per_ip: false,
    });
    setReferrerPatternInput("");
    setEditingChannel(null);
    setShowCreateModal(true);
  };

  const handleEdit = (channel: WelcomeBonusChannelRule) => {
    setFormData({
      channel: channel.channel,
      referrer_patterns: [...channel.referrer_patterns],
      enabled: channel.enabled,
      bonus_type: channel.bonus_type,
      fixed_amount: channel.fixed_amount || 0,
      percentage: channel.percentage || 0,
      max_deposit_amount: channel.max_deposit_amount || 0,
      inherit_ip_policy: channel.inherit_ip_policy,
      ip_restriction_enabled: channel.ip_restriction_enabled,
      allow_multiple_bonuses_per_ip: channel.allow_multiple_bonuses_per_ip,
    });
    setReferrerPatternInput("");
    setEditingChannel(channel);
    setShowCreateModal(true);
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel rule?")) {
      return;
    }
    try {
      await welcomeBonusChannelService.deleteChannel(channelId);
      toast.success("Channel deleted successfully");
      loadChannels();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete channel");
    }
  };

  const handleSave = async () => {
    if (!brandId) {
      toast.error("Please select a brand first");
      return;
    }

    if (!formData.channel.trim()) {
      toast.error("Channel name is required");
      return;
    }

    if (formData.referrer_patterns.length === 0) {
      toast.error("At least one referrer pattern is required");
      return;
    }

    if (
      formData.bonus_type === "fixed" &&
      (!formData.fixed_amount || formData.fixed_amount <= 0)
    ) {
      toast.error("Fixed amount must be greater than 0");
      return;
    }

    if (formData.bonus_type === "percentage") {
      if (!formData.percentage || formData.percentage <= 0) {
        toast.error("Percentage must be greater than 0");
        return;
      }
    }

    try {
      const { max_bonus_percentage, ...dataToSave } = formData;
      if (editingChannel) {
        await welcomeBonusChannelService.updateChannel(
          editingChannel.id,
          brandId,
          dataToSave,
        );
        toast.success("Channel updated successfully");
      } else {
        await welcomeBonusChannelService.createChannel(brandId, dataToSave);
        toast.success("Channel created successfully");
      }
      setShowCreateModal(false);
      loadChannels();
    } catch (error: any) {
      toast.error(error.message || "Failed to save channel");
    }
  };

  const addReferrerPattern = () => {
    if (referrerPatternInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        referrer_patterns: [
          ...prev.referrer_patterns,
          referrerPatternInput.trim(),
        ],
      }));
      setReferrerPatternInput("");
    }
  };

  const removeReferrerPattern = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      referrer_patterns: prev.referrer_patterns.filter((_, i) => i !== index),
    }));
  };

  if (!brandId) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <span className="text-yellow-400 font-medium">
            Please select a brand to configure channel rules
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Channel-Based Bonus Rules
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Configure different bonus rules for different traffic sources
            (channels)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Channel</span>
        </button>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">How Channel Rules Work:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-200">
              <li>Channel rules are checked first when a user registers</li>
              <li>
                If a referrer URL matches a channel pattern, that channel's
                bonus is used
              </li>
              <li>If no match is found, the global bonus settings are used</li>
              <li>
                Channel bonuses are mutually exclusive with global bonuses
              </li>
            </ul>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading channels...</div>
      ) : channels.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
          <Globe className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No channel rules configured</p>
          <p className="text-sm text-gray-500 mt-2">
            Create your first channel rule to customize bonuses by traffic
            source
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-white font-medium">
                      {channel.channel}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        channel.enabled
                          ? "bg-green-900/30 text-green-400"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {channel.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        channel.bonus_type === "fixed"
                          ? "bg-purple-900/30 text-purple-400"
                          : "bg-blue-900/30 text-blue-400"
                      }`}
                    >
                      {channel.bonus_type === "fixed" ? "Fixed" : "Percentage"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>
                      <span className="font-medium">Bonus:</span>{" "}
                      {channel.bonus_type === "fixed"
                        ? `$${channel.fixed_amount}`
                        : `${channel.percentage}%`}
                    </p>
                    <p>
                      <span className="font-medium">Referrer Patterns:</span>{" "}
                      {channel.referrer_patterns.join(", ") || "None"}
                    </p>
                    {channel.bonus_type === "percentage" &&
                      channel.max_deposit_amount > 0 && (
                        <p>
                          <span className="font-medium">Max Deposit:</span> $
                          {channel.max_deposit_amount}
                        </p>
                      )}
                    <p>
                      <span className="font-medium">IP Policy:</span>{" "}
                      {channel.inherit_ip_policy
                        ? "Inherit from global"
                        : channel.ip_restriction_enabled
                          ? "Restricted"
                          : "No restriction"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(channel)}
                    className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(channel.id)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingChannel ? "Edit Channel Rule" : "Create Channel Rule"}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Channel Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Channel Name *
                </label>
                <input
                  type="text"
                  value={formData.channel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      channel: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  placeholder="e.g., Google Ads, Facebook, Affiliate Network"
                />
              </div>

              {/* Referrer Patterns */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Referrer Patterns *
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={referrerPatternInput}
                    onChange={(e) => setReferrerPatternInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addReferrerPattern();
                      }
                    }}
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    placeholder="e.g., google.com, facebook.com"
                  />
                  <button
                    onClick={addReferrerPattern}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.referrer_patterns.map((pattern, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-sm"
                    >
                      <span>{pattern}</span>
                      <button
                        onClick={() => removeReferrerPattern(index)}
                        className="text-purple-400 hover:text-purple-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Patterns are matched against the referrer URL. Use domain
                  names or partial URLs.
                </p>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-500"
                />
                <label className="text-sm font-medium text-gray-300">
                  Enabled
                </label>
              </div>

              {/* Bonus Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bonus Type *
                </label>
                <select
                  value={formData.bonus_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bonus_type: e.target.value as "fixed" | "percentage",
                    }))
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage (Deposit Match)</option>
                </select>
              </div>

              {/* Fixed Amount */}
              {formData.bonus_type === "fixed" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fixed Bonus Amount *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.fixed_amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fixed_amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
              )}

              {/* Percentage Fields */}
              {formData.bonus_type === "percentage" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Bonus Percentage (%) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.percentage}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          percentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Max Deposit Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.max_deposit_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_deposit_amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum deposit amount for bonus calculation (0 = no
                      limit)
                    </p>
                  </div>
                </>
              )}

              {/* IP Policy */}
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-300">
                  IP Policy Settings
                </h4>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.inherit_ip_policy}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        inherit_ip_policy: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-500"
                  />
                  <label className="text-sm text-gray-300">
                    Inherit IP policy from global settings
                  </label>
                </div>
                {!formData.inherit_ip_policy && (
                  <>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.ip_restriction_enabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            ip_restriction_enabled: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-500"
                      />
                      <label className="text-sm text-gray-300">
                        Enable IP restriction
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.allow_multiple_bonuses_per_ip}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            allow_multiple_bonuses_per_ip: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-500"
                      />
                      <label className="text-sm text-gray-300">
                        Allow multiple bonuses per IP address
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingChannel ? "Update" : "Create"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
