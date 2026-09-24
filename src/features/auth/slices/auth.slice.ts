import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../types/auth.types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      // Intentionally does NOT flip isAuthenticated. This is dispatched before
      // the user profile is fetched (both in LoginPage and AuthHydrator) purely
      // so RTK Query's prepareHeaders has a token to attach to that fetch. If
      // this flipped isAuthenticated, PublicRoute would redirect to a hardcoded
      // route the instant the token lands — racing ahead of the caller's own
      // navigate() and producing a visible flash to the wrong page.
      state.token = action.payload;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    finishHydration(state) {
      state.hydrated = true;
    },
    logout() {
      return { ...initialState, hydrated: true };
    },
  },
});

export const { setToken, setUser, logout, finishHydration } =
  authSlice.actions;
export default authSlice.reducer;
