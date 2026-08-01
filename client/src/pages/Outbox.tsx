import { useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DraftsRoundedIcon from "@mui/icons-material/DraftsRounded";

import {
  PendingDraft,
  approveDraft,
  fetchDrafts,
  rejectDraft,
} from "../api/client";
import { CategoryChip } from "../components/CategoryChip";
import { EmptyState } from "../components/EmptyState";

export function Outbox(): JSX.Element {
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchDrafts()
      .then((data) => {
        setDrafts(data);
        // Seed edits map so editing before typing works.
        setEdits(
          data.reduce(
            (acc: Record<string, string>, d) => ({
              ...acc,
              [d._id]: d.draftBody || "",
            }),
            {}
          )
        );
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (draft: PendingDraft) => {
    setBusy(draft._id);
    try {
      await approveDraft(draft._id, { draftBody: edits[draft._id] });
      setToast({ severity: "success", message: "Reply sent." });
      setDrafts((prev) => prev.filter((d) => d._id !== draft._id));
    } catch (err: any) {
      setToast({
        severity: "error",
        message: err?.response?.data?.message || "Failed to send",
      });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (draft: PendingDraft) => {
    setBusy(draft._id);
    try {
      await rejectDraft(draft._id);
      setDrafts((prev) => prev.filter((d) => d._id !== draft._id));
    } catch (err: any) {
      setToast({
        severity: "error",
        message: err?.response?.data?.message || "Failed to reject",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Outbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drafts waiting for your review. Approve to send; reject to discard.
          </Typography>
        </Box>
        <IconButton onClick={load} aria-label="Refresh drafts">
          <RefreshRoundedIcon />
        </IconButton>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : drafts.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <EmptyState
              icon={<DraftsRoundedIcon fontSize="inherit" />}
              title="No drafts awaiting review"
              description="When an account is set to review mode, generated replies land here first."
            />
          </CardContent>
        </Card>
      ) : (
        drafts.map((draft) => (
          <Card key={draft._id} variant="outlined">
            <CardHeader
              title={draft.subject || "(no subject)"}
              subheader={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    From <strong>{draft.from}</strong> to{" "}
                    <strong>{draft.emailID}</strong>
                  </Typography>
                  <CategoryChip category={draft.category} />
                </Stack>
              }
            />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Incoming
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      bgcolor: "action.hover",
                      p: 1.5,
                      borderRadius: 1,
                    }}
                  >
                    {draft.incomingSnippet}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Draft reply
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={6}
                    value={edits[draft._id] ?? draft.draftBody ?? ""}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [draft._id]: e.target.value,
                      }))
                    }
                  />
                </Box>
              </Stack>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 2 }}>
              <Button
                color="inherit"
                startIcon={<DeleteRoundedIcon />}
                onClick={() => reject(draft)}
                disabled={busy === draft._id}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                startIcon={<SendRoundedIcon />}
                onClick={() => approve(draft)}
                disabled={busy === draft._id}
              >
                {busy === draft._id ? "Sending…" : "Approve & send"}
              </Button>
            </CardActions>
          </Card>
        ))
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
