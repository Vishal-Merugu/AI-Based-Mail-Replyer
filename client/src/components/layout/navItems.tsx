import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DraftsRoundedIcon from "@mui/icons-material/DraftsRounded";
import RuleRoundedIcon from "@mui/icons-material/RuleRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";

export type NavItem = {
  label: string;
  path: string;
  icon: JSX.Element;
};

export const navItems: NavItem[] = [
  { label: "Home", path: "/", icon: <HomeRoundedIcon /> },
  {
    label: "Connect Email",
    path: "/connect_email",
    icon: <AlternateEmailRoundedIcon />,
  },
  { label: "Outbox", path: "/outbox", icon: <DraftsRoundedIcon /> },
  { label: "Rules", path: "/rules", icon: <RuleRoundedIcon /> },
  { label: "Dashboard", path: "/dashboard", icon: <DashboardRoundedIcon /> },
  { label: "Analytics", path: "/analytics", icon: <InsightsRoundedIcon /> },
];
