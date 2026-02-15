import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Game,
  CreateGameRequest,
  UpdateGameRequest,
  GameFilters,
} from "../../types/gameManagement";
import { gameManagementService } from "../../services/gameManagementService";

const GameManagement: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filters, setFilters] = useState<GameFilters>({
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

  const [newGame, setNewGame] = useState<CreateGameRequest>({
    name: "",
    status: "ACTIVE",
    photo: "",
    enabled: true,
    game_id: "",
    internal_name: "",
    integration_partner: "groove",
    provider: "groove_gaming",
  });

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await gameManagementService.getGames(filters);
      if (response.success) {
        setGames(response.data.games || []);
        setPagination({
          total: response.data.total_count || response.data.total || 0,
          total_pages: response.data.total_pages || 0,
          current_page: response.data.page || 1,
        });
      } else {
        setError("Failed to load games");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load games");
      console.error("Error loading games:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const toggleDropdown = (gameId: string) => {
    setActiveDropdown(activeDropdown === gameId ? null : gameId);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  useEffect(() => {
    loadGames();
  }, [loadGames]);

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

  const handleCreateGame = async () => {
    if (creating) return; // Prevent multiple submissions

    setCreating(true);
    try {
      const response = await gameManagementService.createGame(newGame);
      if (response.success) {
        toast.success("Game created successfully");
        setShowCreateModal(false);
        setNewGame({
          name: "",
          status: "ACTIVE",
          photo: "",
          enabled: true,
          game_id: "",
          internal_name: "",
          integration_partner: "groove",
          provider: "groove_gaming",
        });
        loadGames();
      } else {
        toast.error("Failed to create game");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create game");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateGame = async () => {
    if (!editingGame || updating) return; // Prevent multiple submissions

    setUpdating(true);
    try {
      const updateData: UpdateGameRequest = {
        name: editingGame.name,
        status: editingGame.status,
        photo: editingGame.photo,
        enabled: editingGame.enabled,
        game_id: editingGame.game_id,
        internal_name: editingGame.internal_name,
        integration_partner: editingGame.integration_partner,
        provider: editingGame.provider,
      };

      const response = await gameManagementService.updateGame(
        editingGame.id,
        updateData,
      );
      if (response.success) {
        toast.success("Game updated successfully");
        setShowEditModal(false);
        setEditingGame(null);
        loadGames();
      } else {
        toast.error("Failed to update game");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update game");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    const game = games.find((g) => g.id === id);
    if (game) {
      setGameToDelete(game);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteGame = async () => {
    if (!gameToDelete || deleting) return; // Prevent multiple submissions

    setDeleting(true);
    try {
      const response = await gameManagementService.deleteGame(gameToDelete.id);
      if (response.success) {
        toast.success("Game deleted successfully");
        loadGames();
        setShowDeleteModal(false);
        setGameToDelete(null);
      } else {
        toast.error("Failed to delete game");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete game");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGames.length === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedGames.length} games?`)
    )
      return;

    try {
      const response =
        await gameManagementService.bulkDeleteGames(selectedGames);
      if (response.success) {
        toast.success(`${selectedGames.length} games deleted successfully`);
        setSelectedGames([]);
        loadGames();
      } else {
        toast.error("Failed to delete games");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete games");
    }
  };

  const handleFilterChange = (key: keyof GameFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSelectGame = (id: string) => {
    setSelectedGames((prev) =>
      prev.includes(id)
        ? prev.filter((gameId) => gameId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedGames.length === games.length) {
      setSelectedGames([]);
    } else {
      setSelectedGames(games.map((game) => game.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800";
      case "MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Game Management</h1>
            <p className="text-gray-400">
              Manage casino games and their configurations
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Game</span>
            </button>
            <button
              onClick={loadGames}
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

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={filters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider
              </label>
              <input
                type="text"
                placeholder="Provider name..."
                value={filters.provider || ""}
                onChange={(e) =>
                  handleFilterChange("provider", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enabled
              </label>
              <select
                value={
                  filters.enabled === undefined
                    ? ""
                    : filters.enabled.toString()
                }
                onChange={(e) =>
                  handleFilterChange(
                    "enabled",
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                  )
                }
                className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedGames.length > 0 && (
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-200">
                {selectedGames.length} game
                {selectedGames.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedGames([])}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Games Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading games...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadGames}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No games found</p>
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
                          selectedGames.length === games.length &&
                          games.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Game
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Game ID
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Integration Partner
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Enabled
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Last Played
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {games.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedGames.includes(game.id)}
                          onChange={() => handleSelectGame(game.id)}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {game.photo && (
                            <img
                              src={game.photo}
                              alt={game.name}
                              className="w-10 h-10 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          <div>
                            <div className="text-white font-medium">
                              {game.name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {game.internal_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-mono text-sm">
                          {game.game_id}
                        </div>
                        <div className="text-gray-400 text-xs">
                          ID: {game.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}
                        >
                          {game.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {game.provider}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {game.integration_partner || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            game.enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {game.enabled ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <div className="text-sm">
                          {new Date(game.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(game.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <div className="text-sm">
                          {new Date(game.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(game.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        <div className="text-sm">
                          {new Date(game.updated_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(game.updated_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => toggleDropdown(game.id)}
                            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdown === game.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-50 border border-gray-600">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setViewingGame(game);
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
                                    setEditingGame(game);
                                    setShowEditModal(true);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                                >
                                  <Edit className="h-4 w-4 mr-3" />
                                  Edit Game
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteGame(game.id);
                                    closeDropdown();
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-600 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  Delete Game
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

        {/* Create Game Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Create New Game
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={newGame.name}
                    onChange={(e) =>
                      setNewGame((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newGame.status}
                    onChange={(e) =>
                      setNewGame((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={newGame.photo}
                    onChange={(e) =>
                      setNewGame((prev) => ({ ...prev, photo: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game ID
                  </label>
                  <input
                    type="text"
                    value={newGame.game_id}
                    onChange={(e) =>
                      setNewGame((prev) => ({
                        ...prev,
                        game_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Internal Name
                  </label>
                  <input
                    type="text"
                    value={newGame.internal_name}
                    onChange={(e) =>
                      setNewGame((prev) => ({
                        ...prev,
                        internal_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Integration Partner
                  </label>
                  <input
                    type="text"
                    value={newGame.integration_partner}
                    onChange={(e) =>
                      setNewGame((prev) => ({
                        ...prev,
                        integration_partner: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={newGame.provider}
                    onChange={(e) =>
                      setNewGame((prev) => ({
                        ...prev,
                        provider: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newGame.enabled}
                      onChange={(e) =>
                        setNewGame((prev) => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGame}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {creating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{creating ? "Creating..." : "Create Game"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Game Modal */}
        {showEditModal && editingGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">Edit Game</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={editingGame.name}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev ? { ...prev, name: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editingGame.status}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev
                          ? { ...prev, status: e.target.value as any }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={editingGame.photo}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev ? { ...prev, photo: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game ID
                  </label>
                  <input
                    type="text"
                    value={editingGame.game_id}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev ? { ...prev, game_id: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Internal Name
                  </label>
                  <input
                    type="text"
                    value={editingGame.internal_name}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev
                          ? { ...prev, internal_name: e.target.value }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Integration Partner
                  </label>
                  <input
                    type="text"
                    value={editingGame.integration_partner}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev
                          ? { ...prev, integration_partner: e.target.value }
                          : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={editingGame.provider}
                    onChange={(e) =>
                      setEditingGame((prev) =>
                        prev ? { ...prev, provider: e.target.value } : null,
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingGame.enabled}
                      onChange={(e) =>
                        setEditingGame((prev) =>
                          prev ? { ...prev, enabled: e.target.checked } : null,
                        )
                      }
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Enabled</span>
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
                  onClick={handleUpdateGame}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {updating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{updating ? "Updating..." : "Update Game"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Game Modal */}
        {showViewModal && viewingGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Game Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Name
                    </label>
                    <p className="text-white">{viewingGame.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Status
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingGame.status)}`}
                    >
                      {viewingGame.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Game ID
                    </label>
                    <p className="text-white">{viewingGame.game_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Internal Name
                    </label>
                    <p className="text-white">{viewingGame.internal_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Provider
                    </label>
                    <p className="text-white">{viewingGame.provider}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Integration Partner
                    </label>
                    <p className="text-white">
                      {viewingGame.integration_partner}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Enabled
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewingGame.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {viewingGame.enabled ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Created At
                    </label>
                    <p className="text-white">
                      {new Date(viewingGame.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Updated At
                    </label>
                    <p className="text-white">
                      {new Date(viewingGame.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {viewingGame.photo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Photo
                    </label>
                    <img
                      src={viewingGame.photo}
                      alt={viewingGame.name}
                      className="w-32 h-32 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
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

        {/* Delete Game Modal */}
        {showDeleteModal && gameToDelete && (
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
                    Delete Game
                  </h3>
                  <p className="text-sm text-gray-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300">
                  Are you sure you want to delete the game{" "}
                  <span className="font-semibold text-white">
                    "{gameToDelete.name}"
                  </span>
                  ?
                </p>
                <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Game ID:</span>{" "}
                      {gameToDelete.game_id}
                    </div>
                    <div>
                      <span className="font-medium">Provider:</span>{" "}
                      {gameToDelete.provider}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {gameToDelete.status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setGameToDelete(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteGame}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{deleting ? "Deleting..." : "Delete Game"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameManagement;
