import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SmartToyIcon from "@mui/icons-material/SmartToy";

import { supabase } from "../../lib/supabase";
import AgentFleetDashboard from "../../components/agent-fleet/AgentFleetDashboard";

export default function AgentFleetPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [orgName, setOrgName] = useState("Enterprise P2P");

  useEffect(() => {
    async function loadOrgData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: orgUser } = await supabase
            .from("organization_users")
            .select("org_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (orgUser?.org_id) {
            const orgId = orgUser.org_id;

            const { data: orgData } = await supabase
              .from("organizations")
              .select("legal_name")
              .eq("id", orgId)
              .maybeSingle();

            if (orgData?.legal_name) setOrgName(orgData.legal_name);

            const [invRes, poRes, grnRes] = await Promise.all([
              supabase.from("invoices").select("*").eq("org_id", orgId),
              supabase.from("purchase_orders").select("*").eq("org_id", orgId),
              supabase.from("grns").select("*").eq("org_id", orgId),
            ]);

            setInvoices(invRes.data || []);
            setPurchaseOrders(poRes.data || []);
            setGrns(grnRes.data || []);
          }
        }
      } catch (err) {
        console.error("Error loading Agent Fleet data:", err);
      }
    }

    loadOrgData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0b0f19", color: "#f8fafc" }}>
      {/* Top Command Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "rgba(11, 15, 25, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>

          <Box display="flex" alignItems="center" gap={1.5} sx={{ flexGrow: 1 }}>
            <SmartToyIcon sx={{ color: "#818cf8", fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
              Autonomous Agent Command Center
            </Typography>
            <Chip
              label="9 / 9 Agents Active"
              size="small"
              sx={{
                bgcolor: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: 700,
                fontSize: "0.72rem",
                display: { xs: "none", md: "inline-flex" },
              }}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/user")}
              sx={{
                color: "#cbd5e1",
                borderColor: "rgba(255, 255, 255, 0.2)",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.82rem",
                "&:hover": {
                  borderColor: "#818cf8",
                  color: "#818cf8",
                  bgcolor: "rgba(129, 140, 248, 0.08)",
                },
              }}
            >
              Operations Dashboard
            </Button>
            <Button variant="outlined" color="error" size="small" onClick={handleLogout} sx={{ fontSize: "0.82rem" }}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box width={280} sx={{ background: "#fff", height: "100%" }}>
          <Box p={3} bgcolor="#4f46e5" color="white">
            <Typography variant="h6" fontWeight={800}>
              {orgName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Procurement & AI Command
            </Typography>
          </Box>
          <List sx={{ mt: 1 }}>
            <ListItemButton onClick={() => { navigate("/user"); setDrawerOpen(false); }}>
              <ListItemIcon><DashboardIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Procurement Dashboard" />
            </ListItemButton>
            <ListItemButton selected onClick={() => setDrawerOpen(false)}>
              <ListItemIcon><SmartToyIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Autonomous Agent Fleet" secondary="9-Agent Groq Workflow" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/purchase-order"); setDrawerOpen(false); }}>
              <ListItemIcon><ReceiptLongIcon /></ListItemIcon>
              <ListItemText primary="Purchase Orders" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/purchase-requests"); setDrawerOpen(false); }}>
              <ListItemIcon><AssignmentTurnedInIcon /></ListItemIcon>
              <ListItemText primary="Purchase Requests (Create)" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/grn"); setDrawerOpen(false); }}>
              <ListItemIcon><InventoryIcon /></ListItemIcon>
              <ListItemText primary="GRN" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/invoice"); setDrawerOpen(false); }}>
              <ListItemIcon><DescriptionIcon /></ListItemIcon>
              <ListItemText primary="Invoices" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/analytics"); setDrawerOpen(false); }}>
              <ListItemIcon><BarChartIcon /></ListItemIcon>
              <ListItemText primary="Analytics" />
            </ListItemButton>
            <ListItemButton onClick={() => { navigate("/procurement"); setDrawerOpen(false); }}>
              <ListItemIcon><ListAltIcon /></ListItemIcon>
              <ListItemText primary="Procurement Overview" />
            </ListItemButton>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      {/* Fleet Dashboard Container */}
      <Box p={{ xs: 2, md: 3.5 }} maxWidth="1540px" mx="auto">
        <AgentFleetDashboard liveInvoices={invoices} livePOs={purchaseOrders} liveGRNs={grns} />
      </Box>
    </Box>
  );
}
