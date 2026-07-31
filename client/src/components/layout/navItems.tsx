import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";

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
  { label: "Dashboard", path: "/dashboard", icon: <DashboardRoundedIcon /> },
];
