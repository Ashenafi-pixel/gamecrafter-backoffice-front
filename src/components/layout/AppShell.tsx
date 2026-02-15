import React, { useState } from "react";
import { Menu } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SidebarNav
        isMobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((s) => !s)}
      />
      <div className={`transition-[padding] duration-200 ease-out ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <TopBar />
        <div className="lg:hidden border-b border-[var(--border)] px-4 py-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </div>
        <main className="min-h-[calc(100vh-3.5rem)] p-6">
          {children}
        </main>
      </div>
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
        />
      )}
    </div>
  );
}
