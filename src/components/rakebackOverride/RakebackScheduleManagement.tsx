import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  rakebackScheduleService,
  RakebackSchedule,
  CreateRakebackScheduleRequest,
  UpdateRakebackScheduleRequest,
} from "../../services/rakebackScheduleService";
import toast from "react-hot-toast";

export const RakebackScheduleManagement: React.FC = () => {
  const [schedules, setSchedules] = useState<RakebackSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<RakebackSchedule | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [formData, setFormData] = useState<CreateRakebackScheduleRequest>({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    percentage: "" as any,
    scope_type: "all",
    scope_value: "",
  });

  useEffect(() => {
    loadSchedules();
  }, [statusFilter, page]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await rakebackScheduleService.listSchedules({
        status: statusFilter || undefined,
        page,
        page_size: pageSize,
      });
      setSchedules(response.schedules);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (error: any) {
      console.error("Failed to load schedules:", error);
      toast.error(error?.response?.data?.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);

      // Validate
      if (!formData.name.trim()) {
        toast.error("Name is required");
        return;
      }
      if (!formData.start_time) {
        toast.error("Start time is required");
        return;
      }
      if (!formData.end_time) {
        toast.error("End time is required");
        return;
      }
      if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        toast.error("End time must be after start time");
        return;
      }
      if (
        typeof formData.percentage !== "number" ||
        formData.percentage < 0 ||
        formData.percentage > 100
      ) {
        toast.error("Percentage must be between 0 and 100");
        return;
      }
      if (formData.scope_type !== "all" && !formData.scope_value) {
        toast.error('Scope value is required when scope type is not "all"');
        return;
      }

      // Convert datetime-local to ISO string (UTC)
      const startTime = new Date(formData.start_time).toISOString();
      const endTime = new Date(formData.end_time).toISOString();

      await rakebackScheduleService.createSchedule({
        ...formData,
        start_time: startTime,
        end_time: endTime,
        percentage:
          typeof formData.percentage === "string"
            ? parseFloat(formData.percentage)
            : formData.percentage,
      });

      toast.success("Schedule created successfully");
      setShowCreateModal(false);
      resetForm();
      loadSchedules();
    } catch (error: any) {
      console.error("Failed to create schedule:", error);
      toast.error(
        error?.response?.data?.message || "Failed to create schedule",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;

    try {
      setSaving(true);

      const updateData: UpdateRakebackScheduleRequest = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.description !== undefined)
        updateData.description = formData.description;
      if (formData.start_time) {
        updateData.start_time = new Date(formData.start_time).toISOString();
      }
      if (formData.end_time) {
        updateData.end_time = new Date(formData.end_time).toISOString();
      }
      if (formData.percentage !== "" && formData.percentage !== null) {
        updateData.percentage =
          typeof formData.percentage === "string"
            ? parseFloat(formData.percentage)
            : formData.percentage;
      }
      if (formData.scope_type) updateData.scope_type = formData.scope_type;
      if (formData.scope_value !== undefined)
        updateData.scope_value = formData.scope_value;

      await rakebackScheduleService.updateSchedule(
        editingSchedule.id,
        updateData,
      );

      toast.success("Schedule updated successfully");
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (error: any) {
      console.error("Failed to update schedule:", error);
      toast.error(
        error?.response?.data?.message || "Failed to update schedule",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this schedule?")) {
      return;
    }

    try {
      await rakebackScheduleService.deleteSchedule(id);
      toast.success("Schedule cancelled successfully");
      loadSchedules();
    } catch (error: any) {
      console.error("Failed to delete schedule:", error);
      toast.error(
        error?.response?.data?.message || "Failed to cancel schedule",
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      start_time: "",
      end_time: "",
      percentage: "" as any,
      scope_type: "all",
      scope_value: "",
    });
  };

  const openEditModal = (schedule: RakebackSchedule) => {
    setEditingSchedule(schedule);
    // Convert ISO strings to datetime-local format
    const startTime = schedule.start_time
      ? new Date(schedule.start_time).toISOString().slice(0, 16)
      : "";
    const endTime = schedule.end_time
      ? new Date(schedule.end_time).toISOString().slice(0, 16)
      : "";

    setFormData({
      name: schedule.name,
      description: schedule.description || "",
      start_time: startTime,
      end_time: endTime,
      percentage:
        typeof schedule.percentage === "string"
          ? parseFloat(schedule.percentage)
          : schedule.percentage,
      scope_type: schedule.scope_type,
      scope_value: schedule.scope_value || "",
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-400/10";
      case "scheduled":
        return "text-blue-400 bg-blue-400/10";
      case "completed":
        return "text-gray-400 bg-gray-400/10";
      case "cancelled":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-8 h-8 text-purple-500" />
          Scheduled Happy Hours
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create and manage scheduled rakeback events that automatically
          activate and deactivate
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingSchedule(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No schedules found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Scope
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Start Time (UTC)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      End Time (UTC)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {schedule.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-400 font-bold">
                        {typeof schedule.percentage === "string"
                          ? schedule.percentage
                          : schedule.percentage.toFixed(2)}
                        %
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {schedule.scope_type === "all"
                          ? "All Games"
                          : schedule.scope_type === "provider"
                            ? `Provider: ${schedule.scope_value}`
                            : `Game: ${schedule.scope_value}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(schedule.start_time)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(schedule.end_time)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(schedule.status)}`}
                        >
                          {schedule.status}
                        </span>
                        {schedule.is_active && schedule.time_remaining && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {schedule.time_remaining} remaining
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {schedule.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => openEditModal(schedule)}
                                className="text-blue-400 hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Cancel"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {schedule.status === "active" && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, total)} of {total} schedules
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingSchedule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingSchedule ? "Edit Schedule" : "Create Schedule"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Weekend Happy Hour"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rakeback Percentage (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    formData.percentage === "" || formData.percentage === null
                      ? ""
                      : formData.percentage
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setFormData((prev) => ({
                        ...prev,
                        percentage: "" as any,
                      }));
                    } else {
                      const numValue = parseFloat(value);
                      if (
                        !isNaN(numValue) &&
                        numValue >= 0 &&
                        numValue <= 100
                      ) {
                        setFormData((prev) => ({
                          ...prev,
                          percentage: numValue,
                        }));
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scope Type *
                </label>
                <select
                  value={formData.scope_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scope_type: e.target.value as any,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Games</option>
                  <option value="provider">Provider</option>
                  <option value="game">Game</option>
                </select>
              </div>

              {formData.scope_type !== "all" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scope Value *{" "}
                    <span className="text-gray-500 text-xs">
                      (Provider or Game ID)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.scope_value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scope_value: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder={
                      formData.scope_type === "provider"
                        ? "Provider name"
                        : "Game ID"
                    }
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time (UTC) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_time: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Schedule will automatically activate at this time (UTC)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time (UTC) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_time: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Schedule will automatically deactivate at this time (UTC)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingSchedule ? handleUpdate : handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingSchedule ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
