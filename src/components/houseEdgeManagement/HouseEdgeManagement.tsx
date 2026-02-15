import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  HouseEdge,
  CreateHouseEdgeRequest,
  UpdateHouseEdgeRequest,
  HouseEdgeFilters,
  HouseEdgeStats,
  GAME_TYPES,
  GAME_VARIANTS,
} from "../../types/houseEdgeManagement";
import { houseEdgeManagementService } from "../../services/houseEdgeManagementService";
import { Game } from "../../types/gameManagement";
import GameSearchModal from "./GameSearchModal";

const HouseEdgeManagement: React.FC = () => {
  const [houseEdges, setHouseEdges] = useState<HouseEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState<HouseEdgeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedHouseEdges, setSelectedHouseEdges] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGameSearchModal, setShowGameSearchModal] = useState(false);
  const [editingHouseEdge, setEditingHouseEdge] = useState<HouseEdge | null>(
    null,
  );
  const [viewingHouseEdge, setViewingHouseEdge] = useState<HouseEdge | null>(
    null,
  );
  const [houseEdgeToDelete, setHouseEdgeToDelete] = useState<HouseEdge | null>(
    null,
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [filters, setFilters] = useState<HouseEdgeFilters>({
    page: 1,
    per_page: 10,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 0,
    current_page: 1,
  });

  const [newHouseEdge, setNewHouseEdge] = useState<
    Partial<CreateHouseEdgeRequest>
  >({
    game_id: "",
    game_type: undefined,
    game_variant: undefined,
    house_edge: "",
    min_bet: "",
    max_bet: "",
    is_active: true,
    effective_from: "",
    effective_until: "",
  });

  const loadHouseEdges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await houseEdgeManagementService.getHouseEdges(filters);
      if (response.success) {
        setHouseEdges(response.data.house_edges || []);
        setPagination({
          total: response.data.total_count || response.data.total || 0,
          total_pages: response.data.total_pages || 0,
          current_page: response.data.page || 1,
        });
      } else {
        setError("Failed to load house edges");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load house edges");
      console.error("Error loading house edges:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const response = await houseEdgeManagementService.getHouseEdgeStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error("Failed to load statistics:", err);
    }
  }, []);

  const toggleDropdown = (houseEdgeId: string) => {
    setActiveDropdown(activeDropdown === houseEdgeId ? null : houseEdgeId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Convert API date format to datetime-local format
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return "";

      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setNewHouseEdge((prev) => ({ ...prev, game_id: game.game_id }));

    // Also update editing house edge if it exists
    if (editingHouseEdge) {
      setEditingHouseEdge((prev) =>
        prev ? { ...prev, game_id: game.game_id } : null,
      );
    }
  };

  const handleClearGame = () => {
    setSelectedGame(null);
    setNewHouseEdge((prev) => ({ ...prev, game_id: "" }));

    // Also clear editing house edge if it exists
    if (editingHouseEdge) {
      setEditingHouseEdge((prev) => (prev ? { ...prev, game_id: "" } : null));
    }
  };

  useEffect(() => {
    loadHouseEdges();
    loadStats();
  }, [loadHouseEdges, loadStats]);

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown]);

  const handleCreateHouseEdge = async () => {
    if (creating) return; // Prevent multiple submissions

    setCreating(true);
    try {
      // Validate required fields
      if (!newHouseEdge.game_type || !newHouseEdge.game_variant) {
        toast.error("Please select both game type and game variant");
        return;
      }

      // Validate that a game is selected
      if (!selectedGame) {
        toast.error("Please select a game");
        return;
      }

      // Convert datetime-local format to RFC3339 format
      const formatDateTimeForAPI = (dateTimeString: string) => {
        if (!dateTimeString) return "";
        // Add seconds and timezone if not present
        if (dateTimeString.length === 16) {
          // "2025-10-21T21:42" format
          return dateTimeString + ":00Z"; // Add seconds and UTC timezone
        }
        return dateTimeString;
      };

      // Convert house edge percentage to decimal (divide by 100)
      const houseEdgeValue = newHouseEdge.house_edge
        ? parseFloat(newHouseEdge.house_edge) / 100
        : 0;

      const formattedHouseEdge: CreateHouseEdgeRequest = {
        game_id: selectedGame.game_id, // Use game_id (56512456) instead of id (UUID)
        game_type: newHouseEdge.game_type,
        game_variant: newHouseEdge.game_variant,
        house_edge: houseEdgeValue.toString(), // Convert to decimal
        min_bet: newHouseEdge.min_bet || "",
        max_bet: newHouseEdge.max_bet || "",
        is_active: newHouseEdge.is_active ?? true,
        effective_from: newHouseEdge.effective_from
          ? formatDateTimeForAPI(newHouseEdge.effective_from)
          : "",
        effective_until: newHouseEdge.effective_until
          ? formatDateTimeForAPI(newHouseEdge.effective_until)
          : "",
      };

      const response =
        await houseEdgeManagementService.createHouseEdge(formattedHouseEdge);
      if (response.success) {
        toast.success("House edge created successfully");
        setShowCreateModal(false);
        setNewHouseEdge({
          game_id: "",
          game_type: undefined,
          game_variant: undefined,
          house_edge: "",
          min_bet: "",
          max_bet: "",
          is_active: true,
          effective_from: "",
          effective_until: "",
        });
        loadHouseEdges();
      } else {
        toast.error("Failed to create house edge");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create house edge");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateHouseEdge = async () => {
    if (!editingHouseEdge || updating) return; // Prevent multiple submissions

    setUpdating(true);
    try {
      // Convert datetime-local format to RFC3339 format
      const formatDateTimeForAPI = (dateTimeString: string) => {
        if (!dateTimeString) return "";
        // Add seconds and timezone if not present
        if (dateTimeString.length === 16) {
          // "2025-10-21T21:42" format
          return dateTimeString + ":00Z"; // Add seconds and UTC timezone
        }
        return dateTimeString;
      };

      // Convert house edge percentage to decimal (divide by 100)
      const houseEdgeValue = editingHouseEdge.house_edge
        ? parseFloat(editingHouseEdge.house_edge) / 100
        : 0;

      const updateData: UpdateHouseEdgeRequest = {
        game_type: editingHouseEdge.game_type,
        game_variant: editingHouseEdge.game_variant,
        house_edge: houseEdgeValue.toString(), // Convert to decimal
        min_bet: editingHouseEdge.min_bet,
        max_bet: editingHouseEdge.max_bet,
        is_active: editingHouseEdge.is_active,
        effective_from: formatDateTimeForAPI(editingHouseEdge.effective_from),
        effective_until: formatDateTimeForAPI(editingHouseEdge.effective_until),
      };

      const response = await houseEdgeManagementService.updateHouseEdge(
        editingHouseEdge.id,
        updateData,
      );
      if (response.success) {
        toast.success("House edge updated successfully");
        setShowEditModal(false);
        setEditingHouseEdge(null);
        loadHouseEdges();
      } else {
        toast.error("Failed to update house edge");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update house edge");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteHouseEdge = async (id: string) => {
    const houseEdge = houseEdges.find((he) => he.id === id);
    if (houseEdge) {
      // Format house edge for display (convert from decimal to percentage)
      const formattedHouseEdge = {
        ...houseEdge,
        house_edge_percent: houseEdge.house_edge
          ? `${(parseFloat(houseEdge.house_edge) * 100).toFixed(2)}%`
          : "0%",
      };
      setHouseEdgeToDelete(formattedHouseEdge);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteHouseEdge = async () => {
    if (!houseEdgeToDelete || deleting) return; // Prevent multiple submissions

    setDeleting(true);
    try {
      const response = await houseEdgeManagementService.deleteHouseEdge(
        houseEdgeToDelete.id,
      );
      if (response.success) {
        toast.success("House edge deleted successfully");
        loadHouseEdges();
        loadStats();
        setShowDeleteModal(false);
        setHouseEdgeToDelete(null);
      } else {
        toast.error("Failed to delete house edge");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete house edge");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedHouseEdges.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedHouseEdges.length} house edge configurations?`,
      )
    )
      return;

    try {
      const response =
        await houseEdgeManagementService.bulkDeleteHouseEdges(
          selectedHouseEdges,
        );
      if (response.success) {
        toast.success(
          `${selectedHouseEdges.length} house edge configurations deleted successfully`,
        );
        setSelectedHouseEdges([]);
        loadHouseEdges();
      } else {
        toast.error("Failed to delete house edge configurations");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete house edge configurations");
    }
  };

  const handleFilterChange = (key: keyof HouseEdgeFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSelectHouseEdge = (id: string) => {
    setSelectedHouseEdges((prev) =>
      prev.includes(id)
        ? prev.filter((houseEdgeId) => houseEdgeId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedHouseEdges.length === houseEdges.length) {
      setSelectedHouseEdges([]);
    } else {
      setSelectedHouseEdges(houseEdges.map((houseEdge) => houseEdge.id));
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              House Edge Management
            </h1>
            <p className="text-gray-400">
              Manage house edge configurations for different game types
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add House Edge</span>
            </button>
            <button
              onClick={() => {
                loadHouseEdges();
                loadStats();
              }}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total House Edges
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.total_house_edges}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.active_house_edges}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Inactive</p>
                  <p className="text-2xl font-bold text-red-400">
                    {stats.inactive_house_edges}
                  </p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Game Types
                  </p>
                  <p className="text-2xl font-bold text-purple-400">
                    {stats.unique_game_types}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-purple-600 rounded"></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Game Variants
                  </p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stats.unique_game_variants}
                  </p>
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          {/* Search Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search by Name
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by game name..."
                  value={filters.search || ""}
                  onChange={(e) =>
                    handleFilterChange("search", e.target.value || undefined)
                  }
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => handleFilterChange("search", undefined)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Filter Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Type
              </label>
              <select
                value={filters.game_type || ""}
                onChange={(e) =>
                  handleFilterChange("game_type", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Game Types</option>
                {GAME_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Variant
              </label>
              <select
                value={filters.game_variant || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "game_variant",
                    e.target.value || undefined,
                  )
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Game Variants</option>
                {GAME_VARIANTS.map((variant) => (
                  <option key={variant.value} value={variant.value}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Active Status
              </label>
              <select
                value={
                  filters.is_active === undefined
                    ? ""
                    : filters.is_active.toString()
                }
                onChange={(e) =>
                  handleFilterChange(
                    "is_active",
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                  )
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={filters.sort_by || "created_at"}
                onChange={(e) => handleFilterChange("sort_by", e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created Date</option>
                <option value="updated_at">Updated Date</option>
                <option value="game_type">Game Type</option>
                <option value="house_edge">House Edge</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedHouseEdges.length > 0 && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-200">
                {selectedHouseEdges.length} house edge
                {selectedHouseEdges.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedHouseEdges([])}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* House Edges Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading house edges...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadHouseEdges}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          ) : houseEdges.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">
                No house edge configurations found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedHouseEdges.length === houseEdges.length &&
                          houseEdges.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Game
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Variant
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      House Edge
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Bet Range
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Effective Period
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {houseEdges.map((houseEdge) => (
                    <tr key={houseEdge.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedHouseEdges.includes(houseEdge.id)}
                          onChange={() => handleSelectHouseEdge(houseEdge.id)}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">
                          {houseEdge.game_name || houseEdge.game_id || "N/A"}
                        </div>
                        {houseEdge.game_id && (
                          <div className="text-xs text-gray-400">
                            ID: {houseEdge.game_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium capitalize">
                          {houseEdge.game_type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 capitalize">
                        {houseEdge.game_variant}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {houseEdge.house_edge_percent ||
                          `${(parseFloat(houseEdge.house_edge) * 100).toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        ${parseFloat(houseEdge.min_bet).toFixed(2)} - $
                        {parseFloat(houseEdge.max_bet).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(houseEdge.is_active)}`}
                        >
                          {houseEdge.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <div className="text-sm">
                          {houseEdge.effective_from ? (
                            <div>
                              From: {formatDate(houseEdge.effective_from)}
                            </div>
                          ) : (
                            <div className="text-gray-500">No start date</div>
                          )}
                          {houseEdge.effective_until ? (
                            <div>
                              Until: {formatDate(houseEdge.effective_until)}
                            </div>
                          ) : (
                            <div className="text-gray-500">No end date</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => toggleDropdown(houseEdge.id)}
                            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdown === houseEdge.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-50 border border-gray-600">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    // Format house edge for display (convert from decimal to percentage)
                                    const formattedHouseEdge = {
                                      ...houseEdge,
                                      house_edge_percent: houseEdge.house_edge
                                        ? `${(parseFloat(houseEdge.house_edge) * 100).toFixed(2)}%`
                                        : "0%",
                                    };
                                    setViewingHouseEdge(formattedHouseEdge);
                                    setShowViewModal(true);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                                >
                                  <Eye className="h-4 w-4 mr-3" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    // Format dates for datetime-local inputs
                                    const formattedHouseEdge = {
                                      ...houseEdge,
                                      effective_from: formatDateForInput(
                                        houseEdge.effective_from,
                                      ),
                                      effective_until: formatDateForInput(
                                        houseEdge.effective_until,
                                      ),
                                      // Convert house edge from decimal to percentage for display
                                      house_edge: houseEdge.house_edge
                                        ? (
                                            parseFloat(houseEdge.house_edge) *
                                            100
                                          ).toString()
                                        : "",
                                    };
                                    setEditingHouseEdge(formattedHouseEdge);
                                    setShowEditModal(true);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                                >
                                  <Edit className="h-4 w-4 mr-3" />
                                  Edit House Edge
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteHouseEdge(houseEdge.id);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-600 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  Delete House Edge
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-gray-400">
              Showing{" "}
              {((pagination.current_page || 1) - 1) * (filters.per_page || 10) +
                1}{" "}
              to{" "}
              {Math.min(
                (pagination.current_page || 1) * (filters.per_page || 10),
                pagination.total || 0,
              )}{" "}
              of {pagination.total || 0} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  handlePageChange((pagination.current_page || 1) - 1)
                }
                disabled={(pagination.current_page || 1) === 1}
                className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 bg-blue-600 text-white rounded">
                {pagination.current_page || 1} of {pagination.total_pages || 1}
              </span>
              <button
                onClick={() =>
                  handlePageChange((pagination.current_page || 1) + 1)
                }
                disabled={
                  (pagination.current_page || 1) ===
                  (pagination.total_pages || 1)
                }
                className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Create House Edge Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Create New House Edge
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      {selectedGame ? (
                        <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">
                                {selectedGame.name}
                              </div>
                              <div className="text-sm text-gray-400">
                                ID: {selectedGame.game_id} | Provider:{" "}
                                {selectedGame.provider}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleClearGame}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                          No game selected
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGameSearchModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {selectedGame ? "Change Game" : "Select Game"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Type
                  </label>
                  <select
                    value={newHouseEdge.game_type || ""}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        game_type: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Game Type</option>
                    {GAME_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Variant
                  </label>
                  <select
                    value={newHouseEdge.game_variant || ""}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        game_variant: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Game Variant</option>
                    {GAME_VARIANTS.map((variant) => (
                      <option key={variant.value} value={variant.value}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    House Edge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 5.00"
                    value={newHouseEdge.house_edge}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        house_edge: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Bet ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1.00"
                    value={newHouseEdge.min_bet}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        min_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Bet ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1000.00"
                    value={newHouseEdge.max_bet}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        max_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Effective From (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newHouseEdge.effective_from || ""}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        effective_from: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Effective Until (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newHouseEdge.effective_until || ""}
                    onChange={(e) =>
                      setNewHouseEdge((prev) => ({
                        ...prev,
                        effective_until: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newHouseEdge.is_active}
                      onChange={(e) =>
                        setNewHouseEdge((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedGame(null);
                    setNewHouseEdge({
                      game_id: "",
                      game_type: undefined,
                      game_variant: undefined,
                      house_edge: "",
                      min_bet: "",
                      max_bet: "",
                      is_active: true,
                      effective_from: "",
                      effective_until: "",
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHouseEdge}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {creating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{creating ? "Creating..." : "Create House Edge"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit House Edge Modal */}
        {showEditModal && editingHouseEdge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Edit House Edge
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      {editingHouseEdge.game_id ? (
                        <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">
                                Game ID: {editingHouseEdge.game_id}
                              </div>
                              <div className="text-sm text-gray-400">
                                {editingHouseEdge.game_type} -{" "}
                                {editingHouseEdge.game_variant}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingHouseEdge((prev) =>
                                  prev ? { ...prev, game_id: "" } : null,
                                )
                              }
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                          No game selected
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGameSearchModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingHouseEdge.game_id ? "Change Game" : "Select Game"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Type
                  </label>
                  <select
                    value={editingHouseEdge.game_type}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev
                          ? { ...prev, game_type: e.target.value as any }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Game Type</option>
                    {GAME_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Variant
                  </label>
                  <select
                    value={editingHouseEdge.game_variant}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev
                          ? { ...prev, game_variant: e.target.value as any }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Game Variant</option>
                    {GAME_VARIANTS.map((variant) => (
                      <option key={variant.value} value={variant.value}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    House Edge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingHouseEdge.house_edge}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev ? { ...prev, house_edge: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Bet ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingHouseEdge.min_bet}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev ? { ...prev, min_bet: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Bet ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingHouseEdge.max_bet}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev ? { ...prev, max_bet: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Effective From
                  </label>
                  <input
                    type="datetime-local"
                    value={editingHouseEdge.effective_from || ""}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev
                          ? { ...prev, effective_from: e.target.value }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Effective Until
                  </label>
                  <input
                    type="datetime-local"
                    value={editingHouseEdge.effective_until || ""}
                    onChange={(e) =>
                      setEditingHouseEdge((prev) =>
                        prev
                          ? { ...prev, effective_until: e.target.value }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingHouseEdge.is_active}
                      onChange={(e) =>
                        setEditingHouseEdge((prev) =>
                          prev
                            ? { ...prev, is_active: e.target.checked }
                            : null,
                        )
                      }
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHouseEdge}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {updating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{updating ? "Updating..." : "Update House Edge"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View House Edge Modal */}
        {showViewModal && viewingHouseEdge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                House Edge Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Game Type
                    </label>
                    <p className="text-white capitalize">
                      {viewingHouseEdge.game_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Game Variant
                    </label>
                    <p className="text-white capitalize">
                      {viewingHouseEdge.game_variant}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      House Edge
                    </label>
                    <p className="text-white">
                      {(parseFloat(viewingHouseEdge.house_edge) * 100).toFixed(
                        2,
                      )}
                      %
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Bet Range
                    </label>
                    <p className="text-white">
                      ${parseFloat(viewingHouseEdge.min_bet).toFixed(2)} - $
                      {parseFloat(viewingHouseEdge.max_bet).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Status
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingHouseEdge.is_active)}`}
                    >
                      {viewingHouseEdge.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Created At
                    </label>
                    <p className="text-white">
                      {formatDateTime(viewingHouseEdge.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Effective From
                    </label>
                    <p className="text-white">
                      {viewingHouseEdge.effective_from
                        ? formatDateTime(viewingHouseEdge.effective_from)
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Effective Until
                    </label>
                    <p className="text-white">
                      {viewingHouseEdge.effective_until
                        ? formatDateTime(viewingHouseEdge.effective_until)
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Search Modal */}
        <GameSearchModal
          isOpen={showGameSearchModal}
          onClose={() => setShowGameSearchModal(false)}
          onSelectGame={handleGameSelect}
          selectedGameId={selectedGame?.id}
        />

        {/* Delete House Edge Modal */}
        {showDeleteModal && houseEdgeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">
                    Delete House Edge
                  </h3>
                  <p className="text-sm text-gray-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300">
                  Are you sure you want to delete the house edge configuration
                  for{" "}
                  <span className="font-semibold text-white">
                    "
                    {houseEdgeToDelete.game_name ||
                      houseEdgeToDelete.game_id ||
                      "Unknown Game"}
                    "
                  </span>
                  ?
                </p>
                <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Game Type:</span>{" "}
                      {houseEdgeToDelete.game_type}
                    </div>
                    <div>
                      <span className="font-medium">Game Variant:</span>{" "}
                      {houseEdgeToDelete.game_variant}
                    </div>
                    <div>
                      <span className="font-medium">House Edge:</span>{" "}
                      {houseEdgeToDelete.house_edge_percent ||
                        `${(parseFloat(houseEdgeToDelete.house_edge) * 100).toFixed(2)}%`}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {houseEdgeToDelete.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setHouseEdgeToDelete(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteHouseEdge}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{deleting ? "Deleting..." : "Delete House Edge"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseEdgeManagement;
