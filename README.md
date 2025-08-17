# Rapid Geotechnical & Seismic Analyzer (RGSA)

A lightweight, open-source web app that performs a rapid screening for geotechnical & seismic context at a user-provided California address (e.g., Alquist–Priolo Fault Zones, liquefaction & landslide hazard zones), using public GIS layers (e.g., California Geological Survey).

> **Disclaimer**: Informational screening only. Not a substitute for site-specific geotechnical investigation or regulatory determinations.

## Stack
- Backend: FastAPI (Python) — geocoding + ArcGIS REST queries + PDF generation
- Frontend: React (Vite) — address input + “Download PDF”
- Deploy: Frontend → GitHub Pages; Backend → Render/Fly.io/Railway/Heroku

## Quick Start
### Backend
cd backend && python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
# Local API: http://127.0.0.1:8000

### Frontend
cd ../frontend && npm install
npm run dev
# Local app: http://127.0.0.1:5173

### Deploy Frontend to GitHub Pages
- Repo Settings → Pages → Build and deployment → GitHub Actions.
- The workflow in .github/workflows/frontend.yml auto-builds & publishes on push to main.
- If you rename the repo, update vite.config.js base path.

### Deploy Backend
Run: uvicorn main:app --host 0.0.0.0 --port 8000
Configure env vars per backend/.env.example on your host.

## Data Sources (examples)
- California Geological Survey (CGS) ArcGIS REST layers
  - Alquist–Priolo Earthquake Fault Zones
  - Seismic Hazard Zones (Liquefaction / Landslide)
- Geocoding: Census Geocoder (fallback: OSM Nominatim)

MIT License. “As is”.
