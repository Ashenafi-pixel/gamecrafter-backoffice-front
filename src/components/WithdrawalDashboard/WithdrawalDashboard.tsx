import React, { useState, useEffect } from "react";
import {
  Pause,
  Play,
  AlertTriangle,
  DollarSign,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { wmsService } from "../../services/wmsService";
import { brandService, Brand } from "../../services/brandService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { WithdrawalStats } from "../../types";

interface WithdrawalGlobalStatus {
  enabled: boolean;
  reason?: string;
  paused_by?: string;
  paused_at?: string;
}

const WithdrawalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<WithdrawalGlobalStatus>({
    enabled: true,
    reason: "",
    paused_by: "",
    paused_at: "",
  });
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId !== null) {
      fetchDashboardData();
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await brandService.getBrands({
        page: 1,
        "per-page": 100,
      });
      if (response.success && response.data) {
        const brandsList = response.data.brands || [];
        setBrands(brandsList);

        const storedBrandId = localStorage.getItem(
          "withdrawal_dashboard_brand_id",
        );
        if (
          storedBrandId &&
          brandsList.some((b: Brand) => b.id === storedBrandId)
        ) {
          setSelectedBrandId(storedBrandId);
        } else if (brandsList.length > 0) {
          const randomIndex = Math.floor(Math.random() * brandsList.length);
          const randomBrand = brandsList[randomIndex];
          setSelectedBrandId(randomBrand.id);
          localStorage.setItem("withdrawal_dashboard_brand_id", randomBrand.id);
        }
      }
    } catch (err: any) {
      console.error("Error fetching brands:", err);
      toast.error("Failed to fetch brands");
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    localStorage.setItem("withdrawal_dashboard_brand_id", brandId);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const globalStatusData = await wmsService.getWithdrawalGlobalStatus(
        selectedBrandId || undefined,
      );
      if (globalStatusData) {
        setGlobalStatus(globalStatusData);
      }

      const statsData = await wmsService.getWithdrawalStats(
        selectedBrandId || undefined,
      );
      if (statsData) {
        setStats(statsData);
      }
    } catch (err: any) {
      setError("Failed to fetch dashboard data");
      toast.error("Failed to fetch dashboard data");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobalStatus = async () => {
    try {
      const reason = "immediate action needed";
      const response = await wmsService.toggleWithdrawalGlobalStatus(
        reason,
        selectedBrandId || undefined,
      );

      if (response.success) {
        const updatedStatus = await wmsService.getWithdrawalGlobalStatus(
          selectedBrandId || undefined,
        );
        if (updatedStatus) {
          setGlobalStatus(updatedStatus);
        }
        toast.success("Global status updated successfully");
      } else {
        toast.error(response.message || "Failed to update global status");
      }
    } catch (err: any) {
      toast.error("Failed to update global status");
      console.error("Error toggling global status:", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadingBrands ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
            <span className="text-gray-400 text-sm">Loading brands...</span>
          </div>
        </div>
      ) : brands.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Brand
          </label>
          <select
            value={selectedBrandId || ""}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name} ({brand.code})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Withdrawal Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Overview of withdrawal system status and statistics
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Activity className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-600/10 border border-red-600 text-red-400 p-4 rounded-lg flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Global Status Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            {globalStatus.enabled ? (
              <Play className="h-5 w-5 mr-2 text-green-400" />
            ) : (
              <Pause className="h-5 w-5 mr-2 text-red-400" />
            )}
            Global Withdrawal Status
          </h3>
          <button
            onClick={toggleGlobalStatus}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              globalStatus.enabled
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {globalStatus.enabled ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause All</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Resume All</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${globalStatus.enabled ? "bg-green-400" : "bg-red-400"}`}
            ></div>
            <span className="text-white font-medium">
              {globalStatus.enabled
                ? "Withdrawals are currently enabled"
                : "Withdrawals are currently paused"}
            </span>
          </div>

          {!globalStatus.enabled && globalStatus.reason && (
            <div className="bg-red-900/20 border border-red-600 p-3 rounded-lg">
              <p className="text-red-400 text-sm">
                <strong>Pause Reason:</strong> {globalStatus.reason}
              </p>
            </div>
          )}

          {globalStatus.paused_by && (
            <div className="text-sm text-gray-400">
              <p>Paused by: {globalStatus.paused_by}</p>
              {globalStatus.paused_at && (
                <p>Paused at: {formatDate(globalStatus.paused_at)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Withdrawals */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Withdrawals
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.total_withdrawals}
                </p>
              </div>
            </div>
          </div>

          {/* Completed Withdrawals */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {stats.completed_withdrawals}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.pending_review}
                </p>
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.total_amount_cents / 100)}
                </p>
              </div>
            </div>
          </div>

          {/* Today Amount */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Today Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.today_amount_cents / 100)}
                </p>
              </div>
            </div>
          </div>

          {/* Hourly Amount */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Hourly Amount
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats.hourly_amount_cents / 100)}
                </p>
              </div>
            </div>
          </div>

          {/* Approved Today */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Approved Today
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.approved_today}
                </p>
              </div>
            </div>
          </div>

          {/* Rejected Today */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Rejected Today
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.rejected_today}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const url = selectedBrandId
                ? `/transactions/withdrawals?brand_id=${selectedBrandId}`
                : "/transactions/withdrawals";
              navigate(url);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center space-x-3"
          >
            <DollarSign className="h-6 w-6" />
            <div className="text-left">
              <p className="font-medium">View All Withdrawals</p>
              <p className="text-sm text-blue-200">
                Browse and filter withdrawals
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              const url = selectedBrandId
                ? `/transactions/withdrawals?status=awaiting_admin_review&brand_id=${selectedBrandId}`
                : "/transactions/withdrawals?status=awaiting_admin_review";
              navigate(url);
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg flex items-center space-x-3"
          >
            <Pause className="h-6 w-6" />
            <div className="text-left">
              <p className="font-medium">Manage Paused</p>
              <p className="text-sm text-yellow-200">
                Review paused withdrawals
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              const url = selectedBrandId
                ? `/transactions/withdrawals/settings?brand_id=${selectedBrandId}`
                : "/transactions/withdrawals/settings";
              navigate(url);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center space-x-3"
          >
            <Activity className="h-6 w-6" />
            <div className="text-left">
              <p className="font-medium">Configure Settings</p>
              <p className="text-sm text-purple-200">
                Adjust thresholds and rules
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalDashboard;
