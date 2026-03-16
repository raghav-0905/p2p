import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Grid,
  Paper,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";

function UserDashboard() {

  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">

      {/* HEADER */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)}>
            <MenuIcon />
          </IconButton>

          <Typography sx={{ flexGrow: 1, ml: 2, fontWeight: 600 }}>
            P2P OrgNet – User Dashboard
          </Typography>

          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* SIDEBAR DRAWER */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box width={260} role="presentation">

          <Typography variant="h6" fontWeight={700} p={3}>
            P2P OrgNet
          </Typography>

          <Divider />

          <List>

            <ListItem button onClick={() => navigate("/")}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>

            <ListItem button onClick={() => navigate("/purchase-order")}>
              <ListItemIcon>
                <ReceiptLongIcon />
              </ListItemIcon>
              <ListItemText primary="Create Purchase Order" />
            </ListItem>

            <ListItem button onClick={() => navigate("/grn")}>
              <ListItemIcon>
                <InventoryIcon />
              </ListItemIcon>
              <ListItemText primary="Create GRN" />
            </ListItem>

            <ListItem button onClick={() => navigate("/invoice")}>
              <ListItemIcon>
                <DescriptionIcon />
              </ListItemIcon>
              <ListItemText primary="Upload Invoice" />
            </ListItem>

            <ListItem button onClick={toggleDrawer(false)}>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItem>

            <ListItem button onClick={toggleDrawer(false)}>
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText primary="Organization" />
            </ListItem>

            <ListItem button onClick={toggleDrawer(false)}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>

          </List>

          <Divider />

          <List>
            <ListItem button onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ color: "error" }}
              />
            </ListItem>
          </List>

        </Box>
      </Drawer>

      {/* DASHBOARD CONTENT */}
      <Box p={3}>

        <Grid container spacing={3}>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Create Purchase Order">
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate("/purchase-order")}
              >
                New PO
              </Button>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Create GRN">
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate("/grn")}
              >
                New GRN
              </Button>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Upload Invoice">
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate("/invoice")}
              >
                New Invoice
              </Button>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <DashboardCard title="PO → GRN → Invoice Matching">
              <Typography>
                Verify procurement documents for fraud detection and compliance.
              </Typography>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <DashboardCard title="Audit Logs">
              <Typography>
                Track every procurement activity inside the organization.
              </Typography>
            </DashboardCard>
          </Grid>

        </Grid>

      </Box>

    </Box>
  );
}

/* Reusable Card */

function DashboardCard({ title, children }) {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        height: "100%",
        borderRadius: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography fontWeight={600}>{title}</Typography>

        <IconButton size="small">
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {children}
    </Paper>
  );
}

export default UserDashboard;