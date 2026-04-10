import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";

export default function PRManagement() {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [availableOrgs, setAvailableOrgs] = useState([]);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [prNumber, setPrNumber] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState([
    { id: Date.now(), item_name: "", quantity: 1, unit_price: 0, gst_rate: 0 },
  ]);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchPRs();

    const channel = supabase
      .channel("vendor-pr-channel")
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

      const { data: vendorList } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      const vendor = vendorList?.[0];
      if (!vendor) return;
      setVendorData(vendor);

      // Fetch PRs for this vendor
      const { data: prData } = await supabase
        .from("purchase_requests")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      // Enrich with org names
      const orgIds = [...new Set((prData || []).map((p) => p.org_id).filter(Boolean))];
      let orgMap = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, legal_name")
          .in("id", orgIds);
        orgMap = Object.fromEntries((orgs || []).map((o) => [o.id, o.legal_name]));
      }

      setPrs(
        (prData || []).map((pr) => ({
          ...pr,
          org_name: orgMap[pr.org_id] || "Unknown",
        }))
      );

      // Fetch linked orgs for the create dialog
      const linkedOrgIds = new Set();
      if (vendor.org_id) linkedOrgIds.add(vendor.org_id);

      const { data: links } = await supabase
        .from("vendor_org_links")
        .select("org_id")
        .eq("vendor_id", vendor.id);
      (links || []).forEach((l) => { if (l.org_id) linkedOrgIds.add(l.org_id); });

      if (linkedOrgIds.size > 0) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, legal_name")
          .in("id", [...linkedOrgIds]);
        setAvailableOrgs(orgData || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Line item helpers
  const handleItemChange = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (["quantity", "unit_price", "gst_rate"].includes(field)) {
          const qty = Number(updated.quantity) || 0;
          const price = Number(updated.unit_price) || 0;
          const gst = Number(updated.gst_rate) || 0;
          updated.taxable_value = qty * price;
          updated.gst_amount = updated.taxable_value * (gst / 100);
          updated.total_amount = updated.taxable_value + updated.gst_amount;
        }
        return updated;
      })
    );
  };

  const addItemRow = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now(), item_name: "", quantity: 1, unit_price: 0, gst_rate: 0 },
    ]);
  };

  const removeItemRow = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((i) => i.id !== id));
    }
  };

  const computeTotals = () => {
    let taxable = 0, gst = 0;
    lineItems.forEach((i) => {
      const lineTaxable = Number(i.quantity || 0) * Number(i.unit_price || 0);
      const lineGst = lineTaxable * (Number(i.gst_rate || 0) / 100);
      taxable += lineTaxable;
      gst += lineGst;
    });
    return { taxable, gst, total: taxable + gst };
  };

  const handleCreateSubmit = async () => {
    if (!prNumber || !selectedOrgId) {
      setSnack({ open: true, message: "PR Number and Organization are required.", severity: "warning" });
      return;
    }
    if (lineItems.some((i) => !i.item_name)) {
      setSnack({ open: true, message: "All items must have a name.", severity: "warning" });
      return;
    }

    setCreating(true);
    try {
      const totals = computeTotals();

      const { data: inserted, error } = await supabase
        .from("purchase_requests")
        .insert([
          {
            pr_number: prNumber,
            vendor_id: vendorData.id,
            org_id: selectedOrgId,
            status: "pending",
            notes: notes || null,
            total_taxable_value: totals.taxable,
            total_gst_value: totals.gst,
            total_amount: totals.total,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Insert line items
      if (inserted?.id) {
        const itemsPayload = lineItems.map((i) => {
          const taxable = Number(i.quantity || 0) * Number(i.unit_price || 0);
          const gstAmt = taxable * (Number(i.gst_rate || 0) / 100);
          return {
            pr_id: inserted.id,
            item_name: i.item_name,
            hsn_code: i.hsn_code || null,
            unit_price: Number(i.unit_price || 0),
            gst_rate: Number(i.gst_rate || 0),
            quantity: Number(i.quantity || 1),
            taxable_value: taxable,
            gst_amount: gstAmt,
            total_amount: taxable + gstAmt,
          };
        });
        await supabase.from("purchase_request_items").insert(itemsPayload);
      }

      setCreateOpen(false);
      setPrNumber("");
      setSelectedOrgId("");
      setNotes("");
      setLineItems([{ id: Date.now(), item_name: "", quantity: 1, unit_price: 0, gst_rate: 0 }]);
      setSnack({
        open: true,
        message: `Purchase Request ${prNumber} submitted successfully.`,
        severity: "success",
      });
      fetchPRs();
    } catch (error) {
      console.error(error);
      setSnack({
        open: true,
        message: `Failed to create PR: ${error.message}`,
        severity: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  const openDetails = async (pr) => {
    setSelectedPR({ ...pr, items: [] });
    setDetailOpen(true);
    setDetailLoading(true);
    const { data: items } = await supabase
      .from("purchase_request_items")
      .select("*")
      .eq("pr_id", pr.id);
    setSelectedPR({ ...pr, items: items || [] });
    setDetailLoading(false);
  };

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "accepted") return "success";
    if (s === "rejected") return "error";
    return "warning";
  };

  const getStatusLabel = (status) => {
    const map = { pending: "Pending", accepted: "Accepted", rejected: "Rejected" };
    return map[(status || "").toLowerCase()] || status;
  };

  const totals = computeTotals();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1e293b" mb={0.5}>
            Purchase Requests
          </Typography>
          <Typography color="text.secondary">
            Create and submit purchase requests to your buyer organizations.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Create PR
        </Button>
      </Box>

      {/* PR Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>PR Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No purchase requests found. Create your first PR above.
                    </TableCell>
                  </TableRow>
                ) : (
                  prs.map((pr) => (
                    <TableRow key={pr.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{pr.pr_number}</TableCell>
                      <TableCell>{pr.org_name}</TableCell>
                      <TableCell>
                        {new Date(pr.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>₹{Number(pr.total_amount || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(pr.status)}
                          size="small"
                          color={getStatusColor(pr.status)}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View line items">
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => openDetails(pr)}
                          >
                            Details
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Create PR Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Create Purchase Request</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Specify items, unit prices, and GST rates. The buyer organization must accept this PR
            before creating Purchase Orders against it.
          </Alert>

          <Stack spacing={2} mt={1}>
            <TextField
              fullWidth
              required
              label="PR Number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="e.g., PR-2026-001"
            />
            <TextField
              select
              fullWidth
              required
              label="Target Organization"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              disabled={availableOrgs.length === 0}
            >
              {availableOrgs.length === 0 ? (
                <MenuItem value="" disabled>No linked organizations</MenuItem>
              ) : (
                availableOrgs.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.legal_name}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              fullWidth
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
            />
          </Stack>

          <Divider sx={{ my: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase">
              Line Items
            </Typography>
          </Divider>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell width="35%">Item Name</TableCell>
                  <TableCell width="10%">Qty</TableCell>
                  <TableCell width="18%">Unit Price (₹)</TableCell>
                  <TableCell width="12%">GST %</TableCell>
                  <TableCell width="18%">Total (₹)</TableCell>
                  <TableCell width="7%"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lineItems.map((item) => {
                  const taxable = Number(item.quantity || 0) * Number(item.unit_price || 0);
                  const gstAmt = taxable * (Number(item.gst_rate || 0) / 100);
                  const lineTotal = taxable + gstAmt;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          variant="standard"
                          placeholder="e.g., Steel Rods 10mm"
                          value={item.item_name}
                          onChange={(e) => handleItemChange(item.id, "item_name", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          fullWidth
                          variant="standard"
                          inputProps={{ min: 1 }}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          fullWidth
                          variant="standard"
                          inputProps={{ min: 0 }}
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(item.id, "unit_price", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          variant="standard"
                          value={item.gst_rate}
                          onChange={(e) => handleItemChange(item.id, "gst_rate", e.target.value)}
                        >
                          {[0, 5, 12, 18, 28].map((tax) => (
                            <MenuItem key={tax} value={tax}>{tax}%</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeItemRow(item.id)}
                          disabled={lineItems.length === 1}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            variant="text"
            startIcon={<AddCircleOutlinedIcon />}
            onClick={addItemRow}
            sx={{ mb: 2 }}
          >
            Add Another Item
          </Button>

          {/* Financial Summary */}
          <Box
            p={2}
            bgcolor="#f8fafc"
            borderRadius={1}
            border="1px solid #e2e8f0"
            display="flex"
            flexDirection="column"
            gap={0.5}
            alignItems="flex-end"
          >
            <Typography variant="body2">
              Taxable: <b>₹{totals.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b>
            </Typography>
            <Typography variant="body2">
              GST: <b>₹{totals.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b>
            </Typography>
            <Divider sx={{ width: 200, my: 0.5 }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Total: ₹{totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={creating || !prNumber || !selectedOrgId}
          >
            {creating ? <CircularProgress size={20} color="inherit" /> : "Submit PR"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Purchase Request — {selectedPR?.pr_number}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" gap={3} mb={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              <strong>Organization:</strong> {selectedPR?.org_name ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong>{" "}
              <Chip
                label={getStatusLabel(selectedPR?.status)}
                size="small"
                color={getStatusColor(selectedPR?.status)}
              />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Total:</strong> ₹{Number(selectedPR?.total_amount || 0).toLocaleString("en-IN")}
            </Typography>
          </Box>

          {selectedPR?.notes && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Notes:</strong> {selectedPR.notes}
            </Alert>
          )}

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
                    <TableCell sx={{ fontWeight: 700 }}>Taxable</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>GST Amt</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedPR?.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ color: "text.secondary" }}>
                        No line items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (selectedPR?.items || []).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{Number(item.unit_price || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>{item.gst_rate ?? 0}%</TableCell>
                        <TableCell>₹{Number(item.taxable_value || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>₹{Number(item.gst_amount || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          ₹{Number(item.total_amount || 0).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ─────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4500}
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
