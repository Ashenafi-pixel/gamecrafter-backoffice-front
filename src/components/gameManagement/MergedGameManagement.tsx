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
  Settings,
  TrendingUp,
  X,
  Download,
  Gamepad2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Game,
  CreateGameRequest,
  UpdateGameRequest,
  GameFilters,
} from "../../types/gameManagement";
import {
  HouseEdge,
  CreateHouseEdgeRequest,
  UpdateHouseEdgeRequest,
  HouseEdgeFilters,
  HouseEdgeStats,
  GAME_TYPES,
  GAME_VARIANTS,
} from "../../types/houseEdgeManagement";
import { gameManagementService } from "../../services/gameManagementService";
import { houseEdgeManagementService } from "../../services/houseEdgeManagementService";
import { brandService, Brand } from "../../services/brandService";
import { providerService, Provider } from "../../services/providerService";
import GameSearchModal from "../houseEdgeManagement/GameSearchModal";
import BulkGameSearchModal from "../houseEdgeManagement/BulkGameSearchModal";
import GameImportManagement from "./GameImportManagement";

type TabType = "games" | "house-edges" | "game-import";

// Demo helpers were previously used to generate static mock data.
// Games and house edges are now loaded from the backend services.
function getMockHouseEdges(mockGames: Game[]): HouseEdge[] {
  const now = new Date().toISOString();
  const types = ["slot", "table", "live"] as const;
  const variants = ["classic", "v1", "real"] as const;
  const games = mockGames.slice(0, 14);
  return games.flatMap((g, i) => {
    const gameType = types[i % 3];
    const gameVariant = variants[i % 3];
    const houseEdge = (2 + (i % 3) * 0.5).toFixed(2);
    const id = `mock-he-${g.id}-${gameType}-${gameVariant}`;
    return {
      id,
      game_id: g.game_id,
      game_name: g.name,
      game_type: gameType,
      game_variant: gameVariant,
      house_edge: (parseFloat(houseEdge) / 100).toFixed(4),
      min_bet: "0.10",
      max_bet: i % 2 === 0 ? "500" : "1000",
      is_active: i % 5 !== 2,
      effective_from: now,
      effective_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now,
    };
  });
}

