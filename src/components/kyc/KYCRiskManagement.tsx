import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Eye,
  FileText,
  Download,
  ClipboardList,
  Activity,
  Flag,
} from "lucide-react";

interface KYCApplication {
  id: string;
  playerId: string;
  playerName: string;
  email: string;
  submittedDate: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  riskLevel: "low" | "medium" | "high";
  documents: {
    type: string;
    status: "pending" | "approved" | "rejected";
    uploadDate: string;
  }[];
  totalDeposits: number;
  totalWithdrawals: number;
  reviewedBy?: string;
  reviewDate?: string;
  notes?: string;
}

interface RiskAlert {
  id: string;
  playerId: string;
  playerName: string;
  alertType:
    | "suspicious_pattern"
    | "high_volume"
    | "rapid_deposits"
    | "unusual_betting"
    | "multiple_accounts"
    | "chargeback_risk";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detectedDate: string;
  status: "active" | "investigating" | "resolved" | "false_positive";
  assignedTo?: string;
  amount?: number;
  transactionCount?: number;
}

export const KYCRiskManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("kyc-applications");
  const [selectedApplication, setSelectedApplication] =
    useState<KYCApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Mock KYC applications data
  const [kycApplications, setKycApplications] = useState<KYCApplication[]>([
    {
      id: "KYC001",
      playerId: "P001",
      playerName: "CryptoKing92",
      email: "cryptoking92@email.com",
      submittedDate: "2024-01-07 10:30",
      status: "pending",
      riskLevel: "low",
      documents: [
        {
          type: "ID Document",
          status: "approved",
          uploadDate: "2024-01-07 10:30",
        },
        {
          type: "Proof of Address",
          status: "pending",
          uploadDate: "2024-01-07 10:32",
        },
        {
          type: "Selfie with ID",
          status: "pending",
          uploadDate: "2024-01-07 10:35",
        },
      ],
      totalDeposits: 25000,
      totalWithdrawals: 18000,
    },
    {
      id: "KYC002",
      playerId: "P003",
      playerName: "EthereumMaster",
      email: "ethmaster@email.com",
      submittedDate: "2024-01-06 14:20",
      status: "under_review",
      riskLevel: "medium",
      documents: [
        {
          type: "ID Document",
          status: "approved",
          uploadDate: "2024-01-06 14:20",
        },
        {
          type: "Proof of Address",
          status: "approved",
          uploadDate: "2024-01-06 14:22",
        },
        {
          type: "Selfie with ID",
          status: "rejected",
          uploadDate: "2024-01-06 14:25",
        },
      ],
      totalDeposits: 45000,
      totalWithdrawals: 32000,
      assignedTo: "compliance_officer",
      notes: "Selfie quality insufficient, requested resubmission",
    },
    {
      id: "KYC003",
      playerId: "P007",
      playerName: "SolanaGamer",
      email: "solgamer@email.com",
      submittedDate: "2024-01-05 16:45",
      status: "approved",
      riskLevel: "low",
      documents: [
        {
          type: "ID Document",
          status: "approved",
          uploadDate: "2024-01-05 16:45",
        },
        {
          type: "Proof of Address",
          status: "approved",
          uploadDate: "2024-01-05 16:47",
        },
        {
          type: "Selfie with ID",
          status: "approved",
          uploadDate: "2024-01-05 16:50",
        },
      ],
      totalDeposits: 12000,
      totalWithdrawals: 8500,
      reviewedBy: "kyc_analyst",
      reviewDate: "2024-01-06 09:15",
    },
  ]);

  // Mock risk alerts data
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([
    {
      id: "RISK001",
      playerId: "P002",
      playerName: "BitcoinWhale",
      alertType: "high_volume",
      severity: "high",
      description: "Player has deposited $50,000+ in the last 24 hours",
      detectedDate: "2024-01-07 12:30",
      status: "active",
      amount: 67500,
      transactionCount: 8,
    },
    {
      id: "RISK002",
      playerId: "P004",
      playerName: "DogePlayer",
      alertType: "suspicious_pattern",
      severity: "critical",
      description: "Unusual betting patterns detected - potential bot activity",
      detectedDate: "2024-01-07 11:15",
      status: "investigating",
      assignedTo: "risk_analyst",
      transactionCount: 156,
    },
    {
      id: "RISK003",
      playerId: "P008",
      playerName: "PolygonPlayer",
      alertType: "multiple_accounts",
      severity: "medium",
      description: "Potential multiple accounts from same IP address",
      detectedDate: "2024-01-06 18:45",
      status: "resolved",
      assignedTo: "compliance_officer",
    },
    {
      id: "RISK004",
      playerId: "P005",
      playerName: "LitecoinLover",
      alertType: "rapid_deposits",
      severity: "medium",
      description: "Multiple rapid deposits within short timeframe",
      detectedDate: "2024-01-06 15:20",
      status: "false_positive",
      amount: 15000,
      transactionCount: 5,
    },
  ]);

  const handleKYCAction = (
    applicationId: string,
    action: "approve" | "reject",
    notes?: string,
  ) => {
    setKycApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: action === "approve" ? "approved" : "rejected",
              reviewedBy: "current_user",
              reviewDate: new Date().toLocaleString(),
              notes: notes || app.notes,
            }
          : app,
      ),
    );
    setShowApplicationModal(false);
    setSelectedApplication(null);
  };

  const handleRiskAction = (
    alertId: string,
    action: "investigate" | "resolve" | "false_positive",
  ) => {
    setRiskAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: action === "investigate" ? "investigating" : action,
              assignedTo:
                action === "investigate" ? "current_user" : alert.assignedTo,
            }
          : alert,
      ),
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-400 bg-green-400/10";
      case "rejected":
        return "text-red-400 bg-red-400/10";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10";
      case "under_review":
        return "text-blue-400 bg-blue-400/10";
      case "active":
        return "text-red-400 bg-red-400/10";
      case "investigating":
        return "text-blue-400 bg-blue-400/10";
      case "resolved":
        return "text-green-400 bg-green-400/10";
      case "false_positive":
        return "text-slate-400 bg-slate-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
      case "critical":
        return "text-red-500";
      default:
        return "text-slate-400";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "medium":
        return <Flag className="h-4 w-4 text-yellow-400" />;
      case "low":
        return <Flag className="h-4 w-4 text-green-400" />;
      default:
        return <Flag className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <Shield className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Compliance & risk
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Identity verification queue and risk signals
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white">
          <Download className="h-4 w-4" />
          <span>Export report</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Awaiting verification</p>
              <p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">
                {
                  kycApplications.filter((app) => app.status === "pending")
                    .length
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Open signals</p>
              <p className="text-2xl font-bold text-red-400 mt-1 tabular-nums">
                {riskAlerts.filter((alert) => alert.status === "active").length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">In review</p>
              <p className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">
                {
                  kycApplications.filter((app) => app.status === "under_review")
                    .length
                }
              </p>
            </div>
            <Eye className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Cleared today</p>
              <p className="text-2xl font-bold text-green-400 mt-1 tabular-nums">
                {
                  kycApplications.filter(
                    (app) =>
                      app.status === "approved" &&
                      app.reviewDate?.includes("2024-01-07"),
                  ).length
                }
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Main card: vertical sidebar + content */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 overflow-hidden flex flex-col md:flex-row min-h-[480px] backdrop-blur-sm">
        <aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r border-slate-700/80 bg-slate-800/30">
          <nav className="p-3 space-y-6" aria-label="Compliance sections">
            <div>
              <h2 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Compliance
              </h2>
              <div className="space-y-0.5">
                <button
                  onClick={() => setActiveTab("kyc-applications")}
                  className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-medium text-sm text-left transition-colors ${
                    activeTab === "kyc-applications"
                      ? "bg-red-500/15 text-red-500"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  Verification queue
                </button>
                <button
                  onClick={() => setActiveTab("risk-alerts")}
                  className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-medium text-sm text-left transition-colors ${
                    activeTab === "risk-alerts"
                      ? "bg-red-500/15 text-red-500"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <Activity className="h-4 w-4 shrink-0" />
                  Risk signals
                </button>
              </div>
            </div>
          </nav>
        </aside>

        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {activeTab === "kyc-applications" && (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Verification queue ({kycApplications.length})
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/80">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Reference
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Player
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Risk level
                      </th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">
                        Total deposits
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Submitted
                      </th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycApplications.map((application, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <td className="py-3 px-4 text-red-400 font-mono text-sm">
                          {application.id}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {application.playerName}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {application.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(application.status)}`}
                          >
                            {application.status.replace("_", " ")}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 font-medium ${getRiskColor(application.riskLevel)}`}
                        >
                          {application.riskLevel.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-white text-right font-medium">
                          ${application.totalDeposits.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-sm">
                          {application.submittedDate}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowApplicationModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 p-1"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {application.status === "pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleKYCAction(application.id, "approve")
                                  }
                                  className="text-green-400 hover:text-green-300 p-1"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleKYCAction(application.id, "reject")
                                  }
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "risk-alerts" && (
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Risk signals ({riskAlerts.length})
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/80">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Signal ID
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Player
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Severity
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Detected
                      </th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskAlerts.map((alert, index) => (
                      <tr
                        key={index}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <td className="py-3 px-4 text-red-400 font-mono text-sm">
                          {alert.id}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {alert.playerName}
                        </td>
                        <td className="py-3 px-4 text-white capitalize">
                          {alert.alertType.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(alert.severity)}
                            <span
                              className={`font-medium ${getRiskColor(alert.severity)}`}
                            >
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {alert.description}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(alert.status)}`}
                          >
                            {alert.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {alert.detectedDate}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            {alert.status === "active" && (
                              <button
                                onClick={() =>
                                  handleRiskAction(alert.id, "investigate")
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                              >
                                Investigate
                              </button>
                            )}
                            {alert.status === "investigating" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleRiskAction(alert.id, "resolve")
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={() =>
                                    handleRiskAction(alert.id, "false_positive")
                                  }
                                  className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                                >
                                  False Positive
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification detail modal */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 border border-slate-800/80 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Verification details
              </h3>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Reference
                  </label>
                  <p className="text-white font-mono text-sm">
                    {selectedApplication.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Player
                  </label>
                  <p className="text-white">{selectedApplication.playerName}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Email
                  </label>
                  <p className="text-white">{selectedApplication.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Risk level
                  </label>
                  <p
                    className={`font-medium ${getRiskColor(selectedApplication.riskLevel)}`}
                  >
                    {selectedApplication.riskLevel.toUpperCase()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-3">
                  Documents
                </label>
                <div className="space-y-2">
                  {selectedApplication.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-800/60 border border-slate-700/80 p-3 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-white">{doc.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">
                          {doc.uploadDate}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedApplication.notes && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Notes
                  </label>
                  <p className="text-white bg-slate-800/60 border border-slate-700/80 p-3 rounded-xl text-sm">
                    {selectedApplication.notes}
                  </p>
                </div>
              )}

              {selectedApplication.status === "pending" && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/80">
                  <button
                    onClick={() =>
                      handleKYCAction(
                        selectedApplication.id,
                        "reject",
                        "Rejected from detailed review",
                      )
                    }
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-medium text-sm"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() =>
                      handleKYCAction(
                        selectedApplication.id,
                        "approve",
                        "Approved after detailed review",
                      )
                    }
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-xl font-medium text-sm"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
