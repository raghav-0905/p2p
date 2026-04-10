import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchVendorPurchaseOrders,
  enrichPOsWithOrganizations,
  updatePOStatus,
} from "../lib/vendorPo";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

export default function POManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState([]);
  const [pendingNotifications, setPendingNotifications] = useState(0);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { poId, poNumber, newStatus }
  const [actionLoading, setActionLoading] = useState(false);

  // Snackbar feedback
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchPOs();

    const channel = supabase
      .channel("vendor-pos-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        () => fetchPOs()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPOs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vendorList } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      const vendor = vendorList?.[0];
      if (!vendor) return;

      const raw = await fetchVendorPurchaseOrders(user.id, vendor);
      const poData = await enrichPOsWithOrganizations(raw);
      setPos(poData);
      setPendingNotifications(
        poData.filter((po) => (po.status || "").toLowerCase() === "created").length
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Open confirm dialog before acting
  const promptAction = (po, newStatus) => {
    setConfirmAction({ poId: po.id, poNumber: po.po_number, newStatus });
    setConfirmOpen(true);
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    const { poId, poNumber, newStatus } = confirmAction;

    console.log(`[POManagement] Attempting to update PO ${poNumber} to status: "${newStatus}"...`);

    const { error } = await updatePOStatus(poId, newStatus);
    
    console.log(`[POManagement] updatePOStatus Result for ${poNumber} ->`, { error: error || "Success! No RLS blocker detected." });

    setActionLoading(false);
    setConfirmOpen(false);
    setConfirmAction(null);

    if (error) {
      setSnack({
        open: true,
        message: `Failed to update PO ${poNumber}. Please try again.`,
        severity: "error",
      });
    } else {
      const label = (newStatus === "acknowledged" || newStatus === "approved") ? "accepted" : "rejected";
      setSnack({
        open: true,
        message: `PO ${poNumber} has been ${label} successfully.`,
        severity: (newStatus === "acknowledged" || newStatus === "approved") ? "success" : "info",
      });
      fetchPOs();
    }
  };

  const openDetails = async (po) => {
    setSelectedPO({ ...po, items: [] });
    setDetailOpen(true);
    setDetailLoading(true);
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", po.id);
    setSelectedPO({ ...po, items: items || [] });
    setDetailLoading(false);
  };

  const getStatusColor = (status = "") => {
    const s = status.toLowerCase();
    if (s === "acknowledged" || s === "approved") return "success";
    if (s === "closed") return "default";
    if (s === "created" || s === "sent") return "warning";
    if (s === "cancelled") return "error";
    return "default";
  };

  const getStatusLabel = (status = "") => {
    const s = status.toLowerCase();
    if (s === "created" || s === "sent") return "Awaiting Response";
    if (s === "acknowledged" || s === "approved") return "Accepted";
    if (s === "cancelled") return "Rejected";
    if (s === "closed") return "Closed";
    return status;
  };

  const filteredPOs = pos.filter(
    (p) =>
      (p.po_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.organizations?.legal_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1e293b" mb={0.5}>
            Purchase Orders
          </Typography>
          <Typography color="text.secondary">
            Review, accept, or reject inbound purchase orders.
            {pendingNotifications > 0 && (
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
                {pendingNotifications} pending
              </Box>
            )}
          </Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        {/* Search bar */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <TextField
            size="small"
            placeholder="Search by PO number or buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 320 }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Buyer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No purchase orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => {
                    const status = (po.status || "").toLowerCase();
                    const isPending = status === "created";
                    return (
                      <TableRow key={po.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{po.po_number}</TableCell>
                        <TableCell>
                          {new Date(po.po_date || po.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{po.organizations?.legal_name ?? "—"}</TableCell>
                        <TableCell>
                          ₹{Number(po.total_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(po.status)}
                            size="small"
                            color={getStatusColor(po.status)}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {/* View Details always available */}
                            <Tooltip title="View line items">
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<VisibilityIcon fontSize="small" />}
                                onClick={() => openDetails(po)}
                              >
                                Details
                              </Button>
                            </Tooltip>

                            {/* Accept / Reject only for pending POs */}
                            {isPending && (
                              <>
                                <Tooltip title="Accept this PO">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircleOutlinedIcon fontSize="small" />}
                                    onClick={() => promptAction(po, "acknowledged")}
                                  >
                                    Accept
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Reject this PO">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<CancelOutlinedIcon fontSize="small" />}
                                    onClick={() => promptAction(po, "cancelled")}
                                  >
                                    Reject
                                  </Button>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          PO Details — {selectedPO?.po_number}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" gap={3} mb={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              <strong>Buyer:</strong> {selectedPO?.organizations?.legal_name ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Date:</strong>{" "}
              {selectedPO?.po_date
                ? new Date(selectedPO.po_date).toLocaleDateString("en-IN")
                : "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {getStatusLabel(selectedPO?.status)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Total:</strong> ₹
              {Number(selectedPO?.total_amount || 0).toLocaleString("en-IN")}
            </Typography>
          </Box>

          {detailLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unit Price</TableCell>

                    <TableCell sx={{ fontWeight: 700 }}>GST %</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedPO?.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: "text.secondary" }}>
                        No line items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (selectedPO?.items || []).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.item_name_snapshot}</TableCell>

                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          ₹{Number(item.unit_price || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>{item.gst_rate_snapshot ?? 0}%</TableCell>
                        <TableCell>
                          ₹{Number(item.total_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Quick accept/reject inside detail dialog for pending POs */}
          {(selectedPO?.status || "").toLowerCase() === "created" && (
            <Box
              mt={3}
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
                This PO is awaiting your response.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => {
                    setDetailOpen(false);
                    promptAction(selectedPO, "approved");
                  }}
                >
                  Accept PO
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => {
                    setDetailOpen(false);
                    promptAction(selectedPO, "cancelled");
                  }}
                >
                  Reject PO
                </Button>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Action Dialog ─────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => !actionLoading && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {(confirmAction?.newStatus === "acknowledged" || confirmAction?.newStatus === "approved") ? "Accept Purchase Order?" : "Reject Purchase Order?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {(confirmAction?.newStatus === "acknowledged" || confirmAction?.newStatus === "approved")
              ? `You are about to accept PO ${confirmAction?.poNumber}. The buyer will be notified and you can proceed to submit an invoice against it.`
              : `You are about to reject PO ${confirmAction?.poNumber}. This action will notify the buyer. You can contact them to issue a revised PO if needed.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={(confirmAction?.newStatus === "acknowledged" || confirmAction?.newStatus === "approved") ? "success" : "error"}
            onClick={handleConfirmedAction}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (confirmAction?.newStatus === "acknowledged" || confirmAction?.newStatus === "approved") ? (
              "Yes, Accept"
            ) : (
              "Yes, Reject"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}