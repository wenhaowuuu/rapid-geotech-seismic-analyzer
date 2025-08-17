# Backend (FastAPI)

## Run locally
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

## Endpoints
- GET /health
- POST /api/analyze  { "address": "123 Main St, San Jose, CA" } -> PDF
