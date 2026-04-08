import { Paper, Typography, Skeleton, Box } from "@mui/material";

export default function MetricTile({ label, value, loading, delta, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      sx={{
        p: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        "&:hover": onClick ? { borderColor: "primary.main", boxShadow: 2 } : undefined,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={90} height={40} />
      ) : (
        <Box display="flex" justifyContent="space-between" alignItems="end" gap={1}>
          <Typography variant="h5" fontWeight={800}>
            {value}
          </Typography>
          {delta ? (
            <Typography variant="caption" color={delta.startsWith("+") ? "success.main" : "error.main"}>
              {delta}
            </Typography>
          ) : null}
        </Box>
      )}
    </Paper>
  );
}
