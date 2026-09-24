import { Suspense, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { CssBaseline, ThemeProvider } from "@mui/material";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import { ColorModeContext, useMode } from "./style/theme";
import Header from "./components/layout/Header";
import AppRoutes from "./routes/AppRoutes";
import { PublicRoute } from "./routes/PublicRoute";
import LoginPage from "./features/auth/pages/LoginPage";
import { RouteFallback } from "./components/loading/PageLoader";
import { useAppSelector } from "./app/hooks";

const App = () => {
  const isAuth = useAppSelector((s) => s.auth.isAuthenticated);
  const isHydrated = useAppSelector((s) => s.auth.hydrated);
  const [theme, colorMode] = useMode();
  const [dynamicHeaderText, setDynamicHeaderText] = useState("SFTP Management");
  const [dynamicHeaderIcon, setDynamicHeaderIcon] = useState(<DnsOutlinedIcon sx={{ color: "white" }} />);

  return (
    // BASE_URL comes from vite.config.ts's `base` (VITE_APP_BASE_PATH).
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/^\/|\/$/g, "")}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {isAuth && isHydrated && (
            <Header dynamicHeaderText={dynamicHeaderText} dynamicHeaderIcon={dynamicHeaderIcon} />
          )}
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
              <Route
                path="/*"
                element={
                  <AppRoutes
                    setDynamicHeaderText={setDynamicHeaderText}
                    setDynamicHeaderIcon={setDynamicHeaderIcon}
                  />
                }
              />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </BrowserRouter>
  );
};

export default App;
