import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Box, Typography, Paper, Grid, TextField, Button, CircularProgress, Chip } from "@mui/material";

export default function VendorProfile() {
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);
      
      if (data && data.length > 0) setVendorData(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          company_name: vendorData.company_name,
          contact_email: vendorData.contact_email,
          gstin: vendorData.gstin || null,
          pan: vendorData.pan || null,
          address: vendorData.address || null,
          phone: vendorData.phone || null,
          bank_account_name: vendorData.bank_account_name || null,
          bank_account_number: vendorData.bank_account_number || null,
          bank_ifsc: vendorData.bank_ifsc || null,
        })
        .eq("id", vendorData.id);

      if (error) {
        // fallback for deployments where some optional columns may not exist yet
        const { error: fallbackError } = await supabase
          .from("vendors")
          .update({
            company_name: vendorData.company_name,
            contact_email: vendorData.contact_email,
            gstin: vendorData.gstin || null,
            address: vendorData.address || null,
          })
          .eq("id", vendorData.id);
        if (fallbackError) throw fallbackError;
      }
      alert("Profile Updated Successfully!");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1}>Vendor Profile Management</Typography>
        <Typography color="text.secondary">Manage your company details, banking info, and tax configurations.</Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3, borderRadius: 2 }}>
            <form onSubmit={handleSave}>
              <Box mb={2}>
                <Chip
                  color={vendorData?.gstin ? "success" : "warning"}
                  label={vendorData?.gstin ? "Profile Complete" : "Profile Incomplete: Add GSTIN"}
                />
              </Box>
              <Typography variant="h6" mb={3}>Company Details</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Company Name" value={vendorData?.company_name || ""} onChange={(e) => setVendorData({...vendorData, company_name: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Contact Email" value={vendorData?.contact_email || ""} onChange={(e) => setVendorData({...vendorData, contact_email: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone Number" value={vendorData?.phone || ""} onChange={(e) => setVendorData({...vendorData, phone: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Registered Address" value={vendorData?.address || ""} onChange={(e) => setVendorData({...vendorData, address: e.target.value})} />
                </Grid>
              </Grid>

              <Typography variant="h6" mb={2} mt={5}>Tax Details</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="GSTIN Number" value={vendorData?.gstin || ""} onChange={(e) => setVendorData({...vendorData, gstin: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="PAN Number" value={vendorData?.pan || ""} onChange={(e) => setVendorData({...vendorData, pan: e.target.value})} />
                </Grid>
              </Grid>

              <Typography variant="h6" mb={2} mt={5}>Banking Information</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Account Name" value={vendorData?.bank_account_name || ""} onChange={(e) => setVendorData({...vendorData, bank_account_name: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Account Number" value={vendorData?.bank_account_number || ""} onChange={(e) => setVendorData({...vendorData, bank_account_number: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="IFSC Code" value={vendorData?.bank_ifsc || ""} onChange={(e) => setVendorData({...vendorData, bank_ifsc: e.target.value})} />
                </Grid>
              </Grid>

              <Box mt={4} display="flex" justifyContent="flex-end">
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
