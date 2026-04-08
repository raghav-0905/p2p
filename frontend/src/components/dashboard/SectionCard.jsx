import { Paper, Typography, Divider } from "@mui/material";

export default function SectionCard({ title, subtitle, children, sx }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
        ...sx,
      }}
    >
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {subtitle}
        </Typography>
      ) : (
        <Divider sx={{ my: 1.5 }} />
      )}
      {children}
    </Paper>
  );
}
