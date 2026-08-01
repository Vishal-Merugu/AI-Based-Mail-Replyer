import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { AnalyticsData, fetchAnalytics } from "../api/client";
import { LineChart } from "../components/charts/LineChart";
import { BarList } from "../components/charts/BarList";
import { StatTile } from "../components/StatTile";
import { statusColors, infoColor } from "../theme/tokens";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

const CATEGORY_COLORS: Record<string, string> = {
  Interested: statusColors.good,
  "Not Interested": statusColors.critical,
  "More Information": infoColor,
};

export function Analytics(): JSX.Element {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(days)
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [days]);

  const avgPerDay =
    data && data.totals.rangeDays
      ? Math.round((data.totals.emailsProcessed / data.totals.rangeDays) * 10) / 10
      : 0;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aggregated across all connected accounts.
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={days}
          onChange={(_, v) => v && setDays(v)}
        >
          <ToggleButton value={7}>7d</ToggleButton>
          <ToggleButton value={30}>30d</ToggleButton>
          <ToggleButton value={90}>90d</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading || !data ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatTile
                label={`Processed in last ${data.totals.rangeDays} days`}
                value={data.totals.emailsProcessed}
                icon={<ForumRoundedIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatTile
                label="Average per day"
                value={avgPerDay}
                icon={<TrendingUpRoundedIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatTile
                label="Unique categories"
                value={data.categories.length}
                icon={<BarChartRoundedIcon />}
              />
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardHeader title="Emails processed per day" />
            <CardContent>
              <LineChart data={data.daily} />
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Category breakdown" />
                <CardContent>
                  <BarList
                    rows={data.categories.map((c) => ({
                      label: c.category,
                      value: c.count,
                      color: CATEGORY_COLORS[c.category],
                    }))}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Top accounts" />
                <CardContent>
                  <BarList
                    rows={data.accounts.map((a) => ({
                      label: a.emailID,
                      value: a.count,
                    }))}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}
