import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { TextField, Button, Box, Typography } from "@mui/material";

function InvoiceForm() {

  const [poId, setPoId] = useState("");
  const [grnId, setGrnId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");

  const handleSubmit = async () => {

    const user = (await supabase.auth.getUser()).data.user;

    const { data: orgData } = await supabase
      .from("organization_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    const orgId = orgData.org_id;

    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          org_id: orgId,
          po_id: poId,
          grn_id: grnId,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          supplier_name: supplierName,
          supplier_gstin: supplierGstin
        }
      ]);

    if (error) alert(error.message);
    else alert("Invoice Created");
  };

  return (

    <Box p={4} maxWidth={500}>

      <Typography variant="h5">Create Invoice</Typography>

      <TextField
        label="PO ID"
        fullWidth
        margin="normal"
        value={poId}
        onChange={(e) => setPoId(e.target.value)}
      />

      <TextField
        label="GRN ID"
        fullWidth
        margin="normal"
        value={grnId}
        onChange={(e) => setGrnId(e.target.value)}
      />

      <TextField
        label="Invoice Number"
        fullWidth
        margin="normal"
        value={invoiceNumber}
        onChange={(e) => setInvoiceNumber(e.target.value)}
      />

      <TextField
        type="date"
        fullWidth
        margin="normal"
        onChange={(e) => setInvoiceDate(e.target.value)}
      />

      <TextField
        label="Supplier Name"
        fullWidth
        margin="normal"
        value={supplierName}
        onChange={(e) => setSupplierName(e.target.value)}
      />

      <TextField
        label="Supplier GSTIN"
        fullWidth
        margin="normal"
        value={supplierGstin}
        onChange={(e) => setSupplierGstin(e.target.value)}
      />

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSubmit}
      >
        Create Invoice
      </Button>

    </Box>

  );
}

export default InvoiceForm;