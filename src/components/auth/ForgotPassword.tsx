import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { Loader2, Mail, ArrowLeft, Lock, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import gamecrafterLogo from "../../assets/game_crafter-logo.png";

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Username, email, or phone number is required"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [formData, setFormData] = useState<ForgotPasswordForm>({
    identifier: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateField = (name: string, value: string) => {
    const fieldSchema = forgotPasswordSchema.shape[name as keyof typeof forgotPasswordSchema.shape];
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: result.error.errors[0]?.message || "",
        }));
      } else {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = forgotPasswordSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For now, just show the support message
      setSubmitted(true);
      toast.success("Please check the instructions below");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to process request";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (focusedField === name) {
      validateField(name, value);
    }
  };

  const handleInputFocus = (name: string) => {
    setFocusedField(name);
  };

  const handleInputBlur = (name: string, value: string) => {
    setFocusedField(null);
    validateField(name, value);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({ identifier: "" });
    setFieldErrors({});
    setFocusedField(null);
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

  const isIdentifierFocused = focusedField === "identifier";
  const hasIdentifierValue = formData.identifier.length > 0;

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
            <div className="w-72 h-72 rounded-full border border-red-500/25" />
            <div className="absolute inset-6 rounded-full border border-red-500/15" />
            <div className="absolute inset-12 rounded-full border border-red-500/10" />
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md relative z-10 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
        {/* Logo and Header with Entrance Animation */}
        <div className={`text-center mb-8 animate-slideUpFade`}>
        <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src={gamecrafterLogo}
                alt="GameCrafter Logo"
                className={`h-16 w-auto object-contain transition-all duration-500 ${mounted ? "scale-100" : "scale-90"} drop-shadow-lg`}
                style={{
                  filter: mounted ? "drop-shadow(0 0 20px rgba(147, 51, 234, 0.3))" : "none",
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-red-500 transition-transform duration-200 hover:scale-110" />
            <h1 className="text-2xl font-semibold text-white">
              Forgot password
            </h1>
          </div>
          <p className="text-sm text-slate-300">
            Enter your details to recover access
          </p>
        </div>

        {/* Forgot Password Card */}
        <div
          className={`bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] p-8 animate-slideUpFade`}
          style={{ animationDelay: "0.2s" }}
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Identifier Field with Floating Label */}
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    id="identifier"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleInputChange}
                    onFocus={() => handleInputFocus("identifier")}
                    onBlur={(e) => handleInputBlur("identifier", e.target.value)}
                    className={`w-full px-4 pt-6 pb-2 bg-slate-950/60 text-white rounded-xl border transition-all duration-300 placeholder:text-transparent ${
                      fieldErrors.identifier
                        ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : isIdentifierFocused || hasIdentifierValue
                        ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    }`}
                    placeholder="Email or username"
                    required
                  />
                  <label
                    htmlFor="identifier"
                    className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                    isIdentifierFocused || hasIdentifierValue
                      ? "top-2 text-xs text-red-400"
                        : "top-4 text-sm text-slate-400"
                    }`}
                  >
                    Email or username
                  </label>
                  {fieldErrors.identifier && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {hasIdentifierValue && !fieldErrors.identifier && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {fieldErrors.identifier && (
                  <p className="mt-1 text-xs text-red-400 animate-fadeIn">{fieldErrors.identifier}</p>
                )}
              </div>

              <button
                ref={buttonRef}
                type="submit"
                disabled={loading}
                onClick={createRipple}
                className={`relative w-full py-3.5 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-[0_18px_40px_rgba(248,113,113,0.45)] overflow-hidden group ${
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>Sending link…</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                    <span>Send reset link</span>
                  </>
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
            </form>
          ) : (
            <div className={`space-y-5 animate-slideUpFade`}>
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-red-500/40 rounded-lg p-6 relative overflow-hidden">
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 animate-gradientShift"></div>
                
                <div className="relative flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <Mail className="h-8 w-8 text-red-500 transition-all duration-300 animate-pulseGlow" />
                      <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      Contact Support
                      <CheckCircle2 className="h-5 w-5 text-green-400 animate-scaleInGlow" />
                    </h3>
                    <p className="text-sm text-slate-300 mb-4">
                      To reset your password, please contact our support team through the email below:
                    </p>
                    <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 group">
                      <a
                        href="mailto:support@gamecrafter.io"
                        className="text-red-400 hover:text-red-300 font-medium text-sm break-all transition-all duration-200 flex items-center gap-2 group-hover:gap-3"
                      >
                        <Mail className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                        support@gamecrafter.io
                      </a>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      Our support team will assist you with resetting your password.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 px-4 bg-slate-700/50 text-white rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 font-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-all duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Security Footer (intentionally minimal for a clean look) */}
      </div>
    </div>
  );
};
