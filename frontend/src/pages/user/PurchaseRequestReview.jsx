import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  pending: "warning",
  accepted: "success",
  rejected: "error",
};

export default function PurchaseRequestReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prs, setPrs] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [prItems, setPrItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchPRs();

    const channel = supabase
      .channel("customer-pr-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_requests" },
        () => fetchPRs()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgUser } = await supabase
        .from("organization_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!orgUser) return;
      const orgId = orgUser.org_id;

      // Fetch PRs for this org
      const { data: prData, error: prError } = await supabase
        .from("purchase_requests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (prError) throw prError;

      // Enrich with vendor company_name
      const vendorIds = [...new Set((prData || []).map((p) => p.vendor_id).filter(Boolean))];
      let vendorMap = {};
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase
          .from("vendors")
          .select("id, company_name, contact_email, gstin")
          .in("id", vendorIds);
        vendorMap = Object.fromEntries((vendors || []).map((v) => [v.id, v]));
      }

      setPrs(
        (prData || []).map((pr) => ({
          ...pr,
          vendor: vendorMap[pr.vendor_id] || null,
          vendor_name: vendorMap[pr.vendor_id]?.company_name || "Unknown Vendor",
        }))
      );
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: "Failed to load purchase requests", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (pr) => {
    setSelectedPR(pr);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const { data, error } = await supabase
        .from("purchase_request_items")
        .select("*")
        .eq("pr_id", pr.id);
      if (error) throw error;
      setPrItems(data || []);
    } catch (err) {
      console.error(err);
      setPrItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const promptAction = (pr, newStatus) => {
    setConfirmAction({ prId: pr.id, prNumber: pr.pr_number, newStatus });
    setConfirmOpen(true);
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    const { prId, prNumber, newStatus } = confirmAction;

    try {
      const updates = { status: newStatus };
      if (newStatus === "accepted") {
        updates.accepted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_requests")
        .update(updates)
        .eq("id", prId);

      if (error) throw error;

      const label = newStatus === "accepted" ? "accepted" : "rejected";
      setSnack({
        open: true,
        message: `PR ${prNumber} has been ${label} successfully.`,
        severity: newStatus === "accepted" ? "success" : "info",
      });
      fetchPRs();

      // Also update detail dialog if open
      if (selectedPR && selectedPR.id === prId) {
        setSelectedPR({ ...selectedPR, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message: `Failed to update PR ${prNumber}. Please try again.`,
        severity: "error",
      });
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const filteredPrs = prs.filter((pr) => {
    if (statusFilter === "all") return true;
    return (pr.status || "").toLowerCase() === statusFilter;
  });

  const pendingCount = prs.filter((p) => (p.status || "").toLowerCase() === "pending").length;

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
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
          <IconButton edge="start" color="inherit" onClick={() => navigate("/user")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ ml: 2, fontWeight: 700, color: "#4f46e5" }}>
            Purchase Requests
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        p={4}
        maxWidth="1400px"
        mx="auto"
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: "rgba(79,70,229,0.1)",
                display: "inline-flex",
              }}
            >
              <AssignmentTurnedInIcon color="primary" fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#0f172a">
                Purchase Request Review
              </Typography>
              <Typography color="text.secondary">
                Review, accept, or reject purchase requests from vendors.
                {pendingCount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 1.5,
                      py: 0.25,
                      bgcolor: "warning.main",
                      color: "white",
                      borderRadius: 10,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {pendingCount} pending
                  </Box>
                )}
              </Typography>
            </Box>
          </Box>
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
        </Box>

        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" p={6}>
              <CircularProgress />
            </Box>
          ) : filteredPrs.length === 0 ? (
            <Box p={6} textAlign="center">
              <Typography color="text.secondary">
                No purchase requests found.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>PR Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Vendor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPrs.map((pr) => {
                    const isPending = (pr.status || "").toLowerCase() === "pending";
                    return (
                      <TableRow key={pr.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{pr.pr_number}</Typography>
                        </TableCell>
                        <TableCell>{pr.vendor_name}</TableCell>
                        <TableCell>
                          {new Date(pr.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          ₹{Number(pr.total_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={pr.status?.charAt(0).toUpperCase() + pr.status?.slice(1)}
                            color={STATUS_COLORS[pr.status] || "default"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => openDetails(pr)}
                            >
                              Details
                            </Button>
                            {isPending && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircleOutlineIcon />}
                                  onClick={() => promptAction(pr, "accepted")}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<CancelOutlinedIcon />}
                                  onClick={() => promptAction(pr, "rejected")}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* ── Detail Dialog ────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedPR && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              Purchase Request: {selectedPR.pr_number}
            </DialogTitle>
            <DialogContent dividers>
              <Box display="flex" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Vendor</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedPR.vendor_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                  <Typography variant="body1">
                    {selectedPR.vendor?.gstin || "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">
                    {new Date(selectedPR.created_at).toLocaleDateString("en-IN")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    ₹{Number(selectedPR.total_amount || 0).toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>

              {selectedPR.notes && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Vendor Notes:</strong> {selectedPR.notes}
                </Alert>
              )}

              <Typography variant="h6" mb={2} fontSize="1rem">
                Line Items
              </Typography>
              {detailLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress size={30} />
                </Box>
              ) : prItems.length === 0 ? (
                <Typography color="text.secondary" mb={3}>
                  No itemized details provided.
                </Typography>
              ) : (
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{ border: "1px solid #e2e8f0", mb: 3 }}
                >
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">GST %</TableCell>
                        <TableCell align="right">Taxable</TableCell>
                        <TableCell align="right">GST Amt</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">₹{Number(item.unit_price || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell align="right">{item.gst_rate}%</TableCell>
                          <TableCell align="right">₹{Number(item.taxable_value || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell align="right">₹{Number(item.gst_amount || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹{Number(item.total_amount || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Quick accept/reject inside the detail dialog */}
              {(selectedPR.status || "").toLowerCase() === "pending" && (
                <Box
                  mt={2}
                  p={2}
                  bgcolor="#fffbeb"
                  borderRadius={1}
                  border="1px solid"
                  borderColor="warning.light"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                >
                  <Typography variant="body2" color="warning.dark" fontWeight={600}>
                    This Purchase Request is awaiting your response.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => {
                        setDetailOpen(false);
                        promptAction(selectedPR, "accepted");
                      }}
                    >
                      Accept PR
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => {
                        setDetailOpen(false);
                        promptAction(selectedPR, "rejected");
                      }}
                    >
                      Reject PR
                    </Button>
                  </Stack>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary" display="inline" mr={2}>
                  Current Status:{" "}
                  <Chip
                    size="small"
                    label={selectedPR.status?.charAt(0).toUpperCase() + selectedPR.status?.slice(1)}
                    color={STATUS_COLORS[selectedPR.status] || "default"}
                  />
                </Typography>
              </Box>
              <Button onClick={() => setDetailOpen(false)} color="inherit">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Confirm Action Dialog ────────────────────────────────── */}
      <Dialog
        open={confirmOpen}
        onClose={() => !actionLoading && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmAction?.newStatus === "accepted"
            ? "Accept Purchase Request?"
            : "Reject Purchase Request?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmAction?.newStatus === "accepted"
              ? `You are about to accept PR ${confirmAction?.prNumber}. The vendor will be notified and you can create Purchase Orders using the agreed items and prices.`
              : `You are about to reject PR ${confirmAction?.prNumber}. The vendor will be notified. They may revise and resubmit a new PR.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmAction?.newStatus === "accepted" ? "success" : "error"}
            onClick={handleConfirmedAction}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : confirmAction?.newStatus === "accepted" ? (
              "Yes, Accept"
            ) : (
              "Yes, Reject"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ─────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          sx={{ width: "100%" }}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
