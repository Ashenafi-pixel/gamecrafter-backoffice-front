import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Server,
  Gamepad2,
  Activity,
  Receipt,
  Gift,
  FileText,
  ShieldAlert,
  Plug,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import gamecrafterLogo from "../../assets/game_crafter-logo.png";

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; path: string }[];
}

const ENTERPRISE_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { key: "brands", label: "Brands", path: "/admin/brand-management", icon: Building2 },
  { key: "providers", label: "Providers", path: "/reports/provider-performance", icon: Server },
  { key: "games", label: "Games", path: "/admin/game-management", icon: Gamepad2 },
  { key: "sessions", label: "Sessions", path: "/players", icon: Activity },
  {
    key: "transactions",
    label: "Transactions",
    path: "/transactions/gaming",
    icon: Receipt,
    children: [
      { label: "Gaming transactions", path: "/transactions/gaming" },
      { label: "Transaction details", path: "/transactions/details" },
      { label: "Withdrawals", path: "/transactions/withdrawals" },
      { label: "Deposits", path: "/transactions/deposits" },
    ],
  },
  { key: "bonusing", label: "Bonusing", path: "/welcome-bonus", icon: Gift },
  {
    key: "reports",
    label: "Reports",
    path: "/reports",
    icon: FileText,
    children: [
      { label: "Financial overview", path: "/reports" },
      { label: "Daily report", path: "/reports/daily" },
      { label: "Game reports", path: "/reports/game-performance" },
      { label: "Player reports", path: "/reports/player-metrics" },
      { label: "Provider reports", path: "/reports/provider-performance" },
      { label: "Brand reports", path: "/reports/brand" },
    ],
  },
  {
    key: "risk",
    label: "Risk / Fraud",
    path: "/kyc-risk",
    icon: ShieldAlert,
    children: [
      { label: "Compliance & risk", path: "/kyc-risk" },
      { label: "Notification rules", path: "/admin/alerts" },
    ],
  },
  { key: "integrations", label: "Integrations", path: "/settings", icon: Plug },
  {
    key: "settings",
    label: "Settings",
    path: "/access-control",
    icon: Settings,
    children: [
      { label: "Access control", path: "/access-control" },
      { label: "Site settings", path: "/settings" },
    ],
  },
];


function filterNavByAllowedPages(
  items: NavItem[],
  allowedPaths: Set<string>
): NavItem[] {
  return items
    .map((item) => {
      const childAllowed = item.children?.filter((c) => allowedPaths.has(c.path));
      const selfAllowed = allowedPaths.has(item.path);
      const hasAllowedChildren = (childAllowed?.length ?? 0) > 0;
      if (!selfAllowed && !hasAllowedChildren) return null;
      return {
        ...item,
        children: item.children && childAllowed?.length
          ? childAllowed
          : item.children,
      };
    })
    .filter((x): x is NavItem => x !== null);
}

interface SidebarNavProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNav({ isMobileOpen, onCloseMobile, collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["reports"]));
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);

  React.useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsDesktop(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  const allowedPaths = new Set(
    user?.allowedPages?.length
      ? user.allowedPages.flatMap((p) => [p.path, "/reports", "/transactions/gaming", "/transactions/details"])
      : ENTERPRISE_NAV.flatMap((n) => [n.path, ...(n.children?.map((c) => c.path) ?? [])])
  );
  const navItems = user?.allowedPages?.length
    ? filterNavByAllowedPages(ENTERPRISE_NAV, allowedPaths)
    : ENTERPRISE_NAV;

  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === "/reports") return current === "/reports" || current.startsWith("/reports/");
    return current === path || (path !== "/dashboard" && current.startsWith(path));
  };

  const handleNav = (path: string) => {
    navigate(path);
    onCloseMobile?.();
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isNarrow = collapsed && isDesktop;
  const showToggle = Boolean(onToggleCollapse) && isDesktop;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-sm transition-[width] duration-200 ease-out lg:rounded-r-2xl ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${isNarrow ? "lg:w-20" : "lg:w-64"}`}
    >
      <div className={`flex h-16 shrink-0 items-center overflow-hidden border-b border-slate-700/80 transition-[padding] duration-200 ${isNarrow ? "lg:justify-center lg:gap-0 lg:px-0 lg:py-2" : "gap-2 px-3 py-2"}`}>
        {!isNarrow && (
          <img
            src={gamecrafterLogo}
            alt="GameCrafter"
            className="min-w-0 max-h-12 flex-1 w-full object-contain object-left"
          />
        )}
        {showToggle && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-white"
            title={isNarrow ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isNarrow ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isNarrow ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {navItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const open = expanded.has(item.key);
          const active = isActive(item.path);

          if (isNarrow) {
            return (
              <div key={item.key} className="flex justify-center px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => (hasChildren ? handleNav(item.path) : handleNav(item.path))}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    active
                      ? "bg-red-500/10 text-red-500"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                  }`}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </div>
            );
          }

          return (
            <div key={item.key} className="px-2">
              {hasChildren ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggle(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                      active
                        ? "bg-red-500/10 text-red-500"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                  </button>
                  {open &&
                    item.children?.map((child) => {
                      const childActive = location.pathname === child.path;
                      return (
                        <button
                          key={child.path}
                          type="button"
                          onClick={() => handleNav(child.path)}
                          className={`ml-6 flex w-[calc(100%-24px)] items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs transition-colors ${
                            childActive
                              ? "text-red-500"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active
                      ? "bg-red-500/10 text-red-500"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
