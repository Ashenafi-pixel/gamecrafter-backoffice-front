import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  Download,
  Edit,
  MoreVertical,
  DollarSign,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Copy,
  Check,
  UserX,
  UserCheck,
  AlertTriangle,
  Key,
  Users,
} from "lucide-react";
import { PlayerDetails } from "./PlayerDetails";
import { EditPlayerModal } from "./EditPlayerModal";
import { FundManagementModal } from "./FundManagementModal";
import { SuspendPlayerModal } from "./SuspendPlayerModal";
import { AddPlayerModal } from "./AddPlayerModal";
import { useServices } from "../../contexts/ServicesContext";
import { kycService } from "../../services/kycService";
import { clientSvc } from "../../services/apiService";
import { brandService, Brand } from "../../services/brandService";
import { cashbackService } from "../../services/cashbackService";
import toast from "react-hot-toast";

interface Player {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  streetAddress: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  kycStatus: string;
  isEmailVerified: boolean;
  referalCode: string;
  referalType: string;
  referedByCode: string;
  userType: string;
  primaryWalletAddress: string;
  walletVerificationStatus: string;
  status: string;
  isAdmin: boolean;
  defaultCurrency: string;
  profilePicture: string;
  source: string;
  createdBy: string;
  createdAt: string;
  // Computed fields
  registrationDate: string;
  lastLogin: string;
  verified: boolean;
  totalDeposits: number;
  totalWithdrawals: number;
  currentBalance: number;
  totalWagered: number;
  netProfitLoss: number;
  sessionsCount: number;
  vipLevel: string;
  riskScore: string;
  // Suspension info
  suspensionReason?: string;
  suspensionNote?: string;
  suspensionDate?: string;
  transactions: Array<{
    id: string;
    type: string;
    crypto: string;
    amount: string;
    usd: string;
    status: string;
    date: string;
  }>;
  // Test account and balance info
  isTestAccount: boolean;
  accounts: Array<{
    id: string;
    userId: string;
    currencyCode: string;
    amountCents: number;
    amountUnits: number;
    reservedCents: number;
    reservedUnits: number;
    updatedAt: string;
  }>;
  // Withdrawal limits
  withdrawalLimit?: number | string;
  withdrawalAllTimeLimit?: number | string;
  withdrawalLimitEnabled?: boolean;
}

