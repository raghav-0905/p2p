import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { TextField, Button, Box, Typography } from "@mui/material";

function GRNForm() {

  const [poId, setPoId] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState("");

  const handleSubmit = async () => {

    const user = (await supabase.auth.getUser()).data.user;

    const { data: orgData } = await supabase
      .from("organization_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    const orgId = orgData.org_id;

    const { error } = await supabase
      .from("grns")
      .insert([
        {
          org_id: orgId,
          po_id: poId,
          grn_number: grnNumber,
          grn_date: grnDate,
          received_by: user.id
        }
      ]);

    if (error) alert(error.message);
    else alert("GRN Created");
  };

  return (

    <Box p={4} maxWidth={500}>

      <Typography variant="h5">Create GRN</Typography>

      <TextField
        label="PO ID"
        fullWidth
        margin="normal"
        value={poId}
        onChange={(e) => setPoId(e.target.value)}
      />

      <TextField
        label="GRN Number"
        fullWidth
        margin="normal"
        value={grnNumber}
        onChange={(e) => setGrnNumber(e.target.value)}
      />

      <TextField
        type="date"
        fullWidth
        margin="normal"
        onChange={(e) => setGrnDate(e.target.value)}
      />

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSubmit}
      >
        Create GRN
      </Button>

    </Box>

  );
}

export default GRNForm;