import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { navOptions } from "./navigationBar";

export function NavigationRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path={navOptions[0].path} element={<Temp />} />
      <Route path={navOptions[1].path} element={<div>Hello1</div>} />
      <Route path={navOptions[2].path} element={<div>Hello2</div>} />
    </Routes>
  );
}

function Temp(): JSX.Element {
  useEffect(() => {
    const handleMessage = (event: any) => {
      if (event.data === "login_success") {
        // Login was successful, perform necessary actions
        console.log("Login successful!");
      }
    };

    // Listen for messages from the small window
    window.addEventListener("message", handleMessage);

    // Cleanup function
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  function handleClick() {
    window.open(
      "http://localhost:5000/email/vishal.m@klenty.com",
      "_blank",
      "width=500,height=500,left=10,top=150"
    );
  }

  return <button onClick={handleClick}>Connect Gmail</button>;
}
