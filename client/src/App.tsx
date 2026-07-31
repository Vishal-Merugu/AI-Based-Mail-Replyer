import { BrowserRouter } from "react-router-dom";

import { ColorModeProvider } from "./theme";
import { AppShell } from "./components/layout/AppShell";

function App() {
  return (
    <ColorModeProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ColorModeProvider>
  );
}

export default App;
