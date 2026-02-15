import React from "react";
import { Shield, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
import { WithRBAC, useRBAC, usePermission, useRole } from "../../hooks/useRBAC";

// Example component showing different RBAC usage patterns
export const RBACExample: React.FC = () => {
  const { userRoles, hasRole, hasPermission, isSuperUser } = useRBAC();
  const { hasPermission: canManagePlayers } = usePermission("get players");
  const { hasRole: isAdmin } = useRole("admin");

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          RBAC System Status
        </h2>

        {/* Current User Roles */}
        <div className="mb-4">
          <h3 className="text-white font-medium mb-2">Your Roles:</h3>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role) => (
              <span
                key={role.id}
                className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm"
              >
                {role.name}
              </span>
            ))}
            {userRoles.length === 0 && (
              <span className="text-gray-400">No roles assigned</span>
            )}
          </div>
        </div>

        {/* Permission Checks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Permission Checks</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {canManagePlayers ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-white text-sm">Can manage players</span>
              </div>
              <div className="flex items-center space-x-2">
                {hasPermission("manual funding") ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-white text-sm">Can manage funding</span>
              </div>
              <div className="flex items-center space-x-2">
                {hasPermission("get financial metrics") ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-white text-sm">
                  Can view financial metrics
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Role Checks</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {isSuperUser ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-white text-sm">Super User</span>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-white text-sm">Admin Role</span>
              </div>
              <div className="flex items-center space-x-2">
                {hasRole("manager") ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-white text-sm">Manager Role</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Content Examples */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">
          Conditional Content Examples
        </h3>

        {/* Using WithRBAC HOC */}
        <div className="space-y-4">
          <WithRBAC requiredPermission="get players">
            <div className="bg-green-900 border border-green-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-400 font-medium">
                  This content is only visible to users with "get players"
                  permission
                </span>
              </div>
            </div>
          </WithRBAC>

          <WithRBAC requiredRole="admin">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="text-blue-400 font-medium">
                  This content is only visible to admin users
                </span>
              </div>
            </div>
          </WithRBAC>

          <WithRBAC
            requiredPermission="manual funding"
            fallback={
              <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">
                    You don't have permission to manage funding
                  </span>
                </div>
              </div>
            }
          >
            <div className="bg-purple-900 border border-purple-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                <span className="text-purple-400 font-medium">
                  Funding management interface would be here
                </span>
              </div>
            </div>
          </WithRBAC>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">
          How to Use RBAC in Components
        </h3>
        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">
              1. Using the useRBAC hook:
            </h4>
            <pre className="bg-gray-900 p-3 rounded text-green-400 text-xs overflow-x-auto">
              {`const { hasRole, hasPermission, isSuperUser } = useRBAC();

if (hasPermission('get players')) {
  // Show player management features
}`}
            </pre>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">
              2. Using the WithRBAC HOC:
            </h4>
            <pre className="bg-gray-900 p-3 rounded text-green-400 text-xs overflow-x-auto">
              {`<WithRBAC requiredPermission="manual funding">
  <FundingManagementComponent />
</WithRBAC>`}
            </pre>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">
              3. Using specific permission hooks:
            </h4>
            <pre className="bg-gray-900 p-3 rounded text-green-400 text-xs overflow-x-auto">
              {`const { hasPermission } = usePermission('get players');
const { hasRole } = useRole('admin');`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
