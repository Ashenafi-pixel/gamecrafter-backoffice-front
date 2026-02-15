import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg-raised)] py-12 px-6 text-center ${className}`}
    >
      <div className="mb-3 text-[var(--text-muted)]">
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>
      <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[var(--text-secondary)]">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
