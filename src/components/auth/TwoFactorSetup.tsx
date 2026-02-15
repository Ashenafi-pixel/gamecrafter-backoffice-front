import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Smartphone,
  Mail,
  Phone,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  QrCode,
  Loader2,
  Lock,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useServices } from "../../contexts/ServicesContext";
import { twoFactorService } from "../../services/twoFactorService";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import gamecrafterLogo from "../../assets/game_crafter-logo.png";

interface TwoFactorSetupProps {
  onBack?: () => void;
}

type TwoFactorMethod = "totp" | "email_otp" | "sms_otp" | "backup_codes";

interface TwoFactorMethodInfo {
  id: TwoFactorMethod;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { pendingUser, complete2FASetup, reset2FAStates } = useAuth();
  const { adminSvc } = useServices();

  const handleBack = () => {
    // Reset 2FA states to allow navigation back to login
    reset2FAStates();
    
    if (onBack) {
      onBack();
    } else {
      navigate("/login");
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<
    "method" | "generate" | "verify" | "complete"
  >("method");
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(
    null,
  );
  const [secretData, setSecretData] = useState<any>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const availableMethods: TwoFactorMethodInfo[] = [
    {
      id: "totp",
      name: "Authenticator App",
      description: "Use Google Authenticator, Authy, or similar apps",
      icon: Smartphone,
      enabled: true,
    },
    {
      id: "email_otp",
      name: "Email Verification",
      description: "Receive verification codes via email",
      icon: Mail,
      enabled: true,
    },
    {
      id: "sms_otp",
      name: "SMS Verification",
      description: "Receive verification codes via SMS",
      icon: Phone,
      enabled: true,
    },
  ];

  const generateQRCodeImage = async (otpauthUrl: string) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeImage(qrCodeDataURL);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  };

  const handleMethodSelect = async (method: TwoFactorMethod) => {
    setSelectedMethod(method);
    setError(null);

    if (method === "totp") {
      await generateTOTPSecret();
    } else {
      setSetupStep("verify");
    }
  };

  const generateTOTPSecret = async () => {
    if (!pendingUser) return;

    setIsGeneratingSecret(true);
    setError(null);

    try {
      const response = await twoFactorService.generateSecretForSetup(
        pendingUser.id,
      );
      setSecretData(response);

      if (response.qr_code_data) {
        await generateQRCodeImage(response.qr_code_data);
      }

      setSetupStep("verify");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate 2FA secret";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!pendingUser || !selectedMethod || !verificationToken) return;

    setIsEnabling2FA(true);
    setError(null);

    try {
      let response;

      if (selectedMethod === "totp") {
        response = await twoFactorService.enableTOTP(
          pendingUser.id,
          verificationToken,
        );
      } else if (selectedMethod === "email_otp") {
        response = await twoFactorService.enableEmailOTP(
          pendingUser.id,
          verificationToken,
        );
      } else if (selectedMethod === "sms_otp") {
        response = await twoFactorService.enableSMSOTP(
          pendingUser.id,
          verificationToken,
        );
      } else {
        throw new Error("Invalid method selected");
      }

      if (response.backup_codes) {
        setBackupCodes(response.backup_codes);
        setSetupStep("complete");
        if (response.access_token) {
          setAccessToken(response.access_token);
        }
      } else {
        setSuccess("Two-factor authentication enabled successfully");
        toast.success("Two-factor authentication is now enabled.", {
          style: { background: "rgb(15 23 42 / 0.98)", border: "1px solid rgb(51 65 85 / 0.8)", borderRadius: "12px", color: "#f1f5f9" },
          iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" },
        });
        complete2FASetup(response.access_token);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to enable two-factor authentication";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const generateOTP = async (method: "email_otp" | "sms_otp") => {
    if (!pendingUser) return;

    try {
      if (method === "email_otp") {
        await twoFactorService.generateEmailOTP(pendingUser.id);
        toast.success("Verification code sent to your email");
      } else if (method === "sms_otp") {
        await twoFactorService.generateSMSOTP(pendingUser.id);
        toast.success("Verification code sent to your phone");
      }
    } catch (err: any) {
      const errorMessage =
        err.message ||
        `Failed to send ${method === "email_otp" ? "email" : "SMS"} code`;
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCompleteSetup = () => {
    setSuccess("Two-factor authentication setup completed successfully");
    toast.success("Setup complete. You’re all set.", {
      style: { background: "rgb(15 23 42 / 0.98)", border: "1px solid rgb(51 65 85 / 0.8)", borderRadius: "12px", color: "#f1f5f9" },
      iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" },
    });
    complete2FASetup(accessToken || undefined);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${label} copied to clipboard`);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
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

  if (!pendingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          <div className="bg-slate-800/90 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Error</h2>
            <p className="text-sm text-slate-400 mb-6">
              No user data available for two-factor authentication setup
            </p>
              <button
              onClick={handleBack}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Go Back
              </button>
          </div>
        </div>
      </div>
    );
  }

  const hasTokenValue = verificationToken.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* GameCrafter Themed Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep dark base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900" />

        {/* Logo / card glow */}
        <div className="absolute -top-40 left-1/2 w-[34rem] h-[34rem] -translate-x-1/2 rounded-full bg-radial from-red-600/45 via-red-600/10 to-transparent blur-3xl" />

        {/* Ambient red orbs */}
        <div className="absolute -bottom-40 -left-16 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-red-700/40 via-red-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-gradient-to-bl from-red-500/30 via-red-500/5 to-transparent blur-3xl" />

        {/* Subtle concentric rings */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.16]">
          <div className="relative">
            <div className="w-80 h-80 rounded-full border border-red-500/25" />
            <div className="absolute inset-6 rounded-full border border-red-500/15" />
            <div className="absolute inset-12 rounded-full border border-red-500/10" />
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md relative z-10 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        {/* Logo and Header */}
        <div className={`text-center mb-8 animate-slideUpFade`}>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src={gamecrafterLogo}
                alt="GameCrafter Logo"
                className={`h-16 w-auto object-contain transition-all duration-500 ${mounted ? "scale-100" : "scale-90"} drop-shadow-lg`}
                style={{
                  filter: mounted ? "drop-shadow(0 0 32px rgba(248, 113, 113, 0.45))" : "none",
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-red-500 transition-transform duration-200 hover:scale-110" />
            <h1 className="text-2xl font-semibold text-white">
              Two-Factor Authentication Setup
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Enable two-factor authentication to secure your account
          </p>
        </div>

        {/* Setup Card */}
        <div className={`bg-slate-800/90 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl p-8 animate-slideUpFade`} style={{ animationDelay: "0.2s" }}>
        {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400 mb-1">Error</h3>
                  <div className="text-sm text-red-300">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
            <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-400 mb-1">Success</h3>
                  <div className="text-sm text-green-300">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Method Selection Step */}
        {setupStep === "method" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">
                  Choose Verification Method
            </h3>
                <p className="text-sm text-slate-400">
                  Select your preferred method for two-factor authentication
                </p>
              </div>
            <div className="space-y-3">
              {availableMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                      disabled={!method.enabled || isGeneratingSecret}
                      className={`w-full flex items-center p-4 border rounded-lg transition-all duration-200 ${
                        method.enabled && !isGeneratingSecret
                    ? "border-slate-700 hover:border-red-500/50 hover:bg-red-500/5 bg-slate-900/30"
                          : "border-slate-700 bg-slate-900/50 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <IconComponent className={`h-6 w-6 mr-3 ${method.enabled ? "text-red-400" : "text-slate-500"}`} />
                      <div className="text-left flex-1">
                      <div className="text-sm font-medium text-white">
                        {method.name}
                      </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                        {method.description}
                      </div>
                    </div>
                      {isGeneratingSecret && method.id === selectedMethod && (
                        <Loader2 className="h-5 w-5 text-red-400 animate-spin" />
                      )}
                  </button>
                );
              })}
            </div>
              <button
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-slate-700 text-sm font-medium rounded-lg text-slate-300 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>
          </div>
        )}

        {/* TOTP Setup Step */}
        {setupStep === "verify" && selectedMethod === "totp" && secretData && (
          <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-white mb-1">
                Set Up Authenticator App
              </h3>
                <p className="text-sm text-slate-400">
                  Scan the QR code with your authenticator app or enter the secret key manually
              </p>
            </div>

            {qrCodeImage && (
              <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border border-slate-700">
                  <img src={qrCodeImage} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                Secret Key
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type={showSecret ? "text" : "password"}
                  value={secretData.secret}
                  readOnly
                    className="flex-1 px-4 py-3 border border-slate-700 rounded-lg bg-slate-900/60 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/60"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                  {showSecret ? (
                      <EyeOff className="h-5 w-5" />
                  ) : (
                      <Eye className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(secretData.secret, "Secret key")
                  }
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                    <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Verification Code
              </label>
                <div className="relative">
              <input
                type="text"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                    onFocus={() => setFocusedField(true)}
                    onBlur={() => setFocusedField(false)}
                    placeholder="Enter 6-digit code"
                    className={`w-full px-4 pt-6 pb-2 bg-slate-900/60 text-white rounded-lg border transition-all duration-300 placeholder:text-transparent ${
                      focusedField || hasTokenValue
                        ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    }`}
                maxLength={6}
              />
                  <label
                    className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                      focusedField || hasTokenValue
                        ? "top-2 text-xs text-red-400"
                        : "top-4 text-sm text-slate-400"
                    }`}
                  >
                    Enter code from your app
                  </label>
                </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setSetupStep("method")}
                  className="flex-1 py-3 px-4 border border-slate-700 rounded-lg text-white bg-slate-900/50 hover:bg-slate-800 transition-all duration-200 font-medium"
              >
                Back
              </button>
              <button
                  ref={buttonRef}
                  onClick={(e) => {
                    createRipple(e);
                    handleVerifyAndEnable();
                  }}
                disabled={!verificationToken || isEnabling2FA}
                  className={`relative flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 font-medium shadow-lg shadow-red-500/40 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                    !isEnabling2FA && verificationToken
                      ? "hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 active:translate-y-0"
                      : ""
                  }`}
                >
                  {isEnabling2FA ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2 inline" />
                      Enabling...
                    </>
                  ) : (
                    "Enable 2FA"
                  )}
                  <style>{`
                    .ripple {
                      position: absolute;
                      border-radius: 50%;
                      background: rgba(255, 255, 255, 0.6);
                      transform: scale(0);
                      animation: ripple 0.6s ease-out;
                      pointer-events: none;
                    }
                    @keyframes ripple {
                      to {
                        transform: scale(4);
                        opacity: 0;
                      }
                    }
                  `}</style>
              </button>
            </div>
          </div>
        )}

        {/* Email/SMS OTP Setup Step */}
        {setupStep === "verify" &&
          selectedMethod &&
          selectedMethod !== "totp" && (
            <div className="space-y-6">
              <div className="text-center">
                  <h3 className="text-lg font-medium text-white mb-1">
                    Set Up {selectedMethod === "email_otp" ? "Email" : "SMS"} Verification
                </h3>
                  <p className="text-sm text-slate-400">
                  We'll send a verification code to your{" "}
                    {selectedMethod === "email_otp" ? "email" : "phone"}
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => generateOTP(selectedMethod)}
                  disabled={isGeneratingSecret}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-200 font-medium"
                >
                  {isGeneratingSecret
                    ? "Sending..."
                    : `Send ${selectedMethod === "email_otp" ? "Email" : "SMS"} Code`}
                </button>
              </div>

              <div className="space-y-2">
                  <div className="relative">
                <input
                  type="text"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                      onFocus={() => setFocusedField(true)}
                      onBlur={() => setFocusedField(false)}
                      placeholder="Enter 6-digit code"
                      className={`w-full px-4 pt-6 pb-2 bg-slate-900/60 text-white rounded-lg border transition-all duration-300 placeholder:text-transparent ${
                        focusedField || hasTokenValue
                          ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      }`}
                  maxLength={6}
                />
                    <label
                      className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                        focusedField || hasTokenValue
                          ? "top-2 text-xs text-red-400"
                          : "top-4 text-sm text-slate-400"
                      }`}
                    >
                      Verification Code
                    </label>
                  </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSetupStep("method")}
                    className="flex-1 py-3 px-4 border border-slate-700 rounded-lg text-white bg-slate-900/50 hover:bg-slate-800 transition-all duration-200 font-medium"
                >
                  Back
                </button>
                <button
                    ref={buttonRef}
                    onClick={(e) => {
                      createRipple(e);
                      handleVerifyAndEnable();
                    }}
                  disabled={!verificationToken || isEnabling2FA}
                    className={`relative flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 font-medium shadow-lg shadow-red-500/40 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                      !isEnabling2FA && verificationToken
                        ? "hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 active:translate-y-0"
                        : ""
                    }`}
                  >
                    {isEnabling2FA ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2 inline" />
                        Enabling...
                      </>
                    ) : (
                      "Enable 2FA"
                    )}
                    <style>{`
                      .ripple {
                        position: absolute;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.6);
                        transform: scale(0);
                        animation: ripple 0.6s ease-out;
                        pointer-events: none;
                      }
                      @keyframes ripple {
                        to {
                          transform: scale(4);
                          opacity: 0;
                        }
                      }
                    `}</style>
                </button>
              </div>
            </div>
          )}

