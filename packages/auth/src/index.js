// Export auth components
export { AuthProvider, useAuth } from './components/AuthProvider';
export { ProtectedRoute } from './components/ProtectedRoute';

// Export auth service
export { default as authService } from './services/authService';

// User profile helpers (DB firstName/lastName + Strapi shapes)
export {
  flattenUser,
  resolveUserDisplayName,
  resolveUserGreetingName,
  resolveUserInitials,
  resolveUserRole,
} from './utils/userProfile';
