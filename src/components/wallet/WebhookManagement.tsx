import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Edit,
  X,
  CheckCircle,
  XCircle,
  RotateCw,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { wmsService } from "../../services/wmsService";
import { toast } from "react-hot-toast";
import { CopyableText } from "../common/CopyableText";

interface Webhook {
  id: string;
  chain_id: string;
  webhook_id: string;
  webhook_url: string;
  network: string;
  address_count: number;
  signing_key: string;
  max_addresses: number;
  version: string;
  is_active: boolean;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const WebhookManagement: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddressesModal, setShowAddressesModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookAddresses, setWebhookAddresses] = useState<string[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editForm, setEditForm] = useState({
    addresses_to_add: "",
    addresses_to_remove: "",
    is_active: true,
    deactivation_reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<{
    all: boolean;
    webhooks: boolean;
    addresses: boolean;
  }>({
    all: false,
    webhooks: false,
    addresses: false,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSigningKey, setShowSigningKey] = useState<Set<string>>(new Set());

  const allChainIds = [
    "eth-mainnet",
    "eth-sepolia",
    "sol-mainnet",
    "sol-testnet",
    "sol-devnet",
  ];

  useEffect(() => {
    fetchWebhooks();
  }, [selectedChainId, isActiveFilter]);

  const fetchWebhooks = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const params: any = {};
      if (selectedChainId) params.chain_id = selectedChainId;
      if (isActiveFilter !== null) params.is_active = isActiveFilter;

      const response = await wmsService.getWebhooks(params);
      setWebhooks(response);
    } catch (error: any) {
      if (!silent) {
        toast.error(
          error.response?.data?.message || "Failed to fetch webhooks",
        );
      }
      console.error("Error fetching webhooks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setEditForm({
      addresses_to_add: "",
      addresses_to_remove: "",
      is_active: webhook.is_active,
      deactivation_reason: webhook.deactivation_reason || "",
    });
    setShowEditModal(true);
  };

  const handleViewAddresses = async (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setLoadingAddresses(true);
    setShowAddressesModal(true);
    try {
      const addresses = await wmsService.getWebhookAddresses(
        webhook.webhook_id,
      );
      setWebhookAddresses(addresses);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to fetch webhook addresses",
      );
      setWebhookAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSave = async () => {
    if (!editingWebhook) return;

    setSaving(true);
    try {
      const updates: any = {};

      if (editForm.addresses_to_add.trim()) {
        updates.addresses_to_add = editForm.addresses_to_add
          .split("\n")
          .map((addr) => addr.trim())
          .filter((addr) => addr.length > 0);
      }

      if (editForm.addresses_to_remove.trim()) {
        updates.addresses_to_remove = editForm.addresses_to_remove
          .split("\n")
          .map((addr) => addr.trim())
          .filter((addr) => addr.length > 0);
      }

      if (editForm.is_active !== editingWebhook.is_active) {
        updates.is_active = editForm.is_active;
        if (!editForm.is_active && editForm.deactivation_reason) {
          updates.deactivation_reason = editForm.deactivation_reason;
        }
      }

      await wmsService.updateWebhook(editingWebhook.webhook_id, updates);
      toast.success("Webhook updated successfully");
      setShowEditModal(false);
      fetchWebhooks(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (type: "all" | "webhooks" | "addresses") => {
    setSyncing((prev) => ({ ...prev, [type]: true }));
    try {
      let response;
      switch (type) {
        case "all":
          response = await wmsService.syncAllWebhooks();
          break;
        case "webhooks":
          response = await wmsService.syncWebhooksOnly();
          break;
        case "addresses":
          response = await wmsService.syncWebhookAddressesOnly();
          break;
      }
      toast.success(response.message || "Sync completed successfully");
      setTimeout(() => fetchWebhooks(true), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to sync webhooks");
    } finally {
      setSyncing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  const toggleSigningKey = (webhookId: string) => {
    setShowSigningKey((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(webhookId)) {
        newSet.delete(webhookId);
      } else {
        newSet.add(webhookId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getUsagePercentage = (addressCount: number, maxAddresses: number) => {
    if (maxAddresses === 0) return 0;
    return Math.min(100, (addressCount / maxAddresses) * 100);
  };

  const formatUsagePercentage = (percentage: number) => {
    if (percentage === 0) return "0%";
    if (percentage < 0.01) {
      return percentage.toFixed(4) + "%";
    }
    if (percentage < 1) {
      return percentage.toFixed(2) + "%";
    }
    return percentage.toFixed(1) + "%";
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-400 bg-red-400/10";
    if (percentage >= 75) return "text-yellow-400 bg-yellow-400/10";
    return "text-green-400 bg-green-400/10";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading webhooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Alchemy Webhook Management
          </h2>
          <p className="text-gray-400 mt-1">
            Manage and monitor Alchemy webhooks for blockchain event tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSync("all")}
            disabled={syncing.all}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            {syncing.all ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4" />
                <span>Sync All</span>
              </>
            )}
          </button>
          <button
            onClick={() => fetchWebhooks(false)}
            disabled={refreshing}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <select
              value={selectedChainId || ""}
              onChange={(e) => setSelectedChainId(e.target.value || null)}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Chains</option>
              {allChainIds.map((chainId) => (
                <option key={chainId} value={chainId}>
                  {chainId}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={isActiveFilter === null ? "" : isActiveFilter.toString()}
              onChange={(e) =>
                setIsActiveFilter(
                  e.target.value === "" ? null : e.target.value === "true",
                )
              }
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => handleSync("webhooks")}
              disabled={syncing.webhooks}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2 disabled:opacity-50"
            >
              {syncing.webhooks ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RotateCw className="h-3 w-3" />
                  <span>Sync Webhooks</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleSync("addresses")}
              disabled={syncing.addresses}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-2 disabled:opacity-50"
            >
              {syncing.addresses ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RotateCw className="h-3 w-3" />
                  <span>Sync Addresses</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Webhooks</h3>

        {webhooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No webhooks found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-white font-semibold">
                        {webhook.chain_id}
                      </h4>
                      {webhook.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          webhook.is_active
                            ? "text-green-400 bg-green-400/10"
                            : "text-red-400 bg-red-400/10"
                        }`}
                      >
                        {webhook.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className="text-gray-400 text-xs font-mono truncate max-w-[200px]"
                        title={webhook.webhook_id}
                      >
                        {webhook.webhook_id}
                      </span>
                      <button
                        onClick={() => handleCopyId(webhook.webhook_id)}
                        className="flex-shrink-0 p-1 hover:bg-gray-600 rounded transition-colors"
                        title="Copy Webhook ID"
                      >
                        {copiedId === webhook.webhook_id ? (
                          <Check className="h-3 w-3 text-green-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">{webhook.network}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span className="text-white">{webhook.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Address Count:</span>
                    <span className="text-white font-medium">
                      {webhook.address_count.toLocaleString()} /{" "}
                      {webhook.max_addresses.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(webhook.address_count, webhook.max_addresses)).split(" ")[0]}`}
                      style={{
                        width: `${getUsagePercentage(webhook.address_count, webhook.max_addresses)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Usage:</span>
                    <span
                      className={`text-xs font-medium ${getUsageColor(getUsagePercentage(webhook.address_count, webhook.max_addresses))}`}
                    >
                      {formatUsagePercentage(
                        getUsagePercentage(
                          webhook.address_count,
                          webhook.max_addresses,
                        ),
                      )}
                    </span>
                  </div>
                  {webhook.deactivation_reason && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">
                        Deactivation Reason:
                      </span>
                      <span className="text-red-400 text-xs">
                        {webhook.deactivation_reason}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Signing Key:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-white font-mono text-xs">
                        {showSigningKey.has(webhook.webhook_id)
                          ? webhook.signing_key
                          : "••••••••••••••••"}
                      </span>
                      <button
                        onClick={() => toggleSigningKey(webhook.webhook_id)}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title={
                          showSigningKey.has(webhook.webhook_id)
                            ? "Hide"
                            : "Show"
                        }
                      >
                        {showSigningKey.has(webhook.webhook_id) ? (
                          <EyeOff className="h-3 w-3 text-gray-400" />
                        ) : (
                          <Eye className="h-3 w-3 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white text-xs">
                      {formatDate(webhook.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-600">
                  <button
                    onClick={() => handleViewAddresses(webhook)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
                  >
                    <Eye className="h-3 w-3" />
                    <span>View Addresses</span>
                  </button>
                  <button
                    onClick={() => handleEdit(webhook)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && editingWebhook && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-700/50 bg-gray-800/50">
              <h3 className="text-xl font-bold text-white">Edit Webhook</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Addresses to Add (one per line)
                </label>
                <textarea
                  value={editForm.addresses_to_add}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      addresses_to_add: e.target.value,
                    })
                  }
                  placeholder="0x1234...&#10;0xabcd..."
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-32 resize-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Addresses to Remove (one per line)
                </label>
                <textarea
                  value={editForm.addresses_to_remove}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      addresses_to_remove: e.target.value,
                    })
                  }
                  placeholder="0x1234...&#10;0xabcd..."
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 h-32 resize-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.checked })
                    }
                    className="rounded border-gray-500"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    Active
                  </span>
                </label>
              </div>

              {!editForm.is_active && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Deactivation Reason
                  </label>
                  <input
                    type="text"
                    value={editForm.deactivation_reason}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        deactivation_reason: e.target.value,
                      })
                    }
                    placeholder="Reason for deactivation"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddressesModal && editingWebhook && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddressesModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-700/50 bg-gray-800/50">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Webhook Addresses
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {editingWebhook.webhook_id} - {webhookAddresses.length}{" "}
                  addresses
                </p>
              </div>
              <button
                onClick={() => setShowAddressesModal(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingAddresses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading addresses...</p>
                  </div>
                </div>
              ) : webhookAddresses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No addresses found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          #
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Address
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {webhookAddresses.map((address, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <CopyableText
                              text={address}
                              className="text-white font-mono text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
