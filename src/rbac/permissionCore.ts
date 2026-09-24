// src/rbac/permissionCore.ts
import type { ModuleHierarchy } from "../features/auth/types/auth.types";

export type PermAction = "VIEW" | "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT";

/**
 * Pure permission predicates with no Redux dependency, so they can be used
 * both by usePermission() (reading from the store) and by callers that need
 * to evaluate permissions against a user object that hasn't been committed
 * to the store yet (e.g. LoginPage computing the post-login redirect target
 * from the just-fetched user, before dispatch + re-render).
 */

export const isSuperAdminRole = (roleCode: string | null): boolean =>
  roleCode === "SUPER_ADMIN";

export const canIn = (
  modules: Record<string, string[]>,
  _roleCode: string | null,
  moduleName: string,
  action: PermAction,
): boolean => {
  return modules[moduleName]?.includes(action) ?? false;
};

export const hasModuleIn = (
  modules: Record<string, string[]>,
  _roleCode: string | null,
  moduleName: string,
): boolean => {
  return !!modules[moduleName] && modules[moduleName].length > 0;
};

export const hasSubModuleIn = (
  moduleHierarchy: ModuleHierarchy[],
  _roleCode: string | null,
  moduleName: string,
  subModuleName: string,
): boolean => {
  const mod = moduleHierarchy.find((m) => m.moduleName === moduleName);
  const subModule = mod?.subModules.find(
    (sm) => sm.subModuleName === subModuleName,
  );
  return !!subModule && subModule.permissions.length > 0;
};
