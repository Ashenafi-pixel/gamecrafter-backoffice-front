import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Check } from "lucide-react";

const REDIRECT_MS = 2200;

export function AuthSuccessOverlay() {
  const { authSuccessOverlay } = useAuth();
  const [progress, setProgress] = useState(0);

  const visible = authSuccessOverlay === "login" || authSuccessOverlay === "2fa";

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      return;
    }
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / REDIRECT_MS) * 100, 100);
      setProgress(p);
      if (p < 100) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [visible]);

  if (!visible) return null;

  const title =
    authSuccessOverlay === "login"
      ? "You're in"
      : "Verification complete";
  const subtitle = "Taking you to the dashboard…";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-live="polite"
      aria-label="Sign-in success"
    >
      {/* Backdrop with gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-slate-950/95 backdrop-blur-md"
        style={{ animation: "authOverlayFadeIn 0.35s ease-out forwards" }}
      />

      {/* Soft glow behind card */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div className="h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      {/* Content card */}
      <div
        className="relative flex flex-col items-center rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900/98 to-slate-950/98 px-10 py-12 shadow-2xl"
        style={{
          animation: "authOverlayScaleIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Animated ring + checkmark */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
          <svg
            className="absolute h-20 w-20 -rotate-90 text-red-500/30"
            viewBox="0 0 80 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle
              cx="40"
              cy="40"
              r="36"
              strokeDasharray={226}
              strokeDashoffset={226 - (226 * progress) / 100}
              style={{ transition: "stroke-dashoffset 0.08s linear" }}
            />
          </svg>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 ring-4 ring-red-500/20"
            style={{ animation: "authCheckPop 0.4s 0.15s ease-out both" }}
          >
            <Check className="h-7 w-7 text-red-500" strokeWidth={2.5} />
          </div>
        </div>

        <h2 className="mb-1 text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mb-8 text-sm text-slate-400">{subtitle}</p>

        {/* Progress bar */}
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes authOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes authOverlayScaleIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes authCheckPop {
          from {
            opacity: 0;
            transform: scale(0.4);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
