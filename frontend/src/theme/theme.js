import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  spacing: 8,
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb", // calm blue (trust, finance, p2p)
    },
    secondary: {
      main: "#0f172a",
    },
    success: {
      main: "#15803d",
    },
    warning: {
      main: "#b45309",
    },
    error: {
      main: "#dc2626",
    },
    background: {
      default: "#f8fafc", // very soft white
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    body2: {
      lineHeight: 1.45,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: "#f8fafc",
        },
      },
    },
  },
});

export default theme;
