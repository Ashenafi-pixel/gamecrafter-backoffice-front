import React from "react";

interface SkeletonProps {
  className?: string;
  /** Optional: "line" | "circle" | "rect" */
  variant?: "line" | "circle" | "rect";
}

export function Skeleton({ className = "", variant = "line" }: SkeletonProps) {
  const base = "animate-shimmer bg-gradient-to-r from-surface-overlay via-surface-raised to-surface-overlay bg-[length:200%_100%]";
  const variantClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "rect"
        ? "rounded-[var(--radius-card)]"
        : "rounded";

  return <div className={`${base} ${variantClass} ${className}`} />;
}

/** Skeleton for a KPI card */
export function SkeletonKPI() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg-raised)] p-4">
      <Skeleton className="mb-2 h-3 w-20" variant="line" />
      <Skeleton className="h-8 w-24" variant="line" />
    </div>
  );
}

/** Skeleton for a table row */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" variant="line" />
        </td>
      ))}
    </tr>
  );
}
