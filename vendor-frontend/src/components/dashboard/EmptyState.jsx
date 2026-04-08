import { Box, Typography } from "@mui/material";

export default function EmptyState({ title = "No data available", subtitle = "Try changing your filters or adding records." }) {
  return (
    <Box py={4} textAlign="center">
      <Typography fontWeight={600}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}
