import type { JSX } from "react";
import { useAppSelector } from "../app/hooks";
import { Navigate } from "react-router";
import { usePermission } from "../rbac/usePermission";
import { getFirstAccessiblePath } from "../rbac/routeAccess";

export const PublicRoute = ({ element }: { element: JSX.Element }) => {
  const { isAuthenticated, hydrated } = useAppSelector((s) => s.auth);
  const { hasModule, hasSubModule } = usePermission();

  if (!hydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return element;
  }

  // Reached only when an already-authenticated session lands on /login (a
  // bookmark, the back button after signing in, a race) — there is no fresh
  // sign-in here to hand a pending redirect to, so this always resolves to the
  // user's own default. Falls back to "/" (resolved by DefaultRedirect in
  // AppRoutes) rather than a hardcoded module, since which module (if any) is
  // accessible depends entirely on the logged-in user's assigned permissions.
  const fallback = getFirstAccessiblePath(hasModule, hasSubModule) ?? "/";
  return <Navigate to={fallback} replace />;
};
