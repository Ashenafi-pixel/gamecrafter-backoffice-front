import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./components/Dashboard";
import { GameReport } from "./components/reports/GameReport";
import { TransactionReport } from "./components/reports/TransactionReport";
import { DailyReport } from "./components/reports/DailyReport";
import { BigWinnersReport } from "./components/reports/BigWinnersReport";
import { PlayerMetricsReport } from "./components/reports/PlayerMetricsReport";
import { AffiliateReport } from "./components/reports/AffiliateReport";
import { CountryReport } from "./components/reports/CountryReport";
import { GamePerformanceReport } from "./components/reports/GamePerformanceReport";
import { BrandReport } from "./components/reports/BrandReport";
import ProviderManagement from "./components/providerManagement/ProviderManagement";
import { ReportsManagement } from "./components/reports/ReportsManagement";
import { PlayerManagement } from "./components/players/PlayerManagement";
import { WelcomeBonusManagement } from "./components/welcomeBonus/WelcomeBonusManagement";
import { CashbackManagement } from "./components/cashback/CashbackManagement";
import { TransactionManagement } from "./components/transactions/TransactionManagement";
import { GamingTransactions } from "./components/transactions/GamingTransactions";
import { ManualFundManagement } from "./components/transactions/ManualFundsManagement";
import { AccessControl } from "./components/access/AccessControl";
import { NotificationManagement } from "./components/notifications/NotificationManagement";
import { SettingsManagement } from "./components/settings/SettingsManagement";
import { KYCRiskManagement } from "./components/kyc/KYCRiskManagement";
import { KYCManagementPage } from "./components/kyc/KYCManagementPage";
import { WithdrawalManagement } from "./components/transactions/WithdrawalManagement";
import WithdrawalDashboard from "./components/WithdrawalDashboard/WithdrawalDashboard";
import WithdrawalSettings from "./components/WithdrawalSettings/WithdrawalSettings";
import { ServicesProvider } from "./contexts/ServicesContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider, useSidebar } from "./contexts/SidebarContext";
import { SessionTimeoutProvider } from "./contexts/SessionTimeoutContext";
import { LoginPage } from "./components/auth/LoginPage";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { Page } from "./types/page";
import { TwoFactorVerification } from "./components/auth/TwoFactorVerification";
import { TwoFactorSetup } from "./components/auth/TwoFactorSetup";
import { DepositManagement } from "./components/transactions/DepositManagment";
import AdminActivityLogs from "./components/admin/AdminActivityLogs";
import AlertManagement from "./components/AlertManagement/AlertManagement";
import MergedGameManagement from "./components/gameManagement/MergedGameManagement";
import FalconLiquidity from "./components/falconLiquidity/FalconLiquidity";
import BrandManagement from "./components/brandManagement/BrandManagement";
import { RakebackOverrideManagement } from "./components/rakebackOverride/RakebackOverrideManagement";
import { RakebackScheduleManagement } from "./components/rakebackOverride/RakebackScheduleManagement";
import { Toaster } from "react-hot-toast";
import SessionTimeoutManager from "./components/SessionTimeoutManager";

// ProtectedRoute component to check if user has access to a route
const ProtectedRoute: React.FC<{
  path: string;
  element: React.ReactElement;
  allowedPages?: Page[];
}> = ({ path, element, allowedPages }) => {
  const { user } = useAuth();

  // If no allowed pages or user is not admin, allow access (fallback)
  if (!allowedPages || allowedPages.length === 0 || !user?.isAdmin) {
    return element;
  }

  // Check if the current path is in allowed pages
  const isAllowed = allowedPages.some((page) => {
    // Exact match
    if (page.path === path) return true;
    // Check if path starts with page path (for nested routes)
    if (path.startsWith(page.path) && page.path !== "/") return true;
    // If player management is allowed, also allow welcome bonus
    if (page.path === "/players" && path === "/welcome-bonus") return true;
    // If player metrics report is allowed, also allow affiliate report
    if (
      page.path === "/reports/player-metrics" &&
      path === "/reports/affiliate"
    )
      return true;
    // If any transactions page is allowed, also allow gaming transactions
    if (
      path === "/transactions/gaming" &&
      page.path.startsWith("/transactions")
    )
      return true;
    return false;
  });

  if (!isAllowed) {
    // Redirect to dashboard if not allowed
    return <Navigate to="/dashboard" replace />;
  }

  return element;
};

