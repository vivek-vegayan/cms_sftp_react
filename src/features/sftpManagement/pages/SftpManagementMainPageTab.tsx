import { Box, Tabs, Tab, useTheme } from "@mui/material";
import React, { type JSX, Suspense, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import TerminalIcon from "@mui/icons-material/Terminal";
import StorageIcon from "@mui/icons-material/Storage";
import CommonContainer from "../../../components/common/CommonContainer";
import { RouteFallback } from "../../../components/loading/PageLoader";
import AnimatedOutlet from "../../../components/loading/AnimatedOutlet";
import { SHELL_MIN_HEIGHT } from "../../../components/layout/layoutConstants";

interface SftpManagementMainPageTabProps {
  setDynamicHeaderText: (text: string) => void;
  setDynamicHeaderIcon: (icon: JSX.Element) => void;
}

interface SftpTabMeta {
  label: string;
  path: string;
  headerText: string;
  icon: JSX.Element;
}

const SFTP_TABS: SftpTabMeta[] = [
  {
    label: "Windows",
    path: "windows",
    headerText: "SFTP Management — Windows",
    icon: <DnsOutlinedIcon sx={{ color: "white" }} />,
  },
  {
    label: "Linux",
    path: "linux",
    headerText: "SFTP Management — Linux",
    icon: <TerminalIcon sx={{ color: "white" }} />,
  },
  {
    label: "Logs & Files",
    path: "servers",
    headerText: "SFTP Management — Logs & Files",
    icon: <StorageIcon sx={{ color: "white" }} />,
  },
];

const SftpManagementMainPageTab: React.FC<SftpManagementMainPageTabProps> = ({
  setDynamicHeaderText,
  setDynamicHeaderIcon,
}) => {
  const location = useLocation();
  const theme = useTheme();

  /* ================= ACTIVE TAB ================= */

  const activeTab = useMemo(() => {
    const found = SFTP_TABS.find((tab) =>
      location.pathname.includes(`/sftp-management/${tab.path}`),
    );
    return found?.path ?? SFTP_TABS[0].path;
  }, [location.pathname]);

  /* ================= HEADER CONTROL ================= */

  useEffect(() => {
    const activeMeta = SFTP_TABS.find((tab) => tab.path === activeTab);
    setDynamicHeaderText(activeMeta?.headerText ?? "SFTP Management");
    setDynamicHeaderIcon(activeMeta?.icon ?? <DnsOutlinedIcon sx={{ color: "white" }} />);
  }, [activeTab, setDynamicHeaderText, setDynamicHeaderIcon]);

  /* ================= UI ================= */

  return (
    <Box
      sx={{
        maxWidth: "100%",
        minHeight: SHELL_MIN_HEIGHT,
        display: "flex",
        flexDirection: "column",
        // No sidebar rail in this standalone app (airtelcms reserved pl: 8 for it).
        pl: 0,
        overflow: "auto",
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-track": {
          backgroundColor:
            theme.palette.mode === "dark" ? theme.palette.background.paper : "#f1f1f1",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.primary.main,
          borderRadius: 4,
        },
      }}
    >
      {/* ================= TABS ================= */}

      <Box
        sx={{
          mt: "45px",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
              : "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: `1px solid ${
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)"
          }`,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 8px 32px rgba(0,0,0,0.45)"
              : "0 8px 32px rgba(0,0,0,0.08)",
          transition: "all 0.3s ease",
        }}
      >
        <Tabs
          value={activeTab}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: 14 },
            "& .Mui-selected": { fontWeight: 600, color: theme.palette.primary.main },
            "& .MuiTabs-indicator": {
              display: "flex",
              justifyContent: "center",
              backgroundColor: "transparent",
              "&::after": {
                content: '""',
                width: 0,
                height: 0,
                borderRight: "8px solid transparent",
                borderLeft: "8px solid transparent",
                borderBottom: `10px solid ${theme.palette.primary.main}`,
                position: "absolute",
                bottom: 0,
              },
            },
          }}
        >
          {SFTP_TABS.map((tab) => (
            <Tab key={tab.path} label={tab.label} value={tab.path} to={tab.path} component={Link} />
          ))}
        </Tabs>
      </Box>

      {/* ================= CONTENT ================= */}

      <Box sx={{ p: 0, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <CommonContainer>
          <Suspense fallback={<RouteFallback />}>
            <AnimatedOutlet />
          </Suspense>
        </CommonContainer>
      </Box>
    </Box>
  );
};

export default SftpManagementMainPageTab;
