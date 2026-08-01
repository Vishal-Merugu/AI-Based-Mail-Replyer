import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

import { BillingInfo, fetchBilling, startCheckout } from "../api/client";

export function Billing(): JSX.Element {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const returnStatus = query.get("status");
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBilling()
      .then(setInfo)
      .catch((err) =>
        setError(err?.response?.data?.message || "Failed to load billing")
      );
  }, []);

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await startCheckout();
      window.location.href = url;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to start checkout");
      setBusy(false);
    }
  };

  if (!info) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const pct = info.limit ? Math.min(100, (info.used / info.limit) * 100) : 0;
  const isPro = info.plan === "pro";

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto" }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Billing & Usage
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track your monthly reply quota and manage your plan.
        </Typography>
      </Box>

      {returnStatus === "success" && (
        <Alert severity="success">
          Payment complete — your plan will update shortly.
        </Alert>
      )}
      {returnStatus === "cancelled" && (
        <Alert severity="info">Checkout cancelled. No changes made.</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardHeader
          title="Current usage"
          action={
            <Chip
              label={isPro ? "Pro" : "Free"}
              color={isPro ? "primary" : "default"}
            />
          }
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {info.used} of {info.limit} replies used this month
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 10, borderRadius: 999 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Resets on the 1st of each month (UTC).
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardHeader
              title="Free"
              subheader="For personal use"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Typography variant="body2">
                <strong>{info.plan === "free" ? info.limit : "100"} replies</strong> per
                month, all core features included.
              </Typography>
            </CardContent>
            <CardActions>
              <Button disabled fullWidth>
                {isPro ? "Downgrade at renewal" : "Current plan"}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              borderColor: "primary.main",
              boxShadow: (t) => `0 0 0 1px ${t.palette.primary.main}`,
            }}
          >
            <CardHeader
              title="Pro"
              subheader="For heavy senders"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Typography variant="body2">
                <strong>{info.plan === "pro" ? info.limit : "5,000"} replies</strong>{" "}
                per month, priority processing, and future team features.
              </Typography>
            </CardContent>
            <CardActions>
              {isPro ? (
                <Button disabled fullWidth variant="contained">
                  Current plan
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={upgrade}
                  disabled={busy || !info.stripeConfigured}
                >
                  {busy
                    ? "Redirecting…"
                    : info.stripeConfigured
                    ? "Upgrade to Pro"
                    : "Stripe not configured"}
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
