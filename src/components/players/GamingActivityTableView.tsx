import React, { useState } from "react";
import { ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react";

export interface GamingActivityTransaction {
  id: string;
  user_id?: string;
  username?: string;
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
  updated_at?: string;
}

export interface GamingActivityMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface GamingActivityTableViewProps {
  transactions: GamingActivityTransaction[];
  meta?: GamingActivityMeta | null;
  loading?: boolean;
  showPlayerColumn?: boolean;
  onPageChange?: (page: number) => void;
  onExportCSV?: () => void | Promise<void>;
  isExporting?: boolean;
  emptyMessage?: string;
}

export const GamingActivityTableView: React.FC<GamingActivityTableViewProps> = ({
  transactions,
  meta = null,
  loading = false,
  showPlayerColumn = false,
  onPageChange,
  onExportCSV,
  isExporting = false,
  emptyMessage = "No wagers available",
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalCount = meta?.total ?? transactions.length;
  const currentPage = meta?.page ?? 1;
  const pageSize = meta?.page_size ?? transactions.length;
  const totalPages = meta?.pages ?? 1;

  const colSpan = showPlayerColumn ? 8 : 7;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-32" />
                  <div className="h-3 bg-gray-600 rounded w-24" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-16" />
                  <div className="h-3 bg-gray-600 rounded w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              {showPlayerColumn && (
                <th className="text-left py-3 px-4 text-gray-400 font-medium">
                  Player
                </th>
              )}
              <th className="text-left py-3 px-4 text-gray-400 font-medium">
                Game
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">
                Provider
              </th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">
                Bet Amount ($)
              </th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">
                Win Amount ($)
              </th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">
                Net Result ($)
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">
                Date
              </th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              transactions.map((wager) => (
                <React.Fragment key={wager.id}>
                  <tr
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                    onClick={() =>
                      setExpandedRow(
                        expandedRow === wager.id ? null : wager.id
                      )
                    }
                  >
                    {showPlayerColumn && (
                      <td className="py-3 px-4 text-gray-300">
                        {wager.username ?? wager.user_id ?? "—"}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {wager.game_name}
                        </span>
                        {expandedRow === wager.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{wager.provider}</td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      $
                      {parseFloat(
                        wager.bet_amount || wager.amount || "0"
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-white text-right font-medium">
                      {wager.win_amount
                        ? `$${parseFloat(wager.win_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "$0.00"}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium ${
                        parseFloat(wager.net_result || "0") < 0
                          ? "text-red-400"
                          : parseFloat(wager.net_result || "0") > 0
                            ? "text-green-400"
                            : "text-gray-400"
                      }`}
                    >
                      {wager.net_result
                        ? `$${parseFloat(wager.net_result).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "$0.00"}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {wager.created_at
                        ? new Date(wager.created_at).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          wager.status === "completed"
                            ? "text-green-400 bg-green-400/10"
                            : wager.status === "pending"
                              ? "text-yellow-400 bg-yellow-400/10"
                              : "text-red-400 bg-red-400/10"
                        }`}
                      >
                        {wager.status}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === wager.id && (
                    <tr className="bg-gray-800/50">
                      <td colSpan={colSpan} className="py-4 px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">
                              Transaction ID
                            </p>
                            <p className="text-white font-mono text-xs">
                              {wager.id}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Round ID</p>
                            <p className="text-white font-mono text-xs">
                              {wager.round_id || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">
                              Balance Before
                            </p>
                            <p className="text-white font-medium">
                              $
                              {parseFloat(
                                wager.balance_before || "0"
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">
                              Balance After
                            </p>
                            <p className="text-white font-medium">
                              $
                              {parseFloat(
                                wager.balance_after || "0"
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          {wager.external_transaction_id && (
                            <div>
                              <p className="text-gray-400 mb-1">
                                External Transaction ID
                              </p>
                              <p className="text-white font-mono text-xs">
                                {wager.external_transaction_id}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400 mb-1">Session ID</p>
                            <p className="text-white font-mono text-xs">
                              {wager.session_id || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Currency</p>
                            <p className="text-white">
                              {wager.currency || "USD"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">
                              Transaction Type
                            </p>
                            <p className="text-white">
                              {wager.transaction_type || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {totalCount > 0 ? (
                <>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  wagers
                </>
              ) : transactions.length > 0 ? (
                <>
                  Showing {transactions.length} wager
                  {transactions.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>No wagers available</>
              )}
            </div>
            {onExportCSV && (
              <button
                onClick={onExportCSV}
                disabled={isExporting || totalCount === 0}
                className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isExporting ? "Exporting..." : "Export to CSV"}</span>
              </button>
            )}
          </div>
          {onPageChange && meta && totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPageChange(Math.max(currentPage - 1, 1));
                }}
                disabled={currentPage === 1 || totalPages <= 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-white text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPageChange(Math.min(currentPage + 1, totalPages));
                }}
                disabled={currentPage >= totalPages || totalPages <= 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
