import { Box, useTheme } from "@mui/material";

const CommonContainer = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        marginTop: "5px",
        maxWidth: "100%",
        overflow: "auto",
        height: {
          xs: "calc(100vh - 50px)", 
          sm: "calc(100vh - 50px)", 
          md: "calc(100vh - 40px)", 
          lg: "auto",
          xl: "calc(100vh - 100px)",
        },
        minHeight: "500px",
        // Column flex so a routed page — or the loader standing in for one —
        // fills this container instead of collapsing to its own content.
        display: "flex",
        flexDirection: "column",
        p: {
          xs: "0px 8px",
          sm: "4px 12px",
          md: "4px 18px",
          lg: "4px 40px",
          xl: "8px 16px",
          // xl: "18px",
        },
        bgcolor: theme.palette.background.default,
      }}
    >
      {children}
    </Box>
  );
};

export default CommonContainer;
