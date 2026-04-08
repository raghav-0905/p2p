import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchVendorPurchaseOrders,
  fetchVendorInvoices,
  enrichInvoicesWithOrganizations,
} from "../lib/vendorPo";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FileUploadIcon from "@mui/icons-material/FileUpload";

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
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInvoices();

    const channel = supabase.channel('vendor-invoice-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (vendor) {
        setVendorData(vendor);
        const invRaw = await fetchVendorInvoices(user.id, vendor);
        const invData = await enrichInvoicesWithOrganizations(invRaw);
        setInvoices(invData);

        const poRows = await fetchVendorPurchaseOrders(user.id, vendor);
        const approved = poRows.filter(
          (p) => (p.status || "").toLowerCase() === "approved"
        );
        setAvailablePOs(
          approved.map((p) => ({
            id: p.id,
            po_number: p.po_number,
            total_amount: p.total_amount,
            org_id: p.org_id,
          }))
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!newInvoice.invoice_number || !newInvoice.total_amount || !newInvoice.po_id) return;
    setUploading(true);
    try {
      const selectedPo = availablePOs.find((p) => p.id === newInvoice.po_id);
      const buyerOrgId = selectedPo?.org_id ?? vendorData.org_id;
      const { error } = await supabase.from("invoices").insert([{
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
      }]);
      
      if (!error) {
        if (selectedPo?.id) {
          const { data: poItems } = await supabase
            .from("purchase_order_items")
            .select("*")
            .eq("po_id", selectedPo.id);
          if (poItems?.length) {
            const { data: invoiceRow } = await supabase
              .from("invoices")
              .select("id")
              .eq("po_id", selectedPo.id)
              .eq("invoice_number", newInvoice.invoice_number)
              .single();
            if (invoiceRow?.id) {
              const invoiceItems = poItems.map((i) => ({
                invoice_id: invoiceRow.id,
                po_item_id: i.id,
                item_name_snapshot: i.item_name_snapshot,
                hsn_code_snapshot: i.hsn_code_snapshot || null,
                gst_rate_snapshot: i.gst_rate_snapshot || 0,
                quantity: i.quantity,
                unit_price: i.unit_price,
                taxable_value: i.taxable_value,
                gst_amount: i.gst_amount,
                total_amount: i.total_amount,
              }));
              await supabase.from("invoice_items").insert(invoiceItems);
            }
          }
        }
        setUploadOpen(false);
        setNewInvoice({ po_id: "", invoice_number: "", total_amount: "" });
        fetchInvoices();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("paid")) return "success";
    if (s.includes("approved") || s.includes("matched")) return "info";
    if (s.includes("rejected") || s.includes("hold")) return "error";
    return "warning"; 
  };

  const handlePoSelect = (e) => {
    const po = availablePOs.find(p => p.id === e.target.value);
    if(po) {
      setNewInvoice({ ...newInvoice, po_id: po.id, total_amount: po.total_amount || "" });
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "all") return true;
    return (inv.status || "").toLowerCase().includes(statusFilter);
  });

  const matchType = (inv) => (inv.grn_id ? "3-way" : "2-way");

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1}>Invoice Management</Typography>
          <Typography color="text.secondary">Create and submit invoices against accepted purchase orders.</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </TextField>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
          Submit Invoice
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
      ) : (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No invoices found.</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{inv.invoice_number}</TableCell>
                      <TableCell>{inv.po_id ? String(inv.po_id).slice(0, 8) : "-"}</TableCell>
                      <TableCell>{inv.organizations?.legal_name}</TableCell>
                      <TableCell>₹{Number(inv.total_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1} alignItems="center">
                          <Chip label={inv.status} size="small" color={getStatusColor(inv.status)} sx={{ fontWeight: 600 }} />
                          <Chip label={`${matchType(inv)} match`} size="small" variant="outlined" />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Submit New Invoice</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>Select an accepted (approved) purchase order, then enter your invoice details.</Alert>
          
          <TextField select fullWidth required label="Select Approved PO" value={newInvoice.po_id} onChange={handlePoSelect} margin="dense">
            <MenuItem value="" disabled>Select PO</MenuItem>
            {availablePOs.map(po => (
              <MenuItem key={po.id} value={po.id}>{po.po_number}</MenuItem>
            ))}
          </TextField>

          <TextField fullWidth required label="Invoice Number" value={newInvoice.invoice_number} onChange={(e) => setNewInvoice({...newInvoice, invoice_number: e.target.value})} margin="dense" />
          <TextField fullWidth required type="number" label="Total Amount (₹)" value={newInvoice.total_amount} onChange={(e) => setNewInvoice({...newInvoice, total_amount: e.target.value})} margin="dense" />
          <Box border="1px dashed #cbd5e1" borderRadius={1} p={3} mt={2} textAlign="center" sx={{ cursor: 'pointer', bgcolor: '#f8fafc' }}>
             <FileUploadIcon color="action" />
             <Typography variant="body2" color="text.secondary">Document upload can be integrated next (storage).</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button onClick={handleUploadSubmit} variant="contained" disabled={uploading || !newInvoice.po_id}>
            {uploading ? <CircularProgress size={20} color="inherit" /> : "Submit Invoice"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
