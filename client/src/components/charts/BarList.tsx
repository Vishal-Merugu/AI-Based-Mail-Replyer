import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

type Row = { label: string; value: number; color?: string };

export function BarList({ rows }: { rows: Row[] }) {
  const theme = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  const barBg = theme.palette.action.hover;

  return (
    <Stack spacing={1}>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No data yet.
        </Typography>
      )}
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        return (
          <Box key={r.label}>
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="body2" noWrap>
                {r.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {r.value}
              </Typography>
            </Stack>
            <Box
              sx={{
                position: "relative",
                height: 8,
                borderRadius: 999,
                bgcolor: barBg,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: `${pct}%`,
                  bgcolor: r.color || theme.palette.primary.main,
                  borderRadius: 999,
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
