// src/rbac/routeAccess.ts
/* eslint-disable @typescript-eslint/no-unused-vars -- params kept to match CHM's signatures */
//
// SFTP-only counterpart of airtelcms_react's routeAccess.ts: same function
// names and signatures (LoginPage, PrivateRoute and AccessDenied use them
// unchanged), but the only routes are the SFTP Management pages.
//
// Gated at module level only, exactly as CHM did (MODULE_ONLY_GUARD there):
// the live WEB_SUB_MODULE rows for this module are named
// "Dashboard/Files/Servers", not "Windows/Linux", so sub-module gating would
// lock real users out of both pages.

export const SFTP_MODULE_NAME = "SFTP Management";
export const SFTP_HOME_PATH = "/sftp-management/windows";

const SFTP_BASE_PATH = "/sftp-management";

type HasModule = (moduleName: string) => boolean;
type HasSubModule = (moduleName: string, subModuleName: string) => boolean;

/** Where to land after sign-in, or null when this user has no SFTP access. */
export const getFirstAccessiblePath = (
  hasModule: HasModule,
  _hasSubModule?: HasSubModule,
): string | null => (hasModule(SFTP_MODULE_NAME) ? SFTP_HOME_PATH : null);

export const isPathAllowed = (
  pathname: string,
  hasModule: HasModule,
  _hasSubModule?: HasSubModule,
  _isSuperAdmin?: boolean,
): boolean => {
  if (pathname === "/" || pathname === "") return true; // resolved by the index redirect
  const isSftpPath = pathname === SFTP_BASE_PATH || pathname.startsWith(SFTP_BASE_PATH + "/");
  return isSftpPath && hasModule(SFTP_MODULE_NAME);
};
