import { BrowserRouter } from "react-router-dom";

import { ColorModeProvider } from "./theme";
import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/layout/AppShell";

function App() {
  return (
    <ColorModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ColorModeProvider>
  );
}

export default App;
