import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: JSX.Element;
  title: string;
  description?: string;
}) {
  return (
    <Stack
      alignItems="center"
      spacing={1}
      sx={{ py: 6, color: "text.secondary" }}
    >
      <Box sx={{ fontSize: 40, display: "flex", opacity: 0.6 }}>{icon}</Box>
      <Typography variant="subtitle1" color="text.primary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ maxWidth: 360, textAlign: "center" }}>
          {description}
        </Typography>
      )}
    </Stack>
  );
}
