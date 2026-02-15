import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Optional header: title + optional action (e.g. Export button) */
  title?: string;
  action?: React.ReactNode;
}

export function Card({ children, className = "", title, action }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg-raised)] ${className}`}
      style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.03)" }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {title}
            </h3>
          )}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={title || action ? "p-4" : "p-4"}>{children}</div>
    </div>
  );
}
