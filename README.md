# TBR Logistics – Full-Stack (Supabase Postgres + JWT + OR-Tools)

Backend: FastAPI + SQLModel + Postgres (Supabase) + JWT + OR-Tools CVRP (Weight/Volume)  
Frontend: Static HTML/JS/CSS (Leaflet map + XLSX export)

## Environment Variables
- `DATABASE_URL`  → e.g. `postgresql+psycopg://postgres:***@<host>:5432/postgres?sslmode=require`
- `JWT_SECRET`    → random string (>= 32 chars)
- `JWT_ALGO`      → `HS256`
- `VRP_ENGINE`    → `ortools` (fallback: `greedy`)

## Local Run (backend)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg://postgres:***@HOST:5432/postgres?sslmode=require"
export JWT_SECRET="changemechangemechangemechangeme"
export JWT_ALGO="HS256"
export VRP_ENGINE="ortools"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open `http://localhost:8000/docs`

## Frontend
Open `frontend/index.html` (or host statically).  
Set:
```html
<script>window.API_BASE="http://localhost:8000";</script>
```

## Deploy (Render example)
- New → Web Service → Runtime: **Docker**, Root directory: `backend/`
- Add ENV above → Deploy
- Frontend: Cloudflare Pages (Upload `frontend/`).

