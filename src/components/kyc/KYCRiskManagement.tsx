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
  Upload,
  User,
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
        return "text-gray-400 bg-gray-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
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
        return "text-gray-400";
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
        return <Flag className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            KYC & Risk Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage KYC applications and monitor risk alerts
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending KYC</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {
                  kycApplications.filter((app) => app.status === "pending")
                    .length
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Risk Alerts</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {riskAlerts.filter((alert) => alert.status === "active").length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Under Review</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {
                  kycApplications.filter((app) => app.status === "under_review")
                    .length
                }
              </p>
            </div>
            <Eye className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Approved Today</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
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

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("kyc-applications")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "kyc-applications"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              KYC Applications
            </button>
            <button
              onClick={() => setActiveTab("risk-alerts")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "risk-alerts"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Risk Alerts
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "kyc-applications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  KYC Applications ({kycApplications.length})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Application ID
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Player
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Risk Level
                      </th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">
                        Total Deposits
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Submitted
                      </th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycApplications.map((application, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30"
                      >
                        <td className="py-3 px-4 text-purple-400 font-mono text-sm">
                          {application.id}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {application.playerName}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
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
                        <td className="py-3 px-4 text-gray-400 text-sm">
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
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                  Risk Alerts ({riskAlerts.length})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Alert ID
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Player
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Alert Type
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Severity
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        Detected
                      </th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskAlerts.map((alert, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30"
                      >
                        <td className="py-3 px-4 text-purple-400 font-mono text-sm">
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
                        <td className="py-3 px-4 text-gray-300 max-w-xs truncate">
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

      {/* KYC Application Detail Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                KYC Application Details
              </h3>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Application ID
                  </label>
                  <p className="text-white font-mono">
                    {selectedApplication.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Player Name
                  </label>
                  <p className="text-white">{selectedApplication.playerName}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-white">{selectedApplication.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Risk Level
                  </label>
                  <p
                    className={`font-medium ${getRiskColor(selectedApplication.riskLevel)}`}
                  >
                    {selectedApplication.riskLevel.toUpperCase()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-3">
                  Documents
                </label>
                <div className="space-y-2">
                  {selectedApplication.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-700 p-3 rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-white">{doc.type}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 text-sm">
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
                  <label className="block text-sm text-gray-400 mb-2">
                    Notes
                  </label>
                  <p className="text-white bg-gray-700 p-3 rounded">
                    {selectedApplication.notes}
                  </p>
                </div>
              )}

              {selectedApplication.status === "pending" && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() =>
                      handleKYCAction(
                        selectedApplication.id,
                        "reject",
                        "Rejected from detailed review",
                      )
                    }
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
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
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
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
