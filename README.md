```md
# TBR Logistics – Full‑Stack


**Backend**: FastAPI + SQLite (ผ่าน SQLModel) + Dockerfile (Deploy ง่ายบน Koyeb/Render/Fly.io)


**Frontend**: HTML + JS + Leaflet (OSM) + XLSX (Export) + TailwindCDN (ไม่ต้อง build)


### ฟีเจอร์
- Master Data: Customer, Vehicle (CRUD)
- Planning: สร้างแผน, ระบุน้ำหนัก/ปริมาตร, วิเคราะห์เส้นทาง (Clustering + Nearest Neighbor)
- Result: สรุปจำนวนรถ/ระยะทาง/ต้นทุน, รายละเอียดเส้นทาง + แผนที่
- Export: Excel/CSV, Print PDF


### การ Deploy (สรุปย่อ)
1) Backend → Koyeb (จาก GitHub; ใช้ Dockerfile)
2) Frontend → Cloudflare Pages (อัปโหลดโฟลเดอร์ `frontend/` ตรงๆ)
3) ตั้งค่า **API_BASE** ใน `frontend/index.html` ให้ชี้ URL ของ Backend
