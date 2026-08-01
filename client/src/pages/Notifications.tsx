import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import {
  NotificationSettings,
  fetchNotifications,
  saveNotifications,
} from "../api/client";

export function Notifications(): JSX.Element {
  const [settings, setSettings] = useState<NotificationSettings>({
    slackWebhookUrl: "",
    notifyOnInterested: true,
    notifyOnFailure: true,
    digestEnabled: false,
    digestCadence: "weekly",
  });
  const [status, setStatus] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchNotifications()
      .then((s) => setSettings((prev) => ({ ...prev, ...s })))
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    try {
      await saveNotifications(settings);
      setStatus({ severity: "success", message: "Saved." });
    } catch (err: any) {
      setStatus({
        severity: "error",
        message: err?.response?.data?.message || "Failed to save",
      });
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 640, mx: "auto" }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Notifications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Get pinged in Slack when something matters, and receive periodic
          digests of your activity.
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardHeader
          title="Slack Webhook"
          subheader="Paste an Incoming Webhook URL from your Slack app."
        />
        <CardContent>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Slack Webhook URL"
                value={settings.slackWebhookUrl || ""}
                onChange={(e) =>
                  setSettings({ ...settings, slackWebhookUrl: e.target.value })
                }
                placeholder="https://hooks.slack.com/services/..."
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={!!settings.notifyOnInterested}
                    onChange={(_, c) =>
                      setSettings({ ...settings, notifyOnInterested: c })
                    }
                  />
                }
                label="Ping me when an Interested reply is sent"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={!!settings.notifyOnFailure}
                    onChange={(_, c) =>
                      setSettings({ ...settings, notifyOnFailure: c })
                    }
                  />
                }
                label="Ping me when a reply job fails"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={!!settings.digestEnabled}
                    onChange={(_, c) =>
                      setSettings({ ...settings, digestEnabled: c })
                    }
                  />
                }
                label="Send me a digest"
              />
              <TextField
                select
                label="Digest cadence"
                value={settings.digestCadence || "weekly"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    digestCadence: e.target.value as "daily" | "weekly",
                  })
                }
                disabled={!settings.digestEnabled}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly (Mondays)</MenuItem>
              </TextField>

              {status && <Alert severity={status.severity}>{status.message}</Alert>}
              <Box>
                <Button type="submit" variant="contained">
                  Save
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Stack>
  );
}
