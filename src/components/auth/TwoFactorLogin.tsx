import React, { useState, useEffect } from "react";
import {
  Shield,
  Smartphone,
  Mail,
  Phone,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { twoFactorService } from "../../services/twoFactorService";

interface TwoFactorLoginProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type TwoFactorMethod = "totp" | "email_otp" | "sms_otp" | "backup_codes";

interface MethodInfo {
  id: TwoFactorMethod;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  placeholder: string;
}

export const TwoFactorLogin: React.FC<TwoFactorLoginProps> = ({
  userId,
  onSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Method selection state
  const [availableMethods, setAvailableMethods] = useState<TwoFactorMethod[]>(
    [],
  );
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(
    null,
  );
  const [verificationCode, setVerificationCode] = useState("");

  // OTP generation state
  const [isGeneratingOTP, setIsGeneratingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const methodInfo: MethodInfo[] = [
    {
      id: "totp",
      name: "Authenticator App",
      description: "Enter the 6-digit code from your authenticator app",
      icon: Smartphone,
      placeholder: "123456",
    },
    {
      id: "email_otp",
      name: "Email OTP",
      description: "Enter the code sent to your email",
      icon: Mail,
      placeholder: "123456",
    },
    {
      id: "sms_otp",
      name: "SMS OTP",
      description: "Enter the code sent to your phone",
      icon: Phone,
      placeholder: "123456",
    },
    {
      id: "backup_codes",
      name: "Backup Code",
      description: "Enter one of your backup codes",
      icon: Key,
      placeholder: "ABCD1234",
    },
  ];

  // Load available methods
  useEffect(() => {
    const loadMethods = async () => {
      try {
        const methods = await twoFactorService.getAvailableMethods(userId);
        setAvailableMethods(methods as TwoFactorMethod[]);

        // Auto-select first method if only one available
        if (methods.length === 1) {
          setSelectedMethod(methods[0] as TwoFactorMethod);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load available methods");
      }
    };

    loadMethods();
  }, [userId]);

  const handleMethodSelect = async (method: TwoFactorMethod) => {
    setSelectedMethod(method);
    setError(null);
    setVerificationCode("");
    setOtpSent(false);

    // Generate OTP for email/SMS methods
    if (method === "email_otp" || method === "sms_otp") {
      await generateOTP(method);
    }
  };

  const generateOTP = async (method: TwoFactorMethod) => {
    setIsGeneratingOTP(true);
    setError(null);

    try {
      if (method === "email_otp") {
        await twoFactorService.generateEmailOTP({ email: "user@example.com" });
        setSuccess("Email OTP sent to your email address");
      } else if (method === "sms_otp") {
        await twoFactorService.generateSmsOTP({ phone_number: "+1234567890" });
        setSuccess("SMS OTP sent to your phone number");
      }
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || `Failed to send ${method} OTP`);
    } finally {
      setIsGeneratingOTP(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedMethod || !verificationCode) {
      setError("Please select a method and enter the verification code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await twoFactorService.verifyWithMethod({
        method: selectedMethod,
        token: verificationCode,
      });

      setSuccess("Verification successful!");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (
      selectedMethod &&
      (selectedMethod === "email_otp" || selectedMethod === "sms_otp")
    ) {
      await generateOTP(selectedMethod);
    }
  };

  const getCurrentMethodInfo = () => {
    return methodInfo.find((m) => m.id === selectedMethod);
  };

  const isValidCode = (code: string) => {
    if (!selectedMethod) return false;

    switch (selectedMethod) {
      case "totp":
      case "email_otp":
      case "sms_otp":
        return /^\d{6}$/.test(code);
      case "backup_codes":
        return /^[A-Z0-9]{8}$/.test(code);
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-900 flex items-center justify-center p-4">
      <div className="relative max-w-md w-full rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-[0_18px_45px_rgba(0,0,0,0.75)] px-6 py-7 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4 rounded-full bg-red-500/10 border border-red-500/40 p-2.5">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Confirm your sign‑in
          </h2>
          <p className="text-sm text-slate-400 mt-1.5">
            Choose how you’d like to enter your code
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400 font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Method Selection */}
        {!selectedMethod && (
          <div className="space-y-3 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Available Methods
            </h3>
            {availableMethods.map((method) => {
              const info = methodInfo.find((m) => m.id === method);
              if (!info) return null;

              const IconComponent = info.icon;
              return (
                <button
                  key={method}
                  onClick={() => handleMethodSelect(method)}
                  className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-600 rounded-lg">
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{info.name}</h4>
                      <p className="text-gray-400 text-sm">
                        {info.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Verification Form */}
        {selectedMethod && (
          <div className="space-y-4">
            {/* Method Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {(() => {
                  const info = getCurrentMethodInfo();
                  if (!info) return null;
                  const IconComponent = info.icon;
                  return (
                    <>
                      <div className="p-2 bg-red-600/90 rounded-lg shadow-lg shadow-red-500/30">
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{info.name}</h3>
                        <p className="text-gray-400 text-sm">
                          {info.description}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedMethod(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>

            {/* Verification Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder={getCurrentMethodInfo()?.placeholder}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none"
                maxLength={selectedMethod === "backup_codes" ? 8 : 6}
              />
            </div>

            {/* Resend OTP Button */}
            {(selectedMethod === "email_otp" ||
              selectedMethod === "sms_otp") && (
              <div className="text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={isGeneratingOTP}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                >
                  {isGeneratingOTP ? (
                    <span className="flex items-center justify-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </span>
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={!isValidCode(verificationCode) || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </span>
                ) : (
                  "Verify"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-medium text-sm">
                Security Notice
              </h4>
              <p className="text-gray-300 text-sm mt-1">
                Your account is protected with multiple 2FA methods. Choose the
                method that's most convenient for you right now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
