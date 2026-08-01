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
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import { API_URL, ConnectedAccount, fetchAccounts } from "../api/client";
import { EmptyState } from "../components/EmptyState";

export function ConnectEmail(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
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
                  secondaryAction={
                    <Button
                      size="small"
                      startIcon={<TuneRoundedIcon />}
                      onClick={() =>
                        navigate(`/accounts/${account._id}/persona`)
                      }
                    >
                      Persona
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      {account.emailID.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={account.emailID}
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
    </Stack>
  );
}