export const PlayerManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [fundManagementPlayer, setFundManagementPlayer] =
    useState<Player | null>(null);
  const [suspendingPlayer, setSuspendingPlayer] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [testAccountFilter, setTestAccountFilter] = useState<boolean | null>(
    null,
  );
  const [showTestAccountFilter, setShowTestAccountFilter] = useState(false);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [showBrandFilter, setShowBrandFilter] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    above?: boolean;
  } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const playersPerPage = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [withdrawalsBlockedById, setWithdrawalsBlockedById] = useState<
    Record<string, boolean>
  >({});
  const [blockModalPlayer, setBlockModalPlayer] = useState<Player | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [unblockModalPlayer, setUnblockModalPlayer] = useState<Player | null>(
    null,
  );
  const [processingBlock, setProcessingBlock] = useState(false);
  const [resettingPasswordPlayer, setResettingPasswordPlayer] =
    useState<Player | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Copy functionality state
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  // VIP levels from database
  const [vipLevels, setVipLevels] = useState<string[]>([]);
  const [loadingVipLevels, setLoadingVipLevels] = useState(true);
  const [cashbackTiers, setCashbackTiers] = useState<any[]>([]);

  // Bulk operations state
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    new Set(),
  );

  // Sorting state
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const { adminSvc } = useServices();

  // Copy to clipboard function
  const copyToClipboard = async (text: string, itemType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => new Set(prev).add(itemType));
      toast.success(`${itemType} copied to clipboard`);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemType);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Fetch brands from database
  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({
        page: 1,
        "per-page": 100, // Get all brands
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

  // Fetch VIP levels from database
  const fetchVipLevels = async () => {
    try {
      setLoadingVipLevels(true);
      const response = await adminSvc.get("/cashback/tiers");
      if (response.success && response.data && Array.isArray(response.data)) {
        const tiers = response.data.map((tier: any) => tier.tier_name);
        setVipLevels(tiers);
        setCashbackTiers(response.data); // Store full tier data for calculations
      }
    } catch (err) {
      console.error("Failed to fetch VIP levels:", err);
      // Fallback to hardcoded values if API fails
      setVipLevels(["Bronze", "Silver", "Gold", "Platinum", "Diamond"]);
      // Create mock tier data for fallback
      setCashbackTiers([
        { tier_name: "Bronze", tier_level: 1, min_ggr_required: 0 },
        { tier_name: "Silver", tier_level: 2, min_ggr_required: 1000 },
        { tier_name: "Gold", tier_level: 3, min_ggr_required: 5000 },
        { tier_name: "Platinum", tier_level: 4, min_ggr_required: 15000 },
        { tier_name: "Diamond", tier_level: 5, min_ggr_required: 50000 },
      ]);
    } finally {
      setLoadingVipLevels(false);
    }
  };

  // Calculate cashback level based on total wagered amount
  const calculateCashbackLevel = (
    totalWagered: number,
    cashbackTiers: any[],
  ) => {
    if (!cashbackTiers || cashbackTiers.length === 0) {
      return "Bronze"; // Default level
    }

    // Sort tiers by level (ascending)
    const sortedTiers = [...cashbackTiers].sort(
      (a, b) => a.tier_level - b.tier_level,
    );

    // Find the highest tier the player qualifies for
    let currentTier = sortedTiers[0]; // Start with the lowest tier

    for (const tier of sortedTiers) {
      if (totalWagered >= tier.min_ggr_required) {
        currentTier = tier;
      } else {
        break;
      }
    }

    return currentTier.tier_name;
  };

  // Bulk level progression function
  const handleBulkLevelProgression = async () => {
    if (selectedPlayers.size === 0) {
      toast.error("Please select at least one player");
      return;
    }

    try {
      setIsProcessingBulk(true);
      const data = await cashbackService.processBulkLevelProgression(
        Array.from(selectedPlayers),
      );

      if (data) {
        const successful = data?.successful || 0;
        const failed = data?.failed || 0;
        const results = data?.results || [];

        // Build detailed message with individual results
        let detailedMessage = `Bulk level progression: ${successful} successful, ${failed} failed\n\n`;

        // Add details for each result
        results.forEach((result: any, index: number) => {
          if (result.success) {
            // Use the detailed message from backend if available
            if (result.message) {
              detailedMessage += `✓ User ${index + 1}: ${result.message}\n`;
            } else if (
              result.new_level &&
              result.new_level > (result.current_level || 0)
            ) {
              detailedMessage += `✓ User ${index + 1}: Progressed to Level ${result.new_level} (${result.next_tier_name || result.current_tier_name || "Unknown Tier"})\n`;
            } else {
              detailedMessage += `✓ User ${index + 1}: Already at Level ${result.current_level || result.new_level} (${result.current_tier_name || "Unknown Tier"})\n`;
            }
          } else {
            // Show detailed error message from backend
            const errorMsg =
              result.message ||
              result.error ||
              "Failed to process level progression";
            detailedMessage += `✗ User ${index + 1}: ${errorMsg}\n`;
          }
        });

        // Show success toast with details
        if (successful > 0) {
          toast.success(detailedMessage, { duration: 6000 });
        } else {
          toast.error(detailedMessage, { duration: 6000 });
        }

        // Log detailed results
        console.log("Bulk level progression results:", results);

        // Refresh the players list to show updated levels
        await fetchPlayers(currentPage, searchTerm);

        // Clear selection
        setSelectedPlayers(new Set());
      } else {
        toast.error("Failed to process bulk level progression");
      }
    } catch (err: any) {
      console.error("Bulk level progression error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to process bulk level progression";
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Toggle player selection
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  // Select all players
  const selectAllPlayers = () => {
    setSelectedPlayers(new Set(players.map((p) => p.id)));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedPlayers(new Set());
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column with ascending order
      setSortBy(column);
      setSortOrder("asc");
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  // Fetch players from backend
  const fetchPlayers = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const filterPayload: any = {
        // Broad search fields; backend should do substring matching
        searchterm: search || undefined,
        search: search || undefined,
        username: search || undefined,
        email: search || undefined,
        phone_number: search || undefined,
        user_id: search || undefined,
        is_test_account: testAccountFilter,
        brand_id: brandFilter.length > 0 ? brandFilter : undefined,
      };

      const requestPayload: any = {
        page,
        per_page: playersPerPage,
        filter: filterPayload,
      };

      // Add sorting parameters if sort is active
      if (sortBy) {
        requestPayload.sort_by = sortBy;
        requestPayload.sort_order = sortOrder;
      }

      const response = await adminSvc.post("/users", requestPayload);

      if (response.success && response.data && (response.data as any).users) {
        // Map backend User format to frontend Player format
        const mappedPlayers = (response.data as any).users.map((user: any) => {
          console.log("User data structure:", user);
          console.log("User VIP level from backend:", user.vip_level);
          console.log("User accounts:", user.accounts);

          return {
            id: user.id,
            username: user.username || "",
            email: user.email || "",
            phoneNumber: user.phone_number || "",
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            dateOfBirth: user.date_of_birth || "",
            streetAddress: user.street_address || "",
            country: user.country || "",
            state: user.state || "",
            city: user.city || "",
            postalCode: user.postal_code || "",
            kycStatus: user.kyc_status || "PENDING",
            isEmailVerified: user.is_email_verified || false,
            referalCode: user.referal_code || "",
            referalType: user.referal_type || "",
            referedByCode: user.refered_by_code || "",
            userType: user.user_type || "PLAYER",
            primaryWalletAddress: user.primary_wallet_address || "",
            walletVerificationStatus: user.wallet_verification_status || "none",
            status: user.status || "ACTIVE",
            isAdmin: user.is_admin || false,
            defaultCurrency: user.default_currency || "USD",
            profilePicture: user.profile_picture || "",
            source: user.source || "",
            createdBy: user.created_by || "",
            createdAt: user.created_at || new Date().toISOString(),
            // Computed fields
            registrationDate: user.created_at || new Date().toISOString(),
            lastLogin: user.last_login || new Date().toISOString(),
            verified: user.is_email_verified || false,
            totalDeposits: user.total_deposits || 0,
            totalWithdrawals: user.total_withdrawals || 0,
            currentBalance: (() => {
              // First try to get balance from accounts
              if (user.accounts && user.accounts.length > 0) {
                const account = user.accounts[0];
                // Use amount_units as the primary balance field
                const accountBalance = parseFloat(account.amount_units || "0");
                if (accountBalance > 0) {
                  return accountBalance;
                }
              }

              // If accounts is empty or balance is 0, calculate from approved transactions
              if (user.transactions && Array.isArray(user.transactions)) {
                console.log(
                  "User transactions for balance calculation:",
                  user.transactions,
                );
                let balance = 0;
                user.transactions.forEach((transaction: any) => {
                  console.log(
                    "Processing transaction for balance:",
                    transaction,
                  );
                  // Only count approved/confirmed transactions
                  if (
                    transaction.status === "APPROVED" ||
                    transaction.status === "CONFIRMED" ||
                    transaction.status === "COMPLETED"
                  ) {
                    if (
                      transaction.type === "DEPOSIT" ||
                      transaction.type === "WIN"
                    ) {
                      balance += parseFloat(
                        transaction.amount || transaction.usd || "0",
                      );
                    } else if (
                      transaction.type === "WITHDRAWAL" ||
                      transaction.type === "BET"
                    ) {
                      balance -= parseFloat(
                        transaction.amount || transaction.usd || "0",
                      );
                    }
                  }
                });
                console.log("Calculated balance from transactions:", balance);
                return balance;
              }

              // Fallback to direct balance fields
              if (user.balance !== undefined) {
                return parseFloat(user.balance || "0");
              }
              if (user.current_balance !== undefined) {
                return parseFloat(user.current_balance || "0");
              }

              return 0;
            })(),
            totalWagered: user.total_wagered || 0,
            netProfitLoss:
              (user.total_wagered || 0) - (user.total_winnings || 0),
            sessionsCount: user.sessions_count || 0,
            vipLevel: user.vip_level || "Bronze",
            riskScore: user.risk_score || "Low",
            transactions: [],
            // Test account and balance info
            isTestAccount: user.is_test_account || false,
            accounts: user.accounts || [],
            // Withdrawal limits - convert strings to numbers if needed
            withdrawalLimit:
              user.withdrawal_limit !== undefined &&
              user.withdrawal_limit !== null
                ? typeof user.withdrawal_limit === "string"
                  ? parseFloat(user.withdrawal_limit)
                  : user.withdrawal_limit
                : undefined,
            withdrawalAllTimeLimit:
              user.withdrawal_all_time_limit !== undefined &&
              user.withdrawal_all_time_limit !== null
                ? typeof user.withdrawal_all_time_limit === "string"
                  ? parseFloat(user.withdrawal_all_time_limit)
                  : user.withdrawal_all_time_limit
                : undefined,
            withdrawalLimitEnabled:
              user.withdrawal_limit_enabled !== undefined
                ? Boolean(user.withdrawal_limit_enabled)
                : false,
          };
        });

        setPlayers(mappedPlayers);
        // After setting players, fetch withdrawals block status for visible players
        try {
          const statuses = await Promise.all(
            mappedPlayers.map(async (p: Player) => {
              try {
                const res = await kycService.getWithdrawalBlockStatus(p.id);
                const isBlocked = !!(
                  res.success &&
                  ((res.data && (res.data as any).is_blocked) ||
                    (res.data as any)?.data?.is_blocked)
                );
                return { id: p.id, blocked: isBlocked };
              } catch {
                return { id: p.id, blocked: false };
              }
            }),
          );
          const map: Record<string, boolean> = {};
          statuses.forEach((s) => {
            map[s.id] = s.blocked;
          });
          setWithdrawalsBlockedById(map);
        } catch (e) {
          console.warn(
            "Failed to load withdrawals block statuses for players:",
            e,
          );
        }
        setTotalPages((response.data as any).total_pages || 1);
        setTotalPlayers((response.data as any).total_count || 0);
      }
    } catch (error: any) {
      console.error("Failed to fetch players:", error);

      // Check if it's a 401/403 error (permission issue)
      if (error.status === 401 || error.status === 403) {
        toast.error("You do not have permission to view players.");
        setPlayers([]);
        setTotalPages(0);
        setTotalPlayers(0);
      } else {
        toast.error("Failed to fetch players");
        setPlayers([]);
        setTotalPages(0);
        setTotalPlayers(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [
    searchTerm,
    testAccountFilter,
    brandFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) {
      setSearchTerm(qParam);
    }
  }, []);

  useEffect(() => {
    fetchVipLevels();
    fetchBrands();
  }, []);

  // Refetch players when cashback tiers are loaded to recalculate levels
  useEffect(() => {
    if (cashbackTiers.length > 0) {
      fetchPlayers(currentPage, searchTerm);
    }
  }, [cashbackTiers, currentPage, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchPlayers(currentPage, searchTerm);
  }, [
    currentPage,
    searchTerm,
    testAccountFilter,
    brandFilter,
    sortBy,
    sortOrder,
  ]);

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Close action dropdowns - check if click is outside both the button and the portal dropdown
      if (openDropdownId) {
        const isDropdownButton = target.closest(".dropdown-container");
        const isPortalDropdown = target.closest(".action-dropdown-portal");
        if (!isDropdownButton && !isPortalDropdown) {
          setOpenDropdownId(null);
          setDropdownPosition(null);
        }
      }

      // Close filter dropdowns
      if (!target.closest(".filter-dropdown-container")) {
        setShowTestAccountFilter(false);
        setShowBrandFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdownId]);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowTestAccountFilter(false);
      setShowBrandFilter(false);
    }, 200); // Simple delay when leaving the filter card
    setHoverTimeout(timeout);
  };

  const toggleTestAccountFilter = (value: boolean | null) => {
    setTestAccountFilter(value);
  };

  const toggleBrandFilter = (brandId: string) => {
    setBrandFilter((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId],
    );
  };

  const clearAllFilters = () => {
    setTestAccountFilter(null);
    setBrandFilter([]);
    setSearchTerm("");
  };

  const handleSuspendPlayer = async (
    playerId: string,
    blockType: string,
    reason: string,
    note: string,
  ) => {
    try {
      const response = await adminSvc.post("/users/block", {
        user_id: playerId,
        reason: reason,
        type: blockType,
        duration: "permanent",
        note: note || "Account suspended by admin",
      });

      if (response.success) {
        // Update the player's suspension info in local state
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) =>
            player.id === playerId
              ? {
                  ...player,
                  status: "SUSPENDED",
                  suspensionReason: reason,
                  suspensionNote: note,
                  suspensionDate: new Date().toISOString(),
                }
              : player,
          ),
        );

        toast.success("Player suspended successfully");
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "PLAYER_SUSPEND",
            category: "PlayerManagement",
            severity: "warning",
            resource_type: "user",
            resource_id: playerId,
            description: "Player suspension from Player Management",
            details: { block_type: blockType, reason, note },
          });
        } catch {}
        fetchPlayers(currentPage, searchTerm);
      } else {
        toast.error(response.message || "Failed to suspend player");
      }
    } catch (error: any) {
      console.error("Failed to suspend player:", error);

      // Extract error message from different possible error structures
      let errorMessage = "Failed to suspend player";

      // Handle ApiResponse error structure (from apiService)
      if (error.message && typeof error.message === "string") {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      if (error.status === 401 || error.status === 403) {
        toast.error("You do not have permission to suspend players");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleUnsuspendPlayer = async (playerId: string) => {
    try {
      // Find the player to get their current data
      const player = players.find((p) => p.id === playerId);
      if (!player) {
        toast.error("Player not found");
        return;
      }

      // Use the update profile endpoint to change status with all required fields
      const response = await adminSvc.patch("/users", {
        user_id: playerId,
        first_name: player.firstName,
        last_name: player.lastName,
        username: player.username,
        email: player.email,
        phone_number: player.phoneNumber,
        street_address: player.streetAddress,
        city: player.city,
        postal_code: player.postalCode,
        state: player.state,
        country: player.country,
        kyc_status: player.kycStatus,
        date_of_birth: player.dateOfBirth,
        status: "ACTIVE",
        is_email_verified: player.isEmailVerified,
        default_currency: player.defaultCurrency,
        wallet_verification_status: player.walletVerificationStatus,
      });

      if (response.success) {
        // Update the player's status in local state
        setPlayers((prevPlayers) =>
          prevPlayers.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  status: "ACTIVE",
                  suspensionReason: undefined,
                  suspensionNote: undefined,
                  suspensionDate: undefined,
                }
              : p,
          ),
        );

        toast.success("Player unsuspended successfully");
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "PLAYER_UNSUSPEND",
            category: "PlayerManagement",
            severity: "info",
            resource_type: "user",
            resource_id: playerId,
            description: "Player unsuspension from Player Management",
          });
        } catch {}
        fetchPlayers(currentPage, searchTerm);
      } else {
        toast.error(response.message || "Failed to unsuspend player");
      }
    } catch (error: any) {
      console.error("Failed to unsuspend player:", error);

      // Extract error message from different possible error structures
      let errorMessage = "Failed to unsuspend player";

      // Handle ApiResponse error structure (from apiService)
      if (error.message && typeof error.message === "string") {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      if (error.status === 401 || error.status === 403) {
        toast.error("You do not have permission to unsuspend players");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleExportPlayers = async () => {
    try {
      // For now, we'll create a simple CSV export from the current data
      const csvContent = [
        [
          "Player ID",
          "Username",
          "Email",
          "Phone",
          "KYC Status",
          "Rakeback Tier",
          "Status",
          "Balance",
          "Date registered",
          "Total Wagered",
          "Net P&L",
          "Risk Score",
        ],
        ...players.map((player) => [
          player.id,
          player.username,
          player.email,
          player.phoneNumber,
          player.kycStatus,
          player.vipLevel,
          player.status,
          player.currentBalance,
          player.registrationDate || player.createdAt
            ? new Date(
                player.registrationDate || player.createdAt,
              ).toLocaleDateString()
            : "N/A",
          player.totalWagered,
          player.netProfitLoss,
          player.riskScore,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `players_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Players exported successfully");
    } catch (error) {
      console.error("Failed to export players:", error);
      toast.error("Failed to export players");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "text-green-400 bg-green-400/10";
      case "INACTIVE":
        return "text-gray-400 bg-gray-400/10";
      case "SUSPENDED":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const confirmBlockWithdrawals = async () => {
    if (!blockModalPlayer) return;
    try {
      setProcessingBlock(true);
      const res = await kycService.blockWithdrawals({
        user_id: blockModalPlayer.id,
        reason: blockReason || "Blocked by admin",
      });
      if (res.success) {
        setWithdrawalsBlockedById((prev) => ({
          ...prev,
          [blockModalPlayer.id]: true,
        }));
        toast.success("Withdrawals blocked");
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "WITHDRAWALS_BLOCKED",
            category: "PlayerManagement",
            severity: "warning",
            resource_type: "user",
            resource_id: blockModalPlayer.id,
            description: "Withdrawals blocked from Player Management",
            details: { reason: blockReason },
          });
        } catch {}
        setBlockModalPlayer(null);
        setBlockReason("");
      } else {
        toast.error("Failed to block withdrawals");
      }
    } catch (e) {
      console.error("Block withdrawals error:", e);
      toast.error("Failed to block withdrawals");
    } finally {
      setProcessingBlock(false);
    }
  };

  const confirmUnblockWithdrawals = async () => {
    if (!unblockModalPlayer) return;
    try {
      setProcessingBlock(true);
      const res = await kycService.unblockWithdrawals(unblockModalPlayer.id);
      if (res.success) {
        setWithdrawalsBlockedById((prev) => ({
          ...prev,
          [unblockModalPlayer.id]: false,
        }));
        toast.success("Withdrawals unblocked");
        try {
          const { adminActivityLogsService } =
            await import("../../services/adminActivityLogsService");
          await adminActivityLogsService.createActivityLog({
            action: "WITHDRAWALS_UNBLOCKED",
            category: "PlayerManagement",
            severity: "info",
            resource_type: "user",
            resource_id: unblockModalPlayer.id,
            description: "Withdrawals unblocked from Player Management",
          });
        } catch {}
        setUnblockModalPlayer(null);
      } else {
        toast.error("Failed to unblock withdrawals");
      }
    } catch (e) {
      console.error("Unblock withdrawals error:", e);
      toast.error("Failed to unblock withdrawals");
    } finally {
      setProcessingBlock(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resettingPasswordPlayer) return;

    try {
      setIsResettingPassword(true);
      const response = await adminSvc.post("/users/password/auto-reset", {
        user_id: resettingPasswordPlayer.id,
      });

      if (response.success) {
        toast.success(
          "Password reset successfully! New password has been sent to the player's email.",
        );
        setResettingPasswordPlayer(null);
      } else {
        toast.error(response.message || "Failed to reset password");
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (selectedPlayer) {
    const player = players.find((p) => p.id === selectedPlayer);
    if (player) {
      // Map camelCase to snake_case for PlayerDetails component
      const mappedPlayer = {
        id: player.id,
        username: player.username,
        email: player.email,
        phone_number: player.phoneNumber,
        first_name: player.firstName,
        last_name: player.lastName,
        date_of_birth: player.dateOfBirth,
        street_address: player.streetAddress,
        country: player.country,
        state: player.state,
        city: player.city,
        postal_code: player.postalCode,
        kyc_status: player.kycStatus,
        is_email_verified: player.isEmailVerified,
        referral_code: player.referalCode,
        user_type: player.userType,
        type: player.userType, // Add type field
        status: player.status,
        default_currency: player.defaultCurrency,
        profile_picture: player.profilePicture,
        created_at: player.createdAt,
        source: player.source,
      };

      return (
        <PlayerDetails
          player={mappedPlayer}
          onBack={() => {
            setSelectedPlayer(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onEdit={() => {
            setEditingPlayer(player);
            setSelectedPlayer(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onSuspend={() => {
            setSuspendingPlayer(player);
            setSelectedPlayer(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onUnsuspend={() => {
            handleUnsuspendPlayer(player.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onFundManagement={() => {
            setFundManagementPlayer(player);
            setSelectedPlayer(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header - match game-management */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <Users className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Player Management
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage and monitor player accounts
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-3">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
              <span className="text-sm">Loading...</span>
            </div>
          )}
          {selectedPlayers.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-300">
                {selectedPlayers.size} selected
              </span>
              <button
                onClick={handleBulkLevelProgression}
                disabled={isProcessingBulk}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProcessingBulk ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <DollarSign className="h-4 w-4" />
                )}
                <span>
                  {isProcessingBulk ? "Processing..." : "Cashback Progression"}
                </span>
              </button>
              <button
                onClick={clearAllSelections}
                className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 border border-slate-600/50 text-sm font-medium"
              >
                Clear
              </button>
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg shadow-red-500/20"
          >
            <UserPlus className="h-5 w-5" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Filters Section - match game-management */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Filters
          </h3>
          <button
            onClick={clearAllFilters}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Clear all filters
          </button>
        </div>
        {/* Search + Filter dropdowns row */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by username, email, or phone number..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    if (value) setSearchParams({ q: value });
                    else setSearchParams({});
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white border border-slate-700 rounded-xl placeholder-slate-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Test Account Filter */}
            <div
              className="relative dropdown-container filter-dropdown-container"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setShowTestAccountFilter(!showTestAccountFilter)}
                className={`w-full px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-all duration-200 border text-sm font-medium ${
                  testAccountFilter !== null
                    ? "bg-slate-800/80 border-red-500/50 text-red-400 hover:bg-slate-700/80"
                    : "bg-slate-950/60 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span>Account Type</span>
                <div className="flex items-center gap-1.5">
                  {testAccountFilter !== null && (
                    <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-medium">
                      {testAccountFilter ? "Test" : "Real"}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${showTestAccountFilter ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {showTestAccountFilter && (
                <div
                  className="absolute top-full left-0 right-0 mt-3 rounded-xl p-4 z-[9999] min-w-[200px]"
                  style={{
                    backgroundColor: "#111827",
                    border: "2px solid #4B5563",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    backdropFilter: "none",
                  }}
                >
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer group py-1">
                      <input
                        type="radio"
                        name="testAccount"
                        checked={testAccountFilter === null}
                        onChange={() => toggleTestAccountFilter(null)}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-500 focus:ring-purple-500 focus:ring-2 flex-shrink-0"
                      />
                      <span className="text-white text-sm group-hover:text-purple-300 transition-colors whitespace-nowrap">
                        All Accounts
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer group py-1">
                      <input
                        type="radio"
                        name="testAccount"
                        checked={testAccountFilter === true}
                        onChange={() => toggleTestAccountFilter(true)}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-500 focus:ring-purple-500 focus:ring-2 flex-shrink-0"
                      />
                      <span className="text-white text-sm group-hover:text-purple-300 transition-colors whitespace-nowrap">
                        Test Accounts Only
                      </span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer group py-1">
                      <input
                        type="radio"
                        name="testAccount"
                        checked={testAccountFilter === false}
                        onChange={() => toggleTestAccountFilter(false)}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-500 focus:ring-purple-500 focus:ring-2 flex-shrink-0"
                      />
                      <span className="text-white text-sm group-hover:text-purple-300 transition-colors whitespace-nowrap">
                        Real Accounts Only
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Brand Filter */}
            <div
              className="relative dropdown-container filter-dropdown-container"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setShowBrandFilter(!showBrandFilter)}
                className={`w-full px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-all duration-200 border text-sm font-medium ${
                  brandFilter.length > 0
                    ? "bg-slate-800/80 border-red-500/50 text-red-400 hover:bg-slate-700/80"
                    : "bg-slate-950/60 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span>Brand</span>
                <div className="flex items-center gap-1.5">
                  {brandFilter.length > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-medium">
                      {brandFilter.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${showBrandFilter ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {showBrandFilter && (
                <div
                  className="absolute top-full left-0 right-0 mt-3 rounded-xl p-4 z-[9999] min-w-[200px]"
                  style={{
                    backgroundColor: "#111827",
                    border: "2px solid #4B5563",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    backdropFilter: "none",
                  }}
                >
                  <div
                    className="space-y-3 max-h-[180px] overflow-y-auto pr-2"
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#6B7280 #374151",
                    }}
                  >
                    {loadingBrands ? (
                      <div className="text-gray-400 text-sm">
                        Loading brands...
                      </div>
                    ) : brands.length === 0 ? (
                      <div className="text-gray-400 text-sm">
                        No brands available
                      </div>
                    ) : (
                      brands.map((brand) => (
                        <label
                          key={brand.id}
                          className="flex items-center space-x-3 cursor-pointer group py-1"
                        >
                          <input
                            type="checkbox"
                            checked={brandFilter.includes(brand.id)}
                            onChange={() => toggleBrandFilter(brand.id)}
                            className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-500 rounded focus:ring-purple-500 focus:ring-2 flex-shrink-0"
                          />
                          <span className="text-white text-sm group-hover:text-purple-300 transition-colors whitespace-nowrap">
                            {brand.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Players Table - match game-management */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Players
          </h3>
          <div className="flex items-center gap-2">
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400"></div>
            )}
            <button
              onClick={handleExportPlayers}
              title="Export"
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-center py-2 px-1 text-gray-400 font-medium text-sm w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedPlayers.size === players.length &&
                      players.length > 0
                    }
                    onChange={
                      selectedPlayers.size === players.length
                        ? clearAllSelections
                        : selectAllPlayers
                    }
                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-24">
                  Player ID
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("username")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Username</span>
                    <div className="flex flex-col">
                      {sortBy === "username" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-purple-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-purple-400" />
                        )
                      ) : (
                        <>
                          <ChevronUp className="h-2 w-2 text-gray-500 opacity-50" />
                          <ChevronDown className="h-2 w-2 text-gray-500 opacity-50 -mt-1" />
                        </>
                      )}
                    </div>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    <div className="flex flex-col">
                      {sortBy === "email" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-purple-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-purple-400" />
                        )
                      ) : (
                        <>
                          <ChevronUp className="h-2 w-2 text-gray-500 opacity-50" />
                          <ChevronDown className="h-2 w-2 text-gray-500 opacity-50 -mt-1" />
                        </>
                      )}
                    </div>
                  </div>
                </th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium text-sm w-32">
                  KYC Status
                </th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium text-sm w-32">
                  Withdrawals
                </th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium text-sm w-32">
                  Rakeback Tier
                </th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium text-sm w-20">
                  Status
                </th>
                <th
                  className="text-right py-2 px-2 text-gray-400 font-medium text-sm w-32 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Balance ($)</span>
                    <div className="flex flex-col">
                      {sortBy === "balance" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-purple-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-purple-400" />
                        )
                      ) : (
                        <>
                          <ChevronUp className="h-2 w-2 text-gray-500 opacity-50" />
                          <ChevronDown className="h-2 w-2 text-gray-500 opacity-50 -mt-1" />
                        </>
                      )}
                    </div>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-36 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Registered</span>
                    <div className="flex flex-col">
                      {sortBy === "created_at" ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-purple-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-purple-400" />
                        )
                      ) : (
                        <>
                          <ChevronUp className="h-2 w-2 text-gray-500 opacity-50" />
                          <ChevronDown className="h-2 w-2 text-gray-500 opacity-50 -mt-1" />
                        </>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                    player.isTestAccount
                      ? "bg-orange-900/20 hover:bg-orange-800/30"
                      : ""
                  }`}
                >
                  <td className="text-center py-2 px-1 w-10">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.id)}
                      onChange={() => togglePlayerSelection(player.id)}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                  </td>
                  <td className="py-2 pr-1 pl-2 text-gray-300">
                    <div className="flex items-center space-x-2">
                      <span
                        className="font-mono text-xs cursor-pointer hover:text-purple-400 hover:underline"
                        title={player.id}
                        onClick={() => setSelectedPlayer(player.id)}
                      >
                        {player.id ? player.id.slice(-8) : ""}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(player.id, `PlayerID-${player.id}`)
                        }
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Copy Player ID"
                      >
                        {copiedItems.has(`PlayerID-${player.id}`) ? (
                          <Check className="h-3 w-3 text-green-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 pl-1 pr-2 text-white font-medium text-sm">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="truncate max-w-[120px]"
                        title={player.username}
                      >
                        {player.username}
                      </span>
                      {player.isTestAccount && (
                        <span className="px-1.5 py-0.5 bg-orange-600 text-white text-xs rounded-full font-medium flex-shrink-0">
                          TEST
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-gray-300 text-sm">
                    <span
                      className="truncate block max-w-[160px]"
                      title={player.email}
                    >
                      {player.email || "N/A"}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          player.kycStatus === "ID_SOF_VERIFIED"
                            ? "text-green-400 bg-green-400/10"
                            : player.kycStatus === "ID_VERIFIED"
                              ? "text-purple-400 bg-purple-400/10"
                              : player.kycStatus === "PENDING" ||
                                  player.kycStatus === "NO_KYC"
                                ? "text-yellow-400 bg-yellow-400/10"
                                : player.kycStatus === "KYC_FAILED"
                                  ? "text-red-400 bg-red-400/10"
                                  : "text-gray-400 bg-gray-400/10"
                        }`}
                      >
                        {player.kycStatus === "NO_KYC"
                          ? "No KYC"
                          : player.kycStatus === "ID_VERIFIED"
                            ? "ID Verified"
                            : player.kycStatus === "ID_SOF_VERIFIED"
                              ? "ID + SOF Verified"
                              : player.kycStatus === "KYC_FAILED"
                                ? "KYC Failed"
                                : player.kycStatus}
                      </span>
                      {(player.kycStatus === "PENDING" ||
                        player.kycStatus === "NO_KYC") && (
                        <AlertTriangle className="h-3 w-3 text-yellow-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${withdrawalsBlockedById[player.id] ? "text-red-400 bg-red-400/10" : "text-green-400 bg-green-400/10"}`}
                    >
                      {withdrawalsBlockedById[player.id]
                        ? "Blocked"
                        : "Allowed"}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        player.vipLevel === "Bronze"
                          ? "text-amber-600 bg-amber-600/10"
                          : player.vipLevel === "Silver"
                            ? "text-gray-400 bg-gray-400/10"
                            : player.vipLevel === "Gold"
                              ? "text-yellow-500 bg-yellow-500/10"
                              : player.vipLevel === "Platinum"
                                ? "text-purple-400 bg-purple-400/10"
                                : "text-gray-500 bg-gray-500/10"
                      }`}
                    >
                      {player.vipLevel}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center space-x-2">
                      <div className="relative group">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(player.status)}`}
                        >
                          {player.status}
                        </span>
                        {player.status === "SUSPENDED" &&
                          player.suspensionReason && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                              <div className="font-semibold">
                                Suspension Reason:
                              </div>
                              <div>{player.suspensionReason}</div>
                              {player.suspensionNote && (
                                <>
                                  <div className="font-semibold mt-1">
                                    Note:
                                  </div>
                                  <div>{player.suspensionNote}</div>
                                </>
                              )}
                              {player.suspensionDate && (
                                <div className="text-gray-400 mt-1">
                                  Suspended:{" "}
                                  {new Date(
                                    player.suspensionDate,
                                  ).toLocaleDateString()}
                                </div>
                              )}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                          )}
                      </div>
                      {player.isEmailVerified && (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-white text-right font-medium text-sm">
                    ${player.currentBalance.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-gray-300 text-sm">
                    {player.registrationDate || player.createdAt ? (
                      <span
                        title={new Date(
                          player.registrationDate || player.createdAt,
                        ).toLocaleString()}
                      >
                        {new Date(
                          player.registrationDate || player.createdAt,
                        ).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="relative dropdown-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openDropdownId === player.id) {
                            setOpenDropdownId(null);
                            setDropdownPosition(null);
                          } else {
                            const rect =
                              e.currentTarget.getBoundingClientRect();

                            // Use viewport coordinates directly (getBoundingClientRect gives viewport-relative positions)
                            // Since dropdown uses 'fixed' positioning, we don't need to add scroll offsets
                            // Calculate position relative to viewport
                            const topPosition = rect.bottom + 4;
                            const leftPosition = rect.left + rect.width / 2;

                            // Ensure dropdown doesn't go below viewport - adjust if needed
                            const maxDropdownHeight = 400;
                            const viewportHeight = window.innerHeight;
                            const spaceBelow = viewportHeight - rect.bottom;

                            // If not enough space below, position above or limit height
                            let finalTop = topPosition;
                            if (spaceBelow < 100) {
                              // Position above if very little space below
                              finalTop = rect.top - 4;
                            }

                            setOpenDropdownId(player.id);
                            setDropdownPosition({
                              top: finalTop,
                              left: leftPosition,
                              above: spaceBelow < 100,
                            });
                          }
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg relative z-10"
                        title="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openDropdownId === player.id &&
                        dropdownPosition &&
                        typeof document !== "undefined" &&
                        createPortal(
                          <div
                            className="fixed rounded-lg z-[99999] min-w-[160px] action-dropdown-portal"
                            style={{
                              top: `${dropdownPosition.top}px`,
                              left: `${dropdownPosition.left}px`,
                              transform: "translateX(-50%)",
                              backgroundColor: "#111827",
                              border: "2px solid #4B5563",
                              boxShadow:
                                "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                              backdropFilter: "none",
                              maxHeight: `${Math.min(400, window.innerHeight - dropdownPosition.top - 8)}px`,
                              overflowY: "auto",
                              scrollbarWidth: "thin",
                              scrollbarColor: "#6B7280 #374151",
                              position: "fixed",
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlayer(player.id);
                                setOpenDropdownId(null);
                                setDropdownPosition(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View Details</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPlayer(player);
                                setOpenDropdownId(null);
                                setDropdownPosition(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit Details</span>
                            </button>
                            {withdrawalsBlockedById[player.id] ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnblockModalPlayer(player);
                                  setOpenDropdownId(null);
                                  setDropdownPosition(null);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <UserCheck className="h-4 w-4" />
                                <span>Unblock Withdrawals</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBlockModalPlayer(player);
                                  setOpenDropdownId(null);
                                  setDropdownPosition(null);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <UserX className="h-4 w-4" />
                                <span>Block Withdrawals</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFundManagementPlayer(player);
                                setOpenDropdownId(null);
                                setDropdownPosition(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <DollarSign className="h-4 w-4" />
                              <span>Manage Funds</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (player.status === "SUSPENDED") {
                                  handleUnsuspendPlayer(player.id);
                                } else {
                                  setSuspendingPlayer(player);
                                }
                                setOpenDropdownId(null);
                                setDropdownPosition(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center space-x-2 ${
                                player.status === "SUSPENDED"
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              <Ban className="h-4 w-4" />
                              <span>
                                {player.status === "SUSPENDED"
                                  ? "Unsuspend"
                                  : "Suspend"}
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResettingPasswordPlayer(player);
                                setOpenDropdownId(null);
                                setDropdownPosition(null);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Key className="h-4 w-4" />
                              <span>Reset Password</span>
                            </button>
                          </div>,
                          document.body,
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination - match game-management */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-700/80 bg-slate-800/30">
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * playersPerPage + 1} to{" "}
              {Math.min(currentPage * playersPerPage, totalPlayers)} of{" "}
              {totalPlayers} players
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors font-medium"
              >
                Previous
              </button>
              <span className="text-white text-sm flex items-center px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-700/80 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={(updatedPlayer: any) => {
            // Update the players list
            setPlayers((prev) =>
              prev.map((p) => {
                if (p.id === updatedPlayer.id) {
                  // Map camelCase back to the Player interface format
                  return {
                    ...p,
                    username: updatedPlayer.username,
                    email: updatedPlayer.email,
                    firstName: updatedPlayer.firstName,
                    lastName: updatedPlayer.lastName,
                    phoneNumber: updatedPlayer.phoneNumber,
                    country: updatedPlayer.country,
                    state: updatedPlayer.state,
                    city: updatedPlayer.city,
                    postalCode: updatedPlayer.postalCode,
                    streetAddress: updatedPlayer.streetAddress,
                    dateOfBirth: updatedPlayer.dateOfBirth,
                    status: updatedPlayer.status,
                    kycStatus: updatedPlayer.kycStatus,
                    isEmailVerified: updatedPlayer.isEmailVerified,
                    defaultCurrency: updatedPlayer.defaultCurrency,
                    walletVerificationStatus:
                      updatedPlayer.walletVerificationStatus,
                    ...(('isTestAccount' in updatedPlayer && updatedPlayer.isTestAccount !== undefined) && {
                      isTestAccount: (updatedPlayer as any).isTestAccount,
                    }),
                    ...(updatedPlayer.withdrawalLimit !== undefined && {
                      withdrawalLimit: updatedPlayer.withdrawalLimit,
                    }),
                    ...(updatedPlayer.withdrawalAllTimeLimit !== undefined && {
                      withdrawalAllTimeLimit:
                        updatedPlayer.withdrawalAllTimeLimit,
                    }),
                    ...(updatedPlayer.withdrawalLimitEnabled !== undefined && {
                      withdrawalLimitEnabled:
                        updatedPlayer.withdrawalLimitEnabled,
                    }),
                  } as Player;
                }
                return p;
              }),
            );
            setEditingPlayer(null);
            // If we're viewing this player's details, refresh the view by updating selectedPlayer
            if (selectedPlayer === updatedPlayer.id) {
              // Trigger a re-render by briefly clearing and resetting selectedPlayer
              setSelectedPlayer(null);
              setTimeout(() => setSelectedPlayer(updatedPlayer.id), 0);
            }
          }}
        />
      )}

      {fundManagementPlayer && (
        <FundManagementModal
          player={fundManagementPlayer}
          onClose={() => setFundManagementPlayer(null)}
          onFundManagement={(playerId, amount, type, description) => {
            console.log("Fund management:", {
              playerId,
              amount,
              type,
              description,
            });
            setFundManagementPlayer(null);
            fetchPlayers(currentPage, searchTerm); // Refresh the list
          }}
        />
      )}

      {suspendingPlayer && (
        <SuspendPlayerModal
          player={suspendingPlayer}
          onClose={() => setSuspendingPlayer(null)}
          onSuspend={handleSuspendPlayer}
        />
      )}

      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchPlayers(currentPage, searchTerm);
          }}
        />
      )}

      {/* Block Withdrawals Modal */}
      {blockModalPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Block Withdrawals
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Player:{" "}
                <span className="text-white">{blockModalPlayer.username}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  rows={3}
                  placeholder="Enter reason for blocking withdrawals..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setBlockModalPlayer(null);
                  setBlockReason("");
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmBlockWithdrawals}
                disabled={processingBlock || !blockReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {processingBlock ? "Blocking..." : "Block Withdrawals"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Withdrawals Modal */}
      {unblockModalPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Unblock Withdrawals
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Player:{" "}
                <span className="text-white">
                  {unblockModalPlayer.username}
                </span>
              </p>
            </div>
            <div className="p-6 text-gray-300">
              Are you sure you want to unblock withdrawals for this player?
            </div>
            <div className="p-6 border-t border-gray-700 flex items-center justify-end space-x-3">
              <button
                onClick={() => setUnblockModalPlayer(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnblockWithdrawals}
                disabled={processingBlock}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
              >
                {processingBlock ? "Unblocking..." : "Unblock Withdrawals"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingPasswordPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Key className="h-5 w-5 text-purple-400" />
                <span>Reset Password</span>
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Player:{" "}
                <span className="text-white">
                  {resettingPasswordPlayer.username}
                </span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-300">
                Are you sure you want to reset the password for{" "}
                <span className="font-semibold text-white">
                  {resettingPasswordPlayer.username}
                </span>
                ?
              </p>
              <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Note:</strong> A new random password will be generated
                  and sent to the player's email:
                </p>
                <p className="text-yellow-300 text-sm mt-1 font-mono">
                  {resettingPasswordPlayer.email}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex items-center justify-end space-x-3">
              <button
                onClick={() => setResettingPasswordPlayer(null)}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                {isResettingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
