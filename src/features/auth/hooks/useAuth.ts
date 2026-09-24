import { useAppSelector } from "../../../app/hooks";

export const useAuth = () => {
  const auth = useAppSelector((s) => s.auth);

  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    role: auth.user?.roleCode,
    userId: auth.user?.userId,
  };
};
