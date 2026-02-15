import React, { useState, useEffect } from 'react';
import { GameActivityTable } from './GameActivityTable';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CheckCircle,
  Ban,
  DollarSign,
  Copy,
  Check,
  Filter,
  ArrowUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  Phone,
  MonitorSmartphone,
  Banknote,
} from 'lucide-react';
import { useServices } from '../../contexts/ServicesContext';
import { cashbackService } from '../../services/cashbackService';
import { KYCManagement } from '../kyc/KYCManagement';
import toast from 'react-hot-toast';
import axios from 'axios';
import { config } from '../../config/load-config';

/**
 * Deduplicates transactions by preferring completed over pending
 * Identifies duplicates by: round_id + bet_amount + game_id (or transaction_id if round_id missing)
 * If same transaction exists as both pending and completed, keeps only the completed one
 */
function deduplicateTransactions(transactions: any[]): any[] {
  const seen = new Map<string, any>();

  for (const tx of transactions) {
    // Create a unique key based on round_id + bet_amount + game_id
    // If round_id is missing, use transaction_id as fallback
    const roundId = tx.round_id || tx.id || tx.transaction_id || '';
    const betAmount = tx.bet_amount || tx.amount || '0';
    const gameId = tx.game_id || '';
    const key = `${roundId}_${betAmount}_${gameId}`;

    // If we haven't seen this transaction, add it
    if (!seen.has(key)) {
      seen.set(key, tx);
    } else {
      // If we've seen it, prefer completed over pending
      const existing = seen.get(key);
      if (existing.status === 'pending' && tx.status === 'completed') {
        seen.set(key, tx); // Replace pending with completed
      } else if (existing.status === 'completed' && tx.status === 'pending') {
        // Keep the existing completed one, ignore pending
        continue;
      } else {
        // Both same status, keep the one with later updated_at or created_at
        const existingTime = new Date(
          existing.updated_at || existing.created_at || 0,
        ).getTime();
        const currentTime = new Date(
          tx.updated_at || tx.created_at || 0,
        ).getTime();
        if (currentTime > existingTime) {
          seen.set(key, tx);
        }
      }
    }
  }

  return Array.from(seen.values());
}

interface Player {
  id: string;
  username: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  street_address: string;
  country: string;
  state: string;
  city: string;
  postal_code: string;
  kyc_status: string;
  is_email_verified: boolean;
  referral_code: string;
  user_type: string;
  type: string;
  status: string;
  default_currency: string;
  profile_picture: string;
  created_at: string;
  source?: string;
}

interface Balance {
  id: string;
  user_id: string;
  currency_code: string;
  real_money?: string;
  bonus_money?: string;
  points?: number;
  updated_at?: string;
  // Fallback fields from balances table
  amount_units?: string;
  reserved_units?: string;
  amount_cents?: number;
  reserved_cents?: number;
}

interface SuspensionHistory {
  id: string;
  user_id: string;
  blocked_by: string;
  duration: string;
  type: string;
  blocked_from: string | null;
  blocked_to: string | null;
  unblocked_at: string | null;
  reason: string;
  note: string;
  created_at: string;
  blocked_by_username: string;
  blocked_by_email: string;
}

interface GameActivity {
  game: string;
  provider: string;
  sessions: number;
  total_wagered: string;
  net_result: string;
  last_played: string;
  favorite_game: boolean;
}

interface Wager {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: string;
  currency: string;
  status: string;
  game_id: string;
  game_name: string;
  provider: string;
  session_id: string;
  round_id?: string;
  bet_amount?: string;
  win_amount?: string;
  net_result?: string;
  balance_before?: string;
  balance_after?: string;
  external_transaction_id?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

interface WagersResponse {
  success: boolean;
  data: Wager[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

interface PlayerStatistics {
  total_wagered: string;
  net_pl: string;
  sessions: number;
  total_bets: number;
  total_wins: number;
  total_losses: number;
  win_rate: string;
  avg_bet_size: string;
  last_activity: string;
}

interface PlayerDetailsData {
  player: Player;
  suspension_history: SuspensionHistory[];
  balance_logs: any[];
  balances: Balance[];
  game_activity: GameActivity[];
  statistics: PlayerStatistics;
}

interface PlayerDetailsProps {
  player: Player;
  onBack: () => void;
  onEdit: () => void;
  onSuspend: (reason: string) => void;
  onUnsuspend: () => void;
  onFundManagement: () => void;
}

export const PlayerDetails: React.FC<PlayerDetailsProps> = ({
  player,
  onBack,
  onEdit,
  onSuspend,
  onUnsuspend,
  onFundManagement,
}) => {
  const { adminSvc } = useServices();
  const [activeTab, setActiveTab] = useState('transactions');
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 5;
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Pagination for transactions (analytics)
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPerPageCount] = useState(50); // Items per page for analytics transactions
  const [transactionsMeta, setTransactionsMeta] = useState<{
    total: number;
    page: number;
    page_size: number;
    pages: number;
    total_bet_amount?: string;
    total_win_amount?: string;
  } | null>(null);

  // Pagination for game activity/wagers
  const [wagersPage, setWagersPage] = useState(1);
  const [wagersPerPage] = useState(10);

  // Pagination for Rakeback and tips
  const [claimedRakebackPage, setClaimedRakebackPage] = useState(1);
  const [claimedRakebackPerPage] = useState(10);
  const [claimedRakebackMeta, setClaimedRakebackMeta] = useState<any>(null);

  const [earnedRakebackPage, setEarnedRakebackPage] = useState(1);
  const [earnedRakebackPerPage] = useState(10);
  const [earnedRakebackMeta, setEarnedRakebackMeta] = useState<any>(null);

  const [tipTransactionsPage, setTipTransactionsPage] = useState(1);
  const [tipTransactionsPerPage] = useState(10);
  const [tipTransactionsMeta, setTipTransactionsMeta] = useState<any>(null);

  // Cashback tiers for level calculation
  const [cashbackTiers, setCashbackTiers] = useState<any[]>([]);
  const [levelProgressionInfo, setLevelProgressionInfo] = useState<any>(null);
  const [levelProgressionLoading, setLevelProgressionLoading] = useState(false);

  // Separate loading states for different data sections
  const [playerLoading, setPlayerLoading] = useState(true);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [gameActivityLoading, setGameActivityLoading] = useState(true);
  const [suspensionLoading, setSuspensionLoading] = useState(true);
  const [wagersLoading, setWagersLoading] = useState(true);

  // Separate state for different data sections
  const [playerDetails, setPlayerDetails] = useState<PlayerDetailsData | null>(
    null,
  );
  const [statistics, setStatistics] = useState<PlayerStatistics | null>(null);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
  const [gameActivity, setGameActivity] = useState<GameActivity[]>([]);
  const [suspensionHistory, setSuspensionHistory] = useState<
    SuspensionHistory[]
  >([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [manualFunds, setManualFunds] = useState<any[]>([]);
  const [manualFundsLoading, setManualFundsLoading] = useState(true);
  const [manualFundsPage, setManualFundsPage] = useState(1);
  const [manualFundsPerPage] = useState(10);
  const [manualFundsTotal, setManualFundsTotal] = useState(0);
  // wagers and wagersMeta are now handled by GameActivityTable component
  // Keeping wagersMeta only for summary card total count
  const [wagersMeta, setWagersMeta] = useState<WagersResponse['meta'] | null>(
    null,
  );
  const [transactionsData, setTransactionsData] = useState<any[]>([]);
  const [transactionTotals, setTransactionTotals] = useState<{
    total_bet_amount?: number | string;
    total_win_amount?: number | string;
    net_result?: number | string;
  } | null>(null);

  // New sections state
  const [claimedRakeback, setClaimedRakeback] = useState<any[]>([]);
  const [claimedRakebackLoading, setClaimedRakebackLoading] = useState(false);
  const [earnedRakeback, setEarnedRakeback] = useState<any[]>([]);
  const [earnedRakebackLoading, setEarnedRakebackLoading] = useState(false);
  const [expandedEarnedRakebackRow, setExpandedEarnedRakebackRow] = useState<
    string | null
  >(null);
  const [tipTransactions, setTipTransactions] = useState<any[]>([]);
  const [tipTransactionsLoading, setTipTransactionsLoading] = useState(false);
  const [rakebackSummary, setRakebackSummary] = useState<any>(null);
  const [rakebackSummaryLoading, setRakebackSummaryLoading] = useState(false);

  // Deposits state
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [depositsPage, setDepositsPage] = useState(1);
  const [depositsPerPage] = useState(10);
  const [depositsMeta, setDepositsMeta] = useState<{
    total: number;
    page: number;
    page_size: number;
    pages: number;
  } | null>(null);

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsPerPage] = useState(10);
  const [, setWithdrawalsMeta] = useState<{
    total: number;
    page: number;
    page_size: number;
    pages: number;
  } | null>(null);

  // Welcome Bonus state
  const [welcomeBonus, setWelcomeBonus] = useState<any[]>([]);
  const [welcomeBonusLoading, setWelcomeBonusLoading] = useState(false);
  const [welcomeBonusPage, setWelcomeBonusPage] = useState(1);
  const [welcomeBonusPerPage] = useState(10);
  const [welcomeBonusMeta, setWelcomeBonusMeta] = useState<{
    total: number;
    page: number;
    page_size: number;
    pages: number;
  } | null>(null);

  // Transaction filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [transactionTypeFilter, setTransactionTypeFilter] =
    useState<string>('');
  // sourceFilter removed - all transactions are now shown together
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Copy functionality state
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

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
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Calculate cashback level based on total wagered amount
  const calculateCashbackLevel = (
    totalWagered: number,
    cashbackTiers: any[],
  ) => {
    if (!cashbackTiers || cashbackTiers.length === 0) {
      return 'Bronze'; // Default level
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

  // Fetch cashback tiers
  const fetchCashbackTiers = async () => {
    try {
      const response = await adminSvc.get('/cashback/tiers');
      if (response.success && response.data) {
        setCashbackTiers(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch cashback tiers:', err);
      // Fallback to mock data
      setCashbackTiers([
        { tier_name: 'Bronze', tier_level: 1, min_ggr_required: 0 },
        { tier_name: 'Silver', tier_level: 2, min_ggr_required: 1000 },
        { tier_name: 'Gold', tier_level: 3, min_ggr_required: 5000 },
        { tier_name: 'Platinum', tier_level: 4, min_ggr_required: 15000 },
        { tier_name: 'Diamond', tier_level: 5, min_ggr_required: 50000 },
      ]);
    }
  };

  // Fetch level progression info
  const fetchLevelProgressionInfo = async () => {
    try {
      setLevelProgressionLoading(true);
      const info = await cashbackService.getLevelProgressionInfo(player.id);
      setLevelProgressionInfo(info);
    } catch (err) {
      console.error('Failed to fetch level progression info:', err);
      // Don't show error toast, just log it
    } finally {
      setLevelProgressionLoading(false);
    }
  };

  // Process level progression manually
  const handleProcessLevelProgression = async () => {
    try {
      setLevelProgressionLoading(true);
      const result = await cashbackService.processSingleLevelProgression(
        player.id,
      );

      if (result.success) {
        toast.success(
          result.message || 'Level progression processed successfully',
        );
        // Refresh level progression info to show updated data
        await fetchLevelProgressionInfo();
      } else {
        toast.error(result.message || 'Failed to process level progression');
      }
    } catch (err: any) {
      console.error('Failed to process level progression:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to process level progression';
      toast.error(errorMessage);
    } finally {
      setLevelProgressionLoading(false);
    }
  };

  // Fetch basic player details first
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        setPlayerLoading(true);
        const response = await adminSvc.get(`/players/${player.id}/details`);
        console.log('Player details response:', response);
        const playerData = response.data?.data || response.data;
        setPlayerDetails(playerData);
        setPlayerLoading(false);
      } catch (error) {
        console.error('Failed to fetch player details:', error);
        toast.error('Failed to load player details');
        setPlayerLoading(false);
      }
    };

    fetchPlayerDetails();
  }, [player.id, adminSvc]);

  // Fetch statistics separately
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setStatisticsLoading(true);
        const response = await adminSvc.get(`/players/${player.id}/details`);

        // Fix: Access the correct nested structure
        const statisticsData =
          response.data?.data?.statistics || response.data?.statistics;
        setStatistics(statisticsData);
        setStatisticsLoading(false);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
        setStatisticsLoading(false);
      }
    };

    fetchStatistics();
  }, [player.id, adminSvc]);

