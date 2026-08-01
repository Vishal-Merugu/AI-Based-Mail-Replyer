import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

import {
  API_URL,
  ConnectedAccount,
  fetchAccounts,
  updateAccountSettings,
} from "../api/client";
import { EmptyState } from "../components/EmptyState";

export function ConnectEmail(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUpTarget, setFollowUpTarget] =
    useState<ConnectedAccount | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState({
    enabled: false,
    intervalDays: 3,
    maxAttempts: 2,
  });
  const [status, setStatus] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load connected accounts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();

    const handleMessage = (event: MessageEvent) => {
      if (event.data === "login_success") {
        setStatus({
          severity: "success",
          message: "Gmail account connected successfully.",
        });
        loadAccounts();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleConnect() {
    if (!email.trim()) {
      setStatus({ severity: "error", message: "Enter a Gmail address first." });
      return;
    }

    setStatus(null);
    window.open(
      `${API_URL}/email/${encodeURIComponent(email.trim())}`,
      "_blank",
      "width=500,height=600,left=10,top=150"
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 560, mx: "auto" }}>
      <Card variant="outlined">
        <CardHeader
          avatar={<MarkEmailReadRoundedIcon color="primary" />}
          title="Connect Gmail Account"
          subheader="Authorize access so the assistant can watch and reply to this inbox."
        />
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              type="email"
              label="Gmail address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            <Button
              variant="contained"
              onClick={handleConnect}
              sx={{ whiteSpace: "nowrap" }}
            >
              Connect Gmail
            </Button>
          </Stack>

          {status && (
            <Alert severity={status.severity} sx={{ mt: 2 }}>
              {status.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Connected Accounts" />
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={<InboxRoundedIcon fontSize="inherit" />}
              title="No accounts connected yet"
              description="Connect a Gmail account above to start receiving automated replies."
            />
          ) : (
            <List disablePadding>
              {accounts.map((account) => (
                <ListItem
                  key={account._id}
                  disableGutters
                  sx={{ flexWrap: "wrap", gap: 1 }}
                  secondaryAction={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip
                        title={
                          account.autoSend !== false
                            ? "Replies are sent automatically. Turn off to review each draft."
                            : "Drafts land in the Outbox for your review."
                        }
                      >
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={account.autoSend !== false}
                              onChange={async (_, checked) => {
                                setAccounts((prev) =>
                                  prev.map((a) =>
                                    a._id === account._id
                                      ? { ...a, autoSend: checked }
                                      : a
                                  )
                                );
                                try {
                                  await updateAccountSettings(account._id, {
                                    autoSend: checked,
                                  });
                                } catch (err) {
                                  console.error(err);
                                  loadAccounts();
                                }
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {account.autoSend !== false
                                ? "Auto-send"
                                : "Review"}
                            </Typography>
                          }
                        />
                      </Tooltip>
                      <Button
                        size="small"
                        startIcon={<ReplayRoundedIcon />}
                        onClick={() => {
                          setFollowUpTarget(account);
                          setFollowUpDraft({
                            enabled: !!account.followUp?.enabled,
                            intervalDays: account.followUp?.intervalDays ?? 3,
                            maxAttempts: account.followUp?.maxAttempts ?? 2,
                          });
                        }}
                      >
                        Follow-up
                      </Button>
                      <Button
                        size="small"
                        startIcon={<TuneRoundedIcon />}
                        onClick={() =>
                          navigate(`/accounts/${account._id}/persona`)
                        }
                      >
                        Persona
                      </Button>
                    </Stack>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      {account.emailID.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        component="span"
                      >
                        <span>{account.emailID}</span>
                        {account.watchExpiration &&
                          new Date(account.watchExpiration) <= new Date() && (
                            <Chip
                              size="small"
                              color="warning"
                              label="Reconnect needed"
                            />
                          )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Connected{" "}
                        {new Date(account.createdAt).toLocaleDateString()}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!followUpTarget}
        onClose={() => setFollowUpTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Follow-up sequence</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              When enabled, replies marked <strong>Interested</strong> from{" "}
              <strong>{followUpTarget?.emailID}</strong> get an automatic
              follow-up if no reply arrives.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={followUpDraft.enabled}
                  onChange={(_, c) =>
                    setFollowUpDraft({ ...followUpDraft, enabled: c })
                  }
                />
              }
              label="Enable follow-ups"
            />
            <TextField
              type="number"
              label="Days between follow-ups"
              inputProps={{ min: 1, max: 30 }}
              value={followUpDraft.intervalDays}
              onChange={(e) =>
                setFollowUpDraft({
                  ...followUpDraft,
                  intervalDays: Number(e.target.value) || 1,
                })
              }
              disabled={!followUpDraft.enabled}
            />
            <TextField
              type="number"
              label="Max attempts"
              inputProps={{ min: 1, max: 5 }}
              value={followUpDraft.maxAttempts}
              onChange={(e) =>
                setFollowUpDraft({
                  ...followUpDraft,
                  maxAttempts: Number(e.target.value) || 1,
                })
              }
              disabled={!followUpDraft.enabled}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowUpTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!followUpTarget) return;
              try {
                await updateAccountSettings(followUpTarget._id, {
                  followUp: followUpDraft,
                });
                setFollowUpTarget(null);
                loadAccounts();
              } catch (err) {
                console.error(err);
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
