import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import SecurityIcon from "@mui/icons-material/Security";
import TimelineIcon from "@mui/icons-material/Timeline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BarChartIcon from "@mui/icons-material/BarChart";
import ListAltIcon from "@mui/icons-material/ListAlt";

import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";

/* ─── small card shell ─── */
function DashboardCard({ title, icon, children, sx, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 3,
        height: "100%",
        borderRadius: 4,
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": onClick ? { boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transform: "translateY(-2px)" } : {},
        ...sx,
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        {icon && <Box mr={1}>{icon}</Box>}
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box flexGrow={1} display="flex" flexDirection="column">
        {children}
      </Box>
    </Paper>
  );
}

/* ─── mini stat card ─── */
function StatCard({ label, value, bg, border, color, loading }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2, bgcolor: bg, borderRadius: 3, border: `1px solid ${border}` }}
    >
      <Typography color={color} variant="body2" fontWeight={600}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={60} height={40} />
      ) : (
        <Typography variant="h4" fontWeight={800} color={color}>
          {value}
        </Typography>
      )}
    </Paper>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function UserDashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  /* ── data state ── */
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    matchedInvoices: 0,
    pendingInvoices: 0,
    rejectedInvoices: 0,
    totalPOs: 0,
    approvedPOs: 0,
    totalGRNs: 0,
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [fraudTxns, setFraudTxns] = useState([]);
  const [orgDetails, setOrgDetails] = useState(null);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskScore, setRiskScore] = useState(null);

  /* ── lifecycle ── */
  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      /* org info */
      const { data: orgUser } = await supabase
        .from("organization_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      if (!orgUser) return;
      const orgId = orgUser.org_id;

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (org) setOrgDetails(org);

      /* ── invoices ── */
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, status")
        .eq("org_id", orgId);
      const inv = invoices || [];

      /* ── purchase orders ── */
      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("id, status")
        .eq("org_id", orgId);
      const poArr = pos || [];

      /* ── grns ── */
      const { data: grns } = await supabase
        .from("grns")
        .select("id")
        .eq("org_id", orgId);
      const grnArr = grns || [];

      setStats({
        totalInvoices: inv.length,
        matchedInvoices: inv.filter((i) => i.status === "matched").length,
        pendingInvoices: inv.filter((i) => i.status === "submitted" || i.status === "on_hold").length,
        rejectedInvoices: inv.filter((i) => i.status === "rejected").length,
        totalPOs: poArr.length,
        approvedPOs: poArr.filter((p) => p.status === "approved").length,
        totalGRNs: grnArr.length,
      });

      /* ── audit logs ── */
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("org_id", orgId)
        .order("performed_at", { ascending: false })
        .limit(10);
      if (logs) setAuditLogs(logs);

      /* ── fraud / flagged transactions ── */
      // Fraud records = invoices with status "rejected" or "on_hold"
      const { data: flagged } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, supplier_name, status, total_amount")
        .eq("org_id", orgId)
        .in("status", ["rejected", "on_hold"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (flagged) setFraudTxns(flagged);

      /* ── risk score (from DB, fallback to computed) ── */
      if (org && org.risk_score != null) {
        setRiskScore(org.risk_score);
      } else {
        const total = inv.length || 1;
        const bad = inv.filter((i) => i.status === "rejected" || i.status === "on_hold").length;
        setRiskScore(Math.max(0, Math.round(100 - (bad / total) * 100)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };
  const toggleDrawer = (open) => () => setDrawerOpen(open);

  /* risk colour helper */
  const riskColor =
    riskScore >= 80 ? "success" : riskScore >= 50 ? "warning" : "error";
  const riskLabel =
    riskScore >= 80 ? "Low Risk" : riskScore >= 50 ? "Medium Risk" : "High Risk";

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      {/* ── HEADER ── */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "#fff",
          color: "#1e293b",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)}>
            <MenuIcon />
          </IconButton>
          <Typography
            sx={{ flexGrow: 1, ml: 2, fontWeight: 700, color: "#4f46e5" }}
          >
            P2P OrgNet Dashboard
          </Typography>

          {orgDetails && (
            <Button
              color="inherit"
              onClick={() => setRiskDialogOpen(true)}
              startIcon={<SecurityIcon color={riskColor} />}
              sx={{
                mr: 2,
                textTransform: "none",
                fontWeight: 600,
                background: "#f1f5f9",
                borderRadius: 2,
              }}
            >
              {orgDetails.legal_name || "My Organization"}
            </Button>
          )}

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── SIDEBAR ── */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box width={280} sx={{ background: "#fff", height: "100%" }}>
          <Box p={3} bgcolor="#4f46e5" color="white">
            <Typography variant="h6" fontWeight={800}>
              P2P OrgNet
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Secure Procurement
            </Typography>
          </Box>
          <List sx={{ mt: 2 }}>
            <ListItem button onClick={() => { navigate("/user"); toggleDrawer(false)(); }}>
              <ListItemIcon><DashboardIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItem>
            <Divider sx={{ my: 1 }} />
            <ListItem button onClick={() => { navigate("/purchase-order"); toggleDrawer(false)(); }}>
              <ListItemIcon><ReceiptLongIcon /></ListItemIcon>
              <ListItemText primary="Purchase Orders" />
            </ListItem>
            <ListItem button onClick={() => { navigate("/grn"); toggleDrawer(false)(); }}>
              <ListItemIcon><InventoryIcon /></ListItemIcon>
              <ListItemText primary="Goods Receipts (GRN)" />
            </ListItem>
            <ListItem button onClick={() => { navigate("/invoice"); toggleDrawer(false)(); }}>
              <ListItemIcon><DescriptionIcon /></ListItemIcon>
              <ListItemText primary="Invoices" />
            </ListItem>
            <Divider sx={{ my: 1 }} />
            <ListItem button onClick={() => { navigate("/analytics"); toggleDrawer(false)(); }}>
              <ListItemIcon><BarChartIcon /></ListItemIcon>
              <ListItemText primary="Visual Analytics" />
            </ListItem>
            <ListItem button onClick={() => { navigate("/procurement"); toggleDrawer(false)(); }}>
              <ListItemIcon><ListAltIcon /></ListItemIcon>
              <ListItemText primary="Procurement Overview" />
            </ListItem>
            <Divider sx={{ my: 1 }} />
            <ListItem button onClick={toggleDrawer(false)}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
            <ListItem button onClick={handleLogout}>
              <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ color: "error" }} />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* ── MAIN CONTENT ── */}
      <Box p={4} maxWidth="1400px" mx="auto">
        <Typography variant="h4" fontWeight={800} mb={4} color="#0f172a">
          Welcome back to your Workspace
        </Typography>

        <Grid container spacing={4}>
          {/* ─── Analytics ─── */}
          <Grid item xs={12} md={6}>
            <DashboardCard
              title="Invoice Analytics"
              icon={<TimelineIcon color="primary" />}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <StatCard label="Total Invoices" value={stats.totalInvoices} bg="#eff6ff" border="#bfdbfe" color="#1d4ed8" loading={loading} />
                </Grid>
                <Grid item xs={6}>
                  <StatCard label="Matched" value={stats.matchedInvoices} bg="#f0fdf4" border="#bbf7d0" color="#15803d" loading={loading} />
                </Grid>
                <Grid item xs={6}>
                  <StatCard label="Pending / On Hold" value={stats.pendingInvoices} bg="#fffbeb" border="#fde68a" color="#b45309" loading={loading} />
                </Grid>
                <Grid item xs={6}>
                  <StatCard label="Rejected" value={stats.rejectedInvoices} bg="#fef2f2" border="#fecaca" color="#dc2626" loading={loading} />
                </Grid>
              </Grid>
            </DashboardCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <DashboardCard
              title="Procurement Overview"
              icon={<ReceiptLongIcon color="primary" />}
              onClick={() => navigate("/procurement")}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <StatCard label="Total POs" value={stats.totalPOs} bg="#f5f3ff" border="#ddd6fe" color="#7c3aed" loading={loading} />
                </Grid>
                <Grid item xs={6}>
                  <StatCard label="Approved POs" value={stats.approvedPOs} bg="#f0fdf4" border="#bbf7d0" color="#15803d" loading={loading} />
                </Grid>
                <Grid item xs={12}>
                  <StatCard label="Total GRNs" value={stats.totalGRNs} bg="#eff6ff" border="#bfdbfe" color="#1d4ed8" loading={loading} />
                </Grid>
              </Grid>
            </DashboardCard>
          </Grid>

          {/* ─── Fraud Transactions ─── */}
          <Grid item xs={12}>
            <DashboardCard
              title="Flagged / Fraud Transactions"
              icon={<WarningAmberIcon color="error" />}
              sx={{ background: "linear-gradient(135deg, #fff 0%, #fff5f5 100%)", border: "1px solid #fecaca" }}
            >
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : fraudTxns.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary" fontWeight={500}>
                    🎉 No flagged or fraudulent transactions found. Your procurement pipeline is clean!
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#fef2f2" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fraudTxns.map((txn) => (
                        <TableRow key={txn.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {txn.invoice_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {txn.invoice_date
                              ? new Date(txn.invoice_date).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>{txn.supplier_name}</TableCell>
                          <TableCell>
                            ₹{Number(txn.total_amount || 0).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={txn.status === "rejected" ? "Rejected" : "On Hold"}
                              color={txn.status === "rejected" ? "error" : "warning"}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {txn.status === "rejected"
                                ? "PO / GRN mismatch or price inflation detected"
                                : "Pending manual review — possible quantity discrepancy"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DashboardCard>
          </Grid>

          {/* ─── Audit Logs ─── */}
          <Grid item xs={12}>
            <DashboardCard title="Activity History & Audit Logs">
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : auditLogs.length === 0 ? (
                <Typography color="text.secondary" p={2}>
                  No recent activity found.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Entity Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell>
                            {new Date(log.performed_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="#334155">
                              {log.action?.toUpperCase() || "MODIFIED"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={log.entity_type || "System"}
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label="Logged"
                              color="success"
                              sx={{ height: 20, fontSize: "0.7rem" }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DashboardCard>
          </Grid>
        </Grid>
      </Box>

      {/* ── Risk Score Dialog ── */}
      <Dialog
        open={riskDialogOpen}
        onClose={() => setRiskDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ fontWeight: 800, borderBottom: "1px solid #e2e8f0", pb: 2 }}
        >
          Organization Risk Assessment
        </DialogTitle>
        <DialogContent sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {orgDetails?.legal_name}
          </Typography>

          <Box position="relative" display="inline-flex" my={4}>
            <CircularProgress
              variant="determinate"
              value={riskScore ?? 0}
              size={150}
              thickness={4}
              color={riskColor}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h3"
                fontWeight={800}
                color={`${riskColor}.main`}
              >
                {riskScore ?? "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                / 100
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h5"
            color={`${riskColor}.main`}
            fontWeight={700}
            gutterBottom
          >
            {riskLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" px={4}>
            Score is calculated from the ratio of rejected / on-hold invoices
            to total invoices in your organization. A higher score means better
            procurement compliance.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setRiskDialogOpen(false)}
            variant="contained"
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}