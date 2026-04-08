import { useState, useMemo, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { motion } from "framer-motion";

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierContactEmail, setSupplierContactEmail] = useState("");
  const [poDate, setPoDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", severity: "success" });

  // Dynamic Line Items
  const [lineItems, setLineItems] = useState([
    { id: Date.now(), name: "", qty: 1, rate: 0, taxPercent: 0 }
  ]);

  useEffect(() => {
    const fetchVendors = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data: orgData } = await supabase
        .from("organization_users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();
      if (!orgData?.org_id) return;

      // Primary path: legacy direct org mapping on vendors.org_id
      const { data: legacyVendors } = await supabase
        .from("vendors")
        .select("*")
        .eq("org_id", orgData.org_id);

      const merged = [...(legacyVendors || [])];
      const unique = Array.from(
        new Map(merged.map((v) => [v.user_id || v.id, v])).values()
      );
      setVendors(unique);
    };
    fetchVendors();
  }, []);

  const handleVendorSelect = (companyName) => {
    setSupplierName(companyName);
    const vendor = vendors.find((v) => v.company_name === companyName) || null;
    setSelectedVendor(vendor);
    if (vendor) {
      setSupplierGstin(vendor.gstin || "");
      setSupplierAddress(vendor.address || "");
      setSupplierPhone(vendor.phone || "");
      setSupplierContactEmail(vendor.contact_email || "");
    } else {
      setSupplierPhone("");
      setSupplierContactEmail("");
    }
  };

  const handleItemChange = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addItemRow = () => {
    setLineItems([...lineItems, { id: Date.now(), name: "", qty: 1, rate: 0, taxPercent: 0 }]);
  };

  const removeItemRow = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  // Derive totals intrinsically based on items
  const totals = useMemo(() => {
    let taxable = 0;
    let gst = 0;
    lineItems.forEach(i => {
      const lineTaxable = Number(i.qty) * Number(i.rate);
      const lineGst = lineTaxable * (Number(i.taxPercent) / 100);
      taxable += lineTaxable;
      gst += lineGst;
    });
    return {
      taxable,
      gst,
      amount: taxable + gst
    };
  }, [lineItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const user = (await supabase.auth.getUser()).data.user;
    const { data: orgData } = await supabase
      .from("organization_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    const { data: createdPO, error } = await supabase.from("purchase_orders").insert([
      {
        org_id: orgData.org_id,
        po_number: poNumber,
        po_date: poDate,
        supplier_name: supplierName,
        supplier_gstin: supplierGstin || null,
        supplier_address: supplierAddress || null,
        total_taxable_value: totals.taxable,
        total_gst_value: totals.gst,
        total_amount: totals.amount,
        created_by: user.id,
        status: "created"
      },
    ]).select("id").single();

    let itemInsertError = null;
    if (!error && createdPO?.id) {
      const itemsPayload = lineItems.map((i) => {
        const taxable = Number(i.qty) * Number(i.rate);
        const gst = taxable * (Number(i.taxPercent) / 100);
        return {
          po_id: createdPO.id,
          item_name_snapshot: i.name,
          gst_rate_snapshot: Number(i.taxPercent),
          quantity: Number(i.qty),
          unit_price: Number(i.rate),
          taxable_value: taxable,
          gst_amount: gst,
          total_amount: taxable + gst,
        };
      });

      const { error: poItemError } = await supabase
        .from("purchase_order_items")
        .insert(itemsPayload);
      itemInsertError = poItemError;
    }

    setLoading(false);
    if (error || itemInsertError) {
      setToast({
        open: true,
        msg: error?.message || itemInsertError?.message || "PO creation failed",
        severity: "error",
      });
    } else {
      setToast({ open: true, msg: "Purchase Order created and items saved.", severity: "success" });
      setPoNumber("");
      setSupplierName("");
      setSupplierGstin("");
      setSupplierAddress("");
      setSupplierPhone("");
      setSupplierContactEmail("");
      setPoDate("");
      setLineItems([{ id: Date.now(), name: "", qty: 1, rate: 0, taxPercent: 0 }]);
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="#f8fafc">
      <AppBar position="static" elevation={0} sx={{ background: "#fff", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate("/user")}>
            <ArrowBackIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 64px)" p={4}>
        <Paper
          component={motion.div}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          elevation={0}
          sx={{ width: "100%", maxWidth: 860, p: 5, borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff" }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: "rgba(79,70,229,0.1)", display: "inline-flex" }}>
              <ReceiptLongIcon color="primary" fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a">
                New Purchase Order
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add supplier details and itemize your requirements.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="PO Number" required value={poNumber} onChange={(e) => setPoNumber(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="date" label="PO Date" required InputLabelProps={{ shrink: true }} value={poDate} onChange={(e) => setPoDate(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              </Grid>

              {/* HIGHLIGHTED VENDOR PICKER */}
              <Grid item xs={12}>
                <Box p={2.5} borderRadius={2} border="2px solid #4f46e5" bgcolor="#eef2ff" boxShadow="0 4px 12px rgba(79,70,229,0.15)">
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <StorefrontIcon sx={{ color: '#4f46e5' }} />
                    <Typography fontWeight={700} color="#4f46e5">Select Registered Vendor</Typography>
                  </Box>
                  <TextField 
                    select 
                    fullWidth 
                    label="Supplier Name" 
                    required 
                    value={supplierName} 
                    onChange={(e) => handleVendorSelect(e.target.value)} 
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, background: '#fff' } }}
                  >
                    {vendors.length === 0 && <MenuItem disabled>No registered vendors</MenuItem>}
                    {vendors.map((v) => (
                      <MenuItem key={v.id || v.user_id || v.company_name} value={v.company_name}>
                        <Typography fontWeight={600} mr={1}>{v.company_name}</Typography>
                        {v.gstin && <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>({v.gstin})</Typography>}
                        <Typography variant="caption" color="text.secondary">({v.contact_email})</Typography>
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Supplier GSTIN" value={supplierGstin} onChange={(e) => setSupplierGstin(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Supplier Address" multiline rows={1} value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact email (from vendor)"
                  value={supplierContactEmail}
                  InputProps={{ readOnly: true }}
                  helperText="Filled when you select a registered vendor"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone (from vendor)"
                  value={supplierPhone}
                  InputProps={{ readOnly: true }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>

            {/* LINE ITEMS SECTION */}
            <Divider sx={{ my: 4 }}><Typography variant="subtitle2" color="text.secondary" textTransform="uppercase">Itemized Requirements</Typography></Divider>
            
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell width="40%">Item / Service Description</TableCell>
                    <TableCell width="12%">Qty</TableCell>
                    <TableCell width="18%">Unit Price (₹)</TableCell>
                    <TableCell width="15%">Tax (%)</TableCell>
                    <TableCell width="5%"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <TextField size="small" fullWidth placeholder="E.g., Dell Latitude Laptops" required value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" fullWidth required inputProps={{ min: 1 }} value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" fullWidth required inputProps={{ min: 0 }} value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField select size="small" fullWidth value={item.taxPercent} onChange={(e) => handleItemChange(item.id, 'taxPercent', e.target.value)}>
                          {[0, 5, 12, 18, 28].map(tax => (
                            <MenuItem key={tax} value={tax}>{tax}%</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => removeItemRow(item.id)} disabled={lineItems.length === 1}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Button variant="text" startIcon={<AddCircleOutlineIcon />} onClick={addItemRow}>
              Add Another Item
            </Button>

            {/* FINANCIAL SUMMARY */}
            <Box mt={4} p={3} bgcolor="#f8fafc" borderRadius={2} border="1px solid #e2e8f0" display="flex" flexDirection="column" gap={1} alignItems="flex-end">
              <Typography variant="body1">Total Taxable Value: <b>₹{totals.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></Typography>
              <Typography variant="body1">Total GST Applied: <b>₹{totals.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b></Typography>
              <Divider sx={{ width: '250px', my: 1 }} />
              <Typography variant="h6" color="#1e293b" fontWeight={800}>Gross PO Value: ₹{totals.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
            </Box>

            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 4, py: 1.5, borderRadius: 2, fontWeight: 600, fontSize: "1rem", textTransform: "none", boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}>
              {loading ? "Creating..." : "Confirm & Dispatch Purchase Order"}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast({ ...toast, open: false })}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}