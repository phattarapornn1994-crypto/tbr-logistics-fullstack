# TBR Logistics – Full‑Stack

**Backend**: FastAPI + SQLite (SQLModel) + Dockerfile  
**Frontend**: HTML + JS + Leaflet (OSM) + XLSX + Tailwind CDN

## Features
- Master Data: Customer, Vehicle (CRUD)
- Planning: Create plan, volumes (weight/volume), analyze routes (Clustering + Nearest Neighbor)
- Result: Total vehicles/km/cost, per-route details + Map
- Export: Excel/CSV, Print PDF

## Quick Deploy
1) Backend → Koyeb (Dockerfile)
2) Frontend → Cloudflare Pages
3) Set **API_BASE** in `frontend/index.html` to your backend URL
