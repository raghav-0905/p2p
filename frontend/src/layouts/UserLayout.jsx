import { Box, Typography } from "@mui/material";

export default function UserLayout({ children }) {
  return (
    <Box display="flex" height="100vh">
      <Box width={240} bgcolor="background.paper" p={3}>
        <Typography variant="h6">User Dashboard</Typography>
      </Box>

      <Box flex={1} p={4}>
        {children}
      </Box>
    </Box>
  );
}
  