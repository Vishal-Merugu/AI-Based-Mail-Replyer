import { useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

import {
  ConnectedAccount,
  ProcessedEmailActivity,
  fetchAccounts,
  fetchActivity,
} from "../api/client";
import { StatTile } from "../components/StatTile";
import { CategoryChip } from "../components/CategoryChip";
import { EmptyState } from "../components/EmptyState";

export function Dashboard(): JSX.Element {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [activity, setActivity] = useState<ProcessedEmailActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsData, activityData] = await Promise.all([
        fetchAccounts(),
        fetchActivity(50),
      ]);
      setAccounts(accountsData);
      setActivity(activityData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const interestedCount = activity.filter(
    (item) => item.category === "Interested"
  ).length;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <StatTile
            label="Connected Accounts"
            value={accounts.length}
            icon={<MarkEmailReadRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatTile
            label="Emails Processed"
            value={activity.length}
            icon={<ForumRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatTile
            label="Marked Interested"
            value={interestedCount}
            icon={<ThumbUpRoundedIcon />}
          />
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardHeader
          title="Recent Activity"
          action={
            <IconButton onClick={load} aria-label="Refresh activity">
              <RefreshRoundedIcon />
            </IconButton>
          }
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : activity.length === 0 ? (
            <EmptyState
              icon={<HistoryRoundedIcon fontSize="inherit" />}
              title="No emails have been processed yet"
              description="Once a connected account receives mail, replies will show up here."
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Processed At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activity.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>{item.emailID}</TableCell>
                      <TableCell>{item.from}</TableCell>
                      <TableCell>{item.subject}</TableCell>
                      <TableCell>
                        <CategoryChip category={item.category} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {new Date(item.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
