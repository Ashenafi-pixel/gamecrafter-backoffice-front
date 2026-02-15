import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { z } from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { TwoFactorVerification } from "./TwoFactorVerification";
import gamecrafterLogo from "../../assets/game_crafter-logo.png";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username, email, or phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginForm>({
    identifier: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { login, requires2FA } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateField = (name: string, value: string) => {
    const fieldSchema = loginSchema.shape[name as keyof typeof loginSchema.shape];
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      if (!result.success) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: result.error.issues[0]?.message || "",
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

    const validationResult = loginSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      toast.error("Please fix the errors in the form.", {
        style: { background: "rgb(15 23 42 / 0.98)", border: "1px solid rgb(239 68 68 / 0.6)", borderRadius: "12px", color: "#f1f5f9" },
        iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" },
      });
      return;
    }

    setLoading(true);
    try {
      await login(formData.identifier, formData.password, rememberMe);
      if (!requires2FA) {
        toast.success("Signed in successfully. Taking you to the dashboard…", {
          duration: 3500,
          style: { background: "rgb(15 23 42 / 0.98)", border: "1px solid rgb(51 65 85 / 0.8)", borderRadius: "12px", color: "#f1f5f9" },
          iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" },
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || "Invalid credentials";
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

  // Show 2FA verification if required
  if (requires2FA) {
    return <TwoFactorVerification onBack={() => window.location.reload()} />;
  }

  const isIdentifierFocused = focusedField === "identifier";
  const isPasswordFocused = focusedField === "password";
  const hasIdentifierValue = formData.identifier.length > 0;
  const hasPasswordValue = formData.password.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* GameCrafter Themed Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Deep dark base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-900" />

        {/* Logo glow / hero spotlight */}
        <div className="absolute -top-32 left-1/2 w-[36rem] h-[36rem] -translate-x-1/2 rounded-full bg-radial from-red-600/45 via-red-600/10 to-transparent blur-3xl" />

        {/* Ambient red energy orbs */}
        <div className="absolute -bottom-40 -left-10 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-red-700/40 via-red-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-10 right-0 w-72 h-72 rounded-full bg-gradient-to-bl from-red-500/30 via-red-500/5 to-transparent blur-3xl" />

        {/* Subtle concentric rings behind the card */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.16]">
          <div className="relative">
            <div className="w-80 h-80 rounded-full border border-red-500/30" />
            <div className="absolute inset-8 rounded-full border border-red-500/20" />
            <div className="absolute inset-16 rounded-full border border-red-500/10" />
          </div>
        </div>

        {/* Soft vertical beam */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-red-500/25 to-transparent" />
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
            <h1 className="text-2xl font-semibold text-white">
              Sign in to GameCrafter
            </h1>
          </div>
        
        </div>

        {/* Login Card */}
        <div
          className={`bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-slate-800/80 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] p-8 animate-slideUpFade`}
          style={{ animationDelay: "0.2s" }}
        >
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
              </div>
              {fieldErrors.identifier && (
                <p className="mt-1 text-xs text-red-400 animate-fadeIn">{fieldErrors.identifier}</p>
              )}
            </div>

            {/* Password Field with Floating Label */}
            <div className="relative">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => handleInputFocus("password")}
                  onBlur={(e) => handleInputBlur("password", e.target.value)}
                  className={`w-full px-4 pt-6 pb-2 bg-slate-950/60 text-white rounded-xl border transition-all duration-300 placeholder:text-transparent pr-12 ${
                    fieldErrors.password
                      ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : isPasswordFocused || hasPasswordValue
                      ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  }`}
                  placeholder="Password"
                  required
                />
                <label
                  htmlFor="password"
                  className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                    isPasswordFocused || hasPasswordValue
                      ? "top-2 text-xs text-red-400"
                      : "top-4 text-sm text-slate-400"
                  }`}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-red-400 transition-all duration-200 hover:scale-110"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {fieldErrors.password && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400 animate-fadeIn">{fieldErrors.password}</p>
              )}
            </div>

            <div className="flex items-center">
              <div className="relative">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                  aria-label="Remember me"
                />
                <label
                  htmlFor="rememberMe"
                  className={`flex items-center cursor-pointer transition-all duration-200 ${
                    rememberMe ? "text-red-400" : "text-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 mr-2 ${
                      rememberMe
                        ? "bg-red-600 border-red-600 shadow-lg shadow-red-500/40"
                        : "bg-slate-900/50 border-slate-600 group-hover:border-red-500"
                    }`}
                  >
                    {rememberMe && (
                      <CheckCircle2 className="h-4 w-4 text-white animate-scaleInGlow" />
                    )}
                  </div>
                  <span className="text-sm select-none">Remember me</span>
                </label>
              </div>
            </div>

            <button
              ref={buttonRef}
              type="submit"
              disabled={loading}
              onClick={createRipple}
              className={`relative w-full py-3.5 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-[0_18px_40px_rgba(248,113,113,0.45)] overflow-hidden ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign in</span>
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

            <div className="text-center pt-1">
              <Link
                to="/forgot-password"
                className="text-sm text-slate-400 hover:text-red-400 transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Security Footer with Animated Badge (removed per branding update) */}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center animate-slideUpFade" style={{ animationDelay: "0.4s" }}>
          <p className="text-xs text-slate-500">
            All connections are secured and monitored
          </p>
        </div>
      </div>
    </div>
  );
};
