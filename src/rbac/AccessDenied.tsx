import React from "react";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router";
import { useTabColorTokens } from "../style/theme";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useLogoutMutation } from "../features/auth/api/auth.api";
import { logout } from "../features/auth/slices/auth.slice";
import { authStorage } from "../app/store/auth.storage";
import { api } from "../service/api";
import { usePermission } from "./usePermission";
import { getFirstAccessiblePath } from "./routeAccess";

interface AccessDeniedProps {
  /** "forbidden" — authenticated but lacks permission for this specific route.
   *  "no-modules" — role has no assigned modules at all yet. */
  reason: "forbidden" | "no-modules";
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ reason }) => {
  const theme = useTheme();
  const colors = useTabColorTokens(theme);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();
  const { hasModule, hasSubModule } = usePermission();
  const olmId = useAppSelector((s) => s.auth.user?.olmId);

  const workspacePath =
    reason === "forbidden" ? getFirstAccessiblePath(hasModule, hasSubModule) : null;

  const handleLogout = async () => {
    try {
      await logoutApi({ olmId: olmId ?? "" }).unwrap();
    } catch {
      // continue local logout regardless of API outcome
    } finally {
      authStorage.clear();
      dispatch(logout());
      dispatch(api.util.resetApiState());
      navigate("/login", { replace: true });
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      sx={{ minHeight: "60vh", px: 3 }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: colors.dangerDim ?? "rgba(237,28,36,0.1)",
          mb: 2.5,
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 34, color: colors.danger }} />
      </Box>

      <Typography variant="h5" fontWeight={700} sx={{ color: colors.textPrimary, mb: 1 }}>
        {reason === "no-modules" ? "No modules assigned" : "Access denied"}
      </Typography>

      <Typography sx={{ color: colors.textSecondary, maxWidth: 420, mb: 3.5 }}>
        {reason === "no-modules"
          ? "Your role doesn't have any modules assigned yet. Contact your administrator to get access."
          : "You don't have permission to view this page. If you think this is a mistake, contact your administrator."}
      </Typography>

      <Stack direction="row" spacing={1.5}>
        {workspacePath && (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(workspacePath, { replace: true })}
          >
            Go to my workspace
          </Button>
        )}
        <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
          Logout
        </Button>
      </Stack>
    </Box>
  );
};

export default AccessDenied;
