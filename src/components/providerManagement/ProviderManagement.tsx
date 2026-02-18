import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Server,
  Gamepad2,
  CheckCircle2,
  XCircle,
  Link2,
  MoreVertical,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  providerService,
  Provider,
  CreateProviderRequest,
  UpdateProviderRequest,
  GetProvidersRequest,
} from "../../services/providerService";
import { ProviderFormModal } from "./ProviderFormModal";

// Mock providers removed - using API only

const emptyForm = {
  name: "",
  code: "",
  description: "",
  api_url: "",
  webhook_url: "",
  is_active: true,
  integration_type: "API",
};

export default function ProviderManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [viewingProvider, setViewingProvider] = useState<Provider | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetProvidersRequest = {
        page: pagination.page,
        "per-page": pagination.perPage,
        ...(searchTerm && { search: searchTerm }),
        ...(isActiveFilter !== undefined && { is_active: isActiveFilter }),
      };
      const response = await providerService.getProviders(params);
      if (response.success && response.data) {
        setProviders(response.data.providers || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data!.total_count,
          totalPages: response.data!.total_pages,
          currentPage: response.data!.current_page,
        }));
      } else {
        const errorMessage = response.message || "Failed to load providers";
        setError(errorMessage);
        setProviders([]);
        toast.error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load providers";
      setError(errorMessage);
      setProviders([]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, searchTerm, isActiveFilter]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const activeCount = providers.filter((p) => p.is_active).length;
  const inactiveCount = providers.length - activeCount;
  const totalGames = providers.reduce((sum, p) => sum + (p.game_count || 0), 0);

  const handleCreateProvider = async (data: CreateProviderRequest) => {
    if (creating || !data.name?.trim() || !data.code?.trim()) {
      if (!data.name?.trim() || !data.code?.trim()) toast.error("Name and Code are required");
      return;
    }
    setCreating(true);
    try {
      const response = await providerService.createProvider(data);
      if (response.success) {
        toast.success("Provider created successfully");
        setShowCreateModal(false);
        loadProviders(); // Reload from API
      } else {
        toast.error(response.message || "Failed to create provider");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create provider");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProvider = async (id: string, data: UpdateProviderRequest) => {
    if (updating) return;
    setUpdating(true);
    try {
      const response = await providerService.updateProvider(id, data);
      if (response.success) {
        toast.success("Provider updated successfully");
        setShowEditModal(false);
        setEditingProvider(null);
        loadProviders(); // Reload from API
      } else {
        toast.error(response.message || "Failed to update provider");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update provider");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (provider: Provider) => {
    if (toggling) return;
    setToggling(provider.id);
    try {
      const response = await providerService.updateProvider(provider.id, {
        id: provider.id,
        is_active: !provider.is_active,
      });
      if (response.success) {
        toast.success(provider.is_active ? "Provider set to inactive" : "Provider set to active");
        loadProviders(); // Reload from API
      } else {
        toast.error(response.message || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteProvider = (provider: Provider) => {
    setProviderToDelete(provider);
    setShowDeleteModal(true);
  };

  const confirmDeleteProvider = async () => {
    if (!providerToDelete || deleting) return;
    setDeleting(true);
    try {
      const response = await providerService.deleteProvider(providerToDelete.id);
      if (response.success) {
        toast.success("Provider deleted successfully");
        loadProviders(); // Reload from API
        setShowDeleteModal(false);
        setProviderToDelete(null);
      } else {
        toast.error(response.message || "Failed to delete provider");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete provider");
    } finally {
      setDeleting(false);
    }
  };

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeDropdown &&
        !(event.target as Element).closest(".dropdown-container")
      ) {
        closeDropdown();
      }
    };

    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [activeDropdown]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <Server className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Provider Management</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Manage game providers, integration settings, and status
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg shadow-red-500/20"
          >
            <Plus className="w-5 h-5" />
            Add Provider
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Providers</p>
                <p className="text-2xl font-bold text-white mt-1">{pagination.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                <Server className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{activeCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-900/30 border border-green-700/30">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Inactive</p>
                <p className="text-2xl font-bold text-slate-400 mt-1">{inactiveCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                <XCircle className="h-6 w-6 text-slate-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Games</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{totalGames.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30">
                <Gamepad2 className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
          </div>
          <select
            value={
              isActiveFilter === undefined ? "all" : isActiveFilter ? "active" : "inactive"
            }
            onChange={(e) => {
              if (e.target.value === "all") setIsActiveFilter(undefined);
              else setIsActiveFilter(e.target.value === "active");
            }}
            className="px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={loadProviders}
            className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/80 border-b border-slate-700/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Loading providers...
                    </td>
                  </tr>
                ) : providers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No providers found
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                            <Server className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{provider.name}</p>
                            {provider.description && (
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                {provider.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono text-sm">
                        {provider.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm">
                        {provider.integration_type || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {(provider.game_count ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(provider)}
                          disabled={toggling === provider.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                            provider.is_active
                              ? "bg-green-900/50 text-green-300 border-green-700/30 hover:bg-green-800/50"
                              : "bg-slate-800 text-slate-400 border-slate-600/50 hover:bg-slate-700/80"
                          } disabled:opacity-50`}
                        >
                          {provider.is_active ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Active</>
                          ) : (
                            <><XCircle className="h-3.5 w-3.5" /> Inactive</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">
                        {new Date(provider.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative dropdown-container flex justify-end">
                          <button
                            onClick={() => toggleDropdown(provider.id)}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdown === provider.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-50 py-1 backdrop-blur-sm">
                              <button
                                onClick={() => {
                                  setViewingProvider(provider);
                                  setShowViewModal(true);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                              >
                                <Eye className="h-4 w-4 mr-3" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProvider(provider);
                                  setShowEditModal(true);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit Provider
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteProvider(provider);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700/80 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Delete Provider
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/80 bg-slate-800/30">
              <p className="text-sm text-slate-400">
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1} to{" "}
                {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{" "}
                {pagination.total} providers
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors text-sm font-medium"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors text-sm font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      {showCreateModal && (
        <ProviderFormModal
          title="Add Provider"
          initial={emptyForm}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateProvider}
          saving={creating}
          submitLabel="Create"
        />
      )}

      {showEditModal && editingProvider && (
        <ProviderFormModal
          title="Edit Provider"
          initial={{
            name: editingProvider.name,
            code: editingProvider.code,
            description: editingProvider.description ?? "",
            api_url: editingProvider.api_url ?? "",
            webhook_url: editingProvider.webhook_url ?? "",
            is_active: editingProvider.is_active,
            integration_type: editingProvider.integration_type ?? "API",
          }}
          onClose={() => {
            setShowEditModal(false);
            setEditingProvider(null);
          }}
          onSave={(data) => handleUpdateProvider(editingProvider.id, { ...data, id: editingProvider.id })}
          saving={updating}
          submitLabel="Update"
        />
      )}

      {showViewModal && viewingProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700/80 flex items-center justify-between sticky top-0 bg-slate-900/95">
              <h2 className="text-xl font-semibold text-white">Provider Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingProvider(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <DetailRow label="Name" value={viewingProvider.name} />
              <DetailRow label="Code" value={viewingProvider.code} />
              <DetailRow label="Description" value={viewingProvider.description || "—"} />
              <DetailRow label="Integration Type" value={viewingProvider.integration_type || "—"} />
              <DetailRow label="API URL" value={viewingProvider.api_url || "—"}>
                {viewingProvider.api_url && <Link2 className="h-4 w-4 text-red-400 ml-1 inline" />}
              </DetailRow>
              <DetailRow label="Webhook URL" value={viewingProvider.webhook_url || "—"} />
              <DetailRow label="Status" value={viewingProvider.is_active ? "Active" : "Inactive"} />
              <DetailRow label="Games" value={String(viewingProvider.game_count ?? 0)} />
              <DetailRow label="Created" value={new Date(viewingProvider.created_at).toLocaleString()} />
              <DetailRow label="Updated" value={new Date(viewingProvider.updated_at).toLocaleString()} />
            </div>
            <div className="p-6 border-t border-slate-700/80 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingProvider(null);
                  setEditingProvider(viewingProvider);
                  setShowEditModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all"
              >
                Edit Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && providerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Delete Provider</h2>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{providerToDelete.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProviderToDelete(null);
                }}
                className="px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProvider}
                disabled={deleting}
                className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm font-medium shrink-0">{label}</span>
      <span className="text-white text-sm text-right break-all flex items-center gap-1">
        {value}
        {children}
      </span>
    </div>
  );
}
