import { Box, Typography } from "@mui/material";

export default function AdminLayout({ children }) {
  return (
    <Box display="flex" height="100vh">
      <Box width={260} bgcolor="background.paper" p={3}>
        <Typography variant="h6">Admin Panel</Typography>
      </Box>

      <Box flex={1} p={4}>
        {children}
      </Box>
    </Box>
  );
}
