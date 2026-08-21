import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchVendorPurchaseOrders,
  fetchVendorInvoices,
  enrichInvoicesWithOrganizations,
  enrichInvoicesWithPONumbers,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vendorData, setVendorData] = useState(null);

  const [availablePOs, setAvailablePOs] = useState([]);

  const [newInvoice, setNewInvoice] = useState({
    po_id: "",
    invoice_number: "",
    total_amount: "",
  });
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [fraudData, setFraudData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkedPrNumber, setLinkedPrNumber] = useState(null);

  // Detail dialog for invoice line items
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchInvoices();

    const channel = supabase
      .channel("vendor-invoice-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => fetchInvoices()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
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

      setVendorData(vendor);

      // Fetch + enrich invoices with org name AND po_number
      const invRaw = await fetchVendorInvoices(user.id, vendor);
      const invWithOrg = await enrichInvoicesWithOrganizations(invRaw);
      const invData = await enrichInvoicesWithPONumbers(invWithOrg);
      setInvoices(invData);

      // Only approved POs can be invoiced
      const poRows = await fetchVendorPurchaseOrders(user.id, vendor);
      const approved = poRows.filter(
        (p) => (p.status || "").toLowerCase() === "acknowledged" || (p.status || "").toLowerCase() === "approved"
      );
      setAvailablePOs(
        approved.map((p) => ({
          id: p.id,
          po_number: p.po_number,
          total_amount: p.total_amount,
          org_id: p.org_id,
          pr_id: p.pr_id || null,
        }))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!newInvoice.invoice_number || !newInvoice.total_amount || !newInvoice.po_id) {
      setSnack({ open: true, message: "Please fill all required fields.", severity: "warning" });
      return;
    }
    setUploading(true);
    try {
      const selectedPo = availablePOs.find((p) => p.id === newInvoice.po_id);
      const buyerOrgId = selectedPo?.org_id ?? vendorData.org_id;

      const { data: inserted, error } = await supabase
        .from("invoices")
        .insert([
          {
            po_id: newInvoice.po_id,
            invoice_number: newInvoice.invoice_number,
            total_amount: Number(newInvoice.total_amount),
            supplier_name: vendorData.company_name,
            supplier_gstin: vendorData.gstin || null,
            org_id: buyerOrgId,
            status: "submitted",
            invoice_date: new Date().toISOString().slice(0, 10),
            total_taxable_value: Number(newInvoice.total_amount),
            total_gst_value: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Insert invoice_items
      if (invoiceItems.length > 0 && inserted?.id) {
        const itemsPayload = invoiceItems.map((i) => ({
          invoice_id: inserted.id,
          po_item_id: i.po_item_id || null,
          item_name_snapshot: i.item_name_snapshot,
          hsn_code_snapshot: i.hsn_code_snapshot || null,
          gst_rate_snapshot: i.gst_rate_snapshot || 0,
          quantity: i.quantity,
          unit_price: i.unit_price,
          taxable_value: i.taxable_value,
          gst_amount: i.gst_amount,
          total_amount: i.total_amount,
        }));
        await supabase.from("invoice_items").insert(itemsPayload);
      }

      setUploadOpen(false);
      setNewInvoice({ po_id: "", invoice_number: "", total_amount: "" });
      setInvoiceItems([]);
      setSnack({
        open: true,
        message: `Invoice ${newInvoice.invoice_number} submitted successfully.`,
        severity: "success",
      });
      fetchInvoices();
    } catch (error) {
      console.error(error);
      setSnack({
        open: true,
        message: `Failed to submit invoice: ${error.message}`,
        severity: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const openInvoiceDetails = async (inv) => {
    setSelectedInvoice({ ...inv, items: [] });
    setDetailOpen(true);
    setDetailLoading(true);
    setFraudData(null);

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);
    setSelectedInvoice({ ...inv, items: items || [] });

    try {
      const res = await fetch("http://localhost:3001/api/validate/fraud-assessment/" + inv.id);
      if (res.ok) {
        const assessmentData = await res.json();
        setFraudData(assessmentData);
      }
    } catch (e) {
      console.warn("Failed to fetch fraud assessment", e);
    }

    setDetailLoading(false);
  };

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return "success";
    if (s === "matched" || s === "approved") return "info";
    if (s === "rejected" || s === "on_hold") return "error";
    return "warning";
  };

  const getStatusLabel = (status) => {
    const map = {
      submitted: "Submitted",
      matched: "Matched",
      on_hold: "On Hold",
      paid: "Paid",
      rejected: "Rejected",
    };
    return map[(status || "").toLowerCase()] || status;
  };

  const handlePoSelect = async (e) => {
    const po = availablePOs.find((p) => p.id === e.target.value);
    if (!po) return;
    
    setNewInvoice({ ...newInvoice, po_id: po.id, total_amount: po.total_amount || "" });
    // Fetch and prefill items
    const { data: poItems, error: poItemsError } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", po.id);

    console.log("[InvoiceManagement] PO items fetch ->", {
      po_id: po.id,
      itemCount: poItems?.length ?? 0,
      error: poItemsError ?? "none",
      items: poItems,
    });
      
    if (poItems && poItems.length > 0) {
      setInvoiceItems(poItems.map((i) => ({
        po_item_id: i.id,
        item_name_snapshot: i.item_name_snapshot,
        hsn_code_snapshot: i.hsn_code_snapshot || "",
        gst_rate_snapshot: i.gst_rate_snapshot || 0,
        quantity: i.quantity,
        unit_price: i.unit_price,
        taxable_value: i.taxable_value,
        gst_amount: i.gst_amount,
        total_amount: i.total_amount,
      })));
    } else {
      setInvoiceItems([]);
    }

    // Check if this PO has a linked PR
    if (po.pr_id) {
      const { data: prData } = await supabase
        .from("purchase_requests")
        .select("pr_number")
        .eq("id", po.pr_id)
        .single();
      setLinkedPrNumber(prData?.pr_number || null);
    } else {
      setLinkedPrNumber(null);
    }
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };
      
      if (field === "quantity" || field === "unit_price" || field === "gst_rate_snapshot") {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.unit_price) || 0;
        const gstP = Number(item.gst_rate_snapshot) || 0;
        
        item.taxable_value = qty * rate;
        item.gst_amount = item.taxable_value * (gstP / 100);
        item.total_amount = item.taxable_value + item.gst_amount;
      }
      
      newItems[index] = item;
      
      const totalAmt = newItems.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
      setNewInvoice((prevInv) => ({ ...prevInv, total_amount: totalAmt }));
      
      return newItems;
    });
  };

  const matchType = (inv) => (inv.grn_id ? "3-way" : "2-way");

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "all") return true;
    return (inv.status || "").toLowerCase().includes(statusFilter);
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1e293b" mb={0.5}>
            Invoice Management
          </Typography>
          <Typography color="text.secondary">
            Create and submit invoices against accepted purchase orders.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="matched">Matched</MenuItem>
            <MenuItem value="on_hold">On Hold</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </TextField>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setUploadOpen(true)}
          >
            Submit Invoice
          </Button>
        </Stack>
      </Box>

      {/* Invoice Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Buyer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Match</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 6, color: "text.secondary" }}
                    >
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{inv.invoice_number}</TableCell>
                      {/* ✅ Now shows real PO number, not truncated UUID */}
                      <TableCell>{inv.po_number ?? "—"}</TableCell>
                      <TableCell>{inv.organizations?.legal_name ?? "—"}</TableCell>
                      <TableCell>
                        ₹{Number(inv.total_amount || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${matchType(inv)} match`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(inv.status)}
                          size="small"
                          color={getStatusColor(inv.status)}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View invoice line items">
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => openInvoiceDetails(inv)}
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

      {/* ── Submit Invoice Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onClose={() => !uploading && setUploadOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Submit New Invoice</DialogTitle>
        <DialogContent>
          {availablePOs.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No accepted POs available. Accept a purchase order first before submitting an
              invoice.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Select an accepted PO, then enter your invoice details. Line items will be
              copied automatically.
            </Alert>
          )}

          <TextField
            select
            fullWidth
            required
            label="Select Approved PO"
            value={newInvoice.po_id}
            onChange={handlePoSelect}
            margin="dense"
            disabled={availablePOs.length === 0}
          >
            <MenuItem value="" disabled>
              Select PO
            </MenuItem>
            {availablePOs.map((po) => (
              <MenuItem key={po.id} value={po.id}>
                {po.po_number} — ₹{Number(po.total_amount || 0).toLocaleString("en-IN")}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            required
            label="Invoice Number"
            value={newInvoice.invoice_number}
            onChange={(e) =>
              setNewInvoice({ ...newInvoice, invoice_number: e.target.value })
            }
            margin="dense"
          />
          <TextField
            fullWidth
            required
            type="number"
            label="Total Amount (₹)"
            value={newInvoice.total_amount}
            inputProps={{ readOnly: true }}
            margin="dense"
            helperText="Auto-calculated from line items below."
          />

          {linkedPrNumber && (
            <Box mt={1.5}>
              <Chip
                icon={<AssignmentTurnedInIcon />}
                label={`Items sourced from PR: ${linkedPrNumber}`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}

          {invoiceItems.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Invoice Line Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right" width="20%">Qty</TableCell>
                      <TableCell align="right" width="25%">Unit Price</TableCell>
                      <TableCell align="right" width="15%">Tax %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            variant="standard"
                            value={item.item_name_snapshot}
                            onChange={(e) => handleItemChange(idx, "item_name_snapshot", e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            variant="standard"
                            inputProps={{ min: 0 }}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            variant="standard"
                            inputProps={{ min: 0 }}
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            variant="standard"
                            inputProps={{ min: 0, max: 100 }}
                            value={item.gst_rate_snapshot}
                            onChange={(e) => handleItemChange(idx, "gst_rate_snapshot", e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Box
            border="1px dashed #cbd5e1"
            borderRadius={1}
            p={3}
            mt={2}
            textAlign="center"
            sx={{ cursor: "pointer", bgcolor: "#f8fafc" }}
          >
            <FileUploadIcon color="action" />
            <Typography variant="body2" color="text.secondary">
              Attach invoice PDF (storage integration coming soon)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={uploading || !newInvoice.po_id || availablePOs.length === 0}
          >
            {uploading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Submit Invoice"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Invoice Detail Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Invoice — {selectedInvoice?.invoice_number}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" gap={3} mb={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              <strong>PO:</strong> {selectedInvoice?.po_number ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Buyer:</strong> {selectedInvoice?.organizations?.legal_name ?? "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Status:</strong> {getStatusLabel(selectedInvoice?.status)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Total:</strong> ₹
              {Number(selectedInvoice?.total_amount || 0).toLocaleString("en-IN")}
            </Typography>
          </Box>

          {fraudData && fraudData.match_status === "mismatch" && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold">Invoice Dispute / Mismatch Detected</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                The buyer has flagged this invoice for review due to a discrepancy between your invoice and their goods receipt.
              </Typography>
              {fraudData.match_details && (
                <Box mt={1}>
                  {!fraudData.match_details.amount_match && (
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      • <strong>Amount Mismatch:</strong> Discrepancy of ₹{fraudData.match_details.amount_diff?.toLocaleString("en-IN")} between PO and Invoice.
                    </Typography>
                  )}
                  {!fraudData.match_details.qty_match && fraudData.match_details.mismatched_items && (
                    <>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>• <strong>Quantity Mismatches:</strong></Typography>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {fraudData.match_details.mismatched_items.map((item, idx) => (
                          <li key={idx}>
                            <Typography variant="body2">
                              <strong>{item.item}</strong> - Ordered: {item.po_qty} | Accepted by Buyer (GRN): {item.grn_qty} | Billed by you: {item.inv_qty}
                            </Typography>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Box>
              )}
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
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedInvoice?.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{ color: "text.secondary" }}
                      >
                        No line items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (selectedInvoice?.items || []).map((item, idx) => (
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
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