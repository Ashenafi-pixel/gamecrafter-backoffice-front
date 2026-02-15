import React, { useState, useEffect } from "react";
import { adminSvc } from "../../services/apiService";
import {
  GamingActivityTableView,
  type GamingActivityTransaction,
} from "./GamingActivityTableView";

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
    const roundId = tx.round_id || tx.id || tx.transaction_id || "";
    const betAmount = tx.bet_amount || tx.amount || "0";
    const gameId = tx.game_id || "";
    const key = `${roundId}_${betAmount}_${gameId}`;

    // If we haven't seen this transaction, add it
    if (!seen.has(key)) {
      seen.set(key, tx);
    } else {
      // If we've seen it, prefer completed over pending
      const existing = seen.get(key);
      if (existing.status === "pending" && tx.status === "completed") {
        seen.set(key, tx); // Replace pending with completed
      } else if (existing.status === "completed" && tx.status === "pending") {
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

interface GameActivityMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface GameActivityTableProps {
  userId: string;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export const GameActivityTable: React.FC<GameActivityTableProps> = ({
  userId,
  currentPage: externalPage,
  pageSize: externalPageSize = 10,
  onPageChange,
}) => {
  const [wagers, setWagers] = useState<GamingActivityTransaction[]>([]);
  const [wagersMeta, setWagersMeta] = useState<GameActivityMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize] = useState(externalPageSize);

  // Use external page if provided, otherwise use internal state
  const currentPage = externalPage ?? internalPage;
  const pageSize = externalPageSize;

  useEffect(() => {
    const fetchGameActivity = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const offset = (currentPage - 1) * pageSize;

        const response = await adminSvc.get(
          `/analytics/users/${userId}/transactions`,
          {
            params: {
              limit: pageSize,
              offset: offset,
            },
          },
        );

        const transactions = Array.isArray(response.data) ? response.data : [];
        const meta = response.meta;

        // Use meta values directly from API response - MUST use meta.pages (not meta.page)
        const totalCount = meta?.total ?? 0;
        const currentPageNum = meta?.page ?? currentPage;
        const pageSizeNum = meta?.page_size ?? pageSize;
        // Use meta.pages directly from API (this is the total number of pages, not the current page)
        // IMPORTANT: meta.pages is the total number of pages (e.g., 619), not the current page
        const totalPages = meta?.pages ?? 1;

        if (response.success) {
          // Deduplicate transactions (prefer completed over pending)
          const deduplicatedTransactions =
            deduplicateTransactions(transactions);

          // Transform to shared display format
          const wagersData: GamingActivityTransaction[] =
            deduplicatedTransactions.map((tx: any) => ({
              id: tx.id || tx.transaction_id,
              user_id: tx.user_id || userId,
              transaction_type: tx.transaction_type || tx.type,
              amount: tx.amount || "0",
              currency: tx.currency || "USD",
              status: tx.status || "completed",
              game_id: tx.game_id || "",
              game_name: tx.game_name || tx.game || "Unknown Game",
              provider: tx.provider || "Unknown",
              session_id: tx.session_id || "",
              round_id: tx.round_id,
              bet_amount: tx.bet_amount,
              win_amount: tx.win_amount,
              net_result: tx.net_result,
              balance_before: tx.balance_before,
              balance_after: tx.balance_after,
              external_transaction_id: tx.external_transaction_id,
              metadata: tx.metadata,
              created_at: tx.created_at || tx.timestamp,
              updated_at: tx.updated_at || tx.created_at,
            }));

          setWagers(wagersData);
          setWagersMeta({
            total: totalCount,
            page: currentPageNum,
            page_size: pageSizeNum,
            pages: totalPages,
          });
        }
      } catch (error) {
        console.error("Failed to fetch game activity:", error);
        setWagers([]);
        setWagersMeta(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGameActivity();
  }, [userId, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!userId) return;

    try {
      setIsExporting(true);
      const BATCH_SIZE = 500;
      let allTransactions: any[] = [];
      let offset = 0;
      let hasMore = true;

      // Initial fetch to get total count and first batch
      while (hasMore) {
        const response = await adminSvc.get(
          `/analytics/users/${userId}/transactions`,
          {
            params: {
              limit: BATCH_SIZE,
              offset: offset,
            },
          },
        );

        if (response.success && Array.isArray(response.data)) {
          const batch = response.data;
          allTransactions = [...allTransactions, ...batch];

          const meta = response.meta;
          const total = meta?.total ?? 0;

          if (allTransactions.length >= total || batch.length === 0) {
            hasMore = false;
          } else {
            offset += BATCH_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      // Deduplicate
      const deduplicated = deduplicateTransactions(allTransactions);

      // Convert to CSV
      const headers = [
        "Transaction ID",
        "Game Name",
        "Provider",
        "Bet Amount",
        "Win Amount",
        "Net Result",
        "Balance Before",
        "Balance After",
        "Currency",
        "Status",
        "Date",
        "Round ID",
      ];

      const csvRows = [headers.join(",")];

      deduplicated.forEach((tx) => {
        const row = [
          `"${tx.id || tx.transaction_id || ""}"`,
          `"${tx.game_name || tx.game || "Unknown Game"}"`,
          `"${tx.provider || "Unknown"}"`,
          tx.bet_amount || tx.amount || "0",
          tx.win_amount || "0",
          tx.net_result || "0",
          tx.balance_before || "0",
          tx.balance_after || "0",
          `"${tx.currency || "USD"}"`,
          `"${tx.status || "completed"}"`,
          `"${tx.created_at || tx.timestamp || ""}"`,
          `"${tx.round_id || ""}"`,
        ];
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `player-${userId}-activity-full.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <GamingActivityTableView
      transactions={wagers}
      meta={wagersMeta}
      loading={loading}
      showPlayerColumn={false}
      onPageChange={handlePageChange}
      onExportCSV={handleExportCSV}
      isExporting={isExporting}
      emptyMessage="No wagers available"
    />
  );
};
