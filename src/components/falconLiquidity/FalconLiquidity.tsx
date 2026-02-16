import React, { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { falconLiquidityService } from "../../services/falconLiquidityService";
import type { FalconLiquidityData } from "../../types/falconLiquidity";

const FalconLiquidity: React.FC = () => {
  const [messages, setMessages] = useState<FalconLiquidityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await falconLiquidityService.getAllData({ per_page: 50 });
      setMessages(res.data?.messages ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <Activity className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Falcon Liquidity
            </h1>
            <p className="text-sm text-slate-400">
              Liquidity message queue and status
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-500 hover:bg-red-500/25 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-slate-700/80">
          <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Messages
          </h2>
        </div>
        <div className="p-4 md:p-6 overflow-auto">
          {loading ? (
            <div className="text-slate-400 text-center py-8">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              No messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700/80">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Transaction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/80">
                  {messages.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-sm text-white font-mono">{m.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{m.user_id}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{m.transaction_id}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{m.message_type}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{m.status}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{m.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FalconLiquidity;
