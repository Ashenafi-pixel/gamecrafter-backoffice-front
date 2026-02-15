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
  TwoFactorMethodInfo,
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
    if (!twoFactorStatus?.user_id) return;

    try {
      const passkeyResponse = await twoFactorService.listPasskeys(
        twoFactorStatus.user_id,
      );
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
        twoFactorStatus.user_id,
      );

      // Automatically enable backup codes when TOTP is enabled
      await twoFactorService.enableMethod(
        {
          method: "backup_codes",
        },
        twoFactorStatus.user_id,
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
            twoFactorStatus.user_id,
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
            twoFactorStatus.user_id,
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
        twoFactorStatus.user_id,
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
          attestation: "direct",
        },
      };

      // Create the credential
      const credential = (await navigator.credentials.create(
        createOptions,
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
        options,
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
              userHandle: assertion.response.userHandle
                ? Array.from(new Uint8Array(assertion.response.userHandle))
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
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-400">Loading 2FA settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-6 w-6 text-purple-500" />
        <h2 className="text-xl font-semibold text-white">
          Two-Factor Authentication
        </h2>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-green-400 font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Multiple 2FA Methods */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Available Authentication Methods
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableMethods.map((method) => {
            const IconComponent = method.icon;
            // Backup codes are automatically enabled when TOTP is enabled
            // Passkeys are enabled if user has registered any passkeys
            const isEnabled =
              enabledMethods.includes(method.id) ||
              (method.id === "backup_codes" &&
                enabledMethods.includes("totp")) ||
              (method.id === "passkey" && passkeyCredentials.length > 0);
            const isCurrentlySelected = selectedMethod === method.id;

            return (
              <div
                key={method.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  !is2FAEnabled &&
                  (method.id === "totp" || method.id === "backup_codes")
                    ? "border-purple-600 bg-purple-900/10 hover:border-purple-500"
                    : isEnabled
                      ? "border-green-600 bg-green-900/10"
                      : isCurrentlySelected
                        ? "border-purple-600 bg-purple-900/10"
                        : method.enabled
                          ? "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                          : "border-gray-700 bg-gray-800/50 opacity-50"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      !is2FAEnabled &&
                      (method.id === "totp" || method.id === "backup_codes")
                        ? "bg-purple-600"
                        : isEnabled
                          ? "bg-green-600"
                          : isCurrentlySelected
                            ? "bg-purple-600"
                            : "bg-gray-600"
                    }`}
                  >
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{method.name}</h4>
                    <p className="text-gray-400 text-sm mt-1">
                      {method.description}
                    </p>

                    <div className="mt-3 flex space-x-2">
                      {!is2FAEnabled ? (
                        // When 2FA is globally disabled, show Enable buttons for TOTP and Backup Codes
                        method.id === "totp" || method.id === "backup_codes" ? (
                          <button
                            onClick={() =>
                              method.id === "totp"
                                ? handleGenerateSecret()
                                : null
                            }
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors"
                          >
                            Enable
                          </button>
                        ) : method.enabled ? (
                          <button
                            onClick={() => handleEnableMethod(method.id)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors"
                          >
                            Enable
                          </button>
                        ) : (
                          <span className="px-3 py-1 bg-gray-600 text-gray-400 text-sm rounded-md">
                            Coming Soon
                          </span>
                        )
                      ) : // When 2FA is globally enabled, show status or disable buttons
                      !isEnabled && method.enabled ? (
                        <button
                          onClick={() => handleEnableMethod(method.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors"
                        >
                          Enable
                        </button>
                      ) : isEnabled ? (
                        // Don't show disable button for backup codes when TOTP is enabled
                        method.id === "backup_codes" &&
                        enabledMethods.includes("totp") ? (
                          <span className="px-3 py-1 bg-green-600 text-green-100 text-sm rounded-md">
                            Auto-enabled with TOTP
                          </span>
                        ) : method.id === "totp" ? (
                          // Don't show disable button for TOTP - use main "Disable 2FA" section instead
                          <span className="px-3 py-1 bg-green-600 text-green-100 text-sm rounded-md">
                            Use "Disable 2FA" below
                          </span>
                        ) : method.id === "passkey" ? (
                          // Show number of registered passkeys
                          <span className="px-3 py-1 bg-green-600 text-green-100 text-sm rounded-md">
                            {passkeyCredentials.length} registered
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDisableMethod(method.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
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
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Current Status</h3>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                is2FAEnabled
                  ? "bg-green-900/20 text-green-400 border border-green-700"
                  : "bg-yellow-900/20 text-yellow-400 border border-yellow-700"
              }`}
            >
              {is2FAEnabled ? "Enabled" : "Disabled"}
            </div>
          </div>

          {is2FAEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Two-factor authentication is enabled</span>
              </div>
              {twoFactorStatus?.enabled_at && (
                <p className="text-gray-400 text-sm">
                  Enabled on:{" "}
                  {new Date(twoFactorStatus.enabled_at).toLocaleString()}
                </p>
              )}

              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-white font-medium mb-3">Disable 2FA</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Enter verification code from your authenticator app
                    </label>
                    <input
                      type="text"
                      value={disableToken}
                      onChange={(e) => setDisableToken(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleDisable2FA}
                    disabled={isDisabling2FA || !disableToken}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isDisabling2FA ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span>
                      {isDisabling2FA ? "Disabling..." : "Disable 2FA"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Two-factor authentication is not enabled</span>
              </div>
              <p className="text-gray-400">
                Add an extra layer of security to your account by enabling
                two-factor authentication.
              </p>
              <button
                onClick={handleGenerateSecret}
                disabled={isGeneratingSecret}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGeneratingSecret ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <span>
                  {isGeneratingSecret ? "Generating..." : "Enable 2FA"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Setup Flow - Generate Secret */}
      {setupStep === "generate" && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Generate 2FA Secret
          </h3>
          <button
            onClick={handleGenerateSecret}
            disabled={isGeneratingSecret}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isGeneratingSecret ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>
              {isGeneratingSecret ? "Generating..." : "Generate Secret"}
            </span>
          </button>
        </div>
      )}

      {/* Setup Flow - Verify and Enable */}
      {setupStep === "verify" && secretData && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Complete 2FA Setup
          </h3>

          <div className="space-y-6">
            {/* QR Code */}
            <div className="text-center">
              <h4 className="text-white font-medium mb-3">Scan QR Code</h4>
              <div className="bg-white p-4 rounded-lg inline-block">
                {qrCodeImage ? (
                  <img
                    src={qrCodeImage}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Scan this QR code with your authenticator app (Google
                Authenticator, Authy, etc.)
              </p>
            </div>

            {/* Manual Secret */}
            <div>
              <h4 className="text-white font-medium mb-3">Manual Entry</h4>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Secret Key:</span>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="text-white font-mono text-sm bg-gray-800 px-2 py-1 rounded flex-1">
                    {showSecret
                      ? secretData.secret
                      : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <button
                    onClick={() => copyToClipboard(secretData.secret)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Verification */}
            <div>
              <h4 className="text-white font-medium mb-3">Verify Setup</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Enter the 6-digit code from your authenticator app
                  </label>
                  <input
                    type="text"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleEnable2FA}
                    disabled={isEnabling2FA || !verificationToken}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isEnabling2FA ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span>{isEnabling2FA ? "Enabling..." : "Enable 2FA"}</span>
                  </button>
                  <button
                    onClick={resetSetup}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
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
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            2FA Setup Complete!
          </h3>

          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <span className="text-yellow-400 font-medium">
                  Important: Save Your Backup Codes
                </span>
              </div>
              <p className="text-gray-300 text-sm">
                These backup codes can be used to access your account if you
                lose your authenticator device. Each code can only be used once.
                Store them in a safe place.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">Backup Codes</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showBackupCodes ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="text-gray-400 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded"
                    >
                      <span className="text-white font-mono text-sm">
                        {showBackupCodes ? code : "••••••••"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(code)}
                        className="text-gray-400 hover:text-white"
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Complete Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Supported Authenticator Apps
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Google Authenticator</h4>
                <p className="text-gray-400 text-sm">
                  Free authenticator app by Google. Available on iOS and
                  Android.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Authy</h4>
                <p className="text-gray-400 text-sm">
                  Multi-device authenticator with cloud backup. Cross-platform
                  support.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div>
                <h4 className="text-white font-medium">
                  Microsoft Authenticator
                </h4>
                <p className="text-gray-400 text-sm">
                  Microsoft's authenticator app with push notifications and
                  backup.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="text-white font-medium">1Password</h4>
                <p className="text-gray-400 text-sm">
                  Password manager with built-in authenticator functionality.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Bitwarden</h4>
                <p className="text-gray-400 text-sm">
                  Open-source password manager with authenticator features.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <div>
                <h4 className="text-white font-medium">
                  LastPass Authenticator
                </h4>
                <p className="text-gray-400 text-sm">
                  Authenticator app by LastPass with cloud sync capabilities.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <Smartphone className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-medium">How to Use</h4>
                <p className="text-gray-300 text-sm mt-1">
                  Any of these authenticator apps will work with TucanBIT.
                  Simply scan the QR code or enter the secret key manually. All
                  apps generate the same 6-digit codes that change every 30
                  seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <Key className="h-5 w-5 text-green-400 mt-0.5" />
              <div>
                <h4 className="text-green-400 font-medium">Backup Codes</h4>
                <p className="text-gray-300 text-sm mt-1">
                  Save your backup codes securely! These one-time use codes can
                  access your account if you lose your authenticator device.
                  Each code can only be used once, so store them in a safe
                  place.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-purple-400 mt-0.5" />
              <div>
                <h4 className="text-purple-400 font-medium">
                  Security Features
                </h4>
                <p className="text-gray-300 text-sm mt-1">
                  TucanBIT's 2FA uses industry-standard TOTP (Time-based
                  One-Time Password) with SHA-1 algorithm. Your codes are
                  generated locally on your device and never transmitted over
                  the network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
