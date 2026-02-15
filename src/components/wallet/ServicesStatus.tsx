import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Settings,
} from "lucide-react";
import { wmsService } from "../../services/wmsService";
import { toast } from "react-hot-toast";
import { SweeperConfigModal } from "./SweeperConfigModal";

interface ProcessorStatus {
  running: boolean;
  healthy: boolean;
  started_at: string;
  stats?: {
    completed: number;
    pending: number;
    failed: number;
  };
}

interface ListenerStatus {
  chain_id: string;
  running: boolean;
  healthy: boolean;
  last_health_check: string;
  health_error: string;
  started_at: string;
}

interface ListenersStatus {
  running: boolean;
  listeners: ListenerStatus[];
}

interface SweeperStatus {
  running: boolean;
  cycle_number: number;
  last_sweep_time: string;
  next_sweep_time: string;
  cron_expression: string;
}

export const ServicesStatus: React.FC = () => {
  const [processorStatus, setProcessorStatus] =
    useState<ProcessorStatus | null>(null);
  const [listenersStatus, setListenersStatus] =
    useState<ListenersStatus | null>(null);
  const [sweeperStatus, setSweeperStatus] = useState<SweeperStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restarting, setRestarting] = useState<{
    processor: boolean;
    listeners: boolean;
    listenerChainId: string | null;
    sweeper: boolean;
  }>({
    processor: false,
    listeners: false,
    listenerChainId: null,
    sweeper: false,
  });
  const [showSweeperConfigModal, setShowSweeperConfigModal] = useState(false);

  const fetchAllStatus = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [processor, listeners, sweeper] = await Promise.all([
        wmsService.getTVSProcessorStatus(),
        wmsService.getTVSListenersStatus(),
        wmsService.getTVSSweeperStatus(),
      ]);
      setProcessorStatus(processor);
      setListenersStatus(listeners);
      setSweeperStatus(sweeper);
    } catch (error: any) {
      if (!silent) {
        toast.error(
          error.response?.data?.message || "Failed to fetch services status",
        );
      }
      console.error("Error fetching services status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllStatus();
    const interval = setInterval(() => fetchAllStatus(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartProcessor = async () => {
    setRestarting((prev) => ({ ...prev, processor: true }));
    try {
      await wmsService.restartTVSProcessor();
      toast.success("Processor restarted successfully");
      setTimeout(() => fetchAllStatus(true), 2000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to restart processor",
      );
    } finally {
      setRestarting((prev) => ({ ...prev, processor: false }));
    }
  };

  const handleRestartAllListeners = async () => {
    setRestarting((prev) => ({ ...prev, listeners: true }));
    try {
      await wmsService.restartTVSAllListeners();
      toast.success("All listeners restarted successfully");
      setTimeout(() => fetchAllStatus(true), 2000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to restart listeners",
      );
    } finally {
      setRestarting((prev) => ({ ...prev, listeners: false }));
    }
  };

  const handleRestartListener = async (chainId: string) => {
    setRestarting((prev) => ({ ...prev, listenerChainId: chainId }));
    try {
      await wmsService.restartTVSListener(chainId);
      toast.success(`Listener for ${chainId} restarted successfully`);
      setTimeout(() => fetchAllStatus(true), 2000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to restart listener for ${chainId}`,
      );
    } finally {
      setRestarting((prev) => ({ ...prev, listenerChainId: null }));
    }
  };

  const handleTriggerSweeper = async () => {
    setRestarting((prev) => ({ ...prev, sweeper: true }));
    try {
      await wmsService.triggerTVSSweeper();
      toast.success("Sweeper triggered successfully");
      setTimeout(() => fetchAllStatus(true), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to trigger sweeper");
    } finally {
      setRestarting((prev) => ({ ...prev, sweeper: false }));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "0001-01-01T00:00:00Z") {
      return "N/A";
    }
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (running: boolean, healthy: boolean) => {
    if (!running) return "text-red-400 bg-red-400/10";
    if (!healthy) return "text-yellow-400 bg-yellow-400/10";
    return "text-green-400 bg-green-400/10";
  };

  const getStatusIcon = (running: boolean, healthy: boolean) => {
    if (!running) return <XCircle className="h-5 w-5 text-red-400" />;
    if (!healthy) return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    return <CheckCircle className="h-5 w-5 text-green-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading services status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">TVS Services Status</h2>
          <p className="text-gray-400 mt-1">
            Monitor and manage Transaction Verification Service components
          </p>
        </div>
        <button
          onClick={() => fetchAllStatus(false)}
          disabled={refreshing}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Deposit Processor</span>
            </h3>
            {processorStatus &&
              getStatusIcon(processorStatus.running, processorStatus.healthy)}
          </div>
          {processorStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(processorStatus.running, processorStatus.healthy)}`}
                >
                  {processorStatus.running
                    ? processorStatus.healthy
                      ? "Healthy"
                      : "Unhealthy"
                    : "Stopped"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Started At:</span>
                <span className="text-white text-sm">
                  {formatDate(processorStatus.started_at)}
                </span>
              </div>
              {processorStatus.stats && (
                <div className="pt-3 border-t border-gray-700 space-y-2">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Processing Stats
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-900/30 border border-green-700/30 rounded p-2">
                      <div className="text-xs text-green-300 mb-1">
                        Completed
                      </div>
                      <div className="text-lg font-bold text-green-400">
                        {processorStatus.stats.completed}
                      </div>
                    </div>
                    <div className="bg-yellow-900/30 border border-yellow-700/30 rounded p-2">
                      <div className="text-xs text-yellow-300 mb-1">
                        Pending
                      </div>
                      <div className="text-lg font-bold text-yellow-400">
                        {processorStatus.stats.pending}
                      </div>
                    </div>
                    <div className="bg-red-900/30 border border-red-700/30 rounded p-2">
                      <div className="text-xs text-red-300 mb-1">Failed</div>
                      <div className="text-lg font-bold text-red-400">
                        {processorStatus.stats.failed}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleRestartProcessor}
                disabled={restarting.processor}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {restarting.processor ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Restarting...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Restart Processor</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Event Listeners</span>
            </h3>
            {listenersStatus &&
              getStatusIcon(
                listenersStatus.running,
                listenersStatus.listeners.every((l) => l.healthy),
              )}
          </div>
          {listenersStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                    listenersStatus.running,
                    listenersStatus.listeners.every((l) => l.healthy),
                  )}`}
                >
                  {listenersStatus.running
                    ? listenersStatus.listeners.every((l) => l.healthy)
                      ? "All Healthy"
                      : "Some Unhealthy"
                    : "Stopped"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Active Listeners:</span>
                <span className="text-white text-sm">
                  {listenersStatus.listeners.length}
                </span>
              </div>
              <button
                onClick={handleRestartAllListeners}
                disabled={restarting.listeners}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {restarting.listeners ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Restarting...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Restart All Listeners</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Sweeper Service</span>
            </h3>
            {sweeperStatus &&
              getStatusIcon(sweeperStatus.running, sweeperStatus.running)}
          </div>
          {sweeperStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(sweeperStatus.running, sweeperStatus.running)}`}
                >
                  {sweeperStatus.running ? "Running" : "Stopped"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cycle Number:</span>
                <span className="text-white text-sm">
                  {sweeperStatus.cycle_number}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Last Sweep:</span>
                <span className="text-white text-sm">
                  {formatDate(sweeperStatus.last_sweep_time)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Next Sweep:</span>
                <span className="text-white text-sm">
                  {formatDate(sweeperStatus.next_sweep_time)}
                </span>
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setShowSweeperConfigModal(true)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>See Sweeper Config</span>
                </button>
                <button
                  onClick={handleTriggerSweeper}
                  disabled={restarting.sweeper}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {restarting.sweeper ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Triggering...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Trigger Sweep</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>
      </div>

      {listenersStatus && listenersStatus.listeners.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Event Listeners Details
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Chain ID
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Health
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Last Health Check
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Health Error
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Started At
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {listenersStatus.listeners.map((listener) => (
                  <tr
                    key={listener.chain_id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="py-3 px-4 text-white font-medium">
                      {listener.chain_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(listener.running, listener.healthy)}`}
                      >
                        {listener.running ? "Running" : "Stopped"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusIcon(listener.running, listener.healthy)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(listener.last_health_check)}
                    </td>
                    <td className="py-3 px-4">
                      {listener.health_error ? (
                        <span className="text-red-400 text-sm">
                          {listener.health_error}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(listener.started_at)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleRestartListener(listener.chain_id)}
                        disabled={
                          restarting.listenerChainId === listener.chain_id
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 flex items-center space-x-1"
                      >
                        {restarting.listenerChainId === listener.chain_id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Restarting...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            <span>Restart</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SweeperConfigModal
        isOpen={showSweeperConfigModal}
        onClose={() => setShowSweeperConfigModal(false)}
      />
    </div>
  );
};