        {/* Complete Step */}
        {setupStep === "complete" && backupCodes.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">
                  Two-Factor Authentication Enabled
              </h3>
                <p className="text-sm text-slate-400">
                  Save these backup codes in a safe place. You can use them to access your account if you lose your device.
              </p>
            </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-400 mb-2">
                    Important
                  </h3>
                    <div className="text-xs text-yellow-300 space-y-1">
                      <div>• Each backup code can only be used once</div>
                      <div>• Store them in a safe place</div>
                      <div>• You can generate new codes anytime</div>
                  </div>
                </div>
              </div>
            </div>

              <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-300">
                  Backup Codes
                </label>
                <div className="space-x-2">
                  <button
                    onClick={() =>
                      copyToClipboard(backupCodes.join("\n"), "Backup codes")
                    }
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Copy All
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                      className="p-3 bg-slate-900/60 rounded-lg text-center border border-slate-700 text-white"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <button
                ref={buttonRef}
                onClick={(e) => {
                  createRipple(e);
                  handleCompleteSetup();
                }}
                className={`relative w-full py-3.5 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 font-medium shadow-lg shadow-green-500/30 overflow-hidden hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5 active:translate-y-0`}
            >
              Complete Setup
                <style>{`
                  .ripple {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    pointer-events: none;
                  }
                  @keyframes ripple {
                    to {
                      transform: scale(4);
                      opacity: 0;
                    }
                  }
                `}</style>
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
