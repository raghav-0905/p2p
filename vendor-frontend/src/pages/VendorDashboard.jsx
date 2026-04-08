import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Avatar,
} from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import ReplyIcon from "@mui/icons-material/Reply";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DomainIcon from "@mui/icons-material/Domain";

import MetricTile from "../components/dashboard/MetricTile";
import SectionCard from "../components/dashboard/SectionCard";
import {
  fetchVendorPurchaseOrders,
  fetchVendorInvoices,
  enrichInvoicesWithOrganizations,
  connectVendorToOrg,
} from "../lib/vendorPo";

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [newOrganizations, setNewOrganizations] = useState([]);
  const [connectedOrgs, setConnectedOrgs] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchData();

    const channels = supabase
      .channel("vendor-dash-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "organizations" },
        async (payload) => {
          const newOrg = payload.new;
          setNewOrganizations((prev) => {
            if (prev.some((o) => o.id === newOrg.id)) return prev;
            return [newOrg, ...prev.slice(0, 4)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // vendors.user_id is UNIQUE — always at most one row
      const { data: vendorDataList } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      const vendor = vendorDataList?.[0];
      if (!vendor) return;

      setVendorData(vendor);

      // ── Connected orgs ────────────────────────────────────────────────────
      // Collect org_ids from:
      //   1. vendor.org_id  (primary)
      //   2. vendor_org_links  (additional)
      const linkedOrgIds = new Set();
      if (vendor.org_id) linkedOrgIds.add(vendor.org_id);

      const { data: links } = await supabase
        .from("vendor_org_links")
        .select("org_id")
        .eq("vendor_id", vendor.id);

      (links || []).forEach((l) => {
        if (l?.org_id) linkedOrgIds.add(l.org_id);
      });

      if (linkedOrgIds.size > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, legal_name")
          .in("id", [...linkedOrgIds]);
        setConnectedOrgs(orgs || []);
      } else {
        setConnectedOrgs([]);
      }

      // ── POs + Invoices ────────────────────────────────────────────────────
      const [poRows, invRows] = await Promise.all([
        fetchVendorPurchaseOrders(user.id, vendor),
        fetchVendorInvoices(user.id, vendor),
      ]);

      setPurchaseOrders(poRows);
      const invEnriched = await enrichInvoicesWithOrganizations(invRows);
      setInvoices(invEnriched);

      // ── Payments for fetched invoices ─────────────────────────────────────
      if (invEnriched.length > 0) {
        const invIds = invEnriched.map((i) => i.id);
        const { data: payData } = await supabase
          .from("payments")
          .select("*")
          .in("invoice_id", invIds);
        setPayments(payData || []);
      }
    } catch (error) {
      console.error("[VendorDashboard] fetchData error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Connect vendor to a new org via the bridge table.
   * No longer tries to insert a duplicate vendors row (which would fail
   * because user_id has a UNIQUE constraint).
   */
  const handleConnectOrg = async (orgId) => {
    if (!vendorData?.id) return;

    const { error } = await connectVendorToOrg(vendorData.id, orgId);
    if (error) {
      console.error("[VendorDashboard] handleConnectOrg:", error.message);
      return;
    }

    // Dismiss from "new orgs" banner and refresh
    setNewOrganizations((prev) => prev.filter((org) => org.id !== orgId));
    fetchData();
  };

  const snapshot = useMemo(() => {
    const openPOs = purchaseOrders.filter(
      (p) => (p.status || "").toLowerCase() === "created"
    ).length;
    const approvedPOs = purchaseOrders.filter(
      (p) => (p.status || "").toLowerCase() === "approved"
    ).length;
    const submittedInvoices = invoices.filter((i) =>
      ["submitted", "pending", "pending_approval", "on_hold"].includes(
        (i.status || "").toLowerCase()
      )
    ).length;
    const paymentsDue = payments.filter(
      (p) => (p.status || "").toLowerCase() !== "paid"
    ).length;
    const connectedCount = connectedOrgs.length;

    return { openPOs, approvedPOs, submittedInvoices, paymentsDue, connectedCount };
  }, [purchaseOrders, invoices, payments, connectedOrgs]);

  return (
    <Box>
      {loading && !vendorData ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Box mb={4}>
            <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1}>
              Dashboard Overview
            </Typography>
            <Typography color="text.secondary">
              At-a-glance status for {vendorData?.company_name}
            </Typography>
          </Box>

          <Grid container spacing={2} mb={4} columns={10}>
            <Grid item xs={10} sm={5} md={2}>
              <MetricTile
                loading={loading}
                label="Connected Orgs"
                value={snapshot.connectedCount}
              />
            </Grid>
            <Grid item xs={10} sm={5} md={2}>
              <MetricTile
                loading={loading}
                label="Open POs"
                value={snapshot.openPOs}
                delta="Requires Action"
              />
            </Grid>
            <Grid item xs={10} sm={5} md={2}>
              <MetricTile
                loading={loading}
                label="Approved POs"
                value={snapshot.approvedPOs}
              />
            </Grid>
            <Grid item xs={10} sm={5} md={2}>
              <MetricTile
                loading={loading}
                label="Submitted Invoices"
                value={snapshot.submittedInvoices}
              />
            </Grid>
            <Grid item xs={10} sm={5} md={2}>
              <MetricTile
                loading={loading}
                label="Payments Due"
                value={snapshot.paymentsDue}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Vendor Network — New Orgs Alert */}
            <Grid item xs={12} md={8}>
              {newOrganizations.length > 0 && (
                <Alert
                  severity="info"
                  icon={<DomainIcon fontSize="small" />}
                  sx={{ mb: 3, "& .MuiAlert-icon": { alignItems: "flex-start" } }}
                >
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    New Organizations Available
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {newOrganizations.map((org) => (
                      <Box
                        key={org.id}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={1}
                        bgcolor="rgba(255,255,255,0.5)"
                        borderRadius={1}
                      >
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "primary.light",
                              fontSize: "0.875rem",
                            }}
                          >
                            {org.legal_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {org.legal_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              New buyer — connect to receive POs
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleConnectOrg(org.id)}
                        >
                          Connect
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Alert>
              )}

              <SectionCard
                title="Quick Actions"
                subtitle="Fast paths for common supplier workflows"
              >
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Button
                    component={RouterLink}
                    to="/invoices"
                    variant="contained"
                    startIcon={<AddIcon />}
                  >
                    Submit Invoice
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/purchase-orders"
                    variant="outlined"
                    color="secondary"
                    startIcon={<ReplyIcon />}
                  >
                    Respond to PO
                  </Button>
                </Box>
              </SectionCard>
            </Grid>

            {/* Alerts Panel */}
            <Grid item xs={12} md={4}>
              <SectionCard
                title="Alerts & Notifications"
                subtitle="Important updates requiring your attention"
                sx={{ borderColor: "#fecaca", background: "#fff7f7" }}
              >
                <List disablePadding>
                  {invoices
                    .filter(
                      (i) =>
                        (i.status || "").toLowerCase() === "rejected" ||
                        (i.match_status || "").toLowerCase() === "mismatch"
                    )
                    .slice(0, 2)
                    .map((inv) => (
                      <ListItem
                        key={`inv-rej-${inv.id}`}
                        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                      >
                        <ListItemIcon>
                          <WarningAmberIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`Invoice ${inv.invoice_number} Error`}
                          secondary="Mismatched or Rejected. Needs correction."
                        />
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          component={RouterLink}
                          to="/invoices"
                        >
                          Fix
                        </Button>
                      </ListItem>
                    ))}

                  {payments
                    .filter((p) => (p.status || "").toLowerCase() === "paid")
                    .slice(0, 1)
                    .map((pay) => (
                      <ListItem
                        key={`pay-paid-${pay.id}`}
                        sx={{ bgcolor: "#f0fdf4", mt: 1, borderRadius: 1 }}
                      >
                        <ListItemIcon>
                          <AccountBalanceWalletIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Payment Processed"
                          secondary={`For invoice ${pay.invoice_id}`}
                        />
                        <Chip size="small" label="Paid" color="success" />
                      </ListItem>
                    ))}

                  {purchaseOrders
                    .filter((p) => (p.status || "").toLowerCase() === "created")
                    .slice(0, 1)
                    .map((po) => (
                      <ListItem
                        key={`po-pen-${po.id}`}
                        sx={{ bgcolor: "#fffbeb", mt: 1, borderRadius: 1 }}
                      >
                        <ListItemIcon>
                          <WarningAmberIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary="New PO Received"
                          secondary={`${po.po_number} awaits your acceptance.`}
                        />
                        <Button
                          size="small"
                          variant="text"
                          color="warning"
                          component={RouterLink}
                          to="/purchase-orders"
                        >
                          View
                        </Button>
                      </ListItem>
                    ))}
                </List>
              </SectionCard>
            </Grid>
          </Grid>
        </motion.div>
      )}
    </Box>
  );
}