  // Fetch transaction history separately
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const response = await adminSvc.get(`/players/${player.id}/details`);
        const logs = response.data.balance_logs || [];
        // Sort by timestamp in descending order (newest first)
        const sortedLogs = [...logs].sort((a, b) => {
          const dateA = new Date(a.timestamp || a.created_at || 0).getTime();
          const dateB = new Date(b.timestamp || b.created_at || 0).getTime();
          return dateB - dateA; // Descending order
        });
        setBalanceLogs(sortedLogs);
        setTransactionsLoading(false);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [player.id, adminSvc]);

  // Fetch cashback tiers
  useEffect(() => {
    fetchCashbackTiers();
  }, []);

  // Fetch level progression info
  useEffect(() => {
    fetchLevelProgressionInfo();
  }, [player.id]);

  // Fetch transactions data with pagination
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setWagersLoading(true);
        // Calculate offset based on current page
        const offset = (transactionsPage - 1) * transactionsPerPageCount;

        // Use axios directly to get the full response with meta
        const baseURL = config.adminApiUrl;
        const token = localStorage.getItem('access_token');

        const params: any = {
          limit: transactionsPerPageCount,
          offset: offset,
        };

        if (statusFilter) {
          params.status = statusFilter;
        }

        if (searchQuery) {
          params.search = searchQuery;
        }

        if (transactionTypeFilter) {
          // Map frontend filter values to API expected values
          let apiTransactionType = transactionTypeFilter;
          if (transactionTypeFilter === 'claimed_rakeback') {
            apiTransactionType = 'claimed';
          } else if (transactionTypeFilter === 'earned_rakeback') {
            apiTransactionType = 'earned';
          }
          params.transaction_type = apiTransactionType;
        }

        const fullResponse = await axios.get(
          `${baseURL}/analytics/users/${player.id}/transactions`,
          {
            params,
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          },
        );

        console.log('Transactions API response:', fullResponse.data);

        const apiResponse = fullResponse.data;
        if (apiResponse.success && apiResponse.data) {
          // The response structure is: { success: true, data: [...], meta: {...} }
          // Handle null or undefined data
          const dataArray = Array.isArray(apiResponse.data)
            ? apiResponse.data
            : [];

          // Deduplicate transactions (prefer completed over pending)
          const deduplicatedData = deduplicateTransactions(dataArray);

          // Sort by timestamp/created_at in descending order (newest first)
          const sortedData = [...deduplicatedData].sort((a, b) => {
            const dateA = new Date(
              a.timestamp || a.created_at || a.date || 0,
            ).getTime();
            const dateB = new Date(
              b.timestamp || b.created_at || b.date || 0,
            ).getTime();
            return dateB - dateA; // Descending order
          });
          setTransactionsData(sortedData);

          // Set meta for transactions pagination
          const meta = apiResponse.meta;
          if (meta) {
            setTransactionsMeta({
              total: meta.total ?? 0,
              page: meta.page ?? transactionsPage,
              page_size: meta.page_size ?? transactionsPerPageCount,
              pages: meta.pages ?? 0,
              total_bet_amount: meta.total_bet_amount,
              total_win_amount: meta.total_win_amount,
            });
            // Only update wagersMeta if it's not already set (preserve it when switching tabs)
            setWagersMeta(
              (prev) =>
                prev || {
                  total: meta.total ?? 0,
                  page: meta.page ?? transactionsPage,
                  page_size: meta.page_size ?? transactionsPerPageCount,
                  pages: meta.pages ?? 0,
                },
            );
          } else {
            setTransactionsMeta(null);
            // Don't reset wagersMeta if it exists (preserve it when switching tabs)
          }
        } else {
          // Handle case where response.data is null or undefined
          setTransactionsData([]);
          setTransactionsMeta(null);
          // Don't reset wagersMeta (preserve it when switching tabs)
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        toast.error('Failed to fetch transactions data');
        // Set empty arrays on error
        setTransactionsData([]);
        setTransactionsMeta(null);
        // Don't reset wagersMeta (preserve it when switching tabs)
      } finally {
        setWagersLoading(false);
      }
    };

    fetchTransactions();
  }, [
    player.id,
    statusFilter,
    transactionTypeFilter,
    transactionsPage,
    transactionsPerPageCount,
    searchQuery,
  ]);

  // Fetch game activity meta on initial load to get total count
  useEffect(() => {
    const fetchGameActivityMeta = async () => {
      try {
        // Fetch just the meta with limit=1 to get total count quickly
        // Use admin API endpoint (from ClickHouse analytics)
        const params: any = {
          limit: 1,
          offset: 0,
        };

        const response: any = await adminSvc.get(
          `/analytics/users/${player.id}/transactions`,
          {
            params,
          },
        );

        const meta = response.meta;

        if (meta) {
          setWagersMeta({
            total: meta.total ?? 0,
            page: meta.page ?? 1,
            page_size: meta.page_size ?? wagersPerPage,
            pages: meta.pages ?? 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch game activity meta:', error);
      }
    };

    // Fetch meta on initial load
    fetchGameActivityMeta();
  }, [player.id, wagersPerPage, adminSvc]);

  // Game activity data fetching is now handled by GameActivityTable component
  // Only fetch meta for summary card total count

  // Fetch transaction totals (for Total Wagered calculation)
  // Only count completed transactions to avoid duplicates (pending transactions are later marked as completed)
  useEffect(() => {
    const fetchTransactionTotals = async () => {
      if (!player.id) return;

      try {
        const response = await adminSvc.get(
          `/analytics/users/${player.id}/transactions/totals`,
          {
            params: {
              status: 'completed', // Only count completed transactions to avoid duplicates
            },
          },
        );
        if (response.success && response.data) {
          setTransactionTotals(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch transaction totals:', error);
      }
    };

    fetchTransactionTotals();
  }, [player.id, adminSvc]);

  // Reset pagination when switching tabs or changing player
  useEffect(() => {
    setWagersPage(1);
    setTransactionsPage(1);
    setCurrentPage(1);
    setClaimedRakebackPage(1);
    setEarnedRakebackPage(1);
    setTipTransactionsPage(1);
  }, [player.id, activeTab]);

  // Fetch suspension history separately
  useEffect(() => {
    const fetchSuspensionHistory = async () => {
      try {
        setSuspensionLoading(true);
        const response: any = await adminSvc.get(
          `/players/${player.id}/details`,
        );

        // Fix: Access the correct nested structure
        const suspensionData =
          response.data?.data?.suspension_history ||
          response.data?.suspension_history ||
          [];
        setSuspensionHistory(suspensionData);
        setSuspensionLoading(false);
      } catch (error) {
        console.error('Failed to fetch suspension history:', error);
        setSuspensionLoading(false);
      }
    };

    fetchSuspensionHistory();
  }, [player.id, adminSvc]);

  // Fetch claimed Rakeback
  useEffect(() => {
    const fetchClaimedRakeback = async () => {
      try {
        setClaimedRakebackLoading(true);
        const offset = (claimedRakebackPage - 1) * claimedRakebackPerPage;
        const response: any = await adminSvc.get(
          `/analytics/users/${player.id}/rakeback`,
          {
            params: {
              limit: claimedRakebackPerPage,
              offset: offset,
              transaction_type: 'claimed',
            },
          },
        );
        if (response.success && response.data) {
          // Response format: { success: true, data: [...], meta: {...} }
          const data = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          setClaimedRakeback(data);
          setClaimedRakebackMeta(response.meta);
        }
        setClaimedRakebackLoading(false);
      } catch (error) {
        console.error('Failed to fetch claimed Rakeback:', error);
        setClaimedRakebackLoading(false);
      }
    };

    // Always fetch claimed rakeback when on transactions tab
    if (activeTab === 'transactions') {
      fetchClaimedRakeback();
    }
  }, [
    player.id,
    activeTab,
    adminSvc,
    claimedRakebackPage,
    claimedRakebackPerPage,
  ]);

  // Fetch earned Rakeback
  useEffect(() => {
    const fetchEarnedRakeback = async () => {
      try {
        setEarnedRakebackLoading(true);
        const offset = (earnedRakebackPage - 1) * earnedRakebackPerPage;
        const response = await adminSvc.get(
          `/analytics/users/${player.id}/rakeback`,
          {
            params: {
              limit: earnedRakebackPerPage,
              offset: offset,
              transaction_type: 'earned',
            },
          },
        );
        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          setEarnedRakeback(data);
          setEarnedRakebackMeta(response.meta);
        }
        setEarnedRakebackLoading(false);
      } catch (error) {
        console.error('Failed to fetch earned Rakeback:', error);
        setEarnedRakebackLoading(false);
      }
    };

    // Always fetch earned rakeback when on transactions tab
    if (activeTab === 'transactions') {
      fetchEarnedRakeback();
    }
  }, [
    player.id,
    activeTab,
    adminSvc,
    earnedRakebackPage,
    earnedRakebackPerPage,
  ]);

  // Fetch tip transactions
  useEffect(() => {
    const fetchTipTransactions = async () => {
      try {
        setTipTransactionsLoading(true);
        const offset = (tipTransactionsPage - 1) * tipTransactionsPerPage;
        const response = await adminSvc.get(
          `/analytics/users/${player.id}/tips`,
          {
            params: {
              limit: tipTransactionsPerPage,
              offset: offset,
            },
          },
        );
        if (response.success && response.data) {
          // Response format: { success: true, data: [...], meta: {...} }
          const data = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          setTipTransactions(data);
          setTipTransactionsMeta(response.meta);
        }
        setTipTransactionsLoading(false);
      } catch (error) {
        console.error('Failed to fetch tip transactions:', error);
        setTipTransactionsLoading(false);
      }
    };

    // Fetch tips for both "tips" tab and "transactions" tab (to include in All transactions)
    if (activeTab === 'tips' || activeTab === 'transactions') {
      fetchTipTransactions();
    }
  }, [
    player.id,
    activeTab,
    adminSvc,
    tipTransactionsPage,
    tipTransactionsPerPage,
  ]);

  // Fetch player Rakeback summary
  // Fetch rakeback summary on component load (needed for NGR calculation)
  useEffect(() => {
    const fetchRakebackSummary = async () => {
      try {
        setRakebackSummaryLoading(true);
        const response = await adminSvc.get(
          `/analytics/users/${player.id}/rakeback/totals`,
        );
        if (response.success && response.data) {
          // Response format: { success: true, data: { total_earned_count, total_earned_amount, total_claimed_count, total_claimed_amount, available_rakeback } }
          const summaryData = response.data.data || response.data;
          setRakebackSummary(summaryData);
        }
        setRakebackSummaryLoading(false);
      } catch (error) {
        console.error('Failed to fetch Rakeback summary:', error);
        setRakebackSummaryLoading(false);
      }
    };

    // Fetch on component load (needed for NGR calculation) and when tab is active
    fetchRakebackSummary();
  }, [player.id, adminSvc]);

  // Fetch deposits
  useEffect(() => {
    const fetchDeposits = async () => {
      if (activeTab !== 'transactions' || !player.id) return;

      try {
        setDepositsLoading(true);
        const token = localStorage.getItem('access_token');
        const offset = (depositsPage - 1) * depositsPerPage;

        const response = await axios.get(`${config.walletApiUrl}/deposits`, {
          params: {
            limit: depositsPerPage,
            offset: offset,
            search: player.id,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.data) {
          // Handle nested structure: response.data.data.deposits or response.data.deposits
          let depositsArray = [];
          if (response.data.data && response.data.data.deposits) {
            depositsArray = Array.isArray(response.data.data.deposits)
              ? response.data.data.deposits
              : [];
          } else if (response.data.deposits) {
            depositsArray = Array.isArray(response.data.deposits)
              ? response.data.deposits
              : [];
          } else if (Array.isArray(response.data.data)) {
            depositsArray = response.data.data;
          } else if (Array.isArray(response.data)) {
            depositsArray = response.data;
          }

          // Ensure we only show exactly 10 items per page
          const paginatedData = depositsArray.slice(0, depositsPerPage);
          setDeposits(paginatedData);

          // Set meta if available - check for total_count in data object
          const totalCount =
            response.data.data?.total_count ||
            response.data.total_count ||
            depositsArray.length;
          if (response.data.meta) {
            setDepositsMeta({
              total: response.data.meta.total || totalCount,
              page: response.data.meta.page || depositsPage,
              page_size: response.data.meta.page_size || depositsPerPage,
              pages:
                response.data.meta.pages ||
                Math.ceil(
                  (response.data.meta.total || totalCount) / depositsPerPage,
                ),
            });
          } else {
            setDepositsMeta({
              total: totalCount,
              page: depositsPage,
              page_size: depositsPerPage,
              pages: Math.ceil(totalCount / depositsPerPage),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch deposits:', error);
        toast.error('Failed to fetch deposits');
        setDeposits([]);
        setDepositsMeta(null);
      } finally {
        setDepositsLoading(false);
      }
    };

    fetchDeposits();
  }, [player.id, activeTab, depositsPage, depositsPerPage]);

  // Fetch withdrawals
  useEffect(() => {
    const fetchWithdrawals = async () => {
      if (activeTab !== 'transactions' || !player.id) return;

      try {
        setWithdrawalsLoading(true);
        const token = localStorage.getItem('access_token');
        const offset = (withdrawalsPage - 1) * withdrawalsPerPage;

        const response = await axios.get(`${config.walletApiUrl}/withdrawals`, {
          params: {
            limit: withdrawalsPerPage,
            offset: offset,
            search: player.id,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.data) {
          // Handle nested structure: response.data.data.withdrawals or response.data.withdrawals
          let withdrawalsArray = [];
          if (response.data.data && response.data.data.withdrawals) {
            withdrawalsArray = Array.isArray(response.data.data.withdrawals)
              ? response.data.data.withdrawals
              : [];
          } else if (response.data.withdrawals) {
            withdrawalsArray = Array.isArray(response.data.withdrawals)
              ? response.data.withdrawals
              : [];
          } else if (Array.isArray(response.data.data)) {
            withdrawalsArray = response.data.data;
          } else if (Array.isArray(response.data)) {
            withdrawalsArray = response.data;
          }

          // Ensure we only show exactly 10 items per page
          const paginatedData = withdrawalsArray.slice(0, withdrawalsPerPage);
          setWithdrawals(paginatedData);

          // Set meta if available - check for total_count in data object
          const totalCount =
            response.data.data?.total_count ||
            response.data.total_count ||
            withdrawalsArray.length;
          if (response.data.meta) {
            setWithdrawalsMeta({
              total: response.data.meta.total || totalCount,
              page: response.data.meta.page || withdrawalsPage,
              page_size: response.data.meta.page_size || withdrawalsPerPage,
              pages:
                response.data.meta.pages ||
                Math.ceil(
                  (response.data.meta.total || totalCount) / withdrawalsPerPage,
                ),
            });
          } else {
            setWithdrawalsMeta({
              total: totalCount,
              page: withdrawalsPage,
              page_size: withdrawalsPerPage,
              pages: Math.ceil(totalCount / withdrawalsPerPage),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch withdrawals:', error);
        toast.error('Failed to fetch withdrawals');
        setWithdrawals([]);
        setWithdrawalsMeta(null);
      } finally {
        setWithdrawalsLoading(false);
      }
    };

    fetchWithdrawals();
  }, [player.id, activeTab, withdrawalsPage, withdrawalsPerPage]);

  // Fetch welcome bonus
  useEffect(() => {
    const fetchWelcomeBonus = async () => {
      if (activeTab !== 'welcome-bonus' || !player.id) return;

      try {
        setWelcomeBonusLoading(true);
        const offset = (welcomeBonusPage - 1) * welcomeBonusPerPage;

        const response: any = await adminSvc.get(
          `/analytics/users/${player.id}/welcome_bonus`,
          {
            params: {
              limit: welcomeBonusPerPage,
              offset: offset,
            },
          },
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data)
              ? response.data
              : [];

          // Ensure we only show exactly 10 items per page
          const paginatedData = data.slice(0, welcomeBonusPerPage);
          setWelcomeBonus(paginatedData);

          // Set meta if available
          if (response.meta) {
            setWelcomeBonusMeta({
              total: response.meta.total || data.length,
              page: response.meta.page || welcomeBonusPage,
              page_size: response.meta.page_size || welcomeBonusPerPage,
              pages:
                response.meta.pages ||
                Math.ceil(
                  (response.meta.total || data.length) / welcomeBonusPerPage,
                ),
            });
          } else {
            setWelcomeBonusMeta({
              total: data.length,
              page: welcomeBonusPage,
              page_size: welcomeBonusPerPage,
              pages: Math.ceil(data.length / welcomeBonusPerPage),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch welcome bonus:', error);
        toast.error('Failed to fetch welcome bonus transactions');
        setWelcomeBonus([]);
        setWelcomeBonusMeta(null);
      } finally {
        setWelcomeBonusLoading(false);
      }
    };

    fetchWelcomeBonus();
  }, [player.id, activeTab, welcomeBonusPage, welcomeBonusPerPage, adminSvc]);

  // Fetch balances separately
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const response = await adminSvc.get(`/players/${player.id}/details`);
        console.log('Player details response:', response);
        console.log('Response data:', response.data);

        // Fix: Access the correct nested structure
        const balancesData =
          response.data?.data?.balances || response.data?.balances || [];
        console.log('Balances data:', balancesData);
        setBalances(balancesData);
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      }
    };

    fetchBalances();
  }, [player.id, adminSvc]);

  // Fetch manual fund transactions when transactions tab is active
  useEffect(() => {
    if (activeTab === 'transactions') {
      const fetchManualFunds = async () => {
        try {
          setManualFundsLoading(true);
          const response = await adminSvc.get(
            `/players/${player.id}/manual-funds`,
            {
              params: {
                page: manualFundsPage,
                per_page: manualFundsPerPage,
              },
            },
          );
          console.log('Manual funds response:', response);
          console.log('Response data structure:', {
            hasData: !!response.data,
            hasDataData: !!response.data?.data,
            hasManualFunds: !!response.data?.data?.manual_funds,
            manualFundsLength: response.data?.data?.manual_funds?.length,
            pagination: response.data?.data?.pagination,
          });

          if (response.data && response.data.data) {
            const funds = response.data.data.manual_funds || [];
            // Sort by created_at in descending order (newest first)
            const sortedFunds = [...funds].sort((a, b) => {
              const dateA = new Date(
                a.created_at || a.timestamp || 0,
              ).getTime();
              const dateB = new Date(
                b.created_at || b.timestamp || 0,
              ).getTime();
              return dateB - dateA; // Descending order
            });
            setManualFunds(sortedFunds);
            setManualFundsTotal(
              response.data.data.pagination?.total_count || 0,
            );
          } else if (response.data && response.data.manual_funds) {
            // Handle direct response structure
            const funds = response.data.manual_funds || [];
            // Sort by created_at in descending order (newest first)
            const sortedFunds = [...funds].sort((a, b) => {
              const dateA = new Date(
                a.created_at || a.timestamp || 0,
              ).getTime();
              const dateB = new Date(
                b.created_at || b.timestamp || 0,
              ).getTime();
              return dateB - dateA; // Descending order
            });
            setManualFunds(sortedFunds);
            setManualFundsTotal(response.data.pagination?.total_count || 0);
          } else {
            console.log('No manual funds data found in response');
            setManualFunds([]);
            setManualFundsTotal(0);
          }
          setManualFundsLoading(false);
        } catch (error) {
          console.error('Failed to fetch manual funds:', error);
          setManualFundsLoading(false);
        }
      };

      fetchManualFunds();
    }
  }, [player.id, adminSvc, manualFundsPage, manualFundsPerPage, activeTab]);

  // sourceFilter removed - no longer needed

  // Pagination logic for balance logs
  const totalPages = Math.ceil(balanceLogs.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const currentTransactions = balanceLogs.slice(startIndex, endIndex);

  // Calculate filtered transaction counts (including tips)
  const getFilteredTransactionCount = () => {
    // Combine all transactions and apply filters
    const allTransactions = [
      ...balanceLogs,
      ...transactionsData,
      ...manualFunds,
      ...deposits,
      ...withdrawals,
      ...tipTransactions,
    ];

    // Apply status filter
    let filtered = allTransactions;
    if (statusFilter) {
      filtered = filtered.filter((tx) => {
        const txStatus = (tx.status || '').toLowerCase();
        const filterStatus = statusFilter.toLowerCase();
        // If filtering for pending, only show pending transactions (exclude completed/approved/confirmed)
        if (filterStatus === 'pending') {
          return txStatus === 'pending';
        }
        // For other statuses, match exactly
        return txStatus === filterStatus;
      });
    }

    // Apply transaction type filter
    if (transactionTypeFilter) {
      filtered = filtered.filter((tx) => {
        const txType = (tx.transaction_type || tx.type || '').toLowerCase();
        const filterType = transactionTypeFilter.toLowerCase();

        // Handle manual add/remove
        if (filterType === 'manual_add') {
          return tx.type === 'add_fund' || tx.transaction_type === 'manual_add';
        }
        if (filterType === 'manual_remove') {
          return (
            tx.type === 'remove_fund' || tx.transaction_type === 'manual_remove'
          );
        }

        // Handle tip
        if (filterType === 'tip') {
          return tx.transaction_type === 'tip' || tx.type === 'tip';
        }

        return txType === filterType;
      });
    }

    return filtered.length;
  };

  // Calculate totals from real data
  const totalRealMoney = (() => {
    // Prefer balances.amount_units if provided by backend
    const fromAmountUnits = balances.reduce(
      (sum, b) => sum + parseFloat(b.amount_units || '0'),
      0,
    );
    if (fromAmountUnits > 0) return fromAmountUnits;

    // Next try balances.real_money
    const fromRealMoney = balances.reduce(
      (sum, b) => sum + parseFloat(b.real_money || '0'),
      0,
    );
    if (fromRealMoney > 0) return fromRealMoney;

    // Fallback: derive from transactions list if present
    if (
      (playerDetails as any)?.transactions &&
      Array.isArray((playerDetails as any).transactions)
    ) {
      let calculated = 0;
      (playerDetails as any).transactions.forEach((tx: any) => {
        if (['APPROVED', 'CONFIRMED', 'COMPLETED'].includes(tx.status)) {
          if (['DEPOSIT', 'WIN'].includes(tx.type))
            calculated += parseFloat(tx.amount || tx.usd || '0');
          else if (['WITHDRAWAL', 'BET'].includes(tx.type))
            calculated -= parseFloat(tx.amount || tx.usd || '0');
        }
      });
      return calculated;
    }
    return 0;
  })();

  const totalBonusMoney = balances.reduce(
    (sum, b) => sum + parseFloat(b.reserved_units || b.bonus_money || '0'),
    0,
  );
  const totalPoints = balances.reduce(
    (sum, b) => sum + (b.points || b.reserved_cents || 0),
    0,
  );

  // Calculate wagers data - use meta.total from API response for summary card
  const totalWagersCount = wagersMeta?.total ?? 0;

  // Use unfiltered transaction totals for Total Wagered (not affected by filters)
  const totalWagered = transactionTotals?.total_bet_amount
    ? parseFloat(String(transactionTotals.total_bet_amount))
    : statistics
      ? parseFloat(statistics.total_wagered || '0')
      : 0;

  const ngr = (() => {
    const totalBet = transactionTotals?.total_bet_amount
      ? parseFloat(String(transactionTotals.total_bet_amount))
      : statistics
        ? parseFloat(statistics.total_wagered || '0')
        : 0;

    const totalWins = transactionTotals?.total_win_amount
      ? parseFloat(String(transactionTotals.total_win_amount))
      : 0;

    return totalBet - totalWins;
  })();
  const totalSessions = statistics ? statistics.sessions : 0;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-400';
      case 'inactive':
        return 'bg-gray-400';
      case 'suspended':
        return 'bg-red-400';
      case 'confirmed':
        return 'bg-green-400';
      case 'pending':
        return 'bg-yellow-400';
      case 'failed':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getVipColor = (level: string) => {
    switch (level) {
      case 'Platinum':
        return 'text-purple-400 bg-purple-400/10';
      case 'Gold':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'Silver':
        return 'text-gray-300 bg-gray-300/10';
      case 'Bronze':
        return 'text-orange-400 bg-orange-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'text-green-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'High':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (playerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading player details...</div>
      </div>
    );
  }

  if (!playerDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Failed to load player details</div>
      </div>
    );
  }

  const currentPlayer = playerDetails.player;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {currentPlayer.first_name} {currentPlayer.last_name}
            </h1>
            <p className="text-gray-400 mt-1">Player ID: {currentPlayer.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {currentPlayer.status === 'SUSPENDED' ? (
            <button
              onClick={onUnsuspend}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Unsuspend</span>
            </button>
          ) : (
            <button
              onClick={() => onSuspend('Manual suspension by admin')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Ban className="h-4 w-4" />
              <span>Suspend</span>
            </button>
          )}
        </div>
      </div>

      {/* Player Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Current Balance</p>
              {statisticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-700 rounded w-24 mt-1"></div>
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${totalRealMoney.toLocaleString()}
                  </p>
                  {totalBonusMoney > 0 && (
                    <p className="text-sm text-yellow-400">
                      +${totalBonusMoney.toLocaleString()} bonus
                    </p>
                  )}
                  {totalPoints > 0 && (
                    <p className="text-sm text-blue-400">
                      +{totalPoints} points
                    </p>
                  )}
                </>
              )}
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Bets</p>
              {statisticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-700 rounded w-24 mt-1"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-white mt-1">
                  $
                  {totalWagered.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">GGR</p>
              {statisticsLoading || rakebackSummaryLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-700 rounded w-24 mt-1"></div>
                </div>
              ) : (
                <p
                  className={`text-2xl font-bold mt-1 ${
                    ngr >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  $
                  {ngr.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
            {statisticsLoading || rakebackSummaryLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-gray-700 rounded"></div>
              </div>
            ) : ngr >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sessions</p>
              {statisticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-700 rounded w-16 mt-1"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-white mt-1">
                  {totalSessions}
                </p>
              )}
            </div>
            <User className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Player Information */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Player Information
            </h3>
            <div>
              {/* Account indicators */}
              <div className="w-full flex gap-2">
                {/* Account status */}
                <div className="px-3 py-1 rounded-xl text-sm font-medium capitalize border border border-gray-700 flex items-center gap-2">
                  <div
                    className={`rounded-full w-2 h-2 ${getStatusColor(currentPlayer.status)}`}
                  />
                  <span className="text-gray-400">Status: </span>
                  <span className="font-bold">
                    {currentPlayer.status.toLowerCase()}
                  </span>
                </div>

                {/* KYC status */}
                <div className="px-3 py-1 rounded-xl text-sm font-medium capitalize border border border-gray-700 flex items-center gap-2">
                  <div
                    className={`rounded-full w-2 h-2 ${
                      currentPlayer.kyc_status === 'ID_SOF_VERIFIED'
                        ? 'bg-green-400'
                        : currentPlayer.kyc_status === 'ID_VERIFIED'
                          ? 'bg-blue-400'
                          : currentPlayer.kyc_status === 'PENDING' ||
                              currentPlayer.kyc_status === 'NO_KYC'
                            ? 'bg-yellow-400'
                            : currentPlayer.kyc_status === 'KYC_FAILED'
                              ? 'bg-red-400'
                              : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-gray-400">KYC: </span>
                  <span className="font-bold">
                    {(currentPlayer.kyc_status === 'NO_KYC'
                      ? 'No KYC'
                      : currentPlayer.kyc_status === 'ID_VERIFIED'
                        ? 'ID Verified'
                        : currentPlayer.kyc_status === 'ID_SOF_VERIFIED'
                          ? 'ID + SOF Verified'
                          : currentPlayer.kyc_status === 'KYC_FAILED'
                            ? 'KYC Failed'
                            : currentPlayer.kyc_status
                    ).toLowerCase()}
                  </span>
                </div>

                {/* Email verification */}
                <div className="px-3 py-1 rounded-xl text-sm font-medium capitalize border border border-gray-700 flex items-center gap-2">
                  <div
                    className={`rounded-full w-2 h-2 ${
                      currentPlayer.is_email_verified
                        ? 'bg-green-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span className="text-gray-400">Email: </span>
                  <span className="font-bold">
                    {currentPlayer.is_email_verified
                      ? 'Verified'
                      : 'Unverified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex gap-2 mb-2">
              <p className="text-gray-400 text-sm">Referral Code: </p>
              <div className="flex items-center space-x-2">
                <p className="text-white text-sm font-mono">
                  {currentPlayer.referral_code || 'None'}
                </p>
                {currentPlayer.referral_code && (
                  <button
                    onClick={() =>
                      copyToClipboard(
                        currentPlayer.referral_code,
                        'Referral Code',
                      )
                    }
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Copy Referral Code"
                  >
                    {copiedItems.has('Referral Code') ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <p className="text-gray-400 text-sm">Registration Date: </p>
              <p className="text-white text-sm">
                {new Date(currentPlayer.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <div className="w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="space-y-4 mr-16">
              <div className="flex items-center space-x-3">
                <Mail className="min-h-5 min-w-5 h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-gray-400 text-sm">Email</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-white">{currentPlayer.email}</p>
                    <button
                      onClick={() =>
                        copyToClipboard(currentPlayer.email, 'Email')
                      }
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Copy Email"
                    >
                      {copiedItems.has('Email') ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-gray-400 text-sm">Phone</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-white">
                      {currentPlayer.phone_number || 'Not provided'}
                    </p>
                    {currentPlayer.phone_number && (
                      <button
                        onClick={() =>
                          copyToClipboard(currentPlayer.phone_number, 'Phone')
                        }
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Copy Phone"
                      >
                        {copiedItems.has('Phone') ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-400 text-sm">Date of Birth</p>
                  <p className="text-white">
                    {currentPlayer.date_of_birth || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-400 text-sm">Address</p>
                  <p className="text-white">
                    {currentPlayer.street_address || 'Not provided'}
                  </p>
                  <p className="text-gray-300 text-sm">
                    {currentPlayer.city ?? `${currentPlayer.city}, `}
                    {currentPlayer.state} {currentPlayer.postal_code}
                  </p>
                  <p className="text-gray-300 text-sm">
                    {currentPlayer.country}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-400 text-sm">User Type</p>
                  <span className="capitalize">
                    {(
                      currentPlayer.type ||
                      currentPlayer.user_type ||
                      'N/A'
                    ).toLowerCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Banknote className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-gray-400 text-sm">Default Currency</p>
                  <span>{currentPlayer.default_currency}</span>
                </div>
              </div>
              {currentPlayer.source && (
                <div className="flex items-center space-x-3">
                  <MonitorSmartphone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Source</p>
                    <span className="capitalize">{currentPlayer.source}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Level Progression Progress */}
          {levelProgressionInfo && (
            <div className="w-1/3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3 gap-4">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  Progress to Next Level
                </h3>
                <button
                  onClick={handleProcessLevelProgression}
                  disabled={levelProgressionLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Process level progression for this player"
                >
                  {levelProgressionLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3" />
                      Process Progression
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Current Tier:</span>
                  <span
                    className={`font-medium ${
                      calculateCashbackLevel(totalWagered, cashbackTiers) ===
                      'Bronze'
                        ? 'text-amber-600'
                        : calculateCashbackLevel(
                              totalWagered,
                              cashbackTiers,
                            ) === 'Silver'
                          ? 'text-gray-400'
                          : calculateCashbackLevel(
                                totalWagered,
                                cashbackTiers,
                              ) === 'Gold'
                            ? 'text-yellow-500'
                            : calculateCashbackLevel(
                                  totalWagered,
                                  cashbackTiers,
                                ) === 'Platinum'
                              ? 'text-blue-400'
                              : calculateCashbackLevel(
                                    totalWagered,
                                    cashbackTiers,
                                  ) === 'Diamond'
                                ? 'text-purple-500'
                                : 'text-gray-500'
                    }`}
                  >
                    {levelProgressionInfo.current_tier?.tier_name || 'Unknown'}{' '}
                    (Level {levelProgressionInfo.current_level || 1})
                  </span>
                </div>

                {levelProgressionInfo.next_tier ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Next Tier:</span>
                      <span
                        className={`font-medium ${
                          calculateCashbackLevel(
                            totalWagered,
                            cashbackTiers,
                          ) === 'Bronze'
                            ? 'text-gray-400'
                            : calculateCashbackLevel(
                                  totalWagered,
                                  cashbackTiers,
                                ) === 'Silver'
                              ? 'text-yellow-500'
                              : calculateCashbackLevel(
                                    totalWagered,
                                    cashbackTiers,
                                  ) === 'Gold'
                                ? 'text-blue-400'
                                : calculateCashbackLevel(
                                      totalWagered,
                                      cashbackTiers,
                                    ) === 'Platinum'
                                  ? 'text-purple-500'
                                  : 'text-gray-500'
                        }`}
                      >
                        {levelProgressionInfo.next_tier.tier_name} (Level{' '}
                        {levelProgressionInfo.next_tier.tier_level})
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Progress</span>
                        <span>
                          {Math.round(
                            parseFloat(
                              levelProgressionInfo.progress_to_next || '0',
                            ) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(Math.round(parseFloat(levelProgressionInfo.progress_to_next || '0') * 100), 100)}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                        <span>
                          Total NGR: $
                          {parseFloat(
                            levelProgressionInfo.total_expected_ggr || '0',
                          ).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {parseFloat(
                          levelProgressionInfo.expected_ggr_to_next_level ||
                            '0',
                        ) > 0 && (
                          <span className="text-purple-400">
                            $
                            {parseFloat(
                              levelProgressionInfo.expected_ggr_to_next_level ||
                                '0',
                            ).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            to next level
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">
                    <span className="text-green-400 font-medium">
                      Maximum level reached!
                    </span>
                    <div className="mt-1 text-xs">
                      Total NGR: $
                      {parseFloat(
                        levelProgressionInfo.total_expected_ggr || '0',
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-4 md:space-x-8 px-4 md:px-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'transactions'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              All Transactions
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'games'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Game Activity
            </button>
            <button
              onClick={() => setActiveTab('welcome-bonus')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'welcome-bonus'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Bonus
            </button>
            <button
              onClick={() => setActiveTab('suspensions')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'suspensions'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Suspension History
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'kyc'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              KYC Management
            </button>
            <button
              onClick={() => setActiveTab('rakeback-summary')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'rakeback-summary'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Rakeback Summary
            </button>
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  All Transactions (
                  {transactionsLoading || manualFundsLoading || wagersLoading
                    ? '...'
                    : getFilteredTransactionCount()}{' '}
                  total
                  {statusFilter || transactionTypeFilter ? ' (filtered)' : ''})
                </h4>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSearchQuery(e.target.value);
                        setTransactionsPage(1);
                      }}
                      className="bg-gray-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                  </button>
                  <div className="text-sm text-gray-400">
                    Regular: {balanceLogs.length} | Analytics:{' '}
                    {transactionsData.length} | Manual: {manualFunds.length} |
                    Deposits: {deposits.length} | Withdrawals:{' '}
                    {withdrawals.length} | Tips: {tipTransactions.length} |
                    Claimed Rakeback: {claimedRakeback.length} | Earned
                    Rakeback: {earnedRakeback.length}
                  </div>
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
                      >
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="failed">Failed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Transaction Type (Extended)
                      </label>
                      <select
                        value={transactionTypeFilter}
                        onChange={(e) =>
                          setTransactionTypeFilter(e.target.value)
                        }
                        className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2"
                      >
                        <option value="">All Types</option>
                        <option value="deposit">Deposit</option>
                        <option value="withdrawal">Withdrawal</option>
                        <option value="bet">Bet</option>
                        <option value="groove_bet">Groove Bet</option>
                        <option value="win">Win</option>
                        <option value="groove_win">Groove Win</option>
                        <option value="bonus">Bonus</option>
                        <option value="refund">Refund</option>
                        <option value="tip">Tip</option>
                        <option value="claimed_rakeback">
                          Claimed Rakeback
                        </option>
                        <option value="earned_rakeback">Earned Rakeback</option>
                        <option value="manual_add">Manual Add</option>
                        <option value="manual_remove">Manual Remove</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="rollback">Rollback</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-4">
                    <button
                      onClick={() => {
                        setStatusFilter('');
                        setTransactionTypeFilter('');
                        setDepositsPage(1);
                        setWithdrawalsPage(1);
                      }}
                      className="px-4 py-2 text-gray-300 hover:text-white"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {transactionsLoading ||
              manualFundsLoading ||
              wagersLoading ||
              depositsLoading ||
              withdrawalsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-600 rounded w-32"></div>
                            <div className="h-3 bg-gray-600 rounded w-24"></div>
                          </div>
                          <div className="h-6 bg-gray-600 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Transaction ID
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Currency
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Balance Before
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Balance After
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Manual Add
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Admin/Reason
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Combine all transactions
                        const allTransactions: any[] = [];

                        // Add deposits
                        deposits.forEach((d, idx) => {
                          allTransactions.push({
                            ...d,
                            _source: 'deposit',
                            _index: idx,
                            // Ensure date fields are properly mapped
                            created_at:
                              d.created_at ||
                              d.timestamp ||
                              d.date ||
                              d.createdAt ||
                              d.created_at_iso ||
                              '',
                            timestamp:
                              d.timestamp ||
                              d.created_at ||
                              d.date ||
                              d.createdAt ||
                              d.created_at_iso ||
                              '',
                            date:
                              d.date ||
                              d.created_at ||
                              d.timestamp ||
                              d.createdAt ||
                              d.created_at_iso ||
                              '',
                          });
                        });

                        // Add withdrawals
                        withdrawals.forEach((w, idx) => {
                          allTransactions.push({
                            ...w,
                            _source: 'withdrawal',
                            _index: idx,
                          });
                        });

                        // Add regular transactions
                        balanceLogs.forEach((tx, idx) => {
                          allTransactions.push({
                            ...tx,
                            _source: 'regular',
                            _index: idx,
                          });
                        });

                        // Add manual funds
                        manualFunds.forEach((m, idx) => {
                          allTransactions.push({
                            ...m,
                            _source: 'manual',
                            _index: idx,
                          });
                        });

                        // Add analytics transactions
                        transactionsData.forEach((tx, idx) => {
                          allTransactions.push({
                            ...tx,
                            _source: 'analytics',
                            _index: idx,
                          });
                        });

                        // Add tips
                        tipTransactions.forEach((tip, idx) => {
                          allTransactions.push({
                            ...tip,
                            _source: 'tip',
                            _index: idx,
                            transaction_type: 'tip',
                            type: 'tip',
                          });
                        });

                        // Add claimed rakeback
                        claimedRakeback.forEach((rakeback, idx) => {
                          allTransactions.push({
                            ...rakeback,
                            _source: 'claimed_rakeback',
                            _index: idx,
                            transaction_type: 'claimed_rakeback',
                            type: 'claimed_rakeback',
                          });
                        });

                        // Add earned rakeback
                        earnedRakeback.forEach((rakeback, idx) => {
                          allTransactions.push({
                            ...rakeback,
                            _source: 'earned_rakeback',
                            _index: idx,
                            transaction_type: 'earned_rakeback',
                            type: 'earned_rakeback',
                          });
                        });

                        // Apply status filter
                        let filtered = allTransactions;
                        if (statusFilter) {
                          filtered = filtered.filter((tx) => {
                            const txStatus = (tx.status || '').toLowerCase();
                            const filterStatus = statusFilter.toLowerCase();
                            // If filtering for pending, only show pending transactions (exclude completed/approved/confirmed)
                            if (filterStatus === 'pending') {
                              return txStatus === 'pending';
                            }
                            // For other statuses, match exactly
                            return txStatus === filterStatus;
                          });
                        }

                        // Apply transaction type filter
                        if (transactionTypeFilter) {
                          filtered = filtered.filter((tx) => {
                            const txType = (
                              tx.transaction_type ||
                              tx.type ||
                              ''
                            ).toLowerCase();
                            const filterType =
                              transactionTypeFilter.toLowerCase();

                            // Handle manual add/remove
                            if (filterType === 'manual_add') {
                              return (
                                tx.type === 'add_fund' ||
                                tx.transaction_type === 'manual_add'
                              );
                            }
                            if (filterType === 'manual_remove') {
                              return (
                                tx.type === 'remove_fund' ||
                                tx.transaction_type === 'manual_remove'
                              );
                            }

                            // Handle tip
                            if (filterType === 'tip') {
                              return (
                                tx.transaction_type === 'tip' ||
                                tx.type === 'tip' ||
                                tx._source === 'tip'
                              );
                            }

                            // Handle claimed rakeback
                            if (filterType === 'claimed_rakeback') {
                              return (
                                tx._source === 'claimed_rakeback' ||
                                tx.transaction_type === 'claimed_rakeback' ||
                                tx.type === 'claimed_rakeback' ||
                                tx.transaction_type === 'claimed'
                              );
                            }

                            // Handle earned rakeback
                            if (filterType === 'earned_rakeback') {
                              return (
                                tx._source === 'earned_rakeback' ||
                                tx.transaction_type === 'earned_rakeback' ||
                                tx.type === 'earned_rakeback' ||
                                tx.transaction_type === 'earned'
                              );
                            }

                            // Handle deposit/withdrawal
                            if (filterType === 'deposit') {
                              return (
                                tx._source === 'deposit' || txType === 'deposit'
                              );
                            }
                            if (filterType === 'withdrawal') {
                              return (
                                tx._source === 'withdrawal' ||
                                txType === 'withdrawal'
                              );
                            }

                            // Handle groove_bet (also matches bet)
                            if (filterType === 'groove_bet') {
                              return (
                                txType === 'groove_bet' || txType === 'bet'
                              );
                            }

                            // Handle groove_win (also matches win)
                            if (filterType === 'groove_win') {
                              return (
                                txType === 'groove_win' || txType === 'win'
                              );
                            }

                            return txType === filterType;
                          });
                        }

                        // Apply search query filter
                        if (searchQuery) {
                          const query = searchQuery.toLowerCase();
                          filtered = filtered.filter((tx) => {
                            const id = (
                              tx.id ||
                              tx.transaction_id ||
                              ''
                            ).toLowerCase();
                            const roundId = (tx.round_id || '').toLowerCase();
                            const gameName = (
                              tx.game_name ||
                              tx.game ||
                              ''
                            ).toLowerCase();
                            const provider = (tx.provider || '').toLowerCase();
                            const extId = (
                              tx.external_transaction_id || ''
                            ).toLowerCase();
                            // Also search in amount for quick lookup
                            const amount = (
                              tx.amount ||
                              tx.usd ||
                              tx.change_amount ||
                              ''
                            ).toString();

                            return (
                              id.includes(query) ||
                              roundId.includes(query) ||
                              gameName.includes(query) ||
                              provider.includes(query) ||
                              extId.includes(query) ||
                              amount.includes(query)
                            );
                          });
                        }

                        // Sort by date (newest first)
                        filtered.sort((a, b) => {
                          const dateA = new Date(
                            a.created_at || a.timestamp || a.date || 0,
                          ).getTime();
                          const dateB = new Date(
                            b.created_at || b.timestamp || b.date || 0,
                          ).getTime();
                          return dateB - dateA;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={10}
                                className="py-8 text-center text-gray-400"
                              >
                                No transaction history available
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((tx: any, index: number) => {
                          const formatDate = (timestamp: string) => {
                            try {
                              if (
                                !timestamp ||
                                timestamp === '0001-01-01T00:00:00Z'
                              )
                                return 'N/A';
                              const date = new Date(timestamp);
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              });
                            } catch {
                              return 'N/A';
                            }
                          };

                          // Determine transaction type
                          const getTransactionType = () => {
                            if (tx._source === 'tip') return 'Tip';
                            if (tx._source === 'claimed_rakeback')
                              return 'Claimed Rakeback';
                            if (tx._source === 'earned_rakeback')
                              return 'Earned Rakeback';
                            if (tx._source === 'deposit') return 'Deposit';
                            if (tx._source === 'withdrawal')
                              return 'Withdrawal';
                            if (tx._source === 'manual') {
                              return tx.type === 'add_fund'
                                ? 'Manual Add'
                                : 'Manual Remove';
                            }
                            if (tx.transaction_type) return tx.transaction_type;
                            if (tx.type) return tx.type;
                            if (tx.operational_type_name)
                              return tx.operational_type_name;
                            return 'Transaction';
                          };

                          // Get amount
                          const getAmount = () => {
                            if (tx._source === 'deposit') {
                              return tx.usd_amount_cents
                                ? parseFloat(String(tx.usd_amount_cents)) / 100
                                : 0;
                            }
                            if (tx._source === 'withdrawal') {
                              return tx.usd_amount_cents
                                ? parseFloat(String(tx.usd_amount_cents)) / 100
                                : 0;
                            }
                            if (tx._source === 'manual') {
                              return parseFloat(tx.amount || '0');
                            }
                            if (tx._source === 'tip') {
                              return parseFloat(
                                tx.amount || tx.tip_amount || '0',
                              );
                            }
                            if (
                              tx._source === 'claimed_rakeback' ||
                              tx._source === 'earned_rakeback'
                            ) {
                              return parseFloat(
                                tx.rakeback_amount || tx.amount || '0',
                              );
                            }
                            return parseFloat(
                              tx.amount || tx.usd || tx.change_amount || '0',
                            );
                          };

                          // Get currency
                          const getCurrency = () => {
                            return tx.currency_code || tx.currency || 'USD';
                          };

                          // Get balance before
                          const getBalanceBefore = () => {
                            if (tx.balance_before) return tx.balance_before;
                            if (tx.balance_before_update)
                              return tx.balance_before_update;
                            if (tx.balance_after_update && tx.change_amount) {
                              const after = parseFloat(
                                tx.balance_after_update || '0',
                              );
                              const change = parseFloat(
                                tx.change_amount || '0',
                              );
                              return (after - change).toFixed(2);
                            }
                            return '-';
                          };

                          // Get balance after
                          const getBalanceAfter = () => {
                            if (tx.balance_after) return tx.balance_after;
                            if (tx.balance_after_update)
                              return tx.balance_after_update;
                            if (tx.new_balance) return tx.new_balance;
                            return '-';
                          };

                          // Get manual add info
                          const getManualAddInfo = () => {
                            if (tx._source === 'manual') {
                              return tx.admin_name || 'Yes';
                            }
                            if (tx.admin_id || tx.admin_name) {
                              return tx.admin_name || 'Yes';
                            }
                            return 'No';
                          };

                          // Get status
                          const getStatus = () => {
                            if (tx._source === 'manual') return 'Completed';
                            return tx.status || 'Unknown';
                          };

                          // Get admin/reason
                          const getAdminReason = () => {
                            if (tx._source === 'manual') {
                              return tx.admin_name || tx.reason || '-';
                            }
                            if (tx.admin_name) return tx.admin_name;
                            if (tx.reason) return tx.reason;
                            if (tx.tx_hash) {
                              return `${tx.tx_hash.substring(0, 8)}...${tx.tx_hash.substring(tx.tx_hash.length - 6)}`;
                            }
                            return '-';
                          };

                          const amount = getAmount();
                          const isPositive =
                            [
                              'deposit',
                              'win',
                              'credit',
                              'add_fund',
                              'tip',
                              'claimed_rakeback',
                              'earned_rakeback',
                            ].includes(
                              (
                                tx.transaction_type ||
                                tx.type ||
                                ''
                              ).toLowerCase(),
                            ) ||
                            tx._source === 'deposit' ||
                            tx._source === 'tip' ||
                            tx._source === 'claimed_rakeback' ||
                            tx._source === 'earned_rakeback' ||
                            (tx._source === 'manual' && tx.type === 'add_fund');

                          return (
                            <tr
                              key={`tx-${tx._source}-${tx._index || index}-${tx.id || tx.transaction_id || index}`}
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setShowTransactionModal(true);
                              }}
                              className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                                {tx.id || tx.transaction_id || 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    tx._source === 'tip'
                                      ? 'bg-yellow-400/10 text-yellow-400'
                                      : tx._source === 'claimed_rakeback'
                                        ? 'bg-blue-400/10 text-blue-400'
                                        : tx._source === 'earned_rakeback'
                                          ? 'bg-cyan-400/10 text-cyan-400'
                                          : tx._source === 'manual'
                                            ? tx.type === 'add_fund'
                                              ? 'bg-green-400/10 text-green-400'
                                              : 'bg-red-400/10 text-red-400'
                                            : tx._source === 'deposit'
                                              ? 'bg-green-400/10 text-green-400'
                                              : tx._source === 'withdrawal'
                                                ? 'bg-red-400/10 text-red-400'
                                                : 'bg-purple-400/10 text-purple-400'
                                  }`}
                                >
                                  {getTransactionType()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white font-bold">
                                {getCurrency()}
                              </td>
                              <td
                                className={`py-3 px-4 text-right font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {isPositive ? '+' : ''}$
                                {amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-3 px-4 text-white text-right font-medium">
                                {getBalanceBefore()}
                              </td>
                              <td className="py-3 px-4 text-white text-right font-medium">
                                {getBalanceAfter()}
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {getManualAddInfo()}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    getStatus().toLowerCase() === 'completed' ||
                                    getStatus().toLowerCase() === 'approved' ||
                                    getStatus().toLowerCase() === 'confirmed' ||
                                    getStatus().toLowerCase() === 'verified'
                                      ? 'bg-green-400/10 text-green-400'
                                      : getStatus().toLowerCase() === 'pending'
                                        ? 'bg-yellow-400/10 text-yellow-400'
                                        : 'bg-red-400/10 text-red-400'
                                  }`}
                                >
                                  {getStatus()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {getAdminReason()}
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {formatDate(
                                  tx.created_at ||
                                    tx.timestamp ||
                                    tx.date ||
                                    '',
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Note: Pagination removed - all transactions are now shown in a unified list */}
            </div>
          )}

          {activeTab === 'games' && (
            <div>
              <GameActivityTable
                userId={player.id}
                currentPage={wagersPage}
                pageSize={wagersPerPage}
                onPageChange={setWagersPage}
              />
            </div>
          )}

          {activeTab === 'suspensions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Suspension History ({suspensionHistory.length} total)
                </h4>
              </div>

              {suspensionHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No suspension history available
                </div>
              ) : (
                <div className="space-y-4">
                  {suspensionHistory.map((suspension, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/30 border border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Ban className="h-4 w-4 text-red-400" />
                            <span className="text-white font-medium">
                              Suspension #{index + 1}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                suspension.unblocked_at
                                  ? 'text-green-400 bg-green-400/10'
                                  : 'text-red-400 bg-red-400/10'
                              }`}
                            >
                              {suspension.unblocked_at ? 'Resolved' : 'Active'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Reason:</p>
                              <p className="text-white">{suspension.reason}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Note:</p>
                              <p className="text-white">{suspension.note}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Type:</p>
                              <p className="text-white capitalize">
                                {suspension.type}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Duration:</p>
                              <p className="text-white capitalize">
                                {suspension.duration}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Suspended by:</p>
                              <p className="text-white">
                                {suspension.blocked_by_username} (
                                {suspension.blocked_by_email})
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Date:</p>
                              <p className="text-white">
                                {new Date(
                                  suspension.created_at,
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'kyc' && (
            <KYCManagement
              userId={currentPlayer.id}
              currentKYCStatus={currentPlayer.kyc_status}
              onStatusUpdate={(newStatus) => {
                // Update the player's KYC status in the parent component
                if (playerDetails) {
                  setPlayerDetails({
                    ...playerDetails,
                    player: {
                      ...playerDetails.player,
                      kyc_status: newStatus,
                    },
                  });
                }
              }}
            />
          )}

          {/* Claimed Rakeback tab removed - now included in All Transactions */}
          {false && activeTab === 'Rakeback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Claimed Rakeback (
                  {claimedRakebackLoading
                    ? '...'
                    : claimedRakebackMeta?.total || claimedRakeback.length}
                  )
                </h4>
              </div>

              {claimedRakebackLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading claimed Rakeback...
                </div>
              ) : claimedRakeback.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No claimed Rakeback found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Transaction ID
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Currency
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimedRakeback.map((item, index) => (
                        <tr
                          key={item.id || index}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                            {item.id || item.transaction_id || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-green-400 text-right font-medium">
                            $
                            {parseFloat(
                              item.rakeback_amount || item.amount || '0',
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 8,
                              maximumFractionDigits: 8,
                            })}
                          </td>
                          <td className="py-3 px-4 text-white font-bold">
                            {item.currency || 'USD'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-400/10 text-blue-400">
                              {item.transaction_type || 'claimed'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400">
                              {item.status || 'completed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls for Claimed Rakeback */}
                  {claimedRakebackMeta && claimedRakebackMeta.total > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Showing{' '}
                        {(claimedRakebackPage - 1) * claimedRakebackPerPage + 1}{' '}
                        to{' '}
                        {Math.min(
                          claimedRakebackPage * claimedRakebackPerPage,
                          claimedRakebackMeta.total,
                        )}{' '}
                        of {claimedRakebackMeta.total} transactions
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setClaimedRakebackPage((prev) =>
                              Math.max(prev - 1, 1),
                            )
                          }
                          disabled={claimedRakebackPage === 1}
                          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-white text-sm">
                          Page {claimedRakebackPage} of{' '}
                          {claimedRakebackMeta.pages ||
                            Math.ceil(
                              claimedRakebackMeta.total /
                                claimedRakebackPerPage,
                            )}
                        </span>
                        <button
                          onClick={() =>
                            setClaimedRakebackPage((prev) =>
                              Math.min(
                                prev + 1,
                                claimedRakebackMeta.pages ||
                                  Math.ceil(
                                    claimedRakebackMeta.total /
                                      claimedRakebackPerPage,
                                  ),
                              ),
                            )
                          }
                          disabled={
                            claimedRakebackPage >=
                            (claimedRakebackMeta.pages ||
                              Math.ceil(
                                claimedRakebackMeta.total /
                                  claimedRakebackPerPage,
                              ))
                          }
                          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Earned Rakeback tab removed - now included in All Transactions */}
          {false && activeTab === 'earned-Rakeback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Earned Rakeback (
                  {earnedRakebackLoading
                    ? '...'
                    : earnedRakebackMeta?.total || earnedRakeback.length}
                  )
                </h4>
              </div>

              {earnedRakebackLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading earned Rakeback...
                </div>
              ) : earnedRakeback.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No earned Rakeback found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Transaction ID
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Currency
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnedRakeback.map((item, index) => {
                        const rowId = item.id || `earned-Rakeback-${index}`;
                        const isExpanded = expandedEarnedRakebackRow === rowId;
                        return (
                          <React.Fragment key={rowId}>
                            <tr
                              className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                              onClick={() =>
                                setExpandedEarnedRakebackRow(
                                  isExpanded ? null : rowId,
                                )
                              }
                            >
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {item.created_at
                                  ? new Date(item.created_at).toLocaleString()
                                  : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                                <div className="flex items-center space-x-2">
                                  <span>
                                    {item.id || item.transaction_id || 'N/A'}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-green-400 text-right font-medium">
                                $
                                {parseFloat(
                                  item.rakeback_amount || item.amount || '0',
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 8,
                                  maximumFractionDigits: 8,
                                })}
                              </td>
                              <td className="py-3 px-4 text-white font-bold">
                                {item.currency || 'USD'}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-400/10 text-blue-400">
                                  {item.transaction_type || 'earned'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.status === 'available'
                                      ? 'bg-yellow-400/10 text-yellow-400'
                                      : item.status === 'claimed'
                                        ? 'bg-green-400/10 text-green-400'
                                        : 'bg-gray-400/10 text-gray-400'
                                  }`}
                                >
                                  {item.status || 'N/A'}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gray-800/50">
                                <td colSpan={6} className="py-4 px-4">
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    {item.game_id && (
                                      <div>
                                        <p className="text-gray-400 mb-1">
                                          Game ID
                                        </p>
                                        <p className="text-white font-mono text-xs">
                                          {item.game_id}
                                        </p>
                                      </div>
                                    )}
                                    {item.game_name && (
                                      <div>
                                        <p className="text-gray-400 mb-1">
                                          Game Name
                                        </p>
                                        <p className="text-white font-medium">
                                          {item.game_name}
                                        </p>
                                      </div>
                                    )}
                                    {item.provider && (
                                      <div>
                                        <p className="text-gray-400 mb-1">
                                          Provider
                                        </p>
                                        <p className="text-white font-medium">
                                          {item.provider}
                                        </p>
                                      </div>
                                    )}
                                    {!item.game_id &&
                                      !item.game_name &&
                                      !item.provider && (
                                        <div className="col-span-3">
                                          <p className="text-gray-400 text-sm">
                                            No game information available
                                          </p>
                                        </div>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination Controls for Earned Rakeback */}
                  {earnedRakebackMeta && earnedRakebackMeta.total > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Showing{' '}
                        {(earnedRakebackPage - 1) * earnedRakebackPerPage + 1}{' '}
                        to{' '}
                        {Math.min(
                          earnedRakebackPage * earnedRakebackPerPage,
                          earnedRakebackMeta.total,
                        )}{' '}
                        of {earnedRakebackMeta.total} transactions
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setEarnedRakebackPage((prev) =>
                              Math.max(prev - 1, 1),
                            )
                          }
                          disabled={earnedRakebackPage === 1}
                          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-white text-sm">
                          Page {earnedRakebackPage} of{' '}
                          {earnedRakebackMeta.pages ||
                            Math.ceil(
                              earnedRakebackMeta.total / earnedRakebackPerPage,
                            )}
                        </span>
                        <button
                          onClick={() =>
                            setEarnedRakebackPage((prev) =>
                              Math.min(
                                prev + 1,
                                earnedRakebackMeta.pages ||
                                  Math.ceil(
                                    earnedRakebackMeta.total /
                                      earnedRakebackPerPage,
                                  ),
                              ),
                            )
                          }
                          disabled={
                            earnedRakebackPage >=
                            (earnedRakebackMeta.pages ||
                              Math.ceil(
                                earnedRakebackMeta.total /
                                  earnedRakebackPerPage,
                              ))
                          }
                          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tips tab removed - now included in All Transactions */}
          {false && activeTab === 'tips' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Tip Transactions (
                  {tipTransactionsLoading
                    ? '...'
                    : tipTransactionsMeta?.total || tipTransactions.length}
                  )
                </h4>
              </div>

              {tipTransactionsLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading tip transactions...
                </div>
              ) : tipTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No tip transactions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Transaction ID
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Sender/Receiver
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Currency
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Message
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipTransactions.map((tip, index) => (
                        <tr
                          key={tip.id || index}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {tip.created_at
                              ? new Date(tip.created_at).toLocaleString()
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                            {tip.id || tip.transaction_id || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-white">
                            {tip.transaction_type === 'tip_sent' ? (
                              <span className="text-blue-400">
                                Sent to{' '}
                                {tip.receiver_username ||
                                  tip.receiver_id?.slice(0, 8) ||
                                  'N/A'}
                              </span>
                            ) : (
                              <span className="text-green-400">
                                Received from{' '}
                                {tip.sender_username ||
                                  tip.sender_id?.slice(0, 8) ||
                                  'N/A'}
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-medium ${
                              tip.transaction_type === 'tip_sent'
                                ? 'text-red-400'
                                : 'text-green-400'
                            }`}
                          >
                            $
                            {Math.abs(
                              parseFloat(tip.amount || '0'),
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-4 text-white font-bold">
                            {tip.currency || 'USD'}
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {(() => {
                              try {
                                if (tip.metadata) {
                                  const metadata =
                                    typeof tip.metadata === 'string'
                                      ? JSON.parse(tip.metadata)
                                      : tip.metadata;
                                  return metadata.message || '-';
                                }
                                return '-';
                              } catch {
                                return '-';
                              }
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400">
                              {tip.status || 'completed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls for Tip Transactions */}
                  {tipTransactionsMeta &&
                    tipTransactionsMeta.total > tipTransactionsPerPage && (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Showing{' '}
                          {(tipTransactionsPage - 1) * tipTransactionsPerPage +
                            1}{' '}
                          to{' '}
                          {Math.min(
                            tipTransactionsPage * tipTransactionsPerPage,
                            tipTransactionsMeta.total,
                          )}{' '}
                          of {tipTransactionsMeta.total} transactions
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              setTipTransactionsPage((prev) =>
                                Math.max(prev - 1, 1),
                              )
                            }
                            disabled={tipTransactionsPage === 1}
                            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-white text-sm">
                            Page {tipTransactionsPage} of{' '}
                            {tipTransactionsMeta.pages ||
                              Math.ceil(
                                tipTransactionsMeta.total /
                                  tipTransactionsPerPage,
                              )}
                          </span>
                          <button
                            onClick={() =>
                              setTipTransactionsPage((prev) =>
                                Math.min(
                                  prev + 1,
                                  tipTransactionsMeta.pages ||
                                    Math.ceil(
                                      tipTransactionsMeta.total /
                                        tipTransactionsPerPage,
                                    ),
                                ),
                              )
                            }
                            disabled={
                              tipTransactionsPage >=
                              (tipTransactionsMeta.pages ||
                                Math.ceil(
                                  tipTransactionsMeta.total /
                                    tipTransactionsPerPage,
                                ))
                            }
                            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rakeback-summary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Rakeback Summary</h4>
              </div>

              {rakebackSummaryLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading Rakeback summary...
                </div>
              ) : !rakebackSummary ? (
                <div className="text-center py-8 text-gray-400">
                  No Rakeback summary available
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="text-gray-400 text-sm mb-2">
                      Available Rakeback
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      $
                      {parseFloat(
                        rakebackSummary.available_rakeback ||
                          rakebackSummary.available_cashback ||
                          '0',
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="text-gray-400 text-sm mb-2">
                      Total Earned Amount
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      $
                      {parseFloat(
                        rakebackSummary.total_earned_amount || '0',
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {rakebackSummary.total_earned_count || 0} transactions
                    </div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="text-gray-400 text-sm mb-2">
                      Total Claimed Amount
                    </div>
                    <div className="text-2xl font-bold text-purple-400">
                      $
                      {parseFloat(
                        rakebackSummary.total_claimed_amount || '0',
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {rakebackSummary.total_claimed_count || 0} transactions
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'welcome-bonus' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Bonus Transactions (
                  {welcomeBonusLoading
                    ? '...'
                    : welcomeBonusMeta?.total || welcomeBonus.length}
                  )
                </h4>
              </div>

              {welcomeBonusLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading bonus transactions...
                </div>
              ) : welcomeBonus.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No bonus transactions found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Transaction ID
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Currency
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Balance Before
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Balance After
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {welcomeBonus.map((bonus: any, index: number) => (
                        <tr
                          key={bonus.id || bonus.transaction_id || index}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30"
                        >
                          <td className="py-3 px-4 text-white font-mono text-sm">
                            {bonus.id || bonus.transaction_id || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-white">
                            {bonus.amount
                              ? parseFloat(String(bonus.amount)).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )
                              : '0.00'}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {bonus.currency || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                bonus.status === 'completed'
                                  ? 'bg-green-400/10 text-green-400'
                                  : bonus.status === 'pending'
                                    ? 'bg-yellow-400/10 text-yellow-400'
                                    : bonus.status === 'failed'
                                      ? 'bg-red-400/10 text-red-400'
                                      : 'bg-gray-400/10 text-gray-400'
                              }`}
                            >
                              {bonus.status || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {bonus.balance_before
                              ? parseFloat(
                                  String(bonus.balance_before),
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '0.00'}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {bonus.balance_after
                              ? parseFloat(
                                  String(bonus.balance_after),
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '0.00'}
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {bonus.created_at
                              ? new Date(bonus.created_at).toLocaleString()
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls for Welcome Bonus */}
                  {welcomeBonusMeta && welcomeBonusMeta.total > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        Showing{' '}
                        {(welcomeBonusPage - 1) * welcomeBonusPerPage + 1} to{' '}
                        {Math.min(
                          welcomeBonusPage * welcomeBonusPerPage,
                          welcomeBonusMeta.total,
                        )}{' '}
                        of {welcomeBonusMeta.total} transactions
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setWelcomeBonusPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={welcomeBonusPage === 1}
                          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-white text-sm">
                          Page {welcomeBonusPage} of{' '}
                          {welcomeBonusMeta.pages ||
                            Math.ceil(
                              welcomeBonusMeta.total / welcomeBonusPerPage,
                            )}
                        </span>
                        <button
                          onClick={() =>
                            setWelcomeBonusPage((prev) =>
                              Math.min(
                                prev + 1,
                                welcomeBonusMeta.pages ||
                                  Math.ceil(
                                    welcomeBonusMeta.total /
                                      welcomeBonusPerPage,
                                  ),
                              ),
                            )
                          }
                          disabled={
                            welcomeBonusPage >=
                            (welcomeBonusMeta.pages ||
                              Math.ceil(
                                welcomeBonusMeta.total / welcomeBonusPerPage,
                              ))
                          }
                          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Transaction Details
              </h2>
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setSelectedTransaction(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Transaction ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Transaction ID
                  </label>
                  <p className="text-white font-mono text-sm">
                    {selectedTransaction.id ||
                      selectedTransaction.transaction_id ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Source
                  </label>
                  <p className="text-white text-sm capitalize">
                    {selectedTransaction._source || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Type and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Type
                  </label>
                  <p className="text-white text-sm">
                    {selectedTransaction.transaction_type ||
                      selectedTransaction.type ||
                      'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Status
                  </label>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      (selectedTransaction.status || '').toLowerCase() ===
                        'completed' ||
                      (selectedTransaction.status || '').toLowerCase() ===
                        'approved' ||
                      (selectedTransaction.status || '').toLowerCase() ===
                        'confirmed' ||
                      (selectedTransaction.status || '').toLowerCase() ===
                        'verified'
                        ? 'bg-green-400/10 text-green-400'
                        : (selectedTransaction.status || '').toLowerCase() ===
                            'pending'
                          ? 'bg-yellow-400/10 text-yellow-400'
                          : 'bg-red-400/10 text-red-400'
                    }`}
                  >
                    {selectedTransaction.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Amount
                  </label>
                  <p className="text-white font-bold text-lg">
                    {selectedTransaction.amount ||
                      selectedTransaction.bet_amount ||
                      selectedTransaction.payout_amount ||
                      selectedTransaction.rakeback_amount ||
                      '0'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Currency
                  </label>
                  <p className="text-white font-bold">
                    {selectedTransaction.currency ||
                      selectedTransaction.default_currency ||
                      'USD'}
                  </p>
                </div>
              </div>

              {/* Balance Before and After */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Balance Before
                  </label>
                  <p className="text-white font-medium">
                    {selectedTransaction.balance_before ||
                    selectedTransaction.balance_before_cents
                      ? selectedTransaction.balance_before_cents
                        ? `$${(selectedTransaction.balance_before_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${selectedTransaction.balance_before}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Balance After
                  </label>
                  <p className="text-white font-medium">
                    {selectedTransaction.balance_after ||
                    selectedTransaction.balance_after_cents
                      ? selectedTransaction.balance_after_cents
                        ? `$${(selectedTransaction.balance_after_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${selectedTransaction.balance_after}`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-white text-sm">
                    {selectedTransaction.created_at ||
                    selectedTransaction.timestamp ||
                    selectedTransaction.date
                      ? new Date(
                          selectedTransaction.created_at ||
                            selectedTransaction.timestamp ||
                            selectedTransaction.date,
                        ).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Updated At
                  </label>
                  <p className="text-white text-sm">
                    {selectedTransaction.updated_at
                      ? new Date(
                          selectedTransaction.updated_at,
                        ).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Manual Add Info */}
              {selectedTransaction._source === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Manual Add
                  </label>
                  <p className="text-white text-sm">
                    {selectedTransaction.type === 'add_fund' ? 'Yes' : 'No'}
                  </p>
                </div>
              )}

              {/* Admin/Reason */}
              {(selectedTransaction.admin_id ||
                selectedTransaction.reason ||
                selectedTransaction.note) && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Admin / Reason
                  </label>
                  <p className="text-white text-sm">
                    {selectedTransaction.admin_id ||
                      selectedTransaction.reason ||
                      selectedTransaction.note ||
                      'N/A'}
                  </p>
                </div>
              )}

              {/* Game Information (if applicable) */}
              {(selectedTransaction.game_id ||
                selectedTransaction.game_name) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Game ID
                    </label>
                    <p className="text-white text-sm">
                      {selectedTransaction.game_id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Game Name
                    </label>
                    <p className="text-white text-sm">
                      {selectedTransaction.game_name || 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* Round ID (if applicable) */}
              {selectedTransaction.round_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Round ID
                  </label>
                  <p className="text-white font-mono text-sm">
                    {selectedTransaction.round_id}
                  </p>
                </div>
              )}

              {/* Full Transaction Data (JSON) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Full Transaction Data
                </label>
                <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  {JSON.stringify(selectedTransaction, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setSelectedTransaction(null);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
