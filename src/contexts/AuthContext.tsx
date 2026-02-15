import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useServices } from "./ServicesContext";
import toast from "react-hot-toast";
import { SessionTimeoutProvider } from "./SessionTimeoutContext";
import { Page } from "../types/page";

interface User {
  id: string;
  username: string;
  phoneNumber: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  profile: string;
  defaultCurrency: string;
  source: string;
  referralCode: string;
  referralType: string;
  referredByCode: string;
  userType: string;
  streetAddress: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  kycStatus: string;
  createdBy: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  status: string;
  primaryWalletAddress: string;
  walletVerificationStatus: string;
  createdAt: string;
  updatedAt: string;
  allowedPages?: Page[];
}

interface LoginResponse {
  message: string;
  access_token: string;
  user_profile: {
    username: string;
    phone_number: string;
    email: string;
    user_id: string;
    profile_picture: string;
    first_name: string;
    last_name: string;
    type: string;
  };
  requires_2fa?: boolean;
  requires_2fa_setup?: boolean;
  user_id?: string;
  available_2fa_methods?: string[];
  allowed_pages?: Page[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  requires2FA: boolean;
  requires2FASetup: boolean;
  pendingUser: User | null;
  verify2FA: (token: string, method?: string) => Promise<void>;
  reset2FAStates: () => void;
  complete2FASetup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [requires2FASetup, setRequires2FASetup] = useState<boolean>(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const { adminSvc } = useServices();
  const navigate = useNavigate();

  // Simple localStorage helpers
  const setAuthData = (accessToken: string, userData: User) => {
    try {
      console.log("AuthContext: Storing auth data:", {
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 20) + "...",
        userId: userData.id,
      });
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("AuthContext: Auth data stored successfully");
    } catch (error) {
      console.error("Failed to store auth data:", error);
    }
  };

  const getAuthData = () => {
    try {
      const accessToken = localStorage.getItem("access_token");
      const userData = localStorage.getItem("user");

      console.log("AuthContext: Getting auth data:", {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        hasUserData: !!userData,
        userDataLength: userData?.length || 0,
      });

      if (accessToken && userData) {
        return {
          accessToken,
          user: JSON.parse(userData),
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to get auth data:", error);
      return null;
    }
  };

  const clearAuthData = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("remember_me");
    } catch (error) {
      console.error("Failed to clear auth data:", error);
    }
  };

  // Initialize authentication on app start
  useEffect(() => {
    const initAuth = () => {
      try {
        const authData = getAuthData();

        if (authData) {
          // Set authenticated state immediately
          setIsAuthenticated(true);
          setUser(authData.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth cleared events from apiService
    const handleAuthCleared = () => {
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener("auth-cleared", handleAuthCleared);

    return () => {
      window.removeEventListener("auth-cleared", handleAuthCleared);
    };
  }, []);

  const login = async (
    identifier: string,
    password: string,
    rememberMe: boolean,
  ) => {
    try {
      // Reset 2FA states before attempting login
      reset2FAStates();

      const response = await adminSvc.post<LoginResponse>("/login", {
        login_id: identifier,
        password,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Login failed");
      }

      const {
        access_token,
        user_profile,
        requires_2fa,
        requires_2fa_setup,
        user_id,
        available_2fa_methods,
        allowed_pages,
      } = response.data;

      // Map backend response to frontend User interface
      const userData: User = {
        id: user_profile?.user_id || user_id || "",
        username: user_profile?.username || "",
        phoneNumber: user_profile?.phone_number || "",
        password: "",
        email: user_profile?.email || "",
        firstName: user_profile?.first_name || "",
        lastName: user_profile?.last_name || "",
        dateOfBirth: "",
        profile: user_profile?.profile_picture || "",
        defaultCurrency: "USD",
        source: "",
        referralCode: "",
        referralType: "",
        referredByCode: "",
        userType: user_profile?.type || "ADMIN",
        streetAddress: "",
        country: "",
        state: "",
        city: "",
        postalCode: "",
        kycStatus: "PENDING",
        createdBy: "",
        isAdmin: user_profile?.type === "ADMIN",
        isEmailVerified: false,
        status: "ACTIVE",
        primaryWalletAddress: "",
        walletVerificationStatus: "none",
        createdAt: "",
        updatedAt: "",
        allowedPages: allowed_pages || [],
      };

      // Add available 2FA methods to user data
      if (available_2fa_methods) {
        (userData as any).available_2fa_methods = available_2fa_methods;
      }

      // Check if 2FA is required
      if (requires_2fa) {
        setRequires2FA(true);
        setPendingUser(userData);
        // Don't set authentication state yet - wait for 2FA verification
        return;
      }

      // Check if 2FA setup is required
      if (requires_2fa_setup) {
        console.log("AuthContext: 2FA setup required, setting state...", {
          requires_2fa_setup,
          userData: userData.id,
        });
        setRequires2FASetup(true);
        setPendingUser(userData);
        // Don't set authentication state yet - wait for 2FA setup
        return;
      }

      // Store auth data
      setAuthData(access_token, userData);

      // Store remember_me flag
      localStorage.setItem("remember_me", rememberMe.toString());

      // Set authentication state
      setIsAuthenticated(true);
      setUser(userData);

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(error.message || "Login failed");
    }
  };

  const verify2FA = async (token: string, method?: string) => {
    if (!pendingUser) {
      throw new Error("No pending user for 2FA verification");
    }

    try {
      // Prepare request payload
      const payload: any = {
        token: token,
        user_id: pendingUser.id,
      };

      // Add method if specified
      if (method) {
        payload.method = method;
      }

      // Call 2FA verification endpoint
      const response = await adminSvc.post("/auth/2fa/verify", payload);

      if (!response.success) {
        // Handle specific error cases with better messages
        if (method === "backup_codes") {
          if (response.error?.includes("invalid backup code")) {
            throw new Error(
              "❌ Invalid backup code. Please check the code and try again.",
            );
          } else if (
            response.error?.includes("backup code validation not implemented")
          ) {
            throw new Error(
              "⚠️ Backup code verification is temporarily unavailable. Please use another method.",
            );
          } else {
            throw new Error(
              "❌ Backup code verification failed. Please try again or use another method.",
            );
          }
        } else if (method === "totp") {
          throw new Error(
            "❌ Invalid authenticator code. Please check the time on your device and try again.",
          );
        } else if (method === "email_otp") {
          throw new Error(
            "❌ Invalid email code. Please check your email and try again.",
          );
        } else if (method === "sms_otp") {
          throw new Error(
            "❌ Invalid SMS code. Please check your phone and try again.",
          );
        } else {
          throw new Error(response.message || "❌ 2FA verification failed");
        }
      }

      // 2FA verified successfully, complete login
      const { access_token } = response.data;

      // Store auth data
      setAuthData(access_token, pendingUser);

      // Set authentication state
      setIsAuthenticated(true);
      setUser(pendingUser);
      setRequires2FA(false);
      setPendingUser(null);

      // Show success toast
      toast.success("Verification complete. Taking you to the dashboard…", {
        duration: 3500,
        style: { background: "rgb(15 23 42 / 0.98)", border: "1px solid rgb(51 65 85 / 0.8)", borderRadius: "12px", color: "#f1f5f9" },
        iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" },
      });

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("2FA verification failed:", error);

      // Handle API response error structure
      if (error.message && typeof error.message === "string") {
        throw new Error(error.message);
      } else if (error.error && typeof error.error === "string") {
        throw new Error(error.error);
      } else {
        throw new Error("2FA verification failed");
      }
    }
  };

  const reset2FAStates = () => {
    setRequires2FA(false);
    setRequires2FASetup(false);
    setPendingUser(null);
  };

  const complete2FASetup = (accessToken?: string) => {
    if (pendingUser) {
      // Complete the login process with the pending user and access token
      setAuthData(accessToken || "", pendingUser);
      setIsAuthenticated(true);
      setUser(pendingUser);
      setRequires2FASetup(false);
      setPendingUser(null);
    }
  };

  const logout = async () => {
    try {
      const authData = getAuthData();
      if (authData?.accessToken) {
        await adminSvc.post(
          "/auth/logout",
          {},
          {
            headers: { Authorization: `Bearer ${authData.accessToken}` },
          },
        );
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearAuthData();
      setIsAuthenticated(false);
      setUser(null);
      reset2FAStates();
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        requires2FA,
        requires2FASetup,
        pendingUser,
        verify2FA,
        reset2FAStates,
        complete2FASetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
