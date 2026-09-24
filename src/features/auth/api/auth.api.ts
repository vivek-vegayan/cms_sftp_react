import { api } from "../../../service/api";
import type { LoggedUserApiResponse, LoginResponse } from "../types/auth.types";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { olmId: string; password: string }>(
      {
        query: (body) => ({
          url: "/auth/v1/signin",
          method: "POST",
          body,
        }),
      },
    ),

    getLoggedUser: builder.query<LoggedUserApiResponse, void>({
      query: () => "/users/v2/getloggeduserdetails",
    }),

    // Ends a stranded session for an account the caller can prove they own, so
    // they can sign in after a 403 "Already Logged". This used to POST a bare
    // { olmId } to /auth/v1/logout — an endpoint that required no credentials
    // at all, so knowing someone's OLM ID was enough to end their session, and
    // they saw it as "Invalid session" mid-work. The backend now re-checks the
    // account password before terminating anything.
    terminateSession: builder.mutation<void, { olmId: string; password: string }>(
      {
        query: (body) => ({
          url: "/auth/v1/session/terminate",
          method: "POST",
          body,
        }),
      },
    ),

    logout: builder.mutation<void, { olmId: string }>({
      query: (body) => ({
        url: "/auth/v1/logout",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLazyGetLoggedUserQuery,
  useTerminateSessionMutation,
  useLogoutMutation,
} = authApi;
