import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
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
  Badge,
  Avatar,
  Menu,
  MenuItem
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ChatIcon from "@mui/icons-material/Chat";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { fetchVendorPurchaseOrders, fetchVendorInvoices } from "../lib/vendorPo";

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: vendorDataList } = await supabase
      .from("vendors")
      .select("company_name")
      .eq("user_id", user.id)
      .limit(1);
    const vendor = vendorDataList?.[0];
    if (vendor) {
      setCompanyName(vendor.company_name);
      const [pos, invs] = await Promise.all([
        fetchVendorPurchaseOrders(user.id, vendor),
        fetchVendorInvoices(user.id, vendor),
      ]);
      const poNotes = pos.slice(0, 5).map((p) => ({
        id: `po-${p.po_number}-${p.id}`,
        text: `PO ${p.po_number} is ${p.status}`,
      }));
      const invNotes = invs.slice(0, 5).map((i) => ({
        id: `inv-${i.invoice_number}-${i.id}`,
        text: `Invoice ${i.invoice_number} is ${i.status}`,
      }));
      setNotifications([...poNotes, ...invNotes].slice(0, 8));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "Purchase Orders", path: "/purchase-orders", icon: <ShoppingCartIcon /> },
    { label: "Deliveries (GRNs)", path: "/grns", icon: <LocalShippingIcon /> },
    { label: "Invoices", path: "/invoices", icon: <ReceiptIcon /> },
    { label: "Payments", path: "/payments", icon: <AccountBalanceWalletIcon /> },
    { label: "Contracts & Docs", path: "/contracts", icon: <AssignmentIcon /> },
    { label: "Messages", path: "/messages", icon: <ChatIcon /> },
    { label: "Profile", path: "/profile", icon: <PersonIcon /> }
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f3f3", display: "flex", flexDirection: "column" }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#ffffff", color: "#181818" }}>
        <Toolbar sx={{ minHeight: 48 }}>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} size="small">
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", ml: 1 }}>
            <StorefrontIcon sx={{ color: "#0176d3", mr: 1, fontSize: 22 }} />
            <Typography variant="h6" fontWeight={700} color="#032d60" sx={{ fontSize: "1rem" }}>
              Supplier Portal
            </Typography>
          </Box>
          
          <IconButton color="inherit" sx={{ mr: 2 }} onClick={(e) => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" fontWeight={600} display={{ xs: 'none', sm: 'block' }}>
              {companyName}
            </Typography>
            <Avatar sx={{ bgcolor: "#0176d3", width: 32, height: 32, fontSize: "0.875rem" }}>
              {companyName ? companyName[0].toUpperCase() : "V"}
            </Avatar>
            <Button variant="outlined" color="error" size="small" onClick={handleLogout} sx={{ display: { xs: "none", md: "inline-flex" }, borderColor: "#dddbda" }}>
              Sign Out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ "& .MuiDrawer-paper": { borderRight: "1px solid #dddbda" } }}>
        <Box width={280} sx={{ background: "#ffffff", height: "100%" }}>
          <Box p={2.5} borderBottom="1px solid #dddbda" bgcolor="#fafaf9">
            <Typography variant="subtitle2" fontWeight={700} color="#032d60">
              Navigation
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {companyName}
            </Typography>
          </Box>
          <List dense sx={{ py: 1 }}>
            {navItems.map((item) => (
              <ListItemButton 
                key={item.label}
                selected={location.pathname === item.path}
                onClick={() => { 
                  navigate(item.path); 
                  setDrawerOpen(false); 
                }}
                sx={{
                  py: 1,
                  borderLeft: "3px solid transparent",
                  "&.Mui-selected": {
                    bgcolor: "rgba(1, 118, 211, 0.08)",
                    borderLeftColor: "#0176d3",
                  },
                  "&.Mui-selected:hover": { bgcolor: "rgba(1, 118, 211, 0.12)" },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? "#0176d3" : "#706e6b", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  sx={{ 
                    "& .MuiListItemText-primary": {
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      fontSize: "0.8125rem",
                      color: location.pathname === item.path ? "#0176d3" : "#3e3e3c",
                    }
                  }} 
                />
              </ListItemButton>
            ))}
            
            <Box sx={{ my: 2, borderTop: "1px solid", borderColor: "divider" }} />
            
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
              <ListItemText primary="Sign Out" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={() => setNotifAnchor(null)}
      >
        {notifications.length === 0 ? (
          <MenuItem>No new notifications</MenuItem>
        ) : (
          notifications.map((n) => <MenuItem key={n.id}>{n.text}</MenuItem>)
        )}
      </Menu>

      <Box component="main" flexGrow={1} p={{ xs: 2, sm: 3 }} maxWidth="1440px" mx="auto" width="100%">
        <Outlet />
      </Box>
    </Box>
  );
}

