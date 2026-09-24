import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { LockOutlined, WifiOutlined } from "@mui/icons-material";

// Reports the connection's real transport security instead of a static
// "SSL Secured" badge. This deployment is served over plain HTTP, so
// claiming SSL would be misleading — show an honest, environment-aware
// status instead, which also auto-upgrades itself if HTTPS is enabled later.
const ConnectionSecurityBadge: React.FC = () => {
  const isSecure =
    typeof window !== "undefined" && window.location.protocol === "https:";

  return (
    <Tooltip
      arrow
      title={
        isSecure
          ? "This session is encrypted with HTTPS/TLS."
          : "This connection is not encrypted (HTTP). Use only on the trusted internal/corporate network — avoid public or shared Wi-Fi."
      }
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          bgcolor: isSecure ? "var(--lp-badge-ok-bg)" : "var(--lp-badge-warn-bg)",
          border: `1px solid ${isSecure ? "var(--lp-badge-ok-border)" : "var(--lp-badge-warn-border)"}`,
          borderRadius: "6px",
          px: 0.9,
          py: 0.4,
          cursor: "default",
        }}
      >
        {isSecure ? (
          <LockOutlined sx={{ fontSize: 10, color: "var(--lp-badge-ok-fg)" }} />
        ) : (
          <WifiOutlined sx={{ fontSize: 10, color: "var(--lp-badge-warn-fg)" }} />
        )}
        <Typography
          sx={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "9px",
            color: isSecure ? "var(--lp-badge-ok-fg)" : "var(--lp-badge-warn-fg)",
            fontWeight: 500,
            letterSpacing: "0.03em",
          }}
        >
          {isSecure ? "TLS Secured" : "Internal Network Only"}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default ConnectionSecurityBadge;
