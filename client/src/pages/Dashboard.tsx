import { CSSProperties, useEffect, useState } from "react";

import { fetchActivity, ProcessedEmailActivity } from "../api/client";

export function Dashboard(): JSX.Element {
  const [activity, setActivity] = useState<ProcessedEmailActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity()
      .then(setActivity)
      .catch((err) => console.error("Failed to load activity", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <h2>Recent Activity</h2>

      {loading && <p>Loading...</p>}
      {!loading && activity.length === 0 && (
        <p>No emails have been processed yet.</p>
      )}

      {activity.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>Account</th>
              <th style={cellStyle}>From</th>
              <th style={cellStyle}>Subject</th>
              <th style={cellStyle}>Category</th>
              <th style={cellStyle}>Processed At</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((item) => (
              <tr key={item._id}>
                <td style={cellStyle}>{item.emailID}</td>
                <td style={cellStyle}>{item.from}</td>
                <td style={cellStyle}>{item.subject}</td>
                <td style={cellStyle}>{item.category}</td>
                <td style={cellStyle}>
                  {new Date(item.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cellStyle: CSSProperties = {
  border: "1px solid #ddd",
  padding: "0.5rem",
  textAlign: "left",
};
