# RBAC Management System

A comprehensive Role-Based Access Control (RBAC) management system for the TucanBit Casino Admin Panel.

## Features

### 🛡️ Role Management

- Create, edit, and delete roles
- Assign permissions to roles
- View role details and permissions
- Search and filter roles

### 🔑 Permission Management

- View all available permissions
- Permission descriptions and details
- Permission-to-role mapping

### 👥 User Assignment Management

- Assign roles to users
- Revoke roles from users
- View user role assignments
- Track role changes

### 🔒 Access Control

- Frontend component protection
- Permission-based UI rendering
- Role-based feature access
- Super user privileges

## Components

### Core Components

#### `RBACManagement`

Main RBAC management interface with tabs for:

- **Roles & Permissions**: Manage roles and their permissions
- **All Permissions**: View all available permissions
- **User Assignments**: Assign roles to users
- **Usage Examples**: Learn how to use RBAC in components

#### `RBACExample`

Demonstrates different RBAC usage patterns and provides code examples.

### Hooks

#### `useRBAC()`

Main hook for RBAC functionality:

```typescript
const { userRoles, hasRole, hasPermission, isSuperUser, loading, error } =
  useRBAC();
```

#### `usePermission(permissionName)`

Hook for checking specific permissions:

```typescript
const { hasPermission, loading } = usePermission("get players");
```

#### `useRole(roleName)`

Hook for checking specific roles:

```typescript
const { hasRole, loading } = useRole("admin");
```

### Higher-Order Components

#### `WithRBAC`

Protects components based on roles or permissions:

```typescript
<WithRBAC requiredPermission="get players">
  <PlayerManagementComponent />
</WithRBAC>

<WithRBAC requiredRole="admin" fallback={<AccessDenied />}>
  <AdminPanel />
</WithRBAC>
```

## Usage Examples

### 1. Basic Permission Check

```typescript
import { useRBAC } from '../hooks/useRBAC';

const PlayerManagement = () => {
  const { hasPermission } = useRBAC();

  return (
    <div>
      {hasPermission('get players') && (
        <button>Manage Players</button>
      )}
    </div>
  );
};
```

### 2. Role-Based Access

```typescript
import { useRole } from '../hooks/useRBAC';

const AdminPanel = () => {
  const { hasRole } = useRole('admin');

  if (!hasRole) {
    return <div>Access Denied</div>;
  }

  return <div>Admin Panel Content</div>;
};
```

### 3. Component Protection

```typescript
import { WithRBAC } from '../hooks/useRBAC';

const App = () => {
  return (
    <div>
      <WithRBAC requiredPermission="manual funding">
        <FundingManagement />
      </WithRBAC>

      <WithRBAC requiredRole="admin" fallback={<div>Admin access required</div>}>
        <AdminSettings />
      </WithRBAC>
    </div>
  );
};
```

### 4. Conditional Rendering

```typescript
import { useRBAC } from '../hooks/useRBAC';

const Dashboard = () => {
  const { hasPermission, isSuperUser } = useRBAC();

  return (
    <div>
      <h1>Dashboard</h1>

      {isSuperUser && (
        <div className="super-user-banner">
          Super User Access
        </div>
      )}

      {hasPermission('get financial metrics') && (
        <FinancialMetrics />
      )}

      {hasPermission('get players') && (
        <PlayerStats />
      )}
    </div>
  );
};
```

## API Integration

The RBAC system integrates with the backend API endpoints:

### Permissions

- `GET /api/admin/permissions` - Get all permissions
- `GET /api/admin/permissions?page=1&per-page=100` - Paginated permissions

### Roles

- `GET /api/admin/roles` - Get all roles
- `POST /api/admin/roles` - Create new role
- `PATCH /api/admin/roles` - Update role permissions
- `DELETE /api/admin/roles` - Delete role

### User Role Management

- `POST /api/admin/users/roles` - Assign role to user
- `DELETE /api/admin/users/roles` - Revoke role from user
- `GET /api/admin/users/:id/roles` - Get user roles
- `GET /api/admin/roles/:id/users` - Get role users

## Available Permissions

The system includes comprehensive permissions for:

### User Management

- `get players` - View player information
- `block user account` - Block/unblock user accounts
- `reset user account password` - Reset user passwords
- `update user profile` - Update user profiles

### Financial Operations

- `manual funding` - Manual fund management
- `get fund logs` - View funding logs
- `get balance logs` - View balance logs
- `get financial metrics` - View financial metrics

### Game Management

- `get games` - View games
- `update games` - Update game settings
- `disable games` - Disable games
- `get game metrics` - View game metrics

### System Administration

- `get permissions` - View permissions
- `create role` - Create roles
- `assign role` - Assign roles to users
- `update role permissions` - Update role permissions
- `super` - Super user access (all permissions)

## Security Features

### Frontend Protection

- Component-level access control
- Route protection
- UI element visibility control
- Permission-based feature toggling

### Backend Integration

- JWT token validation
- Permission verification
- Role-based API access
- Audit logging

### Super User Access

- Users with `super` role have access to all features
- Bypasses all permission checks
- Full system access

## Best Practices

### 1. Use Specific Permissions

```typescript
// Good: Specific permission
const { hasPermission } = usePermission("get players");

// Avoid: Generic role check
const { hasRole } = useRole("admin");
```

### 2. Provide Fallbacks

```typescript
<WithRBAC
  requiredPermission="manual funding"
  fallback={<div>Contact admin for funding access</div>}
>
  <FundingComponent />
</WithRBAC>
```

### 3. Handle Loading States

```typescript
const { hasPermission, loading } = usePermission('get players');

if (loading) {
  return <div>Loading permissions...</div>;
}

if (!hasPermission) {
  return <div>Access denied</div>;
}
```

### 4. Use Super User Checks Sparingly

```typescript
// Good: Check specific permission first
const { hasPermission, isSuperUser } = useRBAC();

if (hasPermission("get players") || isSuperUser) {
  // Show content
}

// Avoid: Only checking super user
if (isSuperUser) {
  // Show content
}
```

## Navigation

The RBAC management interface is accessible via:

- **Sidebar**: RBAC Management
- **Route**: `/rbac`
- **Icon**: Shield

## Error Handling

The system includes comprehensive error handling:

- API error messages
- Permission loading failures
- Role assignment errors
- Network connectivity issues

## Future Enhancements

- [ ] Bulk role assignments
- [ ] Role templates
- [ ] Permission groups
- [ ] Audit trail for role changes
- [ ] Role expiration
- [ ] Multi-tenant role management
- [ ] Permission inheritance
- [ ] Dynamic permission loading
