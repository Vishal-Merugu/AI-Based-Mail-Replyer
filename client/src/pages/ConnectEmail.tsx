import { useEffect, useState } from "react";

import { API_URL, ConnectedAccount, fetchAccounts } from "../api/client";

export function ConnectEmail(): JSX.Element {
  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load connected accounts", err);
    }
  };

  useEffect(() => {
    loadAccounts();

    const handleMessage = (event: MessageEvent) => {
      if (event.data === "login_success") {
        setStatusMessage("Gmail account connected successfully.");
        loadAccounts();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleConnect() {
    if (!email.trim()) {
      setStatusMessage("Enter a Gmail address first.");
      return;
    }

    setStatusMessage(null);
    window.open(
      `${API_URL}/email/${encodeURIComponent(email.trim())}`,
      "_blank",
      "width=500,height=600,left=10,top=150"
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
      <h2>Connect Gmail Account</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <button onClick={handleConnect}>Connect Gmail</button>
      </div>

      {statusMessage && <p>{statusMessage}</p>}

      <h3>Connected Accounts</h3>
      {accounts.length === 0 ? (
        <p>No accounts connected yet.</p>
      ) : (
        <ul>
          {accounts.map((account) => (
            <li key={account._id}>{account.emailID}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
