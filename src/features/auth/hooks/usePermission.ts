import { useAppSelector } from "../../../app/hooks";

export const usePermission = () => {
  const modules = useAppSelector((s) => s.auth.user?.modules);

  const hasPermission = (
    moduleName: string,
    permission: string
  ): boolean => {
    if (!modules) return false;
    return modules[moduleName]?.includes(permission);
  };

  return { hasPermission };
};
