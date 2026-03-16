import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { TextField, Button, Box, Typography } from "@mui/material";

function PurchaseOrderForm() {

  const [poNumber, setPoNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [poDate, setPoDate] = useState("");

  const handleSubmit = async () => {

    const user = (await supabase.auth.getUser()).data.user;

    const { data: orgData } = await supabase
      .from("organization_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    const orgId = orgData.org_id;

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert([
        {
          org_id: orgId,
          po_number: poNumber,
          po_date: poDate,
          supplier_name: supplierName,
          supplier_gstin: supplierGstin,
          created_by: user.id
        }
      ]);

    if (error) alert(error.message);
    else alert("Purchase Order Created");
  };

  return (

    <Box p={4} maxWidth={500}>

      <Typography variant="h5">Create Purchase Order</Typography>

      <TextField
        fullWidth
        label="PO Number"
        margin="normal"
        value={poNumber}
        onChange={(e) => setPoNumber(e.target.value)}
      />

      <TextField
        fullWidth
        label="Supplier Name"
        margin="normal"
        value={supplierName}
        onChange={(e) => setSupplierName(e.target.value)}
      />

      <TextField
        fullWidth
        label="Supplier GSTIN"
        margin="normal"
        value={supplierGstin}
        onChange={(e) => setSupplierGstin(e.target.value)}
      />

      <TextField
        type="date"
        fullWidth
        margin="normal"
        onChange={(e) => setPoDate(e.target.value)}
      />

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSubmit}
      >
        Create PO
      </Button>

    </Box>

  );
}

export default PurchaseOrderForm;