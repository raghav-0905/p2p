import { Chip } from "@mui/material";

export default function StatusPill({ label, severity = "default" }) {
  const colorMap = {
    success: "success",
    warning: "warning",
    error: "error",
    info: "info",
    default: "default",
  };
  return <Chip size="small" label={label} color={colorMap[severity] || "default"} />;
}
