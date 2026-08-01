import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

import {
  ContactMemory,
  deleteMemory,
  fetchMemory,
  upsertMemory,
} from "../api/client";

export function Memory(): JSX.Element {
  const [rows, setRows] = useState<ContactMemory[]>([]);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetchMemory()
      .then(setRows)
      .catch((err) =>
        setError(err?.response?.data?.message || "Failed to load memory")
      );

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await upsertMemory(email, notes);
      setEmail("");
      setNotes("");
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save note");
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto" }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Contact Memory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Free-form notes per contact that the assistant reads before drafting
          a reply. Great for "already asked about pricing", "prefers concise",
          etc.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardHeader title="Add or update a note" />
        <CardContent>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                type="email"
                label="Contact email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@client.com"
              />
              <TextField
                label="Notes"
                multiline
                minRows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Already sent pricing on 2026-07-15. Prefers Zoom over Meet."
              />
              <Box>
                <Button type="submit" variant="contained">
                  Save
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Saved contacts" />
        <CardContent>
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No contact memory yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {rows.map((r) => (
                <Box
                  key={r._id}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    py: 1.5,
                  }}
                >
                  <Box>
                    <Typography fontWeight={600}>{r.contactEmail}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {r.notes || "(no notes)"}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={async () => {
                      await deleteMemory(r._id);
                      load();
                    }}
                    aria-label="Delete contact memory"
                  >
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
