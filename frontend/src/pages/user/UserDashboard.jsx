import { useState } from "react";
import { supabase } from "../../lib/supabase";
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

function UserDashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        <Box width={260} role="presentation">
          <Typography
            variant="h6"
            fontWeight={700}
            p={3}
          >
            P2P OrgNet
          </Typography>

          <Divider />

          <List>
            <ListItem button onClick={toggleDrawer(false)}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
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
            <DashboardCard title="Job Orders">
              <Typography variant="h4" fontWeight={700}>
                71
              </Typography>
              <Typography color="text.secondary">Past Due</Typography>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={8}>
            <DashboardCard title="Top WIP Value Job Orders">
              <Box height={140} bgcolor="#e5e7eb" borderRadius={2} />
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Planned Production">
              <Typography>MB-1000</Typography>
              <Typography>MB-2000</Typography>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Production Follow-Up">
              <Typography>🔴 48 Days Past Due</Typography>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <DashboardCard title="Resource Utilization">
              <Typography>Assembly: 90%</Typography>
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

/* 🔹 Reusable Card */
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
