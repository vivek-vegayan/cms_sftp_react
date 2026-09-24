import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "react-toastify";
import type { RootState } from "../app/store";
import { authStorage } from "../app/store/auth.storage";
import { logout } from "../features/auth/slices/auth.slice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_REACT_APP_BASE_URL,
  // Send the httpOnly `jwt` cookie the backend issues on login as a second,
  // tamper-resistant way to authenticate the request.
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// Endpoints where a 401/403 is an expected outcome of the call itself
// (bad credentials, already logged in elsewhere) rather than a stale session.
const AUTH_LIFECYCLE_PATHS = [
  "/auth/v1/signin",
  "/auth/v1/logout",
  "/auth/v1/session/terminate",
];

const isAuthLifecycleRequest = (args: string | FetchArgs): boolean => {
  const url = typeof args === "string" ? args : args.url;
  return AUTH_LIFECYCLE_PATHS.some((path) => url.includes(path));
};

// Global session-expiration handler (same as airtelcms_react): any 401 outside
// login/logout clears the session so PrivateRoute redirects to /login.
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, queryApi, extraOptions) => {
  const result = await rawBaseQuery(args, queryApi, extraOptions);

  if (result.error && !isAuthLifecycleRequest(args)) {
    const status = result.error.status;
    if (status === 401) {
      const wasAuthenticated = (queryApi.getState() as RootState).auth.isAuthenticated;
      authStorage.clear();
      queryApi.dispatch(logout());
      queryApi.dispatch(api.util.resetApiState());
      if (wasAuthenticated) {
        toast.error("Your session has expired. Please sign in again.");
      }
    } else if (status === 403) {
      const data = result.error.data as { message?: string } | undefined;
      toast.error(data?.message ?? "You don't have permission to do that.");
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
  tagTypes: ["SftpWindowsFiles", "RemoteListing"],
});
