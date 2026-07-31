import Chip from "@mui/material/Chip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

import { infoColor, statusColors } from "../theme/tokens";

// Maps each email category to a fixed color + icon so identity is never
// carried by color alone — the label text and icon always accompany it.
const CATEGORY_STYLES: Record<
  string,
  { color: string; icon: JSX.Element }
> = {
  Interested: {
    color: statusColors.good,
    icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
  },
  "Not Interested": {
    color: statusColors.critical,
    icon: <CancelIcon sx={{ fontSize: 16 }} />,
  },
  "More Information": {
    color: infoColor,
    icon: <InfoIcon sx={{ fontSize: 16 }} />,
  },
};

const FALLBACK_STYLE = {
  color: "#898781",
  icon: <SupportAgentIcon sx={{ fontSize: 16 }} />,
};

export function CategoryChip({ category }: { category?: string }) {
  const style = (category && CATEGORY_STYLES[category]) || FALLBACK_STYLE;

  return (
    <Chip
      size="small"
      icon={style.icon}
      label={category || "Uncategorized"}
      sx={{
        color: "#ffffff",
        backgroundColor: style.color,
        "& .MuiChip-icon": { color: "#ffffff" },
      }}
    />
  );
}
