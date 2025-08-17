import os
import json
import tempfile
from typing import Dict, Any, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import LETTER

load_dotenv()

app = FastAPI(title="Rapid Geotechnical & Seismic Analyzer API")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS.split(",")] if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USE_CENSUS = os.getenv("USE_CENSUS_GEOCODER", "true").lower() == "true"
USE_NOMINATIM = os.getenv("USE_NOMINATIM_FALLBACK", "true").lower() == "true"

CGS_AP_URL  = os.getenv("CGS_AP_FAULT_ZONE_URL", "").strip()
CGS_LIQ_URL = os.getenv("CGS_LIQUEFACTION_ZONE_URL", "").strip()
CGS_LS_URL  = os.getenv("CGS_LANDSLIDE_ZONE_URL", "").strip()

def geocode_address(addr: str) -> Optional[Dict[str, float]]:
    if USE_CENSUS:
        try:
            url = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
            params = {"address": addr, "benchmark": "2020", "format": "json"}
            r = requests.get(url, params=params, timeout=20)
            r.raise_for_status()
            js = r.json()
            matches = js.get("result", {}).get("addressMatches", [])
            if matches:
                coords = matches[0]["coordinates"]
                return {"lon": float(coords["x"]), "lat": float(coords["y"])}
        except Exception:
            pass
    if USE_NOMINATIM:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {"q": addr, "format": "json", "limit": 1}
            headers = {"User-Agent": "RGSA-open-source/1.0"}
            r = requests.get(url, params=params, headers=headers, timeout=20)
            r.raise_for_status()
            arr = r.json()
            if arr:
                return {"lon": float(arr[0]["lon"]), "lat": float(arr[0]["lat"])}
        except Exception:
            pass
    return None

def query_arcgis_point(layer_url: str, lon: float, lat: float) -> Dict[str, Any]:
    if not layer_url:
        return {"configured": False, "features": []}
    query_url = layer_url.rstrip("/") + "/query"
    geom = {"x": lon, "y": lat, "spatialReference": {"wkid": 4326}}
    params = {
        "f": "json",
        "geometry": json.dumps(geom),
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "returnGeometry": "false",
        "outFields": "*",
        "resultRecordCount": 10
    }
    try:
        r = requests.get(query_url, params=params, timeout=30)
        r.raise_for_status()
        return {"configured": True, **r.json()}
    except Exception as e:
        return {"configured": True, "error": str(e), "features": []}

def build_pdf(address: str, lon: float, lat: float, findings: Dict[str, Any]) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
        c = canvas.Canvas(tmp_pdf.name, pagesize=LETTER)
        w, h = LETTER
        y = h - 72

        c.setFont("Helvetica-Bold", 16)
        c.drawString(72, y, "Rapid Geotechnical & Seismic Analyzer")
        y -= 22
        c.setFont("Helvetica", 12)
        c.drawString(72, y, f"Address: {address}")
        y -= 16
        c.drawString(72, y, f"Coordinates (WGS84): {lat:.6f}, {lon:.6f}")
        y -= 24

        c.setFont("Helvetica-Bold", 13)
        c.drawString(72, y, "Preliminary Screening Results")
        y -= 16
        c.setFont("Helvetica", 11)

        def line(txt: str):
            nonlocal y
            c.drawString(72, y, txt)
            y -= 14

        for key, label in [
            ("ap_fault", "Alquist–Priolo Earthquake Fault Zone"),
            ("liq_zone", "Seismic Hazard Zone – Liquefaction"),
            ("ls_zone",  "Seismic Hazard Zone – Earthquake-Induced Landslide"),
        ]:
            data = findings.get(key, {})
            status = "NOT CONFIGURED" if not data.get("configured") else ("NO" if not data.get("hit") else "YES")
            line(f"- {label}: {status}")
            if data.get("hit"):
                attrs = data.get("attributes", {}) or {}
                for i, (k, v) in enumerate(list(attrs.items())[:3]):
                    line(f"    • {k}: {v}")

        y -= 8
        c.setFont("Helvetica-Oblique", 9)
        for t in [
            "Notes:",
            "1) Rapid, informational screening using public datasets; accuracy varies.",
            "2) Not a substitute for site-specific geotechnical investigation or regulatory review.",
        ]:
            line(t)

        c.showPage()
        c.save()
        return tmp_pdf.name

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/analyze")
def analyze(payload: Dict[str, Any] = Body(...)):
    address = (payload or {}).get("address", "").strip()
    if not address:
        raise HTTPException(status_code=400, detail="address is required")

    pt = geocode_address(address)
    if not pt:
        raise HTTPException(status_code=404, detail="geocoding failed; verify address")

    lon, lat = pt["lon"], pt["lat"]

    ap  = query_arcgis_point(CGS_AP_URL, lon, lat)
    liq = query_arcgis_point(CGS_LIQ_URL, lon, lat)
    ls  = query_arcgis_point(CGS_LS_URL, lon, lat)

    def summarize(qres: Dict[str, Any]) -> Dict[str, Any]:
        features = qres.get("features") or []
        hit = len(features) > 0
        attrs = (features[0].get("attributes") if hit else {}) or {}
        return {"configured": qres.get("configured", False), "hit": hit, "attributes": attrs, "error": qres.get("error")}

    findings = {"ap_fault": summarize(ap), "liq_zone": summarize(liq), "ls_zone": summarize(ls)}

    try:
        pdf_path = build_pdf(address, lon, lat, findings)
        fname = address.replace(",", "").replace(" ", "_") + "_geotech_seismic_report.pdf"
        return FileResponse(pdf_path, media_type="application/pdf", filename=fname)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
