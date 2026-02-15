import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useServices } from "../contexts/ServicesContext";
import { Role } from "../types/rbac";

interface UseRBACReturn {
  userRoles: Role[];
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  isSuperUser: boolean;
  loading: boolean;
  error: string | null;
}

export const useRBAC = (): UseRBACReturn => {
  const { user } = useAuth();
  const { rbacSvc } = useServices();
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserRoles = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await rbacSvc.getUserRoles(user.id);
        setUserRoles(response.roles);
      } catch (err) {
        console.error("Failed to load user roles:", err);
        setError("Failed to load user roles");
      } finally {
        setLoading(false);
      }
    };

    loadUserRoles();
  }, [user?.id, rbacSvc]);

  const hasRole = (roleName: string): boolean => {
    return userRoles.some((role) => role.name === roleName);
  };

  const hasPermission = (permissionName: string): boolean => {
    return userRoles.some((role) =>
      role.permissions?.some(
        (permission) => permission.name === permissionName,
      ),
    );
  };

  const isSuperUser = hasRole("super") || hasRole("admin");

  return {
    userRoles,
    hasRole,
    hasPermission,
    isSuperUser,
    loading,
    error,
  };
};

// Higher-order component for role-based access control
interface WithRBACProps {
  requiredRole?: string;
  requiredPermission?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const WithRBAC: React.FC<WithRBACProps> = ({
  requiredRole,
  requiredPermission,
  fallback = null,
  children,
}) => {
  const { hasRole, hasPermission, isSuperUser, loading } = useRBAC();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Super users have access to everything
  if (isSuperUser) {
    return <>{children}</>;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for checking specific permissions
export const usePermission = (permissionName: string) => {
  const { hasPermission, isSuperUser, loading } = useRBAC();

  return {
    hasPermission: isSuperUser || hasPermission(permissionName),
    loading,
  };
};

// Hook for checking specific roles
export const useRole = (roleName: string) => {
  const { hasRole, isSuperUser, loading } = useRBAC();

  return {
    hasRole: isSuperUser || hasRole(roleName),
    loading,
  };
};
