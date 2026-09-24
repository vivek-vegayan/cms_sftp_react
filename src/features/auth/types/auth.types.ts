export interface PermissionInfo {
  permissionId: number;
  permissionName: string;
  permissionCode: string;
}

export interface SubModuleHierarchy {
  subModuleId: number;
  subModuleCode: string;
  subModuleName: string;
  permissions: PermissionInfo[];
}

export interface ModuleHierarchy {
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  subModules: SubModuleHierarchy[];
}

export interface LoggedUserApiResponse {
  olmId: string;
  employeeName: string;
  roleCode: string;
  modules: ModuleHierarchy[];
  userId: string;
}

export interface AuthUser {
  olmId: string;
  employeeName: string;
  roleCode: string;
  userId: string;
  modules: Record<string, string[]>;
  moduleHierarchy: ModuleHierarchy[];
  authenticated: boolean;
}

export interface StoredUser {
  olmId: string;
  employeeName: string;
  roleCode: string;
  userId: string;
  modules: Record<string, string[]>;
  moduleHierarchy: ModuleHierarchy[];
}


export interface LoginResponse {
  status: string;
  message: string;
  accessToken?: string;
}
