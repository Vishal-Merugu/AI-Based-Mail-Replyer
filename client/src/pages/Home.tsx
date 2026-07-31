import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

const FEATURES = [
  {
    icon: <AlternateEmailRoundedIcon fontSize="large" color="primary" />,
    title: "Connect Gmail",
    description:
      "Authorize a Gmail account once; the assistant watches your inbox for new mail.",
  },
  {
    icon: <PsychologyRoundedIcon fontSize="large" color="primary" />,
    title: "AI Categorization",
    description:
      "Every incoming email is classified as Interested, Not Interested, or needing more info.",
  },
  {
    icon: <SendRoundedIcon fontSize="large" color="primary" />,
    title: "Automatic Reply",
    description:
      "A tailored response is drafted and sent back automatically, labeled by category.",
  },
];

export function Home(): JSX.Element {
  const navigate = useNavigate();

  return (
    <Box>
      <Stack spacing={2} sx={{ textAlign: "center", py: { xs: 4, sm: 6 } }}>
        <Typography variant="h3" fontWeight={700}>
          AI-Based Mail Replyer
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ maxWidth: 560, mx: "auto", fontWeight: 400 }}
        >
          Connect a Gmail account and let the assistant categorize and reply
          to incoming emails automatically.
        </Typography>
        <Box>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={() => navigate("/connect_email")}
          >
            Get Started
          </Button>
        </Box>
      </Stack>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {FEATURES.map((feature) => (
          <Grid item xs={12} sm={4} key={feature.title}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Stack spacing={1.5}>
                  {feature.icon}
                  <Typography variant="subtitle1" fontWeight={600}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
