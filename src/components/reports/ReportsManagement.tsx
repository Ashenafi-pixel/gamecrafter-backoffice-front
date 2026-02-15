import React, { useState } from "react";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { DuplicateIPAccountsReport } from "./DuplicateIPAccountsReport";
import { BarChart3, Shield, FileText } from "lucide-react";

export const ReportsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"analytics" | "duplicate-ip">(
    "analytics",
  );

  return (
    <div className="space-y-6">
      {/* Page Header - match game-management */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <FileText className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Financial overview and analytics
            </p>
          </div>
        </div>
      </div>

      {/* Tabs - red accent for active */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="border-b border-slate-700/80">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === "analytics"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Financial overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("duplicate-ip")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === "duplicate-ip"
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Duplicate IP Accounts</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {activeTab === "analytics" && <AnalyticsDashboard />}
          {activeTab === "duplicate-ip" && (
            <div className="p-6">
              <DuplicateIPAccountsReport />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
