import type { JSX } from "react";
import { useAppSelector } from "../app/hooks";
import { Navigate, useLocation } from "react-router";
import { usePermission } from "../rbac/usePermission";
import { isPathAllowed } from "../rbac/routeAccess";
import AccessDenied from "../rbac/AccessDenied";

export const PrivateRoute = ({ element }: { element: JSX.Element }) => {
  const { isAuthenticated, hydrated } = useAppSelector((s) => s.auth);
  const location = useLocation();
  const { hasModule, hasSubModule, isSuperAdmin } = usePermission();

  if (!hydrated) {
    return null;

  }

  // Deliberately carries no `state={{ from }}`: this same redirect fires for a
  // deliberate logout and for a session torn down under the user (401, cross-
  // tab sign-out), and it cannot tell those apart — so anything it stashed here
  // was liable to be replayed for whoever signed in next. A pending redirect is
  // recorded once, at cold start, by AuthHydrator instead.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Every page here needs the "SFTP Management" module (see rbac/routeAccess).
  if (!isPathAllowed(location.pathname, hasModule, hasSubModule, isSuperAdmin)) {
    return <AccessDenied reason="forbidden" />;
  }

  return element;
};
