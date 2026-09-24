import { combineReducers, configureStore, type Action } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer, { logout } from "../features/auth/slices/auth.slice";
import { api } from "../service/api";

const appReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  auth: authReducer,
});

// Every logout path (header logout, AccessDenied, the global 401 handler in
// service/api.ts, and the cross-tab `storage` event in AuthHydrator) ends by
// dispatching auth/logout — resetting the whole tree here guarantees nothing
// from this session leaks into the next one. Same as airtelcms_react.
const rootReducer: typeof appReducer = (state, action: Action) => {
  if (action.type === logout.type) {
    state = undefined;
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (gDM) => gDM({ serializableCheck: false }).concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

setupListeners(store.dispatch);
