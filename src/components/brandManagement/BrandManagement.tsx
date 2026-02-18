import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Building2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  brandService,
  Brand,
  CreateBrandRequest,
  UpdateBrandRequest,
  GetBrandsRequest,
} from "../../services/brandService";

const BrandManagement: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [viewingBrand, setViewingBrand] = useState<Brand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const [newBrand, setNewBrand] = useState<CreateBrandRequest>({
    name: "",
    code: "",
    domain: "",
    description: "",
    api_url: "",
    webhook_url: "",
    integration_type: "API",
    is_active: true,
  });
  const [showSignatureInput, setShowSignatureInput] = useState(false);
  const [signature, setSignature] = useState("");

  const loadBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetBrandsRequest = {
        page: pagination.page,
        "per-page": pagination.perPage,
        ...(searchTerm && { search: searchTerm }),
        ...(isActiveFilter !== undefined && { is_active: isActiveFilter }),
      };

      const response = await brandService.getBrands(params);

      if (response.success && response.data) {
        setBrands(response.data.brands || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data!.total_count,
          totalPages: response.data!.total_pages,
          currentPage: response.data!.current_page,
          perPage: response.data!.per_page,
        }));
      } else {
        const errorMessage = response.message || "Failed to load brands";
        setError(errorMessage);
        setBrands([]);
        toast.error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load brands";
      setError(errorMessage);
      setBrands([]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, searchTerm, isActiveFilter]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const handleCreateBrand = async () => {
    if (creating) return;

    if (!newBrand.name || !newBrand.code) {
      toast.error("Name and Code are required");
      return;
    }

    setCreating(true);
    try {
      const brandData: CreateBrandRequest = {
        ...newBrand,
        ...(showSignatureInput && signature ? { signature } : {}),
      };
      const response = await brandService.createBrand(brandData);
      if (response.success) {
        toast.success("Brand created successfully");
        setShowCreateModal(false);
        setNewBrand({
          name: "",
          code: "",
          domain: "",
          description: "",
          api_url: "",
          webhook_url: "",
          integration_type: "API",
          is_active: true,
        });
        setShowSignatureInput(false);
        setSignature("");
        await loadBrands();
      } else {
        toast.error(response.message || "Failed to create brand");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create brand");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand || updating) return;

    setUpdating(true);
    try {
      const updateData: UpdateBrandRequest = {
        name: editingBrand.name,
        code: editingBrand.code,
        domain: editingBrand.domain,
        description: editingBrand.description,
        api_url: editingBrand.api_url,
        webhook_url: editingBrand.webhook_url,
        integration_type: editingBrand.integration_type,
        is_active: editingBrand.is_active,
      };

      const response = await brandService.updateBrand(
        editingBrand.id,
        updateData,
      );

      if (response.success) {
        toast.success("Brand updated successfully");
        setShowEditModal(false);
        setEditingBrand(null);
        await loadBrands();
      } else {
        toast.error(response.message || "Failed to update brand");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update brand");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteBrand = (brand: Brand) => {
    setBrandToDelete(brand);
    setShowDeleteModal(true);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete || deleting) return;

    setDeleting(true);
    try {
      const response = await brandService.deleteBrand(brandToDelete.id);
      if (response.success) {
        toast.success("Brand deleted successfully");
        setShowDeleteModal(false);
        setBrandToDelete(null);
        await loadBrands();
      } else {
        toast.error(response.message || "Failed to delete brand");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete brand");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (brand: Brand) => {
    setEditingBrand({ ...brand });
    setShowEditModal(true);
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

  const activeCount = brands.filter((b) => b.is_active).length;
  const inactiveCount = brands.length - activeCount;

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <Building2 className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Brand Management</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Manage brands, domains, and status
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg shadow-red-500/20"
          >
            <Plus className="w-5 h-5" />
            Create Brand
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Brands</p>
                <p className="text-2xl font-bold text-white mt-1">{pagination.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                <Building2 className="h-6 w-6 text-red-500" />
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
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
          </div>
          <select
            value={
              isActiveFilter === undefined
                ? "all"
                : isActiveFilter
                  ? "active"
                  : "inactive"
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
            onClick={loadBrands}
            className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Brands Table */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/80 border-b border-slate-700/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Domain
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
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : brands.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-400"
                    >
                      No brands found
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                        {brand.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {brand.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {brand.domain || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${brand.is_active ? "bg-green-900/50 text-green-300 border border-green-700/30" : "bg-red-900/50 text-red-300 border border-red-700/30"}`}
                        >
                          {brand.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">
                        {new Date(brand.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative dropdown-container flex justify-end">
                          <button
                            onClick={() => toggleDropdown(brand.id)}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdown === brand.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-50 py-1 backdrop-blur-sm">
                              <button
                                onClick={() => {
                                  setViewingBrand(brand);
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
                                  handleEditClick(brand);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit Brand
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteBrand(brand);
                                  closeDropdown();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700/80 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Delete Brand
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-700/80 bg-slate-800/30">
              <div className="text-sm text-slate-400">
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1}{" "}
                to{" "}
                {Math.min(
                  pagination.currentPage * pagination.perPage,
                  pagination.total,
                )}{" "}
                of {pagination.total} brands
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700/80 flex items-center justify-between sticky top-0 bg-slate-900/95">
                <h2 className="text-xl font-semibold text-white">Create Brand</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Code *</label>
                  <input
                    type="text"
                    value={newBrand.code}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newBrand.description || ""}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">API URL</label>
                  <input
                    type="url"
                    value={newBrand.api_url || ""}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, api_url: e.target.value }))}
                    placeholder="https://"
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={newBrand.webhook_url || ""}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="https://"
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Integration Type</label>
                  <select
                    value={newBrand.integration_type || "API"}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, integration_type: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="API">API</option>
                    <option value="Aggregator">Aggregator</option>
                    <option value="Direct">Direct</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-show-signature"
                    checked={showSignatureInput}
                    onChange={(e) => {
                      setShowSignatureInput(e.target.checked);
                      if (!e.target.checked) {
                        setSignature("");
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                  />
                  <label htmlFor="create-show-signature" className="text-sm text-slate-300">Add Signature</label>
                </div>
                {showSignatureInput && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Signature *</label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Enter signature"
                      className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                      required={showSignatureInput}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="create-is_active"
                    checked={newBrand.is_active}
                    onChange={(e) => setNewBrand((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                  />
                  <label htmlFor="create-is_active" className="text-sm text-slate-300">Active</label>
                </div>
              </div>
              <div className="p-6 border-t border-slate-700/80 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowSignatureInput(false);
                    setSignature("");
                  }}
                  className="px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBrand}
                  disabled={creating}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 font-medium transition-all shadow-lg shadow-red-500/20"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingBrand && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700/80 flex items-center justify-between sticky top-0 bg-slate-900/95">
                <h2 className="text-xl font-semibold text-white">Edit Brand</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={editingBrand.name}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Code *</label>
                  <input
                    type="text"
                    value={editingBrand.code}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, code: e.target.value } : null))}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={editingBrand.description || ""}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, description: e.target.value } : null))}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">API URL</label>
                  <input
                    type="url"
                    value={editingBrand.api_url || ""}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, api_url: e.target.value } : null))}
                    placeholder="https://"
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={editingBrand.webhook_url || ""}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, webhook_url: e.target.value } : null))}
                    placeholder="https://"
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Integration Type</label>
                  <select
                    value={editingBrand.integration_type || "API"}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, integration_type: e.target.value } : null))}
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="API">API</option>
                    <option value="Aggregator">Aggregator</option>
                    <option value="Direct">Direct</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is_active"
                    checked={editingBrand.is_active}
                    onChange={(e) => setEditingBrand((prev) => (prev ? { ...prev, is_active: e.target.checked } : null))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                  />
                  <label htmlFor="edit-is_active" className="text-sm text-slate-300">Active</label>
                </div>
              </div>
              <div className="p-6 border-t border-slate-700/80 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBrand}
                  disabled={updating}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 font-medium transition-all shadow-lg shadow-red-500/20"
                >
                  {updating ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && brandToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold text-white mb-4">
                Delete Brand
              </h2>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete{" "}
                <strong className="text-white">{brandToDelete.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBrand}
                  disabled={deleting}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* View Brand Modal */}
      {showViewModal && viewingBrand && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700/80 flex items-center justify-between sticky top-0 bg-slate-900/95">
              <h2 className="text-xl font-semibold text-white">Brand Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingBrand(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Name</span>
                <span className="text-white text-sm text-right">{viewingBrand.name}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Code</span>
                <span className="text-white text-sm font-mono">{viewingBrand.code}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Description</span>
                <span className="text-white text-sm text-right">{viewingBrand.description || "—"}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">API URL</span>
                <span className="text-white text-sm text-right break-all">{viewingBrand.api_url || "—"}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Webhook URL</span>
                <span className="text-white text-sm text-right break-all">{viewingBrand.webhook_url || "—"}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Integration Type</span>
                <span className="text-white text-sm text-right">{viewingBrand.integration_type || "—"}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Status</span>
                <span className={`text-sm font-medium ${viewingBrand.is_active ? "text-green-400" : "text-slate-400"}`}>
                  {viewingBrand.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm font-medium">Created</span>
                <span className="text-white text-sm">{new Date(viewingBrand.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-start gap-4 py-2">
                <span className="text-slate-400 text-sm font-medium">Updated</span>
                <span className="text-white text-sm">{new Date(viewingBrand.updated_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700/80 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingBrand(null);
                  handleEditClick(viewingBrand);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all"
              >
                Edit Brand
              </button>
            </div>
          </div>
      </div>
      )}
    </div>
  );
};

export default BrandManagement;
