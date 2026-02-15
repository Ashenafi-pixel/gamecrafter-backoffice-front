import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Mail,
  Smartphone,
  Key,
  RefreshCw,
  Loader2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useServices } from "../../contexts/ServicesContext";
import { baseApiSvc } from "../../services/apiService";
import toast from "react-hot-toast";
import gamecrafterLogo from "../../assets/game_crafter-logo.png";

interface TwoFactorVerificationProps {
  onBack: () => void;
}

interface TwoFactorMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

// Helper function to decode URL-safe base64
const decodeBase64URL = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const decoded = atob(padded);
  return new Uint8Array(decoded.split("").map((c) => c.charCodeAt(0)));
};

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  onBack,
}) => {
  const { verify2FA, pendingUser } = useAuth();
  const { adminSvc } = useServices();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("totp");
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [isGeneratingOTP, setIsGeneratingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendTimer, setResendTimer] = useState<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Define available 2FA methods
  const methodDefinitions: Record<string, TwoFactorMethod> = {
    passkey: {
      id: "passkey",
      name: "Passkey",
      description: "Use your device's biometric authentication",
      icon: <Key className="h-5 w-5" />,
      enabled: true,
    },
    totp: {
      id: "totp",
      name: "Authenticator App",
      description: "Use Google Authenticator, Authy, or similar apps",
      icon: <Smartphone className="h-5 w-5" />,
      enabled: true,
    },
    email_otp: {
      id: "email_otp",
      name: "Email Verification",
      description: "Receive verification code via email",
      icon: <Mail className="h-5 w-5" />,
      enabled: true,
    },
    sms_otp: {
      id: "sms_otp",
      name: "SMS Verification",
      description: "Receive verification code via SMS",
      icon: <Smartphone className="h-5 w-5" />,
      enabled: true,
    },
    backup_codes: {
      id: "backup_codes",
      name: "Backup Code",
      description: "Use one of your backup codes",
      icon: <Key className="h-5 w-5" />,
      enabled: true,
    },
  };

  // Load available methods from login response
  useEffect(() => {
    if (pendingUser && (pendingUser as any).available_2fa_methods) {
      setAvailableMethods((pendingUser as any).available_2fa_methods);
      if ((pendingUser as any).available_2fa_methods.length > 0) {
        setSelectedMethod((pendingUser as any).available_2fa_methods[0]);
      }
    } else {
      setAvailableMethods(["totp", "backup_codes"]);
    }
  }, [pendingUser]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimer) {
        clearInterval(resendTimer);
      }
    };
  }, [resendTimer]);

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setToken("");
    setError(null);
    setOtpSent(false);
    setResendCooldown(0);
    if (resendTimer) {
      clearInterval(resendTimer);
      setResendTimer(null);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendTimer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setResendTimer(timer);
  };

  const generateOTP = async () => {
    if (!pendingUser) return;

    setIsGeneratingOTP(true);
    setError(null);

    try {
      let endpoint = "";
      let payload: any = { user_id: pendingUser.id };

      if (selectedMethod === "email_otp") {
        endpoint = "/auth/2fa/generate-email-otp";
        payload.email = pendingUser.email;
      } else if (selectedMethod === "sms_otp") {
        endpoint = "/auth/2fa/generate-sms-otp";
        payload.phone_number = pendingUser.phoneNumber;
      }

      if (endpoint) {
        const response = await adminSvc.post(endpoint, payload);
        if (response.success) {
          setOtpSent(true);
          startResendCooldown();
          toast.success("Verification code sent.", {
            style: { background: "rgb(15 23 42 / 0.98)", border: "1px solid rgb(51 65 85 / 0.8)", borderRadius: "12px", color: "#f1f5f9" },
            iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" },
          });
        } else {
          throw new Error(response.message || "Failed to send verification code");
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send verification code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGeneratingOTP(false);
    }
  };

  const handlePasskeyVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser");
      }

      const optionsResponse = await baseApiSvc.post(
        `/api/admin/auth/2fa/passkey/assertion-options`,
        {
          user_id: pendingUser?.id,
        },
      );
      if (!optionsResponse.success) {
        throw new Error("Failed to get passkey options");
      }

      const options = optionsResponse.data as any;
      const challengeBytes = decodeBase64URL(options.challenge);
      const challenge = new Uint8Array(challengeBytes);

      const allowCredentials =
        options.allowCredentials?.map((cred: any) => ({
          type: cred.type,
          id: new Uint8Array(decodeBase64URL(cred.id)),
        })) || [];

      const assertionOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: challenge,
          timeout: options.timeout || 60000,
          rpId: options.rpId || "tucanbit.tv",
          allowCredentials: allowCredentials,
          userVerification: options.userVerification || "required",
        },
      };

      const credential = (await navigator.credentials.get(
        assertionOptions,
      )) as PublicKeyCredential;

      if (credential) {
        const verifyResponse = await baseApiSvc.post(
          "/api/admin/auth/2fa/passkey/verify",
          {
            credential: {
              id: credential.id,
              rawId: Array.from(new Uint8Array(credential.rawId)),
              response: {
                authenticatorData: Array.from(
                  new Uint8Array(
                    (credential.response as AuthenticatorAssertionResponse)
                      .authenticatorData,
                  ),
                ),
                clientDataJSON: Array.from(
                  new Uint8Array(credential.response.clientDataJSON),
                ),
                signature: Array.from(
                  new Uint8Array(
                    (credential.response as AuthenticatorAssertionResponse)
                      .signature,
                  ),
                ),
                userHandle: (credential.response as any).userHandle
                  ? Array.from(
                      new Uint8Array((credential.response as any).userHandle),
                    )
                  : null,
              },
              type: credential.type,
            },
            user_id: pendingUser?.id,
          },
        );

        if (verifyResponse.success) {
          await verify2FA("passkey_verified", "passkey");
        } else {
          throw new Error(
            verifyResponse.message || "Passkey verification failed",
          );
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Passkey verification failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMethod === "passkey") {
      await handlePasskeyVerification();
      return;
    }

    if (!token.trim()) {
      const errorMsg =
        selectedMethod === "backup_codes"
          ? "Please enter your backup code"
          : "Please enter the verification code";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await verify2FA(token, selectedMethod);
    } catch (err: any) {
      const errorMessage = err.message || "Verification failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  };

  const currentMethod = methodDefinitions[selectedMethod];
  const hasTokenValue = token.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900" />
        <div className="absolute -top-40 left-1/2 w-[34rem] h-[34rem] -translate-x-1/2 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-16 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-red-700/30 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-red-500/20 blur-3xl" />
      </div>

      <div className={`w-full max-w-md relative z-10 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        {/* Compact header */}
        <div className="text-center mb-6">
          <img
            src={gamecrafterLogo}
            alt="GameCrafter"
            className={`h-12 w-auto mx-auto mb-4 object-contain transition-all duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
          />
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Confirm your sign‑in
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {selectedMethod === "passkey"
              ? "Use your passkey to continue"
              : "Enter the code from your chosen method"}
          </p>
          {pendingUser && (
            <p className="text-xs text-slate-500 mt-2 truncate max-w-[280px] mx-auto" title={pendingUser.email}>
              {pendingUser.email}
            </p>
          )}
        </div>

        {/* Single card: methods + form */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] p-6 sm:p-8">
          {/* Method pills */}
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Verification method
            </p>
            <div className="flex flex-wrap gap-2">
              {availableMethods.map((methodId) => {
                const method = methodDefinitions[methodId];
                if (!method) return null;
                const isSelected = selectedMethod === methodId;
                return (
                  <button
                    key={methodId}
                    type="button"
                    onClick={() => handleMethodChange(methodId)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                        : "bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white"
                    }`}
                  >
                    {method.icon}
                    <span>{method.name}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {selectedMethod === "passkey" ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3">
                    <Key className="h-7 w-7 text-red-400" />
                  </div>
                  <p className="text-sm text-slate-300">
                    Sign in with your device passkey or security key
                  </p>
                </div>
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={(e) => {
                    createRipple(e);
                    handlePasskeyVerification();
                  }}
                  disabled={isLoading}
                  className="relative w-full py-3.5 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium shadow-[0_12px_32px_rgba(248,113,113,0.4)] overflow-hidden transition-all duration-200 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <span>Continue with Passkey</span>
                  )}
                  <style>{`.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,0.5);transform:scale(0);animation:ripple2fa .6s ease-out;pointer-events:none}@keyframes ripple2fa{to{transform:scale(4);opacity:0}}`}</style>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="token"
                    name="token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onFocus={() => setFocusedField(true)}
                    onBlur={() => setFocusedField(false)}
                    maxLength={selectedMethod === "backup_codes" ? 20 : 6}
                    className={`w-full px-4 pt-6 pb-2 bg-slate-950/60 text-white rounded-xl border transition-all duration-300 placeholder:text-transparent ${
                      error
                        ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : focusedField || hasTokenValue
                        ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    }`}
                    placeholder={
                      selectedMethod === "backup_codes"
                        ? "Backup code"
                        : "6-digit code"
                    }
                  />
                  <label
                    htmlFor="token"
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none ${
                      focusedField || hasTokenValue
                        ? "top-3 translate-y-0 text-xs text-red-400"
                        : "text-sm text-slate-400"
                    }`}
                  >
                    {currentMethod.name} code
                  </label>
                </div>

                {(selectedMethod === "email_otp" || selectedMethod === "sms_otp") && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={generateOTP}
                      disabled={isGeneratingOTP || resendCooldown > 0}
                      className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isGeneratingOTP ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</>
                      ) : resendCooldown > 0 ? (
                        `Resend in ${resendCooldown}s`
                      ) : otpSent ? (
                        "Resend code"
                      ) : (
                        `Send ${selectedMethod === "email_otp" ? "email" : "SMS"} code`
                      )}
                    </button>
                  </div>
                )}

                {selectedMethod === "backup_codes" && (
                  <p className="text-xs text-slate-500">
                    Use a backup code you saved when you enabled 2FA. Each code works once.
                  </p>
                )}

                {otpSent && (selectedMethod === "email_otp" || selectedMethod === "sms_otp") && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>Code sent to your {selectedMethod === "email_otp" ? "email" : "phone"}</span>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <button
                  ref={buttonRef}
                  type="submit"
                  disabled={isLoading}
                  onClick={createRipple}
                  className="relative w-full py-3.5 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium shadow-[0_12px_32px_rgba(248,113,113,0.4)] overflow-hidden transition-all duration-200 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> <span>Verifying…</span></>
                  ) : (
                    <span>Verify</span>
                  )}
                  <style>{`.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,0.5);transform:scale(0);animation:ripple2fa .6s ease-out;pointer-events:none}@keyframes ripple2fa{to{transform:scale(4);opacity:0}}`}</style>
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-red-400 transition-colors font-medium inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
