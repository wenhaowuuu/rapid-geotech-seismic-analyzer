import { useState } from "react";

const ASCE_API_BASE = "https://api-hazard.asce.org/v1";

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [standardsVersion, setStandardsVersion] = useState("7-22");
  const [riskLevel, setRiskLevel] = useState("1");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const fetchHazardData = async () => {
    if (!apiKey || !latitude || !longitude) {
      setError("Please provide API key, latitude, and longitude");
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError("Please provide valid latitude (-90 to 90) and longitude (-180 to 180)");
      return;
    }

    setBusy(true);
    setError("");
    setResults(null);

    try {
      const requests = [
        fetch(`${ASCE_API_BASE}/flood?latitude=${lat}&longitude=${lon}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        }),
        fetch(`${ASCE_API_BASE}/ice?latitude=${lat}&longitude=${lon}&standards_version=${standardsVersion}&risk_level=${riskLevel}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        }),
        fetch(`${ASCE_API_BASE}/rain?latitude=${lat}&longitude=${lon}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        })
      ];

      const [floodResponse, iceResponse, rainResponse] = await Promise.all(requests);

      const floodData = floodResponse.ok ? await floodResponse.json() : { error: `HTTP ${floodResponse.status}` };
      const iceData = iceResponse.ok ? await iceResponse.json() : { error: `HTTP ${iceResponse.status}` };
      const rainData = rainResponse.ok ? await rainResponse.json() : { error: `HTTP ${rainResponse.status}` };

      setResults({
        flood: floodData,
        ice: iceData,
        rain: rainData,
        coordinates: { latitude: lat, longitude: lon }
      });

    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const renderHazardData = (title, data) => {
    if (!data) return null;

    return (
      <div style={{
        marginBottom: 24,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "#f9f9f9"
      }}>
        <h3 style={{ marginTop: 0, color: "#333" }}>{title}</h3>
        {data.error ? (
          <p style={{ color: "#d73027" }}>Error: {data.error}</p>
        ) : (
          <pre style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 4,
            overflow: "auto",
            fontSize: 12,
            border: "1px solid #eee"
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <main style={{
      padding: 24,
      maxWidth: 900,
      margin: "0 auto",
      fontFamily: "system-ui, Arial",
      backgroundColor: "#fff"
    }}>
      <h1 style={{ color: "#333", marginBottom: 8 }}>ASCE Hazard Data Analyzer</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Enter coordinates to fetch flood, ice, and rain hazard data from the ASCE API.
      </p>

      <div style={{
        display: "grid",
        gap: 16,
        marginBottom: 24,
        padding: 20,
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        border: "1px solid #e9ecef"
      }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: "500" }}>
            ASCE API Key *
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your ASCE API key"
            style={{
              width: "100%",
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: 14
            }}
          />
        </div>

        <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "500" }}>
              Latitude *
            </label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 34.921206"
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "500" }}>
              Longitude *
            </label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., -118.418998"
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14
              }}
            />
          </div>
        </div>

        <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "500" }}>
              Standards Version (for Ice)
            </label>
            <select
              value={standardsVersion}
              onChange={(e) => setStandardsVersion(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14
              }}
            >
              <option value="7-10">7-10</option>
              <option value="7-16">7-16</option>
              <option value="7-22">7-22</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "500" }}>
              Risk Level (for Ice)
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14
              }}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchHazardData}
          disabled={!apiKey || !latitude || !longitude || busy}
          style={{
            padding: "12px 24px",
            backgroundColor: busy ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 16,
            fontWeight: "500",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: (!apiKey || !latitude || !longitude || busy) ? 0.6 : 1
          }}
        >
          {busy ? "Fetching Data..." : "Get Hazard Data"}
        </button>
      </div>

      {error && (
        <div style={{
          padding: 12,
          backgroundColor: "#f8d7da",
          color: "#721c24",
          borderRadius: 4,
          marginBottom: 24,
          border: "1px solid #f5c6cb"
        }}>
          {error}
        </div>
      )}

      {results && (
        <div>
          <h2 style={{ color: "#333", marginBottom: 16 }}>
            Results for {results.coordinates.latitude}, {results.coordinates.longitude}
          </h2>

          {renderHazardData("Flood Data", results.flood)}
          {renderHazardData("Ice Data", results.ice)}
          {renderHazardData("Rain Data", results.rain)}
        </div>
      )}

      <div style={{
        marginTop: 32,
        padding: 16,
        backgroundColor: "#fff3cd",
        borderRadius: 4,
        border: "1px solid #ffeaa7"
      }}>
        <h4 style={{ marginTop: 0, color: "#856404" }}>Note:</h4>
        <p style={{ margin: 0, fontSize: 14, color: "#856404" }}>
          You need a valid ASCE API key to use this service. Visit the ASCE website to obtain an API key.
          Default coordinates (34.921206, -118.418998) are provided as an example.
        </p>
      </div>
    </main>
  );
}