import React from "react";
import { BrowserRouter as Router } from "react-router-dom";

import "./App.css";
import { Navigator } from "./Navigator";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Router>
          <Navigator />
        </Router>
      </header>
    </div>
  );
}

export default App;
