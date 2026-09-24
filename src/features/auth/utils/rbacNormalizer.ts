import type { LoggedUserApiResponse, ModuleHierarchy } from "../types/auth.types";

/** Module-level permission union, deduped across all of a module's sub-modules. */
export const normalizeRBAC = (apiUser: LoggedUserApiResponse) => {
  const moduleMap: Record<string, string[]> = {};

  (apiUser.modules ?? []).forEach((mod) => {
    const codes = (mod.subModules ?? []).flatMap((sm) =>
      (sm.permissions ?? []).map((p) => p.permissionCode),
    );
    moduleMap[mod.moduleName] = [...new Set(codes)];
  });

  return moduleMap;
};

/** Full Module -> Sub-module -> Permission hierarchy, passed through as-is. */
export const normalizeModuleHierarchy = (
  apiUser: LoggedUserApiResponse,
): ModuleHierarchy[] => apiUser.modules ?? [];
