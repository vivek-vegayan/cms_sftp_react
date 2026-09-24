// src/rbac/usePermission.ts
import { useMemo } from "react";
import { useAppSelector } from "../app/hooks";
import { canIn, hasModuleIn, hasSubModuleIn, isSuperAdminRole, type PermAction } from "./permissionCore";

export type { PermAction };

export interface PermissionUtils {
  /** Check if the user has a specific action on a module */
  can: (moduleName: string, action: PermAction) => boolean;
  /** Check if the user has any access to a module at all */
  hasModule: (moduleName: string) => boolean;
  /** Check if the user has any access to a specific sub-module within a module */
  hasSubModule: (moduleName: string, subModuleName: string) => boolean;
  /** Check multiple actions at once — returns true if user has ALL of them */
  canAll: (moduleName: string, actions: PermAction[]) => boolean;
  /** Check multiple actions — returns true if user has ANY of them */
  canAny: (moduleName: string, actions: PermAction[]) => boolean;
  /** Shorthand: is the user a super admin */
  isSuperAdmin: boolean;
  /** The raw roleCode from the API */
  roleCode: string | null;
}

export const usePermission = (): PermissionUtils => {
  const user = useAppSelector((s) => s.auth.user);

  return useMemo(() => {
    const modules = user?.modules ?? {};
    const moduleHierarchy = user?.moduleHierarchy ?? [];
    const roleCode = user?.roleCode ?? null;
    const isSuperAdmin = isSuperAdminRole(roleCode);

    const can = (moduleName: string, action: PermAction): boolean =>
      canIn(modules, roleCode, moduleName, action);

    const hasModule = (moduleName: string): boolean =>
      hasModuleIn(modules, roleCode, moduleName);

    const hasSubModule = (moduleName: string, subModuleName: string): boolean =>
      hasSubModuleIn(moduleHierarchy, roleCode, moduleName, subModuleName);

    const canAll = (moduleName: string, actions: PermAction[]): boolean =>
      actions.every((a) => can(moduleName, a));

    const canAny = (moduleName: string, actions: PermAction[]): boolean =>
      actions.some((a) => can(moduleName, a));

    return { can, hasModule, hasSubModule, canAll, canAny, isSuperAdmin, roleCode };
  }, [user]);
};
