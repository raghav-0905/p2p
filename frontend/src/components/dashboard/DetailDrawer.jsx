import { Drawer, Box, Typography, Chip, Divider, Table, TableBody, TableCell, TableHead, TableRow, Button } from "@mui/material";
import EmptyState from "./EmptyState";

export default function DetailDrawer({ open, payload, onClose, onNavigate }) {
  const rows = payload?.rows || [];
  const columns = payload?.columns || [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", md: 520 }, p: 2.5 }}>
        <Typography variant="h6" fontWeight={700}>
          {payload?.title || "Details"}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          {payload?.subtitle || "Drill-down details for selected metric"}
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          {(payload?.chips || []).map((chip) => (
            <Chip key={chip} size="small" label={chip} />
          ))}
        </Box>
        <Divider sx={{ mb: 2 }} />

        {rows.length === 0 ? (
          <EmptyState title="No matching records" subtitle="There are no rows for this selection." />
        ) : (
          <Box sx={{ maxHeight: "60vh", overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{String(row[col.key] ?? "-")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Box mt={2} display="flex" gap={1} justifyContent="flex-end">
          <Button onClick={() => onNavigate?.("/analytics")} variant="outlined">
            Open Analytics
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
