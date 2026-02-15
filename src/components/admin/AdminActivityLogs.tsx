import React, { useState, useEffect } from "react";
import {
  AdminActivityLog,
  AdminActivityCategory,
  AdminActivityAction,
  AdminActivityStats,
  AdminActivityFilters,
} from "../../types";
import { adminActivityLogsService } from "../../services/adminActivityLogsService";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const AdminActivityLogs: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [categories, setCategories] = useState<AdminActivityCategory[]>([]);
  const [actions, setActions] = useState<AdminActivityAction[]>([]);
  const [stats, setStats] = useState<AdminActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [filters, setFilters] = useState<AdminActivityFilters>({
    page: 1,
    limit: 20,
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadInitialData();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadLogs();
    }
  }, [filters, isAuthenticated, authLoading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, actionsRes, statsRes] = await Promise.all([
        adminActivityLogsService.getCategories(),
        adminActivityLogsService.getActions(),
        adminActivityLogsService.getActivityStats(),
      ]);

      if (categoriesRes.success && Array.isArray(categoriesRes.data)) {
        setCategories(categoriesRes.data);
      } else {
        setCategories([]);
      }
      if (actionsRes.success && Array.isArray(actionsRes.data)) {
        setActions(actionsRes.data);
      } else {
        setActions([]);
      }
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await adminActivityLogsService.getActivityLogs(filters);

      if (response.success) {
        // Filter out empty objects and ensure logs is an array
        const validLogs = Array.isArray(response.data?.logs)
          ? response.data.logs.filter(
              (log) => log && log.id && Object.keys(log).length > 0,
            )
          : [];
        setLogs(validLogs);
        setTotalLogs(response.data?.total || 0);
        setTotalPages(response.data?.total_pages || 1);
        setCurrentPage(response.data?.page || 1);
      } else {
        toast.error(response.error || "Failed to load activity logs");
      }
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const newFilters: AdminActivityFilters = {
      ...filters,
      page: 1,
      search: searchTerm || undefined,
      category: selectedCategory || undefined,
      severity: selectedSeverity || undefined,
      action: selectedAction || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedSeverity("");
    setSelectedAction("");
    setDateFrom("");
    setDateTo("");

    const newFilters: AdminActivityFilters = {
      page: 1,
      limit: 20,
    };

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setFilters({ ...filters, page });
  };

  const handleLogClick = (log: AdminActivityLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-100";
      case "error":
        return "text-red-500 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "info":
        return "text-blue-600 bg-blue-100";
      case "low":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryObj = categories.find((c) => c.name === category);
    return categoryObj?.color || "#6B7280";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFilteredActions = () => {
    if (!selectedCategory) return actions;
    return actions.filter(
      (action) =>
        categories.find((cat) => cat.name === selectedCategory)?.id ===
        action.category_id,
    );
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-300 mb-6">
            Please log in to view admin activity logs.
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (loading && (!logs || logs.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Activity Logs
        </h1>
        <p className="text-gray-300">
          Monitor and track all administrative activities
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Logs</p>
                <p className="text-2xl font-semibold text-white">
                  {stats?.total_activities?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Categories</p>
                <p className="text-2xl font-semibold text-white">
                  {stats?.activities_by_category
                    ? Object.keys(stats.activities_by_category).length
                    : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Warnings</p>
                <p className="text-2xl font-semibold text-white">
                  {stats?.activities_by_severity?.warning || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-red-600 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Errors</p>
                <p className="text-2xl font-semibold text-white">
                  {stats?.activities_by_severity?.error || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories &&
                Array.isArray(categories) &&
                categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              {actions &&
                Array.isArray(actions) &&
                getFilteredActions().map((action) => (
                  <option key={action.id} value={action.name}>
                    {action.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Search
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Activity Logs ({totalLogs.toLocaleString()})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {logs && Array.isArray(logs) && logs.length > 0 ? (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">
                            {log.admin_username || "Unknown"}
                          </span>
                          {log.admin_email && (
                            <span className="text-xs text-gray-400">
                              {log.admin_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor:
                              getCategoryColor(log.category) + "20",
                            color: getCategoryColor(log.category),
                          }}
                        >
                          {log.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleLogClick(log)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No activity logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Showing {(currentPage - 1) * limit + 1} to{" "}
                {Math.min(currentPage * limit, totalLogs)} of {totalLogs}{" "}
                results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        currentPage === page
                          ? "text-white bg-blue-600 border border-blue-500"
                          : "text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-700 w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Activity Log Details
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      ID
                    </label>
                    <p className="mt-1 text-sm text-white">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Admin User
                    </label>
                    <div className="mt-1">
                      <p className="text-sm text-white font-medium">
                        {selectedLog.admin_username || "Unknown"}
                      </p>
                      {selectedLog.admin_email && (
                        <p className="text-xs text-gray-400">
                          {selectedLog.admin_email}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {selectedLog.admin_user_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Action
                    </label>
                    <p className="mt-1 text-sm text-white font-medium">
                      {selectedLog.action}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Resource Type
                    </label>
                    <p className="mt-1 text-sm text-white">
                      {selectedLog.resource_type}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Category
                    </label>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor:
                          getCategoryColor(selectedLog.category) + "20",
                        color: getCategoryColor(selectedLog.category),
                      }}
                    >
                      {selectedLog.category}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Severity
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedLog.severity)}`}
                    >
                      {selectedLog.severity}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-white">
                    {selectedLog.description}
                  </p>
                </div>

                {selectedLog.resource_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Resource ID
                    </label>
                    <p className="mt-1 text-sm text-white">
                      {selectedLog.resource_id}
                    </p>
                  </div>
                )}

                {selectedLog.details && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Details
                    </label>
                    <pre className="mt-1 text-sm text-gray-300 bg-gray-700 p-3 rounded-md overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      IP Address
                    </label>
                    <p className="mt-1 text-sm text-white">
                      {selectedLog.ip_address || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Session ID
                    </label>
                    <p className="mt-1 text-sm text-white">
                      {selectedLog.session_id || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Created At
                    </label>
                    <p className="mt-1 text-sm text-white">
                      {formatDate(selectedLog.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Updated At
                    </label>
                    <p className="mt-1 text-sm text-white">
                      {formatDate(selectedLog.updated_at)}
                    </p>
                  </div>
                </div>

                {selectedLog.user_agent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      User Agent
                    </label>
                    <p className="mt-1 text-sm text-white break-all">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminActivityLogs;
