import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { Persona, fetchPersona, savePersona } from "../api/client";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "formal", label: "Formal" },
];

export function PersonaEditor(): JSX.Element {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);
  const [emailID, setEmailID] = useState("");
  const [persona, setPersona] = useState<Persona>({
    name: "",
    tone: "professional",
    signature: "",
    extraInstructions: "",
  });

  useEffect(() => {
    if (!accountId) return;
    fetchPersona(accountId)
      .then((res) => {
        setEmailID(res.emailID);
        setPersona({
          name: res.persona?.name ?? "",
          tone: res.persona?.tone ?? "professional",
          signature: res.persona?.signature ?? "",
          extraInstructions: res.persona?.extraInstructions ?? "",
        });
      })
      .catch((err) =>
        setStatus({
          severity: "error",
          message: err?.response?.data?.message || "Failed to load persona",
        })
      )
      .finally(() => setLoading(false));
  }, [accountId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    setSaving(true);
    setStatus(null);
    try {
      await savePersona(accountId, persona);
      setStatus({ severity: "success", message: "Persona saved." });
    } catch (err: any) {
      setStatus({
        severity: "error",
        message: err?.response?.data?.message || "Failed to save persona",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ maxWidth: 640, mx: "auto" }}>
      <CardHeader
        title="Reply Persona"
        subheader={
          <Typography variant="body2" color="text.secondary">
            Applied to replies from <strong>{emailID}</strong>.
          </Typography>
        }
      />
      <CardContent>
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField
              label="Voice (name / role)"
              placeholder="e.g. Vishal from Acme Sales"
              value={persona.name}
              onChange={(e) => setPersona({ ...persona, name: e.target.value })}
              helperText="Who the reply should sound like."
            />
            <TextField
              select
              label="Tone"
              value={persona.tone}
              onChange={(e) => setPersona({ ...persona, tone: e.target.value })}
            >
              {TONES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Signature"
              multiline
              minRows={3}
              placeholder={"Best,\nVishal M\nAcme Inc."}
              value={persona.signature}
              onChange={(e) =>
                setPersona({ ...persona, signature: e.target.value })
              }
              helperText="Appended verbatim at the end of every reply."
            />
            <TextField
              label="Extra instructions"
              multiline
              minRows={3}
              placeholder="e.g. Never quote pricing; always suggest a 15-min call."
              value={persona.extraInstructions}
              onChange={(e) =>
                setPersona({ ...persona, extraInstructions: e.target.value })
              }
              helperText="Free-form guidance passed to the model on every generation."
            />
            {status && <Alert severity={status.severity}>{status.message}</Alert>}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => navigate("/dashboard")}>Back</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving…" : "Save persona"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