const MergedGameManagement: React.FC = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>("games");

  // Games state (backed by API, with a cached list for selectors/modals)
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesCreating, setGamesCreating] = useState(false);
  const [gamesUpdating, setGamesUpdating] = useState(false);
  const [gamesDeleting, setGamesDeleting] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [showCreateGameModal, setShowCreateGameModal] = useState(false);
  const [showEditGameModal, setShowEditGameModal] = useState(false);
  const [showViewGameModal, setShowViewGameModal] = useState(false);
  const [showDeleteGameModal, setShowDeleteGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string>("");
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [gamesFilters, setGamesFilters] = useState<GameFilters>({
    page: 1,
    per_page: 10,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [gamesPagination, setGamesPagination] = useState({
    total: 0,
    total_pages: 0,
    current_page: 1,
  });

  // House Edges state (now starts empty; can be wired to backend service)
  const [allHouseEdges, setAllHouseEdges] = useState<HouseEdge[]>([]);
  const [houseEdges, setHouseEdges] = useState<HouseEdge[]>([]);
  const [houseEdgesLoading, setHouseEdgesLoading] = useState(false);
  const [houseEdgesCreating, setHouseEdgesCreating] = useState(false);
  const [houseEdgesUpdating, setHouseEdgesUpdating] = useState(false);
  const [houseEdgesDeleting, setHouseEdgesDeleting] = useState(false);
  const [selectedHouseEdges, setSelectedHouseEdges] = useState<string[]>([]);
  const [showCreateHouseEdgeModal, setShowCreateHouseEdgeModal] =
    useState(false);
  const [showBulkCreateHouseEdgeModal, setShowBulkCreateHouseEdgeModal] =
    useState(false);
  const [showApplyAllHouseEdgeModal, setShowApplyAllHouseEdgeModal] =
    useState(false);
  const [showRemoveAllHouseEdgeModal, setShowRemoveAllHouseEdgeModal] =
    useState(false);
  const [showEditHouseEdgeModal, setShowEditHouseEdgeModal] = useState(false);
  const [showViewHouseEdgeModal, setShowViewHouseEdgeModal] = useState(false);
  const [showDeleteHouseEdgeModal, setShowDeleteHouseEdgeModal] =
    useState(false);
  const [showGameSearchModal, setShowGameSearchModal] = useState(false);
  const [showBulkGameSearchModal, setShowBulkGameSearchModal] = useState(false);
  const [editingHouseEdge, setEditingHouseEdge] = useState<HouseEdge | null>(
    null,
  );
  const [viewingHouseEdge, setViewingHouseEdge] = useState<HouseEdge | null>(
    null,
  );
  const [houseEdgeToDelete, setHouseEdgeToDelete] = useState<HouseEdge | null>(
    null,
  );
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedGamesForBulk, setSelectedGamesForBulk] = useState<Game[]>([]);
  const [houseEdgesFilters, setHouseEdgesFilters] = useState<HouseEdgeFilters>({
    page: 1,
    per_page: 10,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [houseEdgesPagination, setHouseEdgesPagination] = useState({
    total: 0,
    total_pages: 0,
    current_page: 1,
  });
  const [stats, setStats] = useState<HouseEdgeStats | null>(null);

  // Common state
  const [error, setError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Brand selection state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // Provider selection state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const [editProviderSearch, setEditProviderSearch] = useState("");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showEditProviderDropdown, setShowEditProviderDropdown] = useState(false);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-900/50 text-green-300 border border-green-700/30";
      case "INACTIVE":
        return "bg-red-900/50 text-red-300 border border-red-700/30";
      case "MAINTENANCE":
        return "bg-yellow-900/50 text-yellow-300 border border-yellow-700/30";
      default:
        return "bg-slate-800 text-slate-300 border border-slate-600/50";
    }
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleDropdown = (id: string) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const formatDateTimeForAPI = (dateTimeString: string) => {
    if (!dateTimeString) return "";
    // Add seconds and timezone if not present
    if (dateTimeString.length === 16) {
      // "2025-10-21T21:42" format
      return dateTimeString + ":00Z"; // Add seconds and UTC timezone
    }
    return dateTimeString;
  };

  // Games form state
  const [newGame, setNewGame] = useState<CreateGameRequest>({
    name: "",
    status: "ACTIVE",
    photo: "",
    enabled: true,
    game_id: "",
    internal_name: "",
    integration_partner: "groove",
    provider_id: "",
  });

  // House Edges form state
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

  // Bulk create house edge state
  const [bulkHouseEdge, setBulkHouseEdge] = useState({
    game_type: "",
    game_variant: "",
    house_edge: "",
    min_bet: "",
    max_bet: "",
    is_active: true,
    effective_from: "",
    effective_until: "",
  });

  // Apply/Remove all house edge state
  const [applyAllHouseEdge, setApplyAllHouseEdge] = useState({
    game_type: "",
    game_variant: "",
    house_edge: "",
    min_bet: "",
    max_bet: "",
    is_active: true,
    effective_from: "",
    effective_until: "",
  });

  const [applyAllLoading, setApplyAllLoading] = useState(false);
  const [removeAllLoading, setRemoveAllLoading] = useState(false);

  // Load games from backend (filters & pagination handled by API)
  const loadGames = useCallback(async () => {
    setGamesLoading(true);
    setError(null);
    try {
      const response = await gameManagementService.getGames(gamesFilters);
      if (response.success && response.data) {
        const payload = response.data;
        const list = payload.games || [];
        setGames(list);
        setAllGames(list);
        setGamesPagination({
          total: payload.total_count ?? payload.total ?? list.length,
          total_pages: payload.total_pages ?? 1,
          current_page: payload.page ?? gamesFilters.page ?? 1,
        });
      } else {
        setError(response.message || "Failed to load games");
        toast.error(response.message || "Failed to load games");
        setGames([]);
      }
    } catch (err: any) {
      console.error("Error loading games:", err);
      const msg = err.message || "Failed to load games";
      setError(msg);
      toast.error(msg);
      setGames([]);
    } finally {
      setGamesLoading(false);
    }
  }, [gamesFilters]);

  // Load house edges (demo: filter and paginate from allHouseEdges, no API)
  const loadHouseEdges = useCallback(() => {
    setHouseEdgesLoading(true);
    setError(null);
    const f = houseEdgesFilters;
    let list = [...allHouseEdges];
    if (f.search) {
      const q = f.search.toLowerCase();
      list = list.filter(
        (h) =>
          (h.game_name && h.game_name.toLowerCase().includes(q)) ||
          (h.game_id && h.game_id.toLowerCase().includes(q)),
      );
    }
    if (f.game_type) list = list.filter((h) => h.game_type === f.game_type);
    if (f.game_variant)
      list = list.filter((h) => h.game_variant === f.game_variant);
    if (f.is_active !== undefined)
      list = list.filter((h) => h.is_active === f.is_active);
    const total = list.length;
    const perPage = f.per_page || 10;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(1, f.page || 1), totalPages);
    const start = (page - 1) * perPage;
    setHouseEdges(list.slice(start, start + perPage));
    setHouseEdgesPagination({
      total,
      total_pages: totalPages,
      current_page: page,
    });
    setHouseEdgesLoading(false);
  }, [allHouseEdges, houseEdgesFilters]);

  // Load house edge stats (demo: derive from allHouseEdges, no API)
  const loadStats = useCallback(() => {
    const types = new Set(allHouseEdges.map((h) => h.game_type));
    const variants = new Set(allHouseEdges.map((h) => h.game_variant));
    setStats({
      total_house_edges: allHouseEdges.length,
      active_house_edges: allHouseEdges.filter((h) => h.is_active).length,
      inactive_house_edges: allHouseEdges.filter((h) => !h.is_active).length,
      unique_game_types: types.size,
      unique_game_variants: variants.size,
    });
  }, [allHouseEdges]);

  const fetchBrands = useCallback(async () => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({
        page: 1,
        "per-page": 100,
      });
      if (response.success && response.data) {
        const brandsList = response.data.brands || [];
        setBrands(brandsList);

        const storedBrandId = localStorage.getItem("game_management_brand_id");
        if (
          storedBrandId &&
          brandsList.some((b: Brand) => b.id === storedBrandId)
        ) {
          setSelectedBrandId(storedBrandId);
        } else if (brandsList.length > 0) {
          const randomIndex = Math.floor(Math.random() * brandsList.length);
          const randomBrand = brandsList[randomIndex];
          setSelectedBrandId(randomBrand.id);
          localStorage.setItem("game_management_brand_id", randomBrand.id);
        }
      }
    } catch (err: any) {
      console.error("Error fetching brands:", err);
      toast.error("Failed to fetch brands");
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      setLoadingProviders(true);
      const response = await providerService.getProviders({
        page: 1,
        "per-page": 500,
        is_active: true, // Only fetch active providers
      });
      if (response.success && response.data) {
        setProviders(response.data.providers || []);
      }
    } catch (err: any) {
      console.error("Error fetching providers:", err);
      toast.error("Failed to fetch providers");
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    localStorage.setItem("game_management_brand_id", brandId);
  };

  useEffect(() => {
    fetchBrands();
    fetchProviders();
  }, [fetchBrands, fetchProviders]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "games") {
      loadGames();
    } else if (activeTab === "house-edges") {
      loadHouseEdges();
      loadStats();
    }
  }, [activeTab, loadGames, loadHouseEdges, loadStats]);

  // Games handlers (now using backend API)
  const handleCreateGame = async () => {
    if (gamesCreating) return;
    setGamesCreating(true);
    try {
      const response = await gameManagementService.createGame(newGame);
      if (response.success) {
        toast.success("Game created successfully");
        setShowCreateGameModal(false);
        setNewGame({
          name: "",
          status: "ACTIVE",
          photo: "",
          enabled: true,
          game_id: "",
          internal_name: "",
          integration_partner: "groove",
          provider_id: "",
        });
        await loadGames();
      } else {
        toast.error(response.message || "Failed to create game");
      }
    } catch (err: any) {
      console.error("Error creating game:", err);
      toast.error(err.message || "Failed to create game");
    } finally {
      setGamesCreating(false);
    }
  };

  const handleUpdateGame = async () => {
    if (!editingGame || gamesUpdating) return;
    setGamesUpdating(true);
    try {
      const updateData: UpdateGameRequest = {
        name: editingGame.name,
        status: editingGame.status,
        photo: editingGame.photo,
        enabled: editingGame.enabled,
        game_id: editingGame.game_id,
        internal_name: editingGame.internal_name,
        integration_partner: editingGame.integration_partner,
        provider_id: editingProviderId,
      };
      const response = await gameManagementService.updateGame(
        editingGame.id,
        updateData,
      );
      if (response.success) {
        toast.success("Game updated successfully");
        setShowEditGameModal(false);
        setEditingGame(null);
        setEditingProviderId("");
        await loadGames();
      } else {
        toast.error(response.message || "Failed to update game");
      }
    } catch (err: any) {
      console.error("Error updating game:", err);
      toast.error(err.message || "Failed to update game");
    } finally {
      setGamesUpdating(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!gameToDelete || gamesDeleting) return;
    setGamesDeleting(true);
    try {
      const response = await gameManagementService.deleteGame(gameToDelete.id);
      if (response.success) {
        toast.success("Game deleted successfully");
        setShowDeleteGameModal(false);
        setGameToDelete(null);
        await loadGames();
      } else {
        toast.error(response.message || "Failed to delete game");
      }
    } catch (err: any) {
      console.error("Error deleting game:", err);
      toast.error(err.message || "Failed to delete game");
    } finally {
      setGamesDeleting(false);
    }
  };

  const handleGamesPageChange = (page: number) => {
    if (page < 1 || page > gamesPagination.total_pages) return;
    setGamesFilters((prev) => ({ ...prev, page }));
  };

  const handleHouseEdgesPageChange = (page: number) => {
    if (page < 1 || page > houseEdgesPagination.total_pages) return;
    setHouseEdgesFilters((prev) => ({ ...prev, page }));
  };

  // Filter handlers
  const handleGamesFilterChange = (key: keyof GameFilters, value: any) => {
    setGamesFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleHouseEdgesFilterChange = (
    key: keyof HouseEdgeFilters,
    value: any,
  ) => {
    setHouseEdgesFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // House Edge Management Handlers (demo: update allHouseEdges only, no API)
  const handleCreateHouseEdge = () => {
    if (!selectedGame || houseEdgesCreating) return;
    setHouseEdgesCreating(true);
    const now = new Date().toISOString();
    const heVal = parseFloat(newHouseEdge.house_edge!);
    const houseEdgeDecimal =
      heVal > 1 ? (heVal / 100).toFixed(4) : newHouseEdge.house_edge!;
    const he: HouseEdge = {
      id: `mock-he-${Date.now()}`,
      game_id: selectedGame.game_id,
      game_name: selectedGame.name,
      game_type: newHouseEdge.game_type!,
      game_variant: newHouseEdge.game_variant!,
      house_edge: houseEdgeDecimal,
      min_bet: newHouseEdge.min_bet!,
      max_bet: newHouseEdge.max_bet!,
      is_active: newHouseEdge.is_active ?? true,
      effective_from: newHouseEdge.effective_from || now,
      effective_until: newHouseEdge.effective_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now,
    };
    setAllHouseEdges((prev) => [...prev, he]);
    toast.success("House edge created successfully");
    setShowCreateHouseEdgeModal(false);
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
    setHouseEdgesCreating(false);
  };

  const handleBulkCreateHouseEdges = () => {
    if (houseEdgesCreating) return;
    if (selectedGamesForBulk.length === 0) {
      toast.error("Please select at least one game");
      return;
    }
    if (!bulkHouseEdge.game_type || !bulkHouseEdge.house_edge || !bulkHouseEdge.min_bet) {
      toast.error("Game type, house edge and min bet are required");
      return;
    }
    setHouseEdgesCreating(true);
    const now = new Date().toISOString();
    const until = bulkHouseEdge.effective_until
      ? formatDateTimeForAPI(bulkHouseEdge.effective_until)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const from = bulkHouseEdge.effective_from
      ? formatDateTimeForAPI(bulkHouseEdge.effective_from)
      : now;
    const heValBulk = parseFloat(bulkHouseEdge.house_edge);
    const heDecimalBulk =
      heValBulk > 1 ? (heValBulk / 100).toFixed(4) : bulkHouseEdge.house_edge;
    const newEdges: HouseEdge[] = selectedGamesForBulk.map((game, i) => ({
      id: `mock-he-bulk-${Date.now()}-${i}`,
      game_id: game.game_id || game.id,
      game_name: game.name,
      game_type: bulkHouseEdge.game_type as HouseEdge["game_type"],
      game_variant: (bulkHouseEdge.game_variant || "classic") as HouseEdge["game_variant"],
      house_edge: heDecimalBulk,
      min_bet: bulkHouseEdge.min_bet,
      max_bet: bulkHouseEdge.max_bet || "1000",
      is_active: bulkHouseEdge.is_active,
      effective_from: from,
      effective_until: until,
      created_at: now,
      updated_at: now,
    }));
    setAllHouseEdges((prev) => [...prev, ...newEdges]);
    toast.success(`${newEdges.length} house edge(s) created successfully`);
    setShowBulkCreateHouseEdgeModal(false);
    setSelectedGamesForBulk([]);
    setBulkHouseEdge({
      game_type: "",
      game_variant: "",
      house_edge: "",
      min_bet: "",
      max_bet: "",
      is_active: true,
      effective_from: "",
      effective_until: "",
    });
    setHouseEdgesCreating(false);
  };

  const handleUpdateHouseEdge = () => {
    if (!editingHouseEdge || houseEdgesUpdating) return;
    setHouseEdgesUpdating(true);
    const heVal = parseFloat(editingHouseEdge.house_edge);
    const houseEdgeDecimal =
      heVal > 1 ? (heVal / 100).toFixed(4) : editingHouseEdge.house_edge;
    const updated: HouseEdge = {
      ...editingHouseEdge,
      house_edge: houseEdgeDecimal,
      updated_at: new Date().toISOString(),
    };
    setAllHouseEdges((prev) =>
      prev.map((h) => (h.id === editingHouseEdge.id ? updated : h)),
    );
    toast.success("House edge updated successfully");
    setShowEditHouseEdgeModal(false);
    setEditingHouseEdge(null);
    setHouseEdgesUpdating(false);
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
      setShowDeleteHouseEdgeModal(true);
    }
  };

  const confirmDeleteHouseEdge = () => {
    if (!houseEdgeToDelete || houseEdgesDeleting) return;
    setHouseEdgesDeleting(true);
    setAllHouseEdges((prev) => prev.filter((h) => h.id !== houseEdgeToDelete.id));
    toast.success("House edge deleted successfully");
    setShowDeleteHouseEdgeModal(false);
    setHouseEdgeToDelete(null);
    setHouseEdgesDeleting(false);
  };

  const handleApplyAllHouseEdges = () => {
    if (applyAllLoading) return;
    if (!applyAllHouseEdge.game_type || !applyAllHouseEdge.house_edge || !applyAllHouseEdge.min_bet) {
      toast.error("Game type, house edge and min bet are required");
      return;
    }
    setApplyAllLoading(true);
    const now = new Date().toISOString();
    const until = applyAllHouseEdge.effective_until
      ? formatDateTimeForAPI(applyAllHouseEdge.effective_until)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const from = applyAllHouseEdge.effective_from
      ? formatDateTimeForAPI(applyAllHouseEdge.effective_from)
      : now;
    const heValApply = parseFloat(applyAllHouseEdge.house_edge);
    const heDecimalApply =
      heValApply > 1 ? (heValApply / 100).toFixed(4) : applyAllHouseEdge.house_edge;
    const newEdges: HouseEdge[] = allGames.map((game, i) => ({
      id: `mock-he-apply-${Date.now()}-${i}`,
      game_id: game.game_id,
      game_name: game.name,
      game_type: applyAllHouseEdge.game_type as HouseEdge["game_type"],
      game_variant: (applyAllHouseEdge.game_variant || "classic") as HouseEdge["game_variant"],
      house_edge: heDecimalApply,
      min_bet: applyAllHouseEdge.min_bet,
      max_bet: applyAllHouseEdge.max_bet || "1000",
      is_active: applyAllHouseEdge.is_active,
      effective_from: from,
      effective_until: until,
      created_at: now,
      updated_at: now,
    }));
    setAllHouseEdges((prev) => [...prev, ...newEdges]);
    toast.success(`House edge applied to ${newEdges.length} games`);
    setShowApplyAllHouseEdgeModal(false);
    setApplyAllHouseEdge({
      game_type: "",
      game_variant: "",
      house_edge: "",
      min_bet: "",
      max_bet: "",
      is_active: true,
      effective_from: "",
      effective_until: "",
    });
    setApplyAllLoading(false);
  };

  const handleRemoveAllHouseEdges = () => {
    if (removeAllLoading) return;
    setRemoveAllLoading(true);
    const matchType = applyAllHouseEdge.game_type;
    const matchVariant = applyAllHouseEdge.game_variant;
    setAllHouseEdges((prev) => {
      const next = prev.filter(
        (h) =>
          (!matchType || h.game_type !== matchType) &&
          (!matchVariant || h.game_variant !== matchVariant),
      );
      return next;
    });
    toast.success("House edges removed");
    setShowRemoveAllHouseEdgeModal(false);
    setApplyAllHouseEdge({
      game_type: "",
      game_variant: "",
      house_edge: "",
      min_bet: "",
      max_bet: "",
      is_active: true,
      effective_from: "",
      effective_until: "",
    });
    setRemoveAllLoading(false);
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
      // Close provider dropdowns when clicking outside
      if (
        showProviderDropdown &&
        !(event.target as Element).closest(".provider-dropdown-container")
      ) {
        setShowProviderDropdown(false);
      }
      if (
        showEditProviderDropdown &&
        !(event.target as Element).closest(".edit-provider-dropdown-container")
      ) {
        setShowEditProviderDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown, showProviderDropdown, showEditProviderDropdown]);

  // KPI counts for Games tab (from current page for active/enabled)
  const gamesActiveCount = games.filter((g) => g.status === "ACTIVE").length;
  const gamesInactiveCount = games.length - gamesActiveCount;

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <Gamepad2 className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Game Management</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Manage games and house edge settings
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700/80">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab("games")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === "games"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              <span>Game Catalog</span>
            </button>
            <button
              onClick={() => setActiveTab("house-edges")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === "house-edges"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Edge Rules</span>
            </button>
            <button
              onClick={() => setActiveTab("game-import")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === "game-import"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
              }`}
            >
              <Download className="h-4 w-4" />
              <span>Bulk Import</span>
            </button>
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Games Tab Content */}
        {activeTab === "games" && (
          <div className="space-y-6">
            {/* Game Catalog Header + Add Game */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Game Catalog</h2>
              <button
                onClick={() => setShowCreateGameModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg shadow-red-500/20"
              >
                <Plus className="w-5 h-5" />
                Add Game
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Games</p>
                    <p className="text-2xl font-bold text-white mt-1">{gamesPagination.total ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <Gamepad2 className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Active (this page)</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">{gamesActiveCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-900/30 border border-green-700/30">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Inactive (this page)</p>
                    <p className="text-2xl font-bold text-slate-400 mt-1">{gamesInactiveCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <XCircle className="h-6 w-6 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Games Filters */}
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Filters</h3>
                <button
                  onClick={() =>
                    setGamesFilters({
                      page: 1,
                      per_page: 10,
                      sort_by: "created_at",
                      sort_order: "desc",
                    })
                  }
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search games..."
                      value={gamesFilters.search || ""}
                      onChange={(e) =>
                        handleGamesFilterChange("search", e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={gamesFilters.status || ""}
                    onChange={(e) =>
                      handleGamesFilterChange(
                        "status",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Provider</label>
                  <input
                    type="text"
                    placeholder="Provider name..."
                    value={gamesFilters.provider || ""}
                    onChange={(e) =>
                      handleGamesFilterChange(
                        "provider",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Game ID</label>
                  <input
                    type="text"
                    placeholder="Game ID..."
                    value={gamesFilters.game_id || ""}
                    onChange={(e) =>
                      handleGamesFilterChange(
                        "game_id",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Enabled</label>
                  <select
                    value={
                      gamesFilters.enabled === undefined
                        ? ""
                        : gamesFilters.enabled.toString()
                    }
                    onChange={(e) =>
                      handleGamesFilterChange(
                        "enabled",
                        e.target.value === ""
                          ? undefined
                          : e.target.value === "true",
                      )
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  >
                    <option value="">All</option>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Games Table */}
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-300 font-medium">
                        <input
                          type="checkbox"
                          className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Game</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Game ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Provider</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Integration Partner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Enabled</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">RTP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Last Played</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Updated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {gamesLoading ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-6 py-8 text-center text-slate-400"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            Loading games...
                          </div>
                        </td>
                      </tr>
                    ) : games.length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-6 py-8 text-center text-slate-400"
                        >
                          No games found
                        </td>
                      </tr>
                    ) : (
                      games.map((game) => (
                        <tr key={game.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                            />
                          </td>
                          <td className="px-6 py-4 text-white font-medium">
                            {game.name}
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-mono text-sm">
                            {game.game_id}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(game.status)}`}
                            >
                              {game.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {game.provider}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {game.integration_partner || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                game.enabled
                                  ? "bg-green-900/50 text-green-300 border border-green-700/30"
                                  : "bg-red-900/50 text-red-300 border border-red-700/30"
                              }`}
                            >
                              {game.enabled ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {game.rtp_percent != null ? `${game.rtp_percent}%` : "—"}
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            {new Date(game.created_at).toLocaleDateString()}
                            <span className="text-slate-500 text-xs block">
                              {new Date(game.created_at).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            {new Date(game.timestamp).toLocaleDateString()}
                            <span className="text-slate-500 text-xs block">
                              {new Date(game.timestamp).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            {new Date(game.updated_at).toLocaleDateString()}
                            <span className="text-slate-500 text-xs block">
                              {new Date(game.updated_at).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative dropdown-container flex justify-end">
                              <button
                                onClick={() => toggleDropdown(game.id)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeDropdown === game.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-50 py-1 backdrop-blur-sm">
                                  <button
                                    onClick={() => {
                                      setViewingGame(game);
                                      setShowViewGameModal(true);
                                      closeDropdown();
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-3" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingGame(game);
                                      // Find provider_id from provider name
                                      const foundProvider = providers.find(
                                        (p) => p.name === game.provider || p.code === game.provider
                                      );
                                      setEditingProviderId(foundProvider?.id || "");
                                      setShowEditGameModal(true);
                                      closeDropdown();
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                                  >
                                    <Edit className="h-4 w-4 mr-3" />
                                    Edit Game
                                  </button>
                                  <button
                                    onClick={() => {
                                      setGameToDelete(game);
                                      setShowDeleteGameModal(true);
                                      closeDropdown();
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700/80 hover:text-red-300 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 mr-3" />
                                    Delete Game
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
            </div>

            {/* Games Pagination */}
            {gamesPagination.total_pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-slate-700/80 bg-slate-800/30">
                <div className="text-sm text-slate-400">
                  Showing{" "}
                  {((gamesPagination.current_page || 1) - 1) *
                    (gamesFilters.per_page || 10) +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    (gamesPagination.current_page || 1) *
                      (gamesFilters.per_page || 10),
                    gamesPagination.total || 0,
                  )}{" "}
                  of {gamesPagination.total || 0} games
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleGamesPageChange(
                        (gamesPagination.current_page || 1) - 1,
                      )
                    }
                    disabled={(gamesPagination.current_page || 1) === 1}
                    className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors font-medium"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      handleGamesPageChange(
                        (gamesPagination.current_page || 1) + 1,
                      )
                    }
                    disabled={
                      (gamesPagination.current_page || 1) ===
                      (gamesPagination.total_pages || 1)
                    }
                    className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* House Edges Tab Content */}
        {activeTab === "house-edges" && (
          <div className="space-y-6">
            {/* Edge Rules Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">Edge Rules</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowApplyAllHouseEdgeModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg shadow-red-500/20"
                  title="Apply house edge to all games"
                >
                  <Plus className="h-5 w-5" />
                  Apply All
                </button>
                <button
                  onClick={() => setShowRemoveAllHouseEdgeModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 font-medium transition-colors"
                  title="Remove house edge from all games"
                >
                  <Trash2 className="h-5 w-5" />
                  Remove All
                </button>
                <button
                  onClick={() => setShowBulkCreateHouseEdgeModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 font-medium transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Bulk Add
                </button>
                <button
                  onClick={() => setShowCreateHouseEdgeModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg shadow-red-500/20"
                >
                  <Plus className="h-5 w-5" />
                  Add House Edge
                </button>
              </div>
            </div>

            {/* House Edges Filters */}
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Filters</h3>
                <button
                  onClick={() =>
                    setHouseEdgesFilters({
                      page: 1,
                      per_page: 10,
                      sort_by: "created_at",
                      sort_order: "desc",
                    })
                  }
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search house edges..."
                      value={houseEdgesFilters.search || ""}
                      onChange={(e) =>
                        handleHouseEdgesFilterChange("search", e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Game Type</label>
                  <select
                    value={houseEdgesFilters.game_type || ""}
                    onChange={(e) =>
                      handleHouseEdgesFilterChange(
                        "game_type",
                        e.target.value || undefined,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  >
                    <option value="">All Types</option>
                    {GAME_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={
                      houseEdgesFilters.is_active === undefined
                        ? ""
                        : houseEdgesFilters.is_active.toString()
                    }
                    onChange={(e) =>
                      handleHouseEdgesFilterChange(
                        "is_active",
                        e.target.value === ""
                          ? undefined
                          : e.target.value === "true",
                      )
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
                  <select
                    value={houseEdgesFilters.sort_by || "created_at"}
                    onChange={(e) =>
                      handleHouseEdgesFilterChange("sort_by", e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  >
                    <option value="created_at">Created Date</option>
                    <option value="house_edge">House Edge</option>
                    <option value="min_bet">Min Bet</option>
                    <option value="max_bet">Max Bet</option>
                    <option value="effective_from">Effective From</option>
                  </select>
                </div>
              </div>
            </div>

            {/* House Edges Table */}
            <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/80 border-b border-slate-700/80">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Game</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Variant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">House Edge (%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Min Bet</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Max Bet</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Effective From</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Effective Until</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {houseEdgesLoading ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-8 text-center text-slate-400"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            Loading house edges...
                          </div>
                        </td>
                      </tr>
                    ) : houseEdges.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-8 text-center text-slate-400"
                        >
                          No house edges found
                        </td>
                      </tr>
                    ) : (
                      houseEdges.map((houseEdge) => (
                        <tr key={houseEdge.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500/20 focus:ring-2"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-white font-medium">
                                {houseEdge.game_name || "N/A"}
                              </div>
                              <div className="text-slate-500 text-sm">
                                ID: {houseEdge.game_id || "N/A"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{houseEdge.game_type}</td>
                          <td className="px-6 py-4 text-slate-300">{houseEdge.game_variant}</td>
                          <td className="px-6 py-4 text-slate-300 font-mono">
                            {houseEdge.house_edge
                              ? `${parseFloat(houseEdge.house_edge).toFixed(2)}%`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-slate-300">${houseEdge.min_bet}</td>
                          <td className="px-6 py-4 text-slate-300">${houseEdge.max_bet}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                houseEdge.is_active
                                  ? "bg-green-900/50 text-green-300 border border-green-700/30"
                                  : "bg-red-900/50 text-red-300 border border-red-700/30"
                              }`}
                            >
                              {houseEdge.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            {new Date(houseEdge.effective_from).toLocaleDateString()}
                            <span className="text-slate-500 text-xs block">
                              {new Date(houseEdge.effective_from).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            {new Date(houseEdge.effective_until).toLocaleDateString()}
                            <span className="text-slate-500 text-xs block">
                              {new Date(houseEdge.effective_until).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative dropdown-container flex justify-end">
                              <button
                                onClick={() => toggleDropdown(houseEdge.id)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeDropdown === houseEdge.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-slate-800/95 border border-slate-700 rounded-xl shadow-xl z-50 py-1 backdrop-blur-sm">
                                  <button
                                    onClick={() => {
                                      setViewingHouseEdge(houseEdge);
                                      setShowViewHouseEdgeModal(true);
                                      closeDropdown();
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-3" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingHouseEdge({
                                        ...houseEdge,
                                        house_edge: (
                                          parseFloat(houseEdge.house_edge) *
                                          100
                                        ).toString(), // Convert to percentage for editing
                                          effective_from: formatDateForInput(
                                            houseEdge.effective_from,
                                          ),
                                          effective_until: formatDateForInput(
                                            houseEdge.effective_until,
                                          ),
                                        });
                                        setShowEditHouseEdgeModal(true);
                                        closeDropdown();
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors"
                                    >
                                      <Edit className="h-4 w-4 mr-3" />
                                      Edit House Edge
                                    </button>
                                  <button
                                    onClick={() => {
                                      setHouseEdgeToDelete(houseEdge);
                                      setShowDeleteHouseEdgeModal(true);
                                      closeDropdown();
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700/80 hover:text-red-300 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 mr-3" />
                                    Delete House Edge
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
            </div>

            {/* House Edges Pagination */}
            {houseEdgesPagination.total_pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between bg-slate-800/30 rounded-2xl border border-slate-800/80">
                <div className="text-sm text-slate-400">
                  Showing{" "}
                  {((houseEdgesPagination.current_page || 1) - 1) *
                    (houseEdgesFilters.per_page || 10) +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    (houseEdgesPagination.current_page || 1) *
                      (houseEdgesFilters.per_page || 10),
                    houseEdgesPagination.total || 0,
                  )}{" "}
                  of {houseEdgesPagination.total || 0} house edges
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleHouseEdgesPageChange(
                        (houseEdgesPagination.current_page || 1) - 1,
                      )
                    }
                    disabled={(houseEdgesPagination.current_page || 1) === 1}
                    className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors font-medium"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      handleHouseEdgesPageChange(
                        (houseEdgesPagination.current_page || 1) + 1,
                      )
                    }
                    disabled={
                      (houseEdgesPagination.current_page || 1) ===
                      (houseEdgesPagination.total_pages || 1)
                    }
                    className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Management Modals */}
        {/* Create Game Modal */}
        {showCreateGameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Create New Game
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={newGame.name}
                    onChange={(e) =>
                      setNewGame((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={newGame.photo}
                    onChange={(e) =>
                      setNewGame((prev) => ({ ...prev, photo: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="relative provider-dropdown-container">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Provider *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search provider by name or code..."
                      value={providerSearch || providers.find(p => p.id === newGame.provider_id)?.name || ""}
                      onChange={(e) => {
                        setProviderSearch(e.target.value);
                        setShowProviderDropdown(true);
                        if (!e.target.value) {
                          setNewGame((prev) => ({ ...prev, provider_id: "" }));
                          setShowProviderDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (providers.length > 0 || providerSearch.length >= 1) {
                          setShowProviderDropdown(true);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-800 text-slate-200 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    />
                    {showProviderDropdown && (providerSearch.length >= 1 || providers.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingProviders ? (
                          <div className="p-3 text-center text-slate-400 text-sm">
                            Loading providers...
                          </div>
                        ) : providers
                            .filter((provider) => {
                              const q = providerSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                provider.name.toLowerCase().includes(q) ||
                                provider.code.toLowerCase().includes(q)
                              );
                            })
                            .length > 0 ? (
                          <>
                            {providers
                              .filter((provider) => {
                                const q = providerSearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  provider.name.toLowerCase().includes(q) ||
                                  provider.code.toLowerCase().includes(q)
                                );
                              })
                              .map((provider) => (
                                <div
                                  key={provider.id}
                                  className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-white text-sm"
                                  onClick={() => {
                                    setNewGame((prev) => ({
                                      ...prev,
                                      provider_id: provider.id,
                                    }));
                                    setProviderSearch(provider.name);
                                    setShowProviderDropdown(false);
                                  }}
                                >
                                  <div className="font-medium">{provider.name}</div>
                                  <div className="text-xs text-slate-400">
                                    Code: {provider.code}
                                  </div>
                                </div>
                              ))}
                          </>
                        ) : providerSearch.length >= 1 ? (
                          <div className="p-3 text-center text-slate-400 text-sm">
                            No providers found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {loadingProviders && (
                    <p className="text-xs text-slate-400 mt-1">Loading providers...</p>
                  )}
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
                      className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-slate-300">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateGameModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGame}
                  disabled={gamesCreating}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {gamesCreating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{gamesCreating ? "Creating..." : "Create Game"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Game Modal */}
        {showEditGameModal && editingGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">Edit Game</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="relative edit-provider-dropdown-container">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Provider *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search provider by name or code..."
                      value={editProviderSearch || providers.find(p => p.id === editingProviderId)?.name || ""}
                      onChange={(e) => {
                        setEditProviderSearch(e.target.value);
                        setShowEditProviderDropdown(true);
                        if (!e.target.value) {
                          setEditingProviderId("");
                          setShowEditProviderDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (providers.length > 0 || editProviderSearch.length >= 1) {
                          setShowEditProviderDropdown(true);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-800 text-slate-200 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    />
                    {showEditProviderDropdown && (editProviderSearch.length >= 1 || providers.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingProviders ? (
                          <div className="p-3 text-center text-slate-400 text-sm">
                            Loading providers...
                          </div>
                        ) : providers
                            .filter((provider) => {
                              const q = editProviderSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                provider.name.toLowerCase().includes(q) ||
                                provider.code.toLowerCase().includes(q)
                              );
                            })
                            .length > 0 ? (
                          <>
                            {providers
                              .filter((provider) => {
                                const q = editProviderSearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  provider.name.toLowerCase().includes(q) ||
                                  provider.code.toLowerCase().includes(q)
                                );
                              })
                              .map((provider) => (
                                <div
                                  key={provider.id}
                                  className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-white text-sm"
                                  onClick={() => {
                                    setEditingProviderId(provider.id);
                                    setEditProviderSearch(provider.name);
                                    setShowEditProviderDropdown(false);
                                  }}
                                >
                                  <div className="font-medium">{provider.name}</div>
                                  <div className="text-xs text-slate-400">
                                    Code: {provider.code}
                                  </div>
                                </div>
                              ))}
                          </>
                        ) : editProviderSearch.length >= 1 ? (
                          <div className="p-3 text-center text-slate-400 text-sm">
                            No providers found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {loadingProviders && (
                    <p className="text-xs text-slate-400 mt-1">Loading providers...</p>
                  )}
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
                      className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-slate-300">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditGameModal(false);
                    setEditingProviderId("");
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGame}
                  disabled={gamesUpdating}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {gamesUpdating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{gamesUpdating ? "Updating..." : "Update Game"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Game Modal */}
        {showViewGameModal && viewingGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Game Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Name
                    </label>
                    <p className="text-white">{viewingGame.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Status
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(viewingGame.status)}`}
                    >
                      {viewingGame.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Game ID
                    </label>
                    <p className="text-white">{viewingGame.game_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Internal Name
                    </label>
                    <p className="text-white">{viewingGame.internal_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Provider
                    </label>
                    <p className="text-white">{viewingGame.provider}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Integration Partner
                    </label>
                    <p className="text-white">
                      {viewingGame.integration_partner}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Enabled
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${viewingGame.enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {viewingGame.enabled ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Created At
                    </label>
                    <p className="text-white">
                      {new Date(viewingGame.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {viewingGame.photo && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Photo
                    </label>
                    <img
                      src={viewingGame.photo}
                      alt={viewingGame.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewGameModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Game Modal */}
        {showDeleteGameModal && gameToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Delete Game</h2>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete "{gameToDelete.name}"? This
                action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteGameModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGame}
                  disabled={gamesDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {gamesDeleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{gamesDeleting ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Search Modal */}
        {showGameSearchModal && (
          <GameSearchModal
            isOpen={showGameSearchModal}
            onClose={() => setShowGameSearchModal(false)}
            games={allGames}
            onSelectGame={(game) => {
              setSelectedGame(game);
              // Check if we're in edit mode
              if (editingHouseEdge) {
                setEditingHouseEdge((prev) =>
                  prev ? { ...prev, game_id: game.game_id } : null,
                );
              } else {
                setNewHouseEdge((prev) => ({ ...prev, game_id: game.game_id }));
              }
              setShowGameSearchModal(false);
            }}
            selectedGameId={selectedGame?.id}
          />
        )}

        {showBulkGameSearchModal && (
          <BulkGameSearchModal
            isOpen={showBulkGameSearchModal}
            onClose={() => setShowBulkGameSearchModal(false)}
            games={allGames}
            onSelectGames={(games) => {
              setSelectedGamesForBulk((prev) => {
                // Merge with existing selections, avoiding duplicates
                const existingIds = new Set(prev.map((g) => g.id));
                const newGames = games.filter((g) => !existingIds.has(g.id));
                return [...prev, ...newGames];
              });
              setShowBulkGameSearchModal(false);
            }}
            selectedGameIds={selectedGamesForBulk.map((g) => g.id)}
          />
        )}

        {/* House Edge Management Modals */}
        {/* Create House Edge Modal */}
        {showCreateHouseEdgeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Create New House Edge
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      {selectedGame ? (
                        <div className="p-3 bg-slate-700 border border-slate-600 rounded-lg">
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
                              onClick={() => setSelectedGame(null)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-400">
                          No game selected
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGameSearchModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors"
                    >
                      {selectedGame ? "Change Game" : "Select Game"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                      className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateHouseEdgeModal(false);
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHouseEdge}
                  disabled={houseEdgesCreating}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {houseEdgesCreating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {houseEdgesCreating ? "Creating..." : "Create House Edge"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Create House Edge Modal */}
        {showBulkCreateHouseEdgeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Bulk Create House Edges
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Selected Games ({selectedGamesForBulk.length})
                  </label>
                  <div className="space-y-2">
                    {selectedGamesForBulk.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedGamesForBulk.map((game) => (
                          <div
                            key={game.id}
                            className="p-3 bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">
                                {game.name}
                              </div>
                              <div className="text-sm text-gray-400 truncate">
                                ID: {game.game_id || game.id}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedGamesForBulk((prev) =>
                                  prev.filter((g) => g.id !== game.id),
                                )
                              }
                              className="ml-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-700 border border-slate-600 rounded-lg text-center text-gray-400">
                        No games selected
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowBulkGameSearchModal(true)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Select Games</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Type
                  </label>
                  <select
                    value={bulkHouseEdge.game_type}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        game_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Variant
                  </label>
                  <select
                    value={bulkHouseEdge.game_variant}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        game_variant: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    House Edge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 12"
                    value={bulkHouseEdge.house_edge}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        house_edge: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Min Bet ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1.00"
                    value={bulkHouseEdge.min_bet}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        min_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Bet ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1000.00"
                    value={bulkHouseEdge.max_bet}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        max_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective From (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkHouseEdge.effective_from}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        effective_from: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective Until (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkHouseEdge.effective_until}
                    onChange={(e) =>
                      setBulkHouseEdge((prev) => ({
                        ...prev,
                        effective_until: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bulkHouseEdge.is_active}
                      onChange={(e) =>
                        setBulkHouseEdge((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowBulkCreateHouseEdgeModal(false);
                    setSelectedGamesForBulk([]);
                    setBulkHouseEdge({
                      game_type: "",
                      game_variant: "",
                      house_edge: "",
                      min_bet: "",
                      max_bet: "",
                      is_active: true,
                      effective_from: "",
                      effective_until: "",
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkCreateHouseEdges}
                  disabled={houseEdgesCreating}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {houseEdgesCreating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {houseEdgesCreating
                      ? "Creating..."
                      : "Bulk Create House Edges"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit House Edge Modal */}
        {showEditHouseEdgeModal && editingHouseEdge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Edit House Edge
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      {editingHouseEdge.game_id ? (
                        <div className="p-3 bg-slate-700 border border-slate-600 rounded-lg">
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
                        <div className="p-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-400">
                          No game selected
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGameSearchModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors"
                    >
                      {editingHouseEdge.game_id ? "Change Game" : "Select Game"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                      className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditHouseEdgeModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHouseEdge}
                  disabled={houseEdgesUpdating}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {houseEdgesUpdating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {houseEdgesUpdating ? "Updating..." : "Update House Edge"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View House Edge Modal */}
        {showViewHouseEdgeModal && viewingHouseEdge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                House Edge Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Game Type
                    </label>
                    <p className="text-white capitalize">
                      {viewingHouseEdge.game_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Game Variant
                    </label>
                    <p className="text-white capitalize">
                      {viewingHouseEdge.game_variant}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      House Edge
                    </label>
                    <p className="text-white">
                      {viewingHouseEdge.house_edge_percent ||
                        `${(parseFloat(viewingHouseEdge.house_edge) * 100).toFixed(2)}%`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Bet Range
                    </label>
                    <p className="text-white">
                      ${parseFloat(viewingHouseEdge.min_bet).toFixed(2)} - $
                      {parseFloat(viewingHouseEdge.max_bet).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Status
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${viewingHouseEdge.is_active ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}
                    >
                      {viewingHouseEdge.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Created At
                    </label>
                    <p className="text-white">
                      {new Date(viewingHouseEdge.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Effective From
                    </label>
                    <p className="text-white">
                      {viewingHouseEdge.effective_from
                        ? new Date(
                            viewingHouseEdge.effective_from,
                          ).toLocaleString()
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Effective Until
                    </label>
                    <p className="text-white">
                      {viewingHouseEdge.effective_until
                        ? new Date(
                            viewingHouseEdge.effective_until,
                          ).toLocaleString()
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewHouseEdgeModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete House Edge Modal */}
        {showDeleteHouseEdgeModal && houseEdgeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
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
                <p className="text-slate-300">
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
                <div className="mt-3 p-3 bg-slate-700 rounded-lg">
                  <div className="text-sm text-slate-300">
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
                    setShowDeleteHouseEdgeModal(false);
                    setHouseEdgeToDelete(null);
                  }}
                  disabled={houseEdgesDeleting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteHouseEdge}
                  disabled={houseEdgesDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {houseEdgesDeleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {houseEdgesDeleting ? "Deleting..." : "Delete House Edge"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Apply All House Edge Modal */}
        {showApplyAllHouseEdgeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Apply House Edge to All Games
              </h2>
              <p className="text-slate-300 mb-6">
                Configure house edge settings that will be applied to all games
                matching the specified criteria.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Type *
                  </label>
                  <select
                    value={applyAllHouseEdge.game_type}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        game_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                    required
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Variant *
                  </label>
                  <select
                    value={applyAllHouseEdge.game_variant}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        game_variant: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                    required
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    House Edge (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 10"
                    value={applyAllHouseEdge.house_edge}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        house_edge: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Min Bet ($) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1.00"
                    value={applyAllHouseEdge.min_bet}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        min_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Bet ($) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1000.00"
                    value={applyAllHouseEdge.max_bet}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        max_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective From
                  </label>
                  <input
                    type="datetime-local"
                    value={applyAllHouseEdge.effective_from}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        effective_from: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective Until
                  </label>
                  <input
                    type="datetime-local"
                    value={applyAllHouseEdge.effective_until}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        effective_until: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={applyAllHouseEdge.is_active}
                      onChange={(e) =>
                        setApplyAllHouseEdge((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-600 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApplyAllHouseEdgeModal(false);
                    setApplyAllHouseEdge({
                      game_type: "",
                      game_variant: "",
                      house_edge: "",
                      min_bet: "",
                      max_bet: "",
                      is_active: true,
                      effective_from: "",
                      effective_until: "",
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAllHouseEdges}
                  disabled={applyAllLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {applyAllLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {applyAllLoading ? "Applying..." : "Apply to All Games"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove All House Edge Modal */}
        {showRemoveAllHouseEdgeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Remove House Edge from All Games
              </h2>
              <p className="text-slate-300 mb-6">
                Remove house edge settings from all games matching the specified
                criteria.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Type *
                  </label>
                  <select
                    value={applyAllHouseEdge.game_type}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        game_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Game Variant *
                  </label>
                  <select
                    value={applyAllHouseEdge.game_variant}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        game_variant: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    House Edge (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 10"
                    value={applyAllHouseEdge.house_edge}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        house_edge: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Min Bet ($) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1.00"
                    value={applyAllHouseEdge.min_bet}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        min_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Bet ($) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1000.00"
                    value={applyAllHouseEdge.max_bet}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        max_bet: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective From
                  </label>
                  <input
                    type="datetime-local"
                    value={applyAllHouseEdge.effective_from}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        effective_from: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Effective Until
                  </label>
                  <input
                    type="datetime-local"
                    value={applyAllHouseEdge.effective_until}
                    onChange={(e) =>
                      setApplyAllHouseEdge((prev) => ({
                        ...prev,
                        effective_until: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={applyAllHouseEdge.is_active}
                      onChange={(e) =>
                        setApplyAllHouseEdge((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-slate-300">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRemoveAllHouseEdgeModal(false);
                    setApplyAllHouseEdge({
                      game_type: "",
                      game_variant: "",
                      house_edge: "",
                      min_bet: "",
                      max_bet: "",
                      is_active: true,
                      effective_from: "",
                      effective_until: "",
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveAllHouseEdges}
                  disabled={removeAllLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {removeAllLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {removeAllLoading ? "Removing..." : "Remove from All Games"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "game-import" && (
          <div className="space-y-6">
            {loadingBrands ? (
              <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-slate-700/50 rounded w-1/4 mb-4" />
              </div>
            ) : selectedBrandId ? (
              <>
                <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Brand
                  </label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full max-w-xs px-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <GameImportManagement brandId={selectedBrandId} />
              </>
            ) : (
              <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-8 text-center">
                <p className="text-slate-400">
                  No brands available. Create a brand in Brand Management first.
                </p>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default MergedGameManagement;
