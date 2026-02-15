import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Shield,
  User,
  Calendar,
  Globe,
  FileText,
  ChevronDown,
  ChevronUp,
  Ban,
} from "lucide-react";
import { useServices } from "../../contexts/ServicesContext";
import { toast } from "react-hot-toast";

interface DuplicateIPAccount {
  user_id: string;
  username: string;
  email: string;
  user_agent: string;
  created_at: string;
  session_date: string;
}

interface DuplicateIPAccountsReport {
  ip_address: string;
  count: number;
  accounts: DuplicateIPAccount[];
}

export const DuplicateIPAccountsReport: React.FC = () => {
  const { reportsSvc } = useServices();
  const [reports, setReports] = useState<DuplicateIPAccountsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIPs, setExpandedIPs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [suspendingIP, setSuspendingIP] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendNote, setSuspendNote] = useState("");

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await reportsSvc.getDuplicateIPAccounts();
      if (response.success && response.data) {
        setReports(response.data);
      } else {
        toast.error("Failed to load duplicate IP accounts report");
      }
    } catch (error) {
      console.error("Failed to load duplicate IP accounts:", error);
      toast.error("Failed to load duplicate IP accounts report");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (ipAddress: string) => {
    setExpandedIPs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ipAddress)) {
        newSet.delete(ipAddress);
      } else {
        newSet.add(ipAddress);
      }
      return newSet;
    });
  };

  const handleSuspendClick = (ipAddress: string) => {
    setSelectedIP(ipAddress);
    setSuspendReason(`Suspended due to duplicate IP address: ${ipAddress}`);
    setSuspendNote("");
    setShowSuspendModal(true);
  };

  const handleSuspendConfirm = async () => {
    if (!selectedIP) return;

    try {
      setSuspendingIP(selectedIP);
      const response = await reportsSvc.suspendAccountsByIP(
        selectedIP,
        suspendReason,
        suspendNote,
      );

      if (response.success) {
        toast.success(
          `Successfully suspended ${response.data?.accounts_suspended || 0} accounts from IP ${selectedIP}`,
        );
        setShowSuspendModal(false);
        setSelectedIP(null);
        setSuspendReason("");
        setSuspendNote("");
        // Reload the report to reflect changes
        await loadReport();
      } else {
        toast.error(response.message || "Failed to suspend accounts");
      }
    } catch (error) {
      console.error("Failed to suspend accounts:", error);
      toast.error("Failed to suspend accounts");
    } finally {
      setSuspendingIP(null);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "IP Address",
      "Account Count",
      "User ID",
      "Username",
      "Email",
      "User Agent",
      "Account Created",
      "Session Date",
    ];
    const rows = reports.flatMap((report) =>
      report.accounts.map((account) => [
        report.ip_address,
        report.count.toString(),
        account.user_id,
        account.username,
        account.email,
        account.user_agent || "N/A",
        new Date(account.created_at).toLocaleString(),
        new Date(account.session_date).toLocaleString(),
      ]),
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `duplicate-ip-accounts-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully");
  };

  const filteredReports = reports.filter(
    (report) =>
      report.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.accounts.some(
        (account) =>
          account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.email.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const totalDuplicateIPs = reports.length;
  const totalAccounts = reports.reduce((sum, report) => sum + report.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-500" />
            Duplicate IP Accounts Report
          </h2>
          <p className="text-gray-400 mt-1">
            Accounts created from the same IP address (potential bot/spam
            detection)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Duplicate IP Addresses</p>
              <p className="text-2xl font-bold text-white mt-1">
                {totalDuplicateIPs}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Accounts</p>
              <p className="text-2xl font-bold text-white mt-1">
                {totalAccounts}
              </p>
            </div>
            <User className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average per IP</p>
              <p className="text-2xl font-bold text-white mt-1">
                {totalDuplicateIPs > 0
                  ? (totalAccounts / totalDuplicateIPs).toFixed(1)
                  : "0"}
              </p>
            </div>
            <Globe className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <input
          type="text"
          placeholder="Search by IP address, username, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Report Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading report...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm
                ? "No results found"
                : "No duplicate IP accounts found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Account Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Accounts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredReports.map((report) => {
                  const isExpanded = expandedIPs.has(report.ip_address);
                  return (
                    <React.Fragment key={report.ip_address}>
                      <tr className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span className="text-white font-mono">
                              {report.ip_address}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                            {report.count} accounts
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleExpand(report.ip_address)}
                            className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide accounts
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Show {report.count} accounts
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() =>
                              handleSuspendClick(report.ip_address)
                            }
                            disabled={suspendingIP === report.ip_address}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Ban className="h-4 w-4" />
                            {suspendingIP === report.ip_address
                              ? "Suspending..."
                              : "Suspend All"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-gray-900/50">
                            <div className="space-y-3">
                              {report.accounts.map((account, index) => (
                                <div
                                  key={account.user_id}
                                  className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">
                                        Username
                                      </p>
                                      <p className="text-white font-medium">
                                        {account.username}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">
                                        Email
                                      </p>
                                      <p className="text-white">
                                        {account.email}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">
                                        User Agent
                                      </p>
                                      <p
                                        className="text-white text-sm truncate"
                                        title={account.user_agent || "N/A"}
                                      >
                                        {account.user_agent || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 text-xs mb-1">
                                        Created
                                      </p>
                                      <p className="text-white text-sm">
                                        {new Date(
                                          account.created_at,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-700">
                                    <p className="text-gray-400 text-xs">
                                      Session Date:{" "}
                                      {new Date(
                                        account.session_date,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && selectedIP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="h-6 w-6 text-red-500" />
              <h3 className="text-xl font-bold text-white">
                Suspend All Accounts
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-300 mb-2">
                  Are you sure you want to suspend all accounts from IP address:
                </p>
                <p className="text-white font-mono font-semibold bg-gray-900 p-2 rounded">
                  {selectedIP}
                </p>
                <p className="text-yellow-400 text-sm mt-2">
                  This will suspend{" "}
                  {reports.find((r) => r.ip_address === selectedIP)?.count || 0}{" "}
                  account(s)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Reason for suspension"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Note (optional)
                </label>
                <textarea
                  value={suspendNote}
                  onChange={(e) => setSuspendNote(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedIP(null);
                  setSuspendReason("");
                  setSuspendNote("");
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendConfirm}
                disabled={suspendingIP !== null}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Ban className="h-4 w-4" />
                {suspendingIP ? "Suspending..." : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
