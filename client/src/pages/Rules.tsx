import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

import {
  Category,
  Rule,
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
  fetchCategories,
  fetchRules,
} from "../api/client";

const MATCH_TYPES = [
  { value: "from-domain", label: "From domain equals" },
  { value: "from-address", label: "From address equals" },
  { value: "subject-contains", label: "Subject contains" },
];

const ACTIONS = [
  { value: "force-category", label: "Force category" },
  { value: "skip-reply", label: "Skip reply entirely" },
];

export function RulesPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catTemplate, setCatTemplate] = useState("");
  const [catDontReply, setCatDontReply] = useState(false);

  // Rule form state
  const [ruleMatchType, setRuleMatchType] =
    useState<Rule["matchType"]>("from-domain");
  const [ruleMatchValue, setRuleMatchValue] = useState("");
  const [ruleAction, setRuleAction] = useState<Rule["action"]>("skip-reply");
  const [ruleCategoryName, setRuleCategoryName] = useState("");

  const load = async () => {
    try {
      const [c, r] = await Promise.all([fetchCategories(), fetchRules()]);
      setCategories(c);
      setRules(r);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load rules");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createCategory({
        name: catName,
        description: catDesc,
        replyTemplate: catTemplate,
        dontReply: catDontReply,
      });
      setCatName("");
      setCatDesc("");
      setCatTemplate("");
      setCatDontReply(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save category");
    }
  };

  const submitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createRule({
        matchType: ruleMatchType,
        matchValue: ruleMatchValue,
        action: ruleAction,
        categoryName: ruleAction === "force-category" ? ruleCategoryName : "",
      });
      setRuleMatchValue("");
      setRuleCategoryName("");
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save rule");
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Categories & Rules
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Define your own categories and routing rules. Rules run before the AI;
          matching category templates override the AI's generated reply.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Custom Categories" />
            <CardContent>
              <form onSubmit={submitCategory}>
                <Stack spacing={2}>
                  <TextField
                    label="Name"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                    placeholder="e.g. Support Request"
                  />
                  <TextField
                    label="Description (helps the AI classify)"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="e.g. Existing customer with a technical issue"
                  />
                  <TextField
                    label="Reply template (optional)"
                    value={catTemplate}
                    onChange={(e) => setCatTemplate(e.target.value)}
                    multiline
                    minRows={2}
                    helperText="If set, replaces the AI reply verbatim for this category."
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={catDontReply}
                        onChange={(_, c) => setCatDontReply(c)}
                      />
                    }
                    label="Don't reply to emails in this category"
                  />
                  <Box>
                    <Button type="submit" variant="contained">
                      Add category
                    </Button>
                  </Box>
                </Stack>
              </form>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1}>
                {categories.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No custom categories yet — the AI will use its defaults.
                  </Typography>
                )}
                {categories.map((c) => (
                  <Box
                    key={c._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Box sx={{ overflow: "hidden" }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{c.name}</Typography>
                        {c.dontReply && (
                          <Chip size="small" label="Skip reply" />
                        )}
                        {c.replyTemplate && (
                          <Chip size="small" label="Template" />
                        )}
                      </Stack>
                      {c.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {c.description}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      onClick={async () => {
                        await deleteCategory(c._id);
                        load();
                      }}
                      aria-label="Delete category"
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Routing Rules" />
            <CardContent>
              <form onSubmit={submitRule}>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Match"
                    value={ruleMatchType}
                    onChange={(e) =>
                      setRuleMatchType(e.target.value as Rule["matchType"])
                    }
                  >
                    {MATCH_TYPES.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Value"
                    value={ruleMatchValue}
                    onChange={(e) => setRuleMatchValue(e.target.value)}
                    required
                    placeholder={
                      ruleMatchType === "from-domain"
                        ? "competitor.com"
                        : ruleMatchType === "from-address"
                        ? "spam@example.com"
                        : "unsubscribe"
                    }
                  />
                  <TextField
                    select
                    label="Then"
                    value={ruleAction}
                    onChange={(e) =>
                      setRuleAction(e.target.value as Rule["action"])
                    }
                  >
                    {ACTIONS.map((a) => (
                      <MenuItem key={a.value} value={a.value}>
                        {a.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {ruleAction === "force-category" && (
                    <TextField
                      select
                      label="Category"
                      value={ruleCategoryName}
                      onChange={(e) => setRuleCategoryName(e.target.value)}
                      required
                      helperText={
                        categories.length === 0
                          ? "Create a category first."
                          : undefined
                      }
                    >
                      {categories.map((c) => (
                        <MenuItem key={c._id} value={c.name}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  <Box>
                    <Button type="submit" variant="contained">
                      Add rule
                    </Button>
                  </Box>
                </Stack>
              </form>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1}>
                {rules.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No rules yet.
                  </Typography>
                )}
                {rules.map((r) => (
                  <Box
                    key={r._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography variant="body2">
                      When <strong>{r.matchType}</strong> ={" "}
                      <code>{r.matchValue}</code> →{" "}
                      <strong>
                        {r.action === "skip-reply"
                          ? "Skip"
                          : `Force "${r.categoryName}"`}
                      </strong>
                    </Typography>
                    <IconButton
                      onClick={async () => {
                        await deleteRule(r._id);
                        load();
                      }}
                      aria-label="Delete rule"
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
