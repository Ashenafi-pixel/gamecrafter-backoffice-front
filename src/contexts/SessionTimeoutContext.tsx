import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { baseApiSvc, adminSvc } from "../services/apiService";
import { config } from "../config/load-config";
import { brandService } from "../services/brandService";
import axios from "axios";
import { getSecondsUntilExpiration } from "../utils/jwtDecoder";

interface SessionTimeoutContextType {
  isSessionExpired: boolean;
  timeRemaining: number;
  showWarning: boolean;
  warningLevel: "none" | "warning" | "critical" | "expired";
  extendSession: () => Promise<void>;
  logout: () => Promise<void>;
  resetSession: () => void;
}

const SessionTimeoutContext = createContext<
  SessionTimeoutContextType | undefined
>(undefined);

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export const SessionTimeoutProvider: React.FC<SessionTimeoutProviderProps> = ({
  children,
}) => {
  const { isAuthenticated, logout: authLogout } = useAuth();

  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(8 * 60 * 60);
  const [showWarning, setShowWarning] = useState(false);
  const [warningLevel, setWarningLevel] = useState<
    "none" | "warning" | "critical" | "expired"
  >("none");
  const [sessionDuration, setSessionDuration] = useState(8 * 60 * 60);

  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef(false);
  const timerInitializedRef = useRef<boolean>(false);
  const lastInitializedTimeRef = useRef<number>(0);
  const lastActivityResetRef = useRef<number>(0);
  const currentTimeRemainingRef = useRef<number>(8 * 60 * 60);

  const getDefaultBrandId = useCallback(async (): Promise<string | null> => {
    try {
      const response = await brandService.getBrands({ page: 1, "per-page": 1 });
      if (
        response.success &&
        response.data &&
        response.data.brands.length > 0
      ) {
        return response.data.brands[0].id;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch default brand:", error);
      return null;
    }
  }, []);

  const loadSecuritySettings = useCallback(async () => {
    try {
      const defaultBrandId = await getDefaultBrandId();
      if (!defaultBrandId) {
        console.log("No brand found, using default session timeout");
        const defaultSeconds = 8 * 60 * 60;
        setSessionDuration(defaultSeconds);
        return defaultSeconds;
      }

      const response = await adminSvc.get<any>(
        `/settings/security?brand_id=${defaultBrandId}`,
      );
      if (response.success && response.data) {
        const data = response.data as any;
        const timeoutMinutes = data.session_timeout || 20;
        const timeoutSeconds = timeoutMinutes * 60;
        console.log(
          "Loaded session timeout from backend:",
          timeoutMinutes,
          "minutes (",
          timeoutSeconds,
          "seconds)",
        );
        setSessionDuration(timeoutSeconds);
        return timeoutSeconds;
      }
    } catch (error: any) {
      console.error("Failed to load security settings, using default:", error);
    }
    const defaultSeconds = 8 * 60 * 60;
    setSessionDuration(defaultSeconds);
    return defaultSeconds;
  }, [getDefaultBrandId]);

  const getSessionDuration = () => sessionDuration;
  const WARNING_THRESHOLD = 10 * 60;
  const CRITICAL_THRESHOLD = 5 * 60;
  const FINAL_THRESHOLD = 60;
  const ACTIVITY_GRACE_PERIOD = 5 * 60;

  const activityEvents = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ];

  const clearAllTimers = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    timerInitializedRef.current = false;
  }, []);

  const updateWarningLevel = useCallback((remaining: number) => {
    if (remaining <= 0) {
      setWarningLevel("expired");
    } else if (remaining <= FINAL_THRESHOLD) {
      setWarningLevel("critical");
    } else if (remaining <= CRITICAL_THRESHOLD) {
      setWarningLevel("critical");
    } else if (remaining <= WARNING_THRESHOLD) {
      setWarningLevel("warning");
    } else {
      setWarningLevel("none");
    }
  }, []);

  const startSessionTimer = useCallback(() => {
    if (!isAuthenticated) return;

    // Get time remaining from JWT token expiration
    const accessToken = localStorage.getItem("access_token");
    let initialTimeRemaining = getSessionDuration(); // Fallback to default
    
    if (accessToken) {
      const secondsUntilExp = getSecondsUntilExpiration(accessToken);
      if (secondsUntilExp !== null && secondsUntilExp > 0) {
        initialTimeRemaining = secondsUntilExp;
      } else {
        console.warn("Token expired or invalid, using default session duration");
      }
    }

    // Only log initialization once or if timer was cleared/reset (increase threshold to prevent spam)
    const now = Date.now();
    const timeSinceLastInit = now - lastInitializedTimeRef.current;
    const shouldLog = !timerInitializedRef.current || timeSinceLastInit > 30000; // Log only if not initialized or 30+ seconds since last init
    
    if (shouldLog) {
      console.log("Session timer initialized from token expiration:", initialTimeRemaining, "seconds");
      lastInitializedTimeRef.current = now;
    }

    // Only clear and restart if timer is not already running or if time difference is significant
    const currentTimeRemaining = currentTimeRemainingRef.current;
    const timeDifference = Math.abs(initialTimeRemaining - currentTimeRemaining);
    
    // If timer is already running and time difference is small (< 10 seconds), don't restart
    if (timerInitializedRef.current && sessionTimerRef.current && timeDifference < 10) {
      return;
    }

    clearAllTimers();
    timerInitializedRef.current = true;

    setTimeRemaining(initialTimeRemaining);
    currentTimeRemainingRef.current = initialTimeRemaining;
    setShowWarning(false);
    setWarningLevel("none");
    setIsSessionExpired(false);

    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        // Re-check token expiration periodically to stay in sync
        if (accessToken) {
          const secondsUntilExp = getSecondsUntilExpiration(accessToken);
          if (secondsUntilExp !== null) {
            // Use token expiration if it's more accurate
            if (Math.abs(secondsUntilExp - prev) > 5) {
              currentTimeRemainingRef.current = secondsUntilExp;
              return secondsUntilExp;
            }
          }
        }

        const newTime = prev - 1;
        currentTimeRemainingRef.current = newTime;
        updateWarningLevel(newTime);

        if (newTime <= 0) {
          clearInterval(countdownInterval);
          setIsSessionExpired(true);
          setShowWarning(true);
          setWarningLevel("expired");
          currentTimeRemainingRef.current = 0;
          return 0;
        }

        return newTime;
      });
    }, 1000);

    sessionTimerRef.current = countdownInterval as any;
  }, [isAuthenticated, clearAllTimers, updateWarningLevel, getSessionDuration]);

  const handleActivity = useCallback(() => {
    if (!isAuthenticated || isSessionExpired) return;

    const now = Date.now();
    lastActivityRef.current = now;

    // Debounce: batch rapid activity events (mousemove, scroll, etc.) to prevent excessive timer resets
    // Only reset timer after user activity has stopped for a brief period
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      // Only reset timer if:
      // 1. Timer is not initialized, OR
      // 2. Timer is not running, OR  
      // 3. Enough time has passed since last reset (prevents spam on rapid events)
      const timeSinceLastReset = Date.now() - lastActivityResetRef.current;
      if (!timerInitializedRef.current || !sessionTimerRef.current || timeSinceLastReset > 10000) {
        lastActivityResetRef.current = Date.now();
        startSessionTimer();
      }
    }, 2000); // Wait 2 seconds after last activity before resetting timer
  }, [isAuthenticated, isSessionExpired, startSessionTimer]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;

    try {
      isRefreshingRef.current = true;
      console.log("Attempting to refresh token...");

      const baseUrl = config.adminApiUrl.replace("/api/admin", "");
      const refreshUrl = `${baseUrl}/refresh`;

      console.log("Refresh URL:", refreshUrl);
      console.log("Config adminApiUrl:", config.adminApiUrl);

      const response = await axios.post(
        refreshUrl,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Refresh token response:", response.data);

      const accessToken = response.data?.access_token;

      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
        console.log("Token refreshed successfully");
            
        const secondsUntilExp = getSecondsUntilExpiration(accessToken);
        if (secondsUntilExp !== null && secondsUntilExp > 0) {
          setTimeRemaining(secondsUntilExp);
          currentTimeRemainingRef.current = secondsUntilExp;
          console.log("Updated session timer from new token:", secondsUntilExp, "seconds");
        }
        
        return true;
      }
      console.warn("No access token found in refresh response:", response.data);
      return false;
    } catch (error: any) {
      console.error("Token refresh failed:", error);
      console.error("Refresh error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.url
          ? `${error.config.baseURL}${error.config.url}`
          : "unknown",
      });

      if (error.response?.status === 404) {
        console.error(
          "404 Not Found - The refresh endpoint was not found at:",
          error.config?.url || "unknown URL",
        );
        console.error("Expected URL format: <baseUrl>/refresh");
        console.error(
          "Base URL should be:",
          config.adminApiUrl.replace("/api/admin", ""),
        );
      }

      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("Logging out due to session timeout");
    clearAllTimers();
    setShowWarning(false);
    setWarningLevel("none");
    setIsSessionExpired(true);
    setTimeRemaining(0);
    currentTimeRemainingRef.current = 0;
    await authLogout();
  }, [clearAllTimers, authLogout]);

  const extendSession = useCallback(async () => {
    try {
      console.log("Extending session...");
      const refreshed = await refreshToken();
      if (refreshed) {
        console.log("Session refreshed successfully");
        startSessionTimer();
        setShowWarning(false);
        setWarningLevel("none");
        setIsSessionExpired(false);
        const duration = getSessionDuration();
        setTimeRemaining(duration);
        currentTimeRemainingRef.current = duration;
      } else {
        console.warn("Session refresh failed - but not logging out automatically");
        setShowWarning(true);
        if (timeRemaining <= 0 || isSessionExpired) {
          setWarningLevel("expired");
          console.log("Session already expired, logging out");
          await logout();
        } else {
          setWarningLevel("critical");
          console.warn("Refresh failed but session still has time, user can try again");
        }
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
      if (timeRemaining <= 0 || isSessionExpired) {
        console.log("Session expired with error, logging out");
        await logout();
      } else {
        console.warn("Error during refresh but session still valid");
        setShowWarning(true);
        setWarningLevel("critical");
      }
    }
  }, [refreshToken, startSessionTimer, logout, getSessionDuration, isSessionExpired, timeRemaining]);

  const resetSession = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setWarningLevel("none");
    setIsSessionExpired(false);
    const duration = getSessionDuration();
    setTimeRemaining(duration);
    currentTimeRemainingRef.current = duration;
    startSessionTimer();
  }, [clearAllTimers, startSessionTimer, getSessionDuration]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const autoRefreshInterval = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const remainingTime = timeRemaining;

      if (
        timeSinceActivity < ACTIVITY_GRACE_PERIOD * 1000 &&
        remainingTime <= 5 * 60 &&
        remainingTime > 0
      ) {
        console.log("Auto-refreshing session...");
        const refreshed = await refreshToken();
        if (refreshed) {
          console.log("Auto-refresh successful");
          startSessionTimer();
        } else {
          console.log("Auto-refresh failed, will logout on next check");
        }
      }
    }, 30 * 1000);

    return () => clearInterval(autoRefreshInterval);
  }, [isAuthenticated, timeRemaining, refreshToken, startSessionTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      setWarningLevel("none");
      setIsSessionExpired(false);
      const duration = getSessionDuration();
      setTimeRemaining(duration);
      currentTimeRemainingRef.current = duration;
    }
  }, [isAuthenticated, clearAllTimers, getSessionDuration]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSecuritySettings();
    }
  }, [isAuthenticated, loadSecuritySettings]);

  useEffect(() => {
    if (isAuthenticated && sessionDuration > 0) {
      setTimeRemaining(sessionDuration);
      currentTimeRemainingRef.current = sessionDuration;
      startSessionTimer();
    }
  }, [isAuthenticated, sessionDuration, startSessionTimer]);

  useEffect(() => {
    if (!isAuthenticated) return;

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    if (sessionDuration > 0) {
      startSessionTimer();
    }

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearAllTimers();
    };
  }, [
    isAuthenticated,
    handleActivity,
    startSessionTimer,
    clearAllTimers,
    sessionDuration,
  ]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const value: SessionTimeoutContextType = {
    isSessionExpired,
    timeRemaining,
    showWarning,
    warningLevel,
    extendSession,
    logout,
    resetSession,
  };

  return (
    <SessionTimeoutContext.Provider value={value}>
      {children}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error(
      "useSessionTimeout must be used within a SessionTimeoutProvider",
    );
  }
  return context;
};
