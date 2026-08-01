import { useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { useColorMode } from "../../theme";
import { useAuth } from "../../auth/AuthContext";
import { RequireAuth } from "../../auth/RequireAuth";
import { navItems } from "./navItems";
import { Home } from "../../pages/Home";
import { ConnectEmail } from "../../pages/ConnectEmail";
import { Dashboard } from "../../pages/Dashboard";
import { LoginPage } from "../../pages/Login";
import { SignupPage } from "../../pages/Signup";
import { PersonaEditor } from "../../pages/PersonaEditor";

export function AppShell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { mode, toggleMode } = useColorMode();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.path === location.pathname)
  );

  const themeToggleButton = (
    <IconButton
      onClick={toggleMode}
      color="inherit"
      aria-label="Toggle color mode"
    >
      {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
    </IconButton>
  );

  const handleLogout = () => {
    setUserMenuAnchor(null);
    logout();
    navigate("/login");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        color="default"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && user && (
            <IconButton
              edge="start"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          )}

          <MarkEmailReadRoundedIcon color="primary" />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
            Mail Replyer
          </Typography>

          {!isMobile && user && (
            <Tabs
              value={activeIndex}
              textColor="primary"
              indicatorColor="primary"
            >
              {navItems.map((item) => (
                <Tab
                  key={item.path}
                  label={item.label}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </Tabs>
          )}

          {themeToggleButton}

          {user ? (
            <>
              <IconButton
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                aria-label="Account menu"
                sx={{ p: 0.5 }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                  {user.email.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
              >
                <MenuItem disabled>
                  <Box>
                    <Typography variant="body2">{user.email}</Typography>
                    {user.name && (
                      <Typography variant="caption" color="text.secondary">
                        {user.name}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  Log out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setDrawerOpen(false);
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/connect_email"
            element={
              <RequireAuth>
                <ConnectEmail />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/accounts/:accountId/persona"
            element={
              <RequireAuth>
                <PersonaEditor />
              </RequireAuth>
            }
          />
        </Routes>
      </Container>
    </Box>
  );
}
