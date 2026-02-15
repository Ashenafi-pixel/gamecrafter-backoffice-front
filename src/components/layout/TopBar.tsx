import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  Calendar,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const MOCK_BRANDS = [
  { id: "all", name: "All brands" },
  { id: "brand-1", name: "Brand Alpha" },
  { id: "brand-2", name: "Brand Beta" },
];

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "MTD", value: "mtd" },
];

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [brandOpen, setBrandOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(MOCK_BRANDS[0]);
  const [selectedDate, setSelectedDate] = useState(DATE_PRESETS[1]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount] = useState(3);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-700/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Brand selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setBrandOpen(!brandOpen); setDateOpen(false); setProfileOpen(false); }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white hover:border-slate-600 transition-colors"
          >
            <Building2 className="h-4 w-4 text-slate-400" />
            <span>{selectedBrand.name}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {brandOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setBrandOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 py-1 shadow-xl backdrop-blur-sm">
                {MOCK_BRANDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setSelectedBrand(b); setBrandOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${selectedBrand.id === b.id ? "bg-red-500/10 text-red-500" : "text-slate-300 hover:bg-slate-800/80 hover:text-white"}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Date range */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setDateOpen(!dateOpen); setBrandOpen(false); setProfileOpen(false); }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white hover:border-slate-600 transition-colors"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{selectedDate.label}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {dateOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setDateOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 py-1 shadow-xl backdrop-blur-sm">
                {DATE_PRESETS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => { setSelectedDate(d); setDateOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${selectedDate.value === d.value ? "bg-red-500/10 text-red-500" : "text-slate-300 hover:bg-slate-800/80 hover:text-white"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 pl-3 pr-2 py-1.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 border-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white ring-2 ring-slate-900">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => { setProfileOpen(!profileOpen); setBrandOpen(false); setDateOpen(false); }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 pl-2 pr-3 py-1.5 text-sm text-white hover:border-slate-600 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <span className="max-w-[120px] truncate">{user?.email ?? "Admin"}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 to-slate-950/95 py-1 shadow-xl backdrop-blur-sm">
                <div className="border-b border-slate-700/80 px-3 py-2">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email ?? "Admin"}
                  </p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/80 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