const ProtectedApp: React.FC = () => {
  const { user } = useAuth();

  return (
    <AppShell>
      <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  path="/dashboard"
                  element={<Dashboard />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/game"
              element={
                <ProtectedRoute
                  path="/reports/game"
                  element={<GameReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/transaction"
              element={
                <ProtectedRoute
                  path="/reports/transaction"
                  element={<TransactionReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/daily"
              element={
                <ProtectedRoute
                  path="/reports/daily"
                  element={<DailyReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/big-winners"
              element={
                <ProtectedRoute
                  path="/reports/big-winners"
                  element={<BigWinnersReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/player-metrics"
              element={
                <ProtectedRoute
                  path="/reports/player-metrics"
                  element={<PlayerMetricsReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/affiliate"
              element={
                <ProtectedRoute
                  path="/reports/affiliate"
                  element={<AffiliateReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/country"
              element={
                <ProtectedRoute
                  path="/reports/country"
                  element={<CountryReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/game-performance"
              element={
                <ProtectedRoute
                  path="/reports/game-performance"
                  element={<GamePerformanceReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/provider-performance"
              element={
                <ProtectedRoute
                  path="/reports/provider-performance"
                  element={<ProviderManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports/brand"
              element={
                <ProtectedRoute
                  path="/reports/brand"
                  element={<BrandReport />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute
                  path="/players"
                  element={<PlayerManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/welcome-bonus"
              element={
                <ProtectedRoute
                  path="/welcome-bonus"
                  element={<WelcomeBonusManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/cashback"
              element={
                <ProtectedRoute
                  path="/cashback"
                  element={<CashbackManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/rakeback-override"
              element={
                <ProtectedRoute
                  path="/admin/rakeback-override"
                  element={<RakebackOverrideManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/rakeback-schedules"
              element={
                <ProtectedRoute
                  path="/admin/rakeback-schedules"
                  element={<RakebackScheduleManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/transactions/gaming"
              element={
                <ProtectedRoute
                  path="/transactions/gaming"
                  element={<GamingTransactions />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/transactions/details"
              element={
                <ProtectedRoute
                  path="/transactions/details"
                  element={<TransactionManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/transactions/withdrawals"
              element={
                <ProtectedRoute
                  path="/transactions/withdrawals"
                  element={<WithdrawalManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />

            <Route
              path="/transactions/withdrawals/dashboard"
              element={
                <ProtectedRoute
                  path="/transactions/withdrawals/dashboard"
                  element={<WithdrawalDashboard />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/transactions/withdrawals/settings"
              element={
                <ProtectedRoute
                  path="/transactions/withdrawals/settings"
                  element={<WithdrawalSettings />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/transactions/deposits"
              element={
                <ProtectedRoute
                  path="/transactions/deposits"
                  element={<DepositManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/transactions/manual-funds"
              element={
                <ProtectedRoute
                  path="/transactions/manual-funds"
                  element={<ManualFundManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/security"
              element={<Navigate to="/access-control" replace />}
            />
            <Route
              path="/access-control"
              element={
                <ProtectedRoute
                  path="/access-control"
                  element={<AccessControl />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/kyc-risk"
              element={
                <ProtectedRoute
                  path="/kyc-risk"
                  element={<KYCRiskManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/kyc-management"
              element={
                <ProtectedRoute
                  path="/kyc-management"
                  element={<KYCManagementPage />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute
                  path="/notifications"
                  element={<NotificationManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  path="/reports"
                  element={<ReportsManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute
                  path="/settings"
                  element={<SettingsManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/activity-logs"
              element={
                <ProtectedRoute
                  path="/admin/activity-logs"
                  element={<AdminActivityLogs />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/alerts"
              element={
                <ProtectedRoute
                  path="/admin/alerts"
                  element={<AlertManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/game-management"
              element={
                <ProtectedRoute
                  path="/admin/game-management"
                  element={<MergedGameManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/brand-management"
              element={
                <ProtectedRoute
                  path="/admin/brand-management"
                  element={<BrandManagement />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route
              path="/admin/falcon-liquidity"
              element={
                <ProtectedRoute
                  path="/admin/falcon-liquidity"
                  element={<FalconLiquidity />}
                  allowedPages={user?.allowedPages}
                />
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
    </AppShell>
  );
};

function App() {
  // Add click handler for toast close buttons
  useEffect(() => {
    const handleToastClose = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is on the toast container (which contains the ::after pseudo-element)
      const toastContainer =
        target.closest('[class*="go2072408551"]') ||
        target.closest('[data-testid="toast"]');

      if (toastContainer) {
        // Get the bounding rect to check if click is in the close button area
        const rect = toastContainer.getBoundingClientRect();
        const clickX = event.clientX;
        const clickY = event.clientY;

        // Check if click is in the top-right area where the close button is positioned
        const closeButtonArea = {
          left: rect.right - 40, // 24px button + 16px padding
          right: rect.right - 8,
          top: rect.top + 8,
          bottom: rect.top + 32, // 24px button + 8px padding
        };

        if (
          clickX >= closeButtonArea.left &&
          clickX <= closeButtonArea.right &&
          clickY >= closeButtonArea.top &&
          clickY <= closeButtonArea.bottom
        ) {
          // Close the toast with smooth animation
          toastContainer.style.opacity = "0";
          toastContainer.style.transform = "translateX(100%)";
          toastContainer.style.transition = "all 0.3s ease";

          setTimeout(() => {
            toastContainer.remove();
          }, 300);
        }
      }
    };

    // Add event listener to document
    document.addEventListener("click", handleToastClose);

    // Cleanup
    return () => {
      document.removeEventListener("click", handleToastClose);
    };
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ServicesProvider>
          <SidebarProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "rgb(15 23 42 / 0.98)",
                  color: "#f1f5f9",
                  border: "1px solid rgb(51 65 85 / 0.8)",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  fontSize: "14px",
                  fontWeight: "500",
                  boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)",
                  position: "relative",
                  backdropFilter: "blur(8px)",
                },
                className: "",
                success: {
                  iconTheme: {
                    primary: "#22c55e",
                    secondary: "#f1f5f9",
                  },
                  style: {
                    background: "rgb(15 23 42 / 0.98)",
                    border: "1px solid rgb(34 197 94 / 0.5)",
                    color: "#f1f5f9",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(8px)",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#f1f5f9",
                  },
                  style: {
                    background: "rgb(15 23 42 / 0.98)",
                    border: "1px solid rgb(239 68 68 / 0.5)",
                    color: "#f1f5f9",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(8px)",
                  },
                },
                loading: {
                  iconTheme: {
                    primary: "#f1f5f9",
                    secondary: "rgb(51 65 85)",
                  },
                  style: {
                    background: "rgb(15 23 42 / 0.98)",
                    border: "1px solid rgb(51 65 85 / 0.8)",
                    color: "#f1f5f9",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(8px)",
                  },
                },
              }}
            />
            <AuthProvider>
              <SessionTimeoutProvider>
                <SessionTimeoutManager />
                <AppRoutes />
              </SessionTimeoutProvider>
            </AuthProvider>
          </SidebarProvider>
        </ServicesProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading, requires2FA, requires2FASetup } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log("AppRoutes: Current auth state:", {
    isAuthenticated,
    loading,
    requires2FA,
    requires2FASetup,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Check for 2FA setup first, even if not authenticated
  if (requires2FASetup) {
    console.log("AppRoutes: Rendering TwoFactorSetup component");
    return <TwoFactorSetup />;
  }

  // Show forgot password page if on that route and not authenticated
  if (!isAuthenticated && location.pathname === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (requires2FA) {
    console.log("AppRoutes: Rendering TwoFactorVerification component");
    return <TwoFactorVerification />;
  }

  console.log("AppRoutes: Rendering ProtectedApp component");
  return <ProtectedApp />;
};

export default App;
