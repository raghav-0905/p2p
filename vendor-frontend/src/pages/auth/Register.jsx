import { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  MenuItem,
  Grid,
  Paper,
  Link,
  Autocomplete,
  Chip,
  Divider
} from "@mui/material";
import { motion } from "framer-motion";
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    password: "",
    selected_orgs: [],
    gstin: "",
    pan: "",
    address: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc: "",
  });

  const normalizeEmail = (email) => (email || "").trim().toLowerCase();

  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const phoneDigits = (p) => (p || "").replace(/\D/g, "");

  const validateForm = () => {
    if (formData.selected_orgs.length === 0) {
      return "Select at least one buying organization.";
    }
    if (!formData.company_name?.trim()) return "Company name is required.";
    if (!formData.contact_person?.trim()) return "Contact person name is required.";
    if (!normalizeEmail(formData.email)) return "Valid email is required.";
    const digits = phoneDigits(formData.phone);
    if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number (10–15 digits).";
    if (!formData.gstin?.trim()) return "GSTIN is required for verified supplier registration.";
    if (!gstinPattern.test(formData.gstin.trim().toUpperCase())) {
      return "GSTIN format looks invalid (15 characters, Indian format).";
    }
    if (formData.pan?.trim() && !panPattern.test(formData.pan.trim().toUpperCase())) {
      return "PAN format looks invalid.";
    }
    if (!formData.address?.trim() || formData.address.trim().length < 10) {
      return "Registered address must be at least 10 characters.";
    }
    if (!formData.password || formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return null;
  };

  useEffect(() => {
    // Fetch available organizations to register with
    const fetchOrgs = async () => {
      const { data, error: orgError } = await supabase
        .from("organizations")
        .select("id, legal_name");
      
      if (!orgError && data) {
        setOrganizations(data);
      }
    };
    fetchOrgs();
  }, []);

const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "selected_orgs") {
      setFormData((prev) => ({
        ...prev,
        [name]: typeof value === "string" ? value.split(",") : value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMultiSelectChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      selected_orgs: newValue.map(org => org.id),
    }));
  };

      const handleRegister = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error("Registration failed.");

      const primaryOrgId = formData.selected_orgs[0];

      // 2. Create or update vendor profile (legacy compatibility + safer retries)
      const { data: existingVendor, error: existingVendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (existingVendorError) throw existingVendorError;

      const vendorPayloadFull = {
        company_name: formData.company_name.trim(),
        contact_email: normalizeEmail(formData.email),
        org_id: primaryOrgId,
        gstin: formData.gstin.trim().toUpperCase(),
        pan: formData.pan?.trim() ? formData.pan.trim().toUpperCase() : null,
        address: formData.address.trim(),
        phone: phoneDigits(formData.phone),
        contact_person: formData.contact_person.trim(),
        bank_account_name: formData.bank_account_name?.trim() || null,
        bank_account_number: formData.bank_account_number?.trim() || null,
        bank_ifsc: formData.bank_ifsc?.trim()?.toUpperCase() || null,
        registration_status: "pending_verification",
      };

      const vendorPayloadMinimal = {
        company_name: vendorPayloadFull.company_name,
        contact_email: vendorPayloadFull.contact_email,
        org_id: primaryOrgId,
        gstin: vendorPayloadFull.gstin,
        address: vendorPayloadFull.address,
      };

      const upsertVendor = async (payload) => {
        if (existingVendor?.id) {
          const { error } = await supabase.from("vendors").update(payload).eq("id", existingVendor.id);
          return error;
        }
        const { error } = await supabase.from("vendors").insert([{ user_id: authData.user.id, ...payload }]);
        return error;
      };

      let vendorErr = await upsertVendor(vendorPayloadFull);
      if (vendorErr) {
        vendorErr = await upsertVendor(vendorPayloadMinimal);
        if (vendorErr) throw vendorErr;
      }

      // 3. Link to ALL selected organizations via vendors table
      for (const orgId of formData.selected_orgs) {
        if (orgId === primaryOrgId) continue; // Already handled by upsertVendor above
        const { data: existingLink, error: linkCheckError } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", authData.user.id)
          .eq("org_id", orgId)
          .maybeSingle();

        if (existingLink?.id || linkCheckError) continue;

        await supabase
          .from("vendors")
          .insert([{ ...vendorPayloadFull, user_id: authData.user.id, org_id: orgId }]);
      }

      // 4. Verify registration writes are actually present
      const { data: verifyVendor, error: verifyVendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (verifyVendorError || !verifyVendor?.id) {
        throw new Error("Vendor profile was not persisted. Please retry registration.");
      }

      // 5. Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err?.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      {/* Left side: Branding / Illustration */}
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          component={motion.div}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          sx={{
            position: "absolute",
            top: "10%",
            left: "20%",
            width: "30vw",
            height: "30vw",
            background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)",
            borderRadius: "50%",
            zIndex: 0,
          }}
        />
        <Box sx={{ zIndex: 1, textAlign: 'center', px: 4 }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <StorefrontIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h3" fontWeight={800} gutterBottom>
              Supplier Portal
            </Typography>
            <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.8, maxWidth: 500, mx: 'auto' }}>
              Create an account to manage invoices and purchase orders in one place.
            </Typography>
          </motion.div>
        </Box>
      </Grid>

      {/* Right side: Form */}
      <Grid item xs={12} sm={8} md={5} sx={{ display: 'flex', alignItems: 'center', background: '#ffffff', overflowY: 'auto' }}>
        <Paper elevation={6} square sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: 'transparent' }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          sx={{
            my: 4,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 400,
            ml: 'auto',
            mr: 'auto'
          }}
        >
          <Typography component="h1" variant="h4" fontWeight={800} gutterBottom color="#1e293b">
            Join the Network
          </Typography>
          <Typography color="text.secondary" mb={3} textAlign="center">
            Register your company details below.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleRegister} sx={{ mt: 1, width: '100%' }}>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Autocomplete
                multiple
                options={organizations}
                getOptionLabel={(org) => org.legal_name}
                value={organizations.filter(org => formData.selected_orgs.includes(org.id))}
                onChange={handleMultiSelectChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Buying Organizations (Select one or multiple)"
                    margin="normal"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="filled"
                      label={option.legal_name}
                      size="small"
                      {...getTagProps({ index })}
                    />
                  ))
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <TextField
                fullWidth
                required
                label="Company Name (legal)"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                margin="normal"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
              <TextField
                fullWidth
                required
                label="Contact Person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                margin="normal"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Business Email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="phone"
                label="Phone (with country code)"
                placeholder="+91 ..."
                value={formData.phone}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="gstin"
                label="GSTIN"
                inputProps={{ style: { textTransform: "uppercase" } }}
                value={formData.gstin}
                onChange={handleChange}
                helperText="Required for verified supplier onboarding"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
              <TextField
                margin="normal"
                fullWidth
                name="pan"
                label="PAN (optional)"
                inputProps={{ style: { textTransform: "uppercase" } }}
                value={formData.pan}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                multiline
                minRows={2}
                name="address"
                label="Registered Address"
                value={formData.address}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
              Banking (for payments — optional at signup, complete in Profile)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="bank_account_name"
                  label="Account name"
                  value={formData.bank_account_name}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="bank_account_number"
                  label="Account number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="bank_ifsc"
                  label="IFSC"
                  inputProps={{ style: { textTransform: "uppercase" } }}
                  value={formData.bank_ifsc}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Register"}
              </Button>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              <Typography variant="body2" align="center" sx={{ mt: 1, color: 'text.secondary' }}>
                Already have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  sx={{ fontWeight: 600, textDecoration: 'none', color: '#4f46e5' }}
                >
                  Sign In
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
