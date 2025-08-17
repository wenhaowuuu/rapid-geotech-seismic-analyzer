import { useState } from "react";

const DEFAULT_API = "http://127.0.0.1:8000";

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    if (!address) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(\`Error: \${err.detail || err.error || r.statusText}\`);
        return;
      }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = \`\${address.replaceAll(/[,\s]/g, "_")}_geotech_seismic_report.pdf\`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, Arial" }}>
      <h1>Rapid Geotechnical & Seismic Analyzer</h1>
      <p style={{ color: "#555" }}>
        Enter a California property address. The app geocodes and checks configured public hazard layers,
        then generates a quick PDF summary for download.
      </p>

      <label style={{ display: "block", marginTop: 16 }}>Backend API Base URL</label>
      <input
        value={apiBase}
        onChange={(e) => setApiBase(e.target.value)}
        placeholder="http://127.0.0.1:8000 or https://your-api.host"
        style={{ width: "100%", padding: 8 }}
      />

      <label style={{ display: "block", marginTop: 16 }}>Property Address</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="123 Main St, San Jose, CA"
        style={{ width: "100%", padding: 8 }}
      />

      <button
        onClick={analyze}
        disabled={!address || busy}
        style={{ marginTop: 16, padding: "10px 16px" }}
      >
        {busy ? "Generating…" : "Generate PDF"}
      </button>

      <p style={{ marginTop: 24, fontSize: 12, color: "#666" }}>
        Disclaimer: Informational screening only. Not a substitute for site-specific geotechnical investigation.
      </p>
    </main>
  );
}
