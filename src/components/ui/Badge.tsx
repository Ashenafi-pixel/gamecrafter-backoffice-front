import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border)]",
  success:
    "bg-[var(--success)]/12 text-[var(--success)] border border-[var(--success)]/25",
  warning:
    "bg-[var(--warning)]/12 text-[var(--warning)] border border-[var(--warning)]/25",
  danger:
    "bg-[var(--danger)]/12 text-[var(--danger)] border border-[var(--danger)]/25",
  info:
    "bg-[var(--accent)]/12 text-[var(--accent)] border border-[var(--accent)]/25",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
