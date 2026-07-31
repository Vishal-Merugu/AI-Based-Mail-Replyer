import { Routes, Route } from "react-router-dom";

import { navOptions } from "./navigationBar";
import { Home } from "../../pages/Home";
import { ConnectEmail } from "../../pages/ConnectEmail";
import { Dashboard } from "../../pages/Dashboard";

export function NavigationRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path={navOptions[0].path} element={<Home />} />
      <Route path={navOptions[1].path} element={<ConnectEmail />} />
      <Route path={navOptions[2].path} element={<Dashboard />} />
    </Routes>
  );
}
