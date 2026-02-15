import React, { useEffect, useState, useMemo } from "react";
import { useSessionTimeout } from "../contexts/SessionTimeoutContext";
import { Clock, AlertCircle, X, RefreshCw, LogOut } from "lucide-react";
import { getTokenExpiration } from "../utils/jwtDecoder";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { timeRemaining, warningLevel, extendSession, logout } =
    useSessionTimeout();
  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [initialSessionDuration, setInitialSessionDuration] = useState<number | null>(null);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getWarningConfig = () => {
    switch (warningLevel) {
      case "warning":
        return {
          title: "Session Expiring Soon",
          message:
            "Your session will expire in a few minutes. Extend your session to continue working.",
          iconColor: "text-amber-500",
          borderColor: "border-amber-500/30",
          bgGradient: "from-amber-500/10 to-amber-500/5",
          progressColor: "bg-amber-500",
          buttonColor: "bg-purple-600 hover:bg-purple-700",
          badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
      case "critical":
        return {
          title: "Session Expiring Soon",
          message:
            "Your session will expire very soon. Please extend it now to avoid losing your work.",
          iconColor: "text-orange-500",
          borderColor: "border-orange-500/30",
          bgGradient: "from-orange-500/10 to-orange-500/5",
          progressColor: "bg-orange-500",
          buttonColor: "bg-purple-600 hover:bg-purple-700",
          badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        };
      case "expired":
        return {
          title: "Session Expired",
          message:
            "Your session has expired. You will be redirected to the login page.",
          iconColor: "text-red-500",
          borderColor: "border-red-500/30",
          bgGradient: "from-red-500/10 to-red-500/5",
          progressColor: "bg-red-500",
          buttonColor: "bg-red-600 hover:bg-red-700",
          badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
        };
      default:
        return {
          title: "Session Timeout",
          message: "Your session is about to expire.",
          iconColor: "text-slate-400",
          borderColor: "border-slate-500/30",
          bgGradient: "from-slate-500/10 to-slate-500/5",
          progressColor: "bg-slate-500",
          buttonColor: "bg-purple-600 hover:bg-purple-700",
          badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        };
    }
  };

  const handleExtendSession = async () => {
    try {
      setIsExtending(true);
      await extendSession();
      onClose();
    } catch (error) {
      console.error("Failed to extend session:", error);
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      onClose();
    } catch (error) {
      console.error("Failed to logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (warningLevel === "expired" && timeRemaining <= 0) {
      const timer = setTimeout(() => {
        handleLogout();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [warningLevel, timeRemaining]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest(".session-timeout-container")) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const config = getWarningConfig();
  
  useEffect(() => {
    if (initialSessionDuration === null || timeRemaining > initialSessionDuration) {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        const exp = getTokenExpiration(accessToken);
        if (exp) {
          const now = Math.floor(Date.now() / 1000);
          const totalDuration = exp - now;
          if (totalDuration > 0) {
            setInitialSessionDuration(totalDuration);
            return;
          }
        }
      }
      if (timeRemaining > 0) {
        setInitialSessionDuration(timeRemaining);
      } else {
        setInitialSessionDuration(20 * 60);
      }
    }
  }, [timeRemaining, initialSessionDuration]);
  
  const progressPercentage = useMemo(() => {
    const maxDuration = initialSessionDuration || 20 * 60;
    if (maxDuration <= 0 || timeRemaining <= 0) return 0;
    const percentage = (timeRemaining / maxDuration) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, [timeRemaining, initialSessionDuration]);

  return (
    <>
      <div
        className={`fixed top-16 right-4 z-50 session-timeout-container transition-all duration-300 ease-out ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className={`bg-gradient-to-br ${config.bgGradient} backdrop-blur-xl border ${config.borderColor} rounded-l-2xl shadow-2xl w-[320px] max-h-[90vh] overflow-y-auto overflow-x-hidden`}>
          <div className="px-5 pt-5 pb-3.5 border-b border-slate-700/50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white mb-1">
                  {config.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {config.message}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
                      
          <div className="px-5 py-5">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center mb-3">
                <div className="relative">
                  <div className="text-center px-3 py-2">
                    <div className="relative">
                      <div 
                        className={`absolute inset-x-0 bottom-0 h-2 rounded-sm opacity-30 blur-sm transition-all duration-1000 ${
                          warningLevel === "expired"
                            ? "bg-red-500"
                            : warningLevel === "critical"
                              ? "bg-orange-500"
                              : warningLevel === "warning"
                                ? "bg-amber-500"
                                : "bg-slate-500"
                        }`}
                        style={{ 
                          width: `${progressPercentage}%`,
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      />
                      <div className="text-2xl font-mono font-semibold text-white tabular-nums leading-tight relative z-10">
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {warningLevel === "expired" ? "Session Expired" : "Time Remaining"}
              </p>
            </div>

            <div className="mb-5">
              <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    warningLevel === "expired"
                      ? "bg-red-500"
                      : warningLevel === "critical"
                        ? "bg-orange-500"
                        : warningLevel === "warning"
                          ? "bg-amber-500"
                          : "bg-slate-500"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {warningLevel !== "expired" && warningLevel !== "none" && (
              <div className="flex justify-center mb-5">
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${config.badgeColor} uppercase tracking-wider`}>
                  {warningLevel === "critical" ? "Critical" : "Warning"}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {warningLevel !== "expired" ? (
                <>
                  <button
                    type="button"
                    onClick={handleExtendSession}
                    disabled={isExtending || isLoggingOut}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${config.buttonColor} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98]`}
                  >
                    {isExtending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Extending Session...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Extend Session</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isExtending || isLoggingOut}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98]"
                >
                  {isLoggingOut ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Continue to Login</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-center gap-2">
              {warningLevel === "expired" ? (
                <AlertCircle className={`w-3.5 h-3.5 ${config.iconColor}`} />
              ) : (
                <Clock className={`w-3.5 h-3.5 ${config.iconColor}`} />
              )}
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {warningLevel === "expired" ? "Session expired" : "Session timeout"}
              </span>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
};

export default SessionTimeoutModal;
