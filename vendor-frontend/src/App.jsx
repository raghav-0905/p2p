import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import VendorLayout from "./layouts/VendorLayout";
import VendorDashboard from "./pages/VendorDashboard";
import POManagement from "./pages/POManagement";
import InvoiceManagement from "./pages/InvoiceManagement";
import PRManagement from "./pages/PRManagement";
import Payments from "./pages/Payments";
import VendorProfile from "./pages/VendorProfile";
import ContractsPerformance from "./pages/ContractsPerformance";
import Messaging from "./pages/Messaging";
import GRNManagement from "./pages/GRNManagement";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { ThemeProvider, createTheme, Box, CircularProgress, Alert, Typography } from "@mui/material";
import "./index.css";
import "./App.css";

// Salesforce Lightning–inspired vendor shell (compact, high-contrast chrome)
const theme = createTheme({
  spacing: 8,
  palette: {
    mode: "light",
    primary: {
      main: "#0176d3",
      dark: "#014486",
      light: "#1b96ff",
    },
    secondary: {
      main: "#032d60",
    },
    success: {
      main: "#2e844a",
    },
    warning: {
      main: "#fe9339",
    },
    error: {
      main: "#ba0517",
    },
    background: {
      default: "#f3f3f3",
      paper: "#ffffff",
    },
    divider: "#dddbda",
    text: {
      primary: "#181818",
      secondary: "#3e3e3c",
    },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: '"Segoe UI", "Salesforce Sans", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em", fontSize: "1.5rem" },
    h6: { fontWeight: 700, fontSize: "1rem" },
    button: { textTransform: "none", fontWeight: 600, fontSize: "0.8125rem" },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: "1px solid #dddbda",
          boxShadow: "0 2px 2px 0 rgba(0, 0, 0, 0.05)",
        },
        elevation0: {
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4, textTransform: "none" },
        contained: { boxShadow: "none" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, backgroundColor: "#f3f3f3", color: "#181818" },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #dddbda",
        },
      },
    },
  },
});

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            minHeight: "100vh",
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 560 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Supabase is not configured
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              Add a file named <code>.env.local</code> inside the <code>vendor-frontend</code> folder with:
            </Typography>
            <Box
              component="pre"
              sx={{
                mt: 1.5,
                p: 1.5,
                bgcolor: "grey.100",
                borderRadius: 1,
                fontSize: "0.75rem",
                overflow: "auto",
              }}
            >
              {`VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co\nVITE_SUPABASE_ANON_KEY=your_anon_key`}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Use Project URL and anon public key from Supabase → Project Settings → API. Restart{" "}
              <code>npm run dev</code> after saving. If the URL is missing, the app calls{" "}
              <code>/rest/v1/...</code> on localhost and the browser shows 404.
            </Typography>
          </Alert>
        </Box>
      </ThemeProvider>
    );
  }

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
          <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={session ? <Navigate to="/dashboard" /> : <Register />} />
          
          <Route element={session ? <VendorLayout /> : <Navigate to="/login" />}>
            <Route path="/dashboard" element={<VendorDashboard />} />
            <Route path="/purchase-orders" element={<POManagement />} />
            <Route path="/purchase-requests" element={<PRManagement />} />
            <Route path="/grns" element={<GRNManagement />} />
            <Route path="/invoices" element={<InvoiceManagement />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/profile" element={<VendorProfile />} />
            <Route path="/contracts" element={<ContractsPerformance />} />
            <Route path="/messages" element={<Messaging />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
