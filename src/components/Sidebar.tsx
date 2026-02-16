import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  Gamepad2,
  CreditCard,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  Shield,
  Bell,
  Globe,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  User,
  LogOut,
  X,
  CheckCircle,
  Activity,
  Key,
  DollarSign,
  Building2,
  Trophy,
  Layers,
} from "lucide-react";
import gamecrafterLogo from "../assets/game_crafter-logo.png";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  onCloseMobileMenu,
}) => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [expandedMenus, setExpandedMenus] = useState<string[]>(["reports"]);

  // Filter menu items based on user's allowed pages
  const filterMenuItemsByAllowedPages = (
    items: typeof menuItems,
  ): typeof menuItems => {
    if (!user?.allowedPages || user.allowedPages.length === 0) {
      // If no allowed pages, return all items (fallback for non-admin users)
      return items;
    }

    const allowedPaths = new Set(user.allowedPages.map((page) => page.path));

    // If player metrics report is allowed, also allow affiliate report
    if (allowedPaths.has("/reports/player-metrics")) {
      allowedPaths.add("/reports/affiliate");
    }

    return items
      .map((menu) => {
        // Check if the menu item itself is allowed
        const menuAllowed = allowedPaths.has(menu.path);

        // Filter child items
        const filteredItems = menu.items.filter((item) =>
          allowedPaths.has(item.path),
        );

        // Include menu if:
        // 1. The menu path is allowed, OR
        // 2. At least one child item is allowed
        if (menuAllowed || filteredItems.length > 0) {
          return {
            ...menu,
            items: filteredItems,
          };
        }

        return null;
      })
      .filter((menu): menu is (typeof menuItems)[0] => menu !== null);
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId],
    );
  };

  const toggleMobileMenu = () => {
    onToggleMobileMenu?.();
  };

  const closeMobileMenu = () => {
    onCloseMobileMenu?.();
  };

  const handleLogout = async () => {
    await logout();
    setShowProfileModal(false);
  };

  const isActiveRoute = (path: string) => {
    const pathWithoutQuery = path.split("?")[0];
    if (location.pathname !== pathWithoutQuery) {
      return false;
    }
    // If path has query params, check if they match
    if (path.includes("?")) {
      const queryString = path.split("?")[1];
      const searchParams = new URLSearchParams(queryString);
      const locationSearchParams = new URLSearchParams(location.search);
      for (const [key, value] of searchParams.entries()) {
        if (locationSearchParams.get(key) !== value) {
          return false;
        }
      }
    }
    return true;
  };

  const isInRouteGroup = (basePath: string) => {
    const basePathWithoutQuery = basePath.split("?")[0];
    return location.pathname.startsWith(basePathWithoutQuery);
  };

  // Auto-expand menus that contain active routes
  useEffect(() => {
    const menusToCheck = [
      {
        id: "reports",
        path: "/reports",
        items: [
          { path: "/reports" },
          // { path: "/reports/game" },
          // { path: "/reports/transaction" },
          { path: "/reports/daily" },
          { path: "/reports/big-winners" },
          { path: "/reports/player-metrics" },
          { path: "/reports/country" },
          { path: "/reports/game-performance" },
          { path: "/reports/provider-performance" },
          { path: "/reports/affiliate" },
          { path: "/reports/brand" },
        ],
      },
      {
        id: "transactions",
        path: "/transactions",
        items: [
          { path: "/transactions/gaming" },
          { path: "/transactions/details" },
        ],
      },
      {
        id: "site-settings",
        path: "/settings",
        items: [
          { path: "/settings?tab=general" },
          { path: "/settings?tab=payments" },
          { path: "/settings?tab=tips" },
          { path: "/settings?tab=configurations" },
          { path: "/settings?tab=database" },
        ],
      },
      {
        id: "settings",
        path: "/access-control",
        items: [
          { path: "/access-control?tab=rbac-roles" },
          { path: "/access-control?tab=rbac-permissions" },
          { path: "/access-control?tab=admin-users" },
          { path: "/access-control?tab=rbac-assignments" },
        ],
      },
    ];

    const expanded: string[] = ["reports"]; // Always keep reports menu expanded
    menusToCheck.forEach((menu) => {
      if (menu.items.length > 0) {
        const hasActiveItem = menu.items.some((item) =>
          isActiveRoute(item.path),
        );
        if (hasActiveItem || isInRouteGroup(menu.path)) {
          expanded.push(menu.id);
        }
      }
    });
    setExpandedMenus((prev) => {
      const newExpanded = [...new Set([...prev, ...expanded])];
      return newExpanded;
    });
  }, [location.pathname, location.search]);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard",
      items: [],
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      path: "/reports",
      items: [
        {
          id: "affiliate-report",
          label: "Affiliate overview",
          icon: Users,
          path: "/reports/affiliate",
        },
        {
          id: "analytics-dashboard",
          label: "Financial overview",
          icon: Activity,
          path: "/reports",
        },
        {
          id: "big-winners-report",
          label: "Top winners",
          icon: Trophy,
          path: "/reports/big-winners",
        },
        {
          id: "country-report",
          label: "By region",
          icon: Globe,
          path: "/reports/country",
        },
        {
          id: "daily-report",
          label: "Daily report",
          icon: BarChart3,
          path: "/reports/daily",
        },
        {
          id: "game-performance-report",
          label: "Game reports",
          icon: Gamepad2,
          path: "/reports/game-performance",
        },
        {
          id: "player-metrics-report",
          label: "Player reports",
          icon: Users,
          path: "/reports/player-metrics",
        },
        {
          id: "provider-performance-report",
          label: "Provider reports",
          icon: Building2,
          path: "/reports/provider-performance",
        },
        {
          id: "brand-report",
          label: "Brand reports",
          icon: Layers,
          path: "/reports/brand",
        },
      ],
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: CreditCard,
      path: "/transactions/gaming",
      items: [
        {
          id: "gaming-transactions",
          label: "Gaming transactions",
          icon: Gamepad2,
          path: "/transactions/gaming",
        },
        {
          id: "transaction-details",
          label: "Transaction details",
          icon: CreditCard,
          path: "/transactions/details",
        },
      ],
    },
    {
      id: "players",
      label: "Player Management",
      icon: Users,
      path: "/players",
      items: [],
    },
    {
      id: "welcome-bonus",
      label: "Bonus",
      icon: Gift,
      path: "/welcome-bonus",
      items: [],
    },
    {
      id: "notifications",
      label: "Player Notifications",
      icon: Bell,
      path: "/notifications",
      items: [],
    },
    {
      id: "kyc-management",
      label: "KYC Management",
      icon: Shield,
      path: "/kyc-management",
      items: [],
    },
    {
      id: "rakeback",
      label: "Rakeback",
      icon: TrendingUp,
      path: "/cashback",
      items: [
        {
          label: "Happy Hour",
          path: "/admin/rakeback-override",
        },
        {
          label: "VIP Levels",
          path: "/cashback",
        },
      ],
    },
    {
      id: "game-management",
      label: "Game Management",
      icon: Gamepad2,
      path: "/admin/game-management",
      items: [],
    },
    {
      id: "brand-management",
      label: "Brand Management",
      icon: Building2,
      path: "/admin/brand-management",
      items: [],
    },
    {
      id: "falcon-liquidity",
      label: "Falcon Liquidity",
      icon: Globe,
      path: "/admin/falcon-liquidity",
      items: [],
    },
    {
      id: "site-settings",
      label: "Site Settings",
      icon: Globe,
      path: "/settings",
      items: [],
    },
    {
      id: "settings",
      label: "Back Office Settings",
      icon: Settings,
      path: "/access-control",
      items: [],
    },
    {
      id: "admin-activity-logs",
      label: "Admin Activity Logs",
      icon: Activity,
      path: "/admin/activity-logs",
      items: [],
    },
    {
      id: "admin-alerts",
      label: "Notification rules",
      icon: Bell,
      path: "/admin/alerts",
      items: [],
    },
  ];

  const Tooltip = ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: string;
  }) => {
    return (
      <div className="relative group">
        {children}
        {isCollapsed && (
          <div className="absolute left-12 top-1/2 transform -translate-y-1/2 z-50">
            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              {content}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Profile Modal Component
  const ProfileModal: React.FC = () => {
    if (!showProfileModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-md">
          {/* Header */}
          <div className="bg-gray-800 rounded-t-2xl p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Profile</h2>
                  <p className="text-gray-300 text-sm">Account Information</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-600 rounded-full p-2 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* User Avatar and Basic Info */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {user?.firstName?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </h3>
                <p className="text-gray-400 text-sm">{user?.email}</p>
                <div className="flex items-center mt-2">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      user?.isEmailVerified ? "bg-green-400" : "bg-yellow-400"
                    }`}
                  ></div>
                  <span
                    className={`text-xs ${
                      user?.isEmailVerified
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {user?.isEmailVerified
                      ? "Verified Account"
                      : "Pending Verification"}
                  </span>
                </div>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Username</p>
                    <p className="text-white font-medium">
                      {user?.username || user?.email || "Not Available"}
                    </p>
                  </div>
                  <div className="text-red-400">
                    <User className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Role</p>
                    <p className="text-white font-medium">
                      {user?.isAdmin ? "Administrator" : "User"}
                    </p>
                  </div>
                  <div className="text-blue-400">
                    <Shield className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Account Status</p>
                    <p
                      className={`font-medium ${
                        user?.isEmailVerified
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {user?.isEmailVerified ? "Active" : "Pending"}
                    </p>
                  </div>
                  <div
                    className={
                      user?.isEmailVerified
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg transform hover:scale-[1.02]"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-gray-900 border-r border-gray-800 h-screen flex flex-col transition-all duration-300 ${
          isMobileMenuOpen
            ? "fixed inset-y-0 left-0 z-50 w-64"
            : isCollapsed
              ? "w-16"
              : "w-64"
        } ${
          isMobileMenuOpen ? "" : "fixed inset-y-0 left-0 z-30 hidden lg:flex"
        }`}
      >
        {/* Header */}
        <div
          className={`border-b border-gray-800 flex items-center ${
            isCollapsed && !isMobileMenuOpen
              ? "p-2 justify-center"
              : "p-4 justify-between"
          }`}
        >
          {(!isCollapsed || isMobileMenuOpen) && (
            <div className="flex items-center">
              <img
                src={gamecrafterLogo}
                alt="GameCrafter Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          {isCollapsed && !isMobileMenuOpen && (
            <img
              src={gamecrafterLogo}
              alt="GameCrafter Logo"
              className="h-8 w-auto object-contain"
            />
          )}
          {!isMobileMenuOpen && (
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden sidebar-nav ${
            isCollapsed && !isMobileMenuOpen ? "p-2" : "p-4"
          }`}
        >
          {filterMenuItemsByAllowedPages(menuItems).map((menu) => (
            <div key={menu.id} className="mb-2">
              <Tooltip content={menu.label}>
                <button
                  onClick={() => {
                    if (
                      menu.items.length > 0 &&
                      (!isCollapsed || isMobileMenuOpen)
                    ) {
                      toggleMenu(menu.id);
                    } else {
                      navigate(menu.path);
                      closeMobileMenu();
                    }
                  }}
                  className={`w-full flex items-center rounded-lg transition-colors ${
                    isActiveRoute(menu.path) || isInRouteGroup(menu.path)
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  } ${
                    isCollapsed && !isMobileMenuOpen
                      ? "justify-center p-3"
                      : "justify-between px-3 py-2"
                  }`}
                  style={{ minWidth: 0, maxWidth: "100%" }}
                >
                  <div
                    className={`flex items-center ${
                      isCollapsed && !isMobileMenuOpen
                        ? "justify-center"
                        : "space-x-3"
                    } min-w-0 flex-1`}
                  >
                    <menu.icon className="h-5 w-5 flex-shrink-0" />
                    {(!isCollapsed || isMobileMenuOpen) && (
                      <span className="font-medium truncate min-w-0">
                        {menu.label}
                      </span>
                    )}
                  </div>
                  {(!isCollapsed || isMobileMenuOpen) &&
                    menu.items.length > 0 && (
                      <div className="flex-shrink-0 ml-2">
                        {expandedMenus.includes(menu.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                </button>
              </Tooltip>

              {(!isCollapsed || isMobileMenuOpen) &&
                menu.items.length > 0 &&
                expandedMenus.includes(menu.id) && (
                  <div className="ml-4 mt-2 space-y-1">
                    {menu.items.map((item, index) => (
                      <Tooltip
                        key={item.path || `item-${index}`}
                        content={item.label || ""}
                      >
                        <button
                          onClick={() => {
                            navigate(item.path);
                            closeMobileMenu();
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isActiveRoute(item.path)
                              ? "bg-red-500/10 text-red-200"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                          style={{ minWidth: 0 }}
                        >
                          {"icon" in item && item.icon && (
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="text-sm truncate">
                            {item.label || ""}
                          </span>
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </nav>

        {/* Profile Button */}
        <div
          className={`border-t border-gray-800 ${isCollapsed ? "p-2" : "p-4"}`}
        >
          <Tooltip content="Profile">
            <button
              onClick={() => setShowProfileModal(true)}
              className={`w-full flex items-center rounded-lg transition-colors text-gray-300 hover:bg-gray-800 hover:text-white ${
                isCollapsed ? "justify-center p-3" : "space-x-3 px-3 py-2"
              }`}
            >
              <User className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Profile</span>}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal />
    </>
  );
};
