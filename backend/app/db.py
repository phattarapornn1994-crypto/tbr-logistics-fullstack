# backend/app/db.py
import os
from sqlmodel import SQLModel, Session, create_engine

# อ่านจาก Environment ของ Render (ถ้าไม่ตั้งไว้จะตกไปใช้ SQLite ชั่วคราว)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/logistics.db")

# เปิด pool_pre_ping เพื่อกัน stale connection กับ Supabase Pooler
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

def init_db() -> None:
    # สร้างตารางตาม models ที่ประกาศในโปรเจกต์
    SQLModel.metadata.create_all(engine)

def get_session():
    # Dependency สำหรับ FastAPI routes
    with Session(engine) as session:
        yield session
