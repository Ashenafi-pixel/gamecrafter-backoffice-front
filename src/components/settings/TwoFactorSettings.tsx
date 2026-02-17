import React, { useState, useEffect, useCallback } from "react";
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
  Fingerprint,
} from "lucide-react";
import {
  twoFactorService,
  TwoFactorSettings,
  TwoFactorAuthSetupResponse,
} from "../../services/twoFactorService";
import toast from "react-hot-toast";
import QRCode from "qrcode";

// 2FA Method Types
type TwoFactorMethod =
  | "totp"
  | "email_otp"
  | "sms_otp"
  | "biometric"
  | "passkey"
  | "backup_codes";

interface TwoFactorMethodInfo {
  id: TwoFactorMethod;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
}

interface TwoFactorAuthSettingsProps {
  userEmail?: string;
  userPhone?: string;
}

export const TwoFactorAuthSettings: React.FC<TwoFactorAuthSettingsProps> = ({
  userEmail = "user@example.com",
  userPhone = "+1234567890",
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 2FA Status
  const [twoFactorStatus, setTwoFactorStatus] =
    useState<TwoFactorSettings | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Setup flow
  const [setupStep, setSetupStep] = useState<
    "status" | "generate" | "verify" | "complete"
  >("status");
  const [secretData, setSecretData] =
    useState<TwoFactorAuthSetupResponse | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Disable flow
  const [disableToken, setDisableToken] = useState("");

  // Multiple methods state
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(
    null,
  );
  const [enabledMethods, setEnabledMethods] = useState<TwoFactorMethod[]>([]);
  const [emailOTP, setEmailOTP] = useState<string>("");
  const [smsOTP, setSmsOTP] = useState<string>("");
  const [isGeneratingEmailOTP, setIsGeneratingEmailOTP] = useState(false);
  const [isGeneratingSmsOTP, setIsGeneratingSmsOTP] = useState(false);

  // Passkey state
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);
  const [passkeyCredentials, setPasskeyCredentials] = useState<any[]>([]);

  // Load initial 2FA status
  const load2FAStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await twoFactorService.getStatus();
      setTwoFactorStatus(status);
      setIs2FAEnabled(status.is_enabled);

      // Load available methods from backend with user ID
      const availableMethods = await twoFactorService.getAvailableMethods(
        status.user_id,
      );
      setEnabledMethods(availableMethods as TwoFactorMethod[]);

      // Check if user has passkeys registered
      try {
        const passkeyResponse = await twoFactorService.listPasskeys(
          status.user_id,
        );
        if (
          passkeyResponse.success &&
          passkeyResponse.data &&
          passkeyResponse.data.length > 0
        ) {
          setPasskeyCredentials(passkeyResponse.data);
          // Update availableMethods to show passkey as enabled
          const updatedMethods = availableMethods.map((method) =>
            method === "passkey" ? "passkey" : method,
          );
          setEnabledMethods(updatedMethods as TwoFactorMethod[]);
        }
      } catch (passkeyErr) {
        // If passkey check fails, continue without passkeys
        console.log(
          "No passkeys found or error checking passkeys:",
          passkeyErr,
        );
      }

      setSetupStep(status.is_enabled ? "status" : "status");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load 2FA status";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh passkey status
  const refreshPasskeyStatus = useCallback(async () => {
    const userId = twoFactorStatus?.user_id;
    if (!userId) return;

    try {
      const passkeyResponse = await twoFactorService.listPasskeys(userId);
      if (passkeyResponse.success && passkeyResponse.data) {
        setPasskeyCredentials(passkeyResponse.data);
      }
    } catch (err) {
      console.log("Error refreshing passkey status:", err);
    }
  }, [twoFactorStatus?.user_id]);

  // Define available 2FA methods - passkey enabled status will be updated dynamically
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
      name: "Email OTP",
      description: "Receive verification codes via email",
      icon: Mail,
      enabled: true,
    },
    {
      id: "sms_otp",
      name: "SMS OTP",
      description: "Receive verification codes via SMS",
      icon: Phone,
      enabled: true,
    },
    {
      id: "passkey",
      name: "Passkey",
      description: "Use WebAuthn passkeys for secure authentication",
      icon: Key,
      enabled: true, // Always enabled so user can register passkeys
    },
    {
      id: "backup_codes",
      name: "Backup Codes",
      description:
        "Backup codes are generated automatically with TOTP. One-time use codes for account recovery.",
      icon: Key,
      enabled: true,
    },
  ];

  useEffect(() => {
    load2FAStatus();
  }, [load2FAStatus]);

  // Generate QR code from otpauth URL
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
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  // Generate 2FA secret
  const handleGenerateSecret = async () => {
    setIsGeneratingSecret(true);
    setError(null);
    try {
      const data = await twoFactorService.generateSecret(userEmail);
      setSecretData(data);

      // Generate QR code image from the otpauth URL
      if (data.qr_code_data) {
        await generateQRCodeImage(data.qr_code_data);
      }

      setSetupStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to generate 2FA secret");
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  // Enable 2FA
  const handleEnable2FA = async () => {
    if (!secretData || !verificationToken) {
      setError("Please enter the verification code");
      return;
    }

    if (!twoFactorService.isValidTOTPFormat(verificationToken)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsEnabling2FA(true);
    setError(null);
    try {
      const userId = twoFactorStatus?.user_id ?? userEmail;
      // Enable 2FA with secret and token verification
      await twoFactorService.enable2FA({
        secret: secretData.secret,
        token: verificationToken,
      });

      // Also enable the TOTP method in the multi-method system
      await twoFactorService.enableMethod(
        {
          method: "totp",
          data: { secret: secretData.secret },
        },
        userId,
      );

      // Automatically enable backup codes when TOTP is enabled
      await twoFactorService.enableMethod(
        {
          method: "backup_codes",
        },
        userId,
      );

      // Update the enabled methods list
      setEnabledMethods((prev) => [...prev, "totp", "backup_codes"]);

      // Generate backup codes (in a real app, these would come from the backend)
      const codes = twoFactorService.generateBackupCodes();
      setBackupCodes(codes);
      setSetupStep("complete");
      setSuccess("2FA enabled successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to enable 2FA");
    } finally {
      setIsEnabling2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!disableToken) {
      setError("Please enter the verification code");
      return;
    }

    if (!twoFactorService.isValidTOTPFormat(disableToken)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsDisabling2FA(true);
    setError(null);
    try {
      await twoFactorService.disable2FA({ token: disableToken });
      setIs2FAEnabled(false);
      setTwoFactorStatus(null);
      setSetupStep("status");
      setSuccess("2FA disabled successfully");
      setDisableToken("");
    } catch (err: any) {
      setError(err.message || "Failed to disable 2FA");
    } finally {
      setIsDisabling2FA(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(null), 2000);
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    const content = `TucanBIT Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}\n\nKeep these codes safe! Each code can only be used once.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tucanbit-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset setup flow
  const resetSetup = () => {
    setSetupStep("status");
    setSecretData(null);
    setVerificationToken("");
    setBackupCodes([]);
    setShowBackupCodes(false);
    setShowSecret(false);
    setError(null);
    setSuccess(null);
  };

  // New handlers for multiple 2FA methods
  const handleGenerateEmailOTP = async () => {
    setIsGeneratingEmailOTP(true);
    setError(null);
    try {
      await twoFactorService.generateEmailOTP({ email: userEmail });
      toast.success("Email OTP sent to your email address");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send email OTP";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGeneratingEmailOTP(false);
    }
  };

  const handleGenerateSmsOTP = async () => {
    setIsGeneratingSmsOTP(true);
    setError(null);
    try {
      await twoFactorService.generateSmsOTP({ phone_number: userPhone });
      toast.success("SMS OTP sent to your phone number");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send SMS OTP";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGeneratingSmsOTP(false);
    }
  };

  const handleEnableMethod = async (method: TwoFactorMethod) => {
    setSelectedMethod(method);
    setError(null);

    try {
      switch (method) {
        case "totp":
          // For TOTP, start the setup flow but don't add to enabled methods yet
          setSetupStep("generate");
          break;
        case "email_otp":
          // Optimistic UI update - immediately show as enabled
          setEnabledMethods((prev) => [...prev, method]);
          await twoFactorService.enableMethod(
            { method },
            twoFactorStatus?.user_id ?? userEmail,
          );
          toast.success(
            `${availableMethods.find((m) => m.id === method)?.name} enabled successfully`,
          );
          break;
        case "sms_otp":
          // Optimistic UI update - immediately show as enabled
          setEnabledMethods((prev) => [...prev, method]);
          await twoFactorService.enableMethod(
            { method },
            twoFactorStatus?.user_id ?? userEmail,
          );
          toast.success(
            `${availableMethods.find((m) => m.id === method)?.name} enabled successfully`,
          );
          break;
        case "passkey":
          // For passkey, register the credential
          await handleRegisterPasskey();
          break;
        case "backup_codes":
          toast.error("Backup codes are generated automatically with TOTP");
          break;
      }
    } catch (err: any) {
      // Revert optimistic update on error for non-TOTP methods
      if (method !== "totp") {
        setEnabledMethods((prev) => prev.filter((m) => m !== method));
      }
      const errorMessage = err.message || `Failed to enable ${method}`;
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDisableMethod = async (method: TwoFactorMethod) => {
    setError(null);

    // Optimistic UI update - immediately show as disabled
    setEnabledMethods((prev) => prev.filter((m) => m !== method));

    try {
      await twoFactorService.disableMethod(
        {
          method,
          verification_data: verificationToken,
        },
        twoFactorStatus?.user_id ?? userEmail,
      );

      toast.success(
        `${availableMethods.find((m) => m.id === method)?.name} disabled successfully`,
      );
    } catch (err: any) {
      // Revert optimistic update on error
      setEnabledMethods((prev) => [...prev, method]);
      const errorMessage = err.message || `Failed to disable ${method}`;
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Passkey functions
  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser");
      }

      // Determine RP ID based on hostname
      let rpId = window.location.hostname;
      if (rpId === "localhost" || rpId === "127.0.0.1") {
        rpId = "localhost";
      } else if (rpId.includes("tucanbit.tv")) {
        // Use apex domain for subdomains so passkeys work across all subdomains
        rpId = "tucanbit.tv";
      } else if (rpId.includes(".")) {
        // Extract apex domain
        const parts = rpId.split(".");
        if (parts.length >= 2) {
          rpId = parts[parts.length - 2] + "." + parts[parts.length - 1];
        }
      }

      // Create credential options
      const createOptions = {
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: "TucanBit Casino",
            id: rpId,
          },
          user: {
            id: new TextEncoder().encode(userEmail),
            name: userEmail,
            displayName: userEmail,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "direct" as AttestationConveyancePreference,
        },
      };

      // Create the credential
      const credential = (await navigator.credentials.create(
        createOptions as CredentialCreationOptions,
      )) as PublicKeyCredential;

      if (credential) {
        // Send the credential to the server
        const response = await twoFactorService.registerPasskey({
          credential: {
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            response: {
              attestationObject: Array.from(
                new Uint8Array(
                  (credential.response as AuthenticatorAttestationResponse)
                    .attestationObject,
                ),
              ),
              clientDataJSON: Array.from(
                new Uint8Array(credential.response.clientDataJSON),
              ),
            },
            type: credential.type,
          },
          user_id: twoFactorStatus?.user_id || userEmail,
        });

        if (response.success) {
          setEnabledMethods((prev) => [...prev, "passkey"]);
          await refreshPasskeyStatus(); // Refresh passkey status to update UI
          toast.success("Passkey registered successfully");
        } else {
          throw new Error(response.message || "Failed to register passkey");
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to register passkey";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleVerifyPasskey = async () => {
    setIsVerifyingPasskey(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser");
      }

      // Get assertion options from server
      const assertionOptions =
        await twoFactorService.getPasskeyAssertionOptions({
          user_id: twoFactorStatus?.user_id || userEmail,
        });

      if (!assertionOptions.success) {
        throw new Error(
          assertionOptions.message || "Failed to get assertion options",
        );
      }

      // Create assertion options
      const options = {
        publicKey: {
          challenge: new Uint8Array(assertionOptions.data.challenge),
          rpId: assertionOptions.data.rpId || "tucanbit.tv", // Use RP ID from server response
          allowCredentials: assertionOptions.data.allowCredentials?.map(
            (cred: any) => ({
              id: new Uint8Array(cred.id),
              type: "public-key",
              transports: cred.transports,
            }),
          ),
          timeout: 60000,
          userVerification: "required",
        },
      };

      // Get the assertion
      const assertion = (await navigator.credentials.get(
        options as CredentialRequestOptions,
      )) as PublicKeyCredential;

      if (assertion) {
        // Verify the assertion with the server
        const response = await twoFactorService.verifyPasskey({
          credential: {
            id: assertion.id,
            rawId: Array.from(new Uint8Array(assertion.rawId)),
            response: {
              authenticatorData: Array.from(
                new Uint8Array(
                  (assertion.response as AuthenticatorAssertionResponse)
                    .authenticatorData,
                ),
              ),
              clientDataJSON: Array.from(
                new Uint8Array(assertion.response.clientDataJSON),
              ),
              signature: Array.from(
                new Uint8Array(
                  (assertion.response as AuthenticatorAssertionResponse)
                    .signature,
                ),
              ),
              userHandle: (assertion.response as AuthenticatorAssertionResponse).userHandle
                ? Array.from(new Uint8Array((assertion.response as AuthenticatorAssertionResponse).userHandle!))
                : null,
            },
            type: assertion.type,
          },
          user_id: twoFactorStatus?.user_id || userEmail,
        });

        if (response.success) {
          toast.success("Passkey verification successful");
          return true;
        } else {
          throw new Error(response.message || "Failed to verify passkey");
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to verify passkey";
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsVerifyingPasskey(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80">
        <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
        <span className="ml-2 text-slate-400 text-sm">Loading 2FA settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-slate-700/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Two-factor authentication
          </h2>
        </div>
        <div className="p-4 md:p-6 space-y-4">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="text-red-400 text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-sm font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Multiple 2FA Methods */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-200 uppercase tracking-wider">
              Available authentication methods
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Combine methods to balance convenience and account security.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
            <span>Recommended: App + backup codes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {availableMethods.map((method) => {
            const IconComponent = method.icon;
            const isEnabled =
              enabledMethods.includes(method.id) ||
              (method.id === "backup_codes" &&
                enabledMethods.includes("totp")) ||
              (method.id === "passkey" && passkeyCredentials.length > 0);
            const isCurrentlySelected = selectedMethod === method.id;

            return (
              <div
                key={method.id}
                className={`rounded-2xl border p-4 md:p-5 transition-all duration-200 shadow-sm ${
                  !is2FAEnabled &&
                  (method.id === "totp" || method.id === "backup_codes")
                    ? "border-red-500/50 bg-red-500/10 hover:border-red-500/70 shadow-red-500/10"
                    : isEnabled
                      ? "border-emerald-500/40 bg-emerald-500/10 shadow-emerald-500/10"
                      : isCurrentlySelected
                        ? "border-red-500/50 bg-red-500/10 shadow-red-500/10"
                        : method.enabled
                          ? "border-slate-700 bg-slate-900/70 hover:border-slate-500"
                          : "border-slate-800 bg-slate-900/40 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      !is2FAEnabled &&
                      (method.id === "totp" || method.id === "backup_codes")
                        ? "bg-red-500"
                        : isEnabled
                          ? "bg-emerald-500"
                          : isCurrentlySelected
                            ? "bg-red-500"
                            : "bg-slate-600"
                    }`}
                  >
                    <IconComponent className="h-5 w-5 text-white drop-shadow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium leading-snug">
                      {method.name}
                    </h4>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">
                      {method.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!is2FAEnabled ? (
                        method.id === "totp" || method.id === "backup_codes" ? (
                          <button
                            onClick={() =>
                              method.id === "totp"
                                ? handleGenerateSecret()
                                : null
                            }
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl transition-colors"
                          >
                            Enable
                          </button>
                        ) : method.enabled ? (
                          <button
                            onClick={() => handleEnableMethod(method.id)}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl transition-colors"
                          >
                            Enable
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-700 text-slate-400 text-sm rounded-xl">
                            Coming Soon
                          </span>
                        )
                      ) : !isEnabled && method.enabled ? (
                        <button
                          onClick={() => handleEnableMethod(method.id)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl transition-colors"
                        >
                          Enable
                        </button>
                      ) : isEnabled ? (
                        method.id === "backup_codes" &&
                        enabledMethods.includes("totp") ? (
                          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-xl border border-emerald-500/30">
                            Auto-enabled with TOTP
                          </span>
                        ) : method.id === "totp" ? (
                          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-xl border border-emerald-500/30">
                            Use &quot;Disable 2FA&quot; below
                          </span>
                        ) : method.id === "passkey" ? (
                          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-xl border border-emerald-500/30">
                            {passkeyCredentials.length} registered
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDisableMethod(method.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl transition-colors"
                          >
                            Disable
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status */}
      {setupStep === "status" && (
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Current status
            </h3>
            <div
              className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
                is2FAEnabled
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {is2FAEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>

          {is2FAEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm">Two-factor authentication is enabled</span>
              </div>
              {twoFactorStatus?.enabled_at && (
                <p className="text-slate-400 text-sm">
                  Enabled on: {new Date(twoFactorStatus.enabled_at).toLocaleString()}
                </p>
              )}

              <div className="pt-4 border-t border-slate-700/80">
                <h4 className="text-slate-200 font-medium mb-3">Disable 2FA</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Enter verification code from your authenticator app
                    </label>
                    <input
                      type="text"
                      value={disableToken}
                      onChange={(e) => setDisableToken(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500"
                    />
                  </div>
                  <button
                    onClick={handleDisable2FA}
                    disabled={isDisabling2FA || !disableToken}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isDisabling2FA ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {isDisabling2FA ? "Disabling..." : "Disable 2FA"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span className="text-sm">Two-factor authentication is not enabled</span>
              </div>
              <p className="text-slate-400 text-sm">
                Add an extra layer of security to your account by enabling two-factor authentication.
              </p>
              <button
                onClick={handleGenerateSecret}
                disabled={isGeneratingSecret}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-lg shadow-red-500/20"
              >
                {isGeneratingSecret ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {isGeneratingSecret ? "Generating..." : "Enable 2FA"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Setup Flow - Generate Secret */}
      {setupStep === "generate" && (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
            Generate 2FA secret
          </h3>
          <button
            onClick={handleGenerateSecret}
            disabled={isGeneratingSecret}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isGeneratingSecret ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isGeneratingSecret ? "Generating..." : "Generate secret"}
          </button>
        </div>
      )}

      {/* Setup Flow - Verify and Enable */}
      {setupStep === "verify" && secretData && (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
            Complete 2FA setup
          </h3>

          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-slate-200 font-medium mb-3">Scan QR code</h4>
              <div className="bg-white p-4 rounded-xl inline-block">
                {qrCodeImage ? (
                  <img src={qrCodeImage} alt="2FA QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-2">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
            </div>

            <div>
              <h4 className="text-slate-200 font-medium mb-3">Manual entry</h4>
              <div className="bg-slate-950/60 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Secret key</span>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-white font-mono text-sm bg-slate-800 px-2 py-1 rounded-lg flex-1">
                    {showSecret ? secretData.secret : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <button
                    onClick={() => copyToClipboard(secretData.secret)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-slate-200 font-medium mb-3">Verify setup</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Enter the 6-digit code from your authenticator app
                  </label>
                  <input
                    type="text"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-slate-950/60 text-white border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleEnable2FA}
                    disabled={isEnabling2FA || !verificationToken}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isEnabling2FA ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {isEnabling2FA ? "Enabling..." : "Enable 2FA"}
                  </button>
                  <button
                    onClick={resetSetup}
                    className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium border border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Complete - Backup Codes */}
      {setupStep === "complete" && backupCodes.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
            2FA setup complete
          </h3>

          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <span className="text-amber-400 font-medium text-sm">
                  Important: save your backup codes
                </span>
              </div>
              <p className="text-slate-300 text-sm">
                These backup codes can be used to access your account if you lose your authenticator device. Each code can only be used once. Store them in a safe place.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-slate-200 font-medium">Backup codes</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50"
                  >
                    {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-700/80 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg"
                    >
                      <span className="text-white font-mono text-sm">
                        {showBackupCodes ? code : "••••••••"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setSetupStep("status");
                  setIs2FAEnabled(true);
                  load2FAStatus();
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium"
              >
                Complete setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-4">
          Supported authenticator apps
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { letter: "G", name: "Google Authenticator", desc: "Free authenticator app by Google. Available on iOS and Android.", bg: "bg-slate-600" },
              { letter: "A", name: "Authy", desc: "Multi-device authenticator with cloud backup. Cross-platform support.", bg: "bg-red-500/80" },
              { letter: "M", name: "Microsoft Authenticator", desc: "Microsoft's authenticator app with push notifications and backup.", bg: "bg-slate-600" },
              { letter: "1", name: "1Password", desc: "Password manager with built-in authenticator functionality.", bg: "bg-emerald-600/80" },
              { letter: "B", name: "Bitwarden", desc: "Open-source password manager with authenticator features.", bg: "bg-slate-600" },
              { letter: "L", name: "LastPass Authenticator", desc: "Authenticator app by LastPass with cloud sync capabilities.", bg: "bg-slate-600" },
            ].map((app) => (
              <div key={app.name} className="flex items-start gap-3">
                <div className={`w-8 h-8 ${app.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-sm">{app.letter}</span>
                </div>
                <div>
                  <h4 className="text-white font-medium">{app.name}</h4>
                  <p className="text-slate-400 text-sm mt-0.5">{app.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-slate-200 font-medium">How to use</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Any of these authenticator apps will work. Simply scan the QR code or enter the secret key manually. All apps generate the same 6-digit codes that change every 30 seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-slate-200 font-medium">Backup codes</h4>
                <p className="text-slate-400 text-sm mt-1">
                  Save your backup codes securely. These one-time use codes can access your account if you lose your authenticator device. Each code can only be used once.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-900/60 border border-slate-700/80 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-slate-200 font-medium">Security features</h4>
                <p className="text-slate-400 text-sm mt-1">
                  2FA uses industry-standard TOTP (Time-based One-Time Password) with SHA-1. Your codes are generated locally on your device and never transmitted over the network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};
