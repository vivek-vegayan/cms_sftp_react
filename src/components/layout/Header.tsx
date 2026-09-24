import { useContext, useState, type JSX } from "react";
import { Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router";
import AirtelLogo from "../../assets/images/airtel3.png";
import { ColorModeContext } from "../../style/theme";
import { mainAppHomeUrl } from "../../features/auth/handoff";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useLogoutMutation } from "../../features/auth/api/auth.api";
import { logout } from "../../features/auth/slices/auth.slice";
import { authStorage } from "../../app/store/auth.storage";
import { api } from "../../service/api";

interface HeaderProps {
  dynamicHeaderText: string;
  dynamicHeaderIcon?: JSX.Element;
}

/** Same fixed gradient bar as airtelcms_react's header, minus the CHM-only controls. */
export default function Header({ dynamicHeaderText, dynamicHeaderIcon }: HeaderProps) {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [logoutApi] = useLogoutMutation();
  const [loggingOut, setLoggingOut] = useState(false);

  // Same logout flow as airtelcms_react's Header.
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logoutApi({ olmId: user?.olmId ?? "" }).unwrap();
    } catch {
      console.warn("Logout API failed, continuing local logout");
    } finally {
      // Clearing the auth keys fires the native `storage` event in every other
      // open tab, which AuthHydrator listens for to log them out too.
      authStorage.clear();
      dispatch(logout());
      dispatch(api.util.resetApiState());
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={{ xs: 1, sm: 1.5 }}
      p={0.8}
      sx={{
        position: "fixed",
        width: "100%",
        zIndex: 1000,
        color: "#fff",
        px: { xs: 1, sm: 2 },
        background: `linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        boxShadow: isDark ? "0 2px 16px rgba(0,0,0,.45)" : "0 2px 16px rgba(13,27,42,.18)",
        transition: "background 0.3s ease",
      }}
    >
      <Box display="flex" alignItems="center" gap={{ xs: "8px", sm: "14px" }} minWidth={0} flex={1}>
        <img
          src={AirtelLogo}
          alt="Airtel Logo"
          width={80}
          height={35}
          style={{ width: "80px", maxWidth: "18vw", height: "auto", objectFit: "contain" }}
        />
        <Box sx={{ width: "1px", height: 22, bgcolor: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0 }}>
          {dynamicHeaderIcon && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "8px",
                bgcolor: "rgba(255,255,255,0.16)",
                flexShrink: 0,
                "& svg": { fontSize: 16 },
              }}
            >
              {dynamicHeaderIcon}
            </Box>
          )}
          <Typography noWrap sx={{ color: "#fff", fontWeight: 700, fontSize: 14.5, letterSpacing: 0.2 }}>
            {dynamicHeaderText}
          </Typography>
        </Stack>
      </Box>

      <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
        <IconButton onClick={colorMode.toggleColorMode} sx={{ color: "#fff" }}>
          {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Button
        href={mainAppHomeUrl}
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{
          color: "#fff",
          textTransform: "none",
          bgcolor: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
        }}
      >
        Back to CHM
      </Button>
      {user && (
        <Typography
          noWrap
          sx={{ display: { xs: "none", md: "block" }, color: "#fff", fontSize: 13, fontWeight: 600, maxWidth: 200 }}
          title={`${user.employeeName} (${user.olmId})`}
        >
          {user.employeeName}
        </Typography>
      )}
      <Tooltip title="Logout">
        <span>
          <IconButton onClick={handleLogout} disabled={loggingOut} sx={{ color: "#fff" }}>
            {loggingOut ? <CircularProgress size={18} color="inherit" /> : <LogoutIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
