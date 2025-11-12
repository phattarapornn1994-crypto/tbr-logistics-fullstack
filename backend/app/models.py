from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    role: str = "user"

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    name: str
    contact: Optional[str] = None
    type: Optional[str] = None
    hours: Optional[str] = None
    note: Optional[str] = None
    addr: Optional[str] = None
    lat: float
    lng: float

class Vehicle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plate: str = Field(index=True, unique=True)
    type: Optional[str] = None
    capW: float = 0
    capV: float = 0
    owner: Optional[str] = None
    costPerKm: float = 0
    status: str = "ready"

class Plan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    date: str
    origin_lat: float
    origin_lng: float
    totalKm: float = 0
    totalCost: float = 0
    totalW: float = 0
    totalV: float = 0

class PlanLine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plan_id: int = Field(foreign_key="plan.id")
    customer_code: str
    w: float = 0
    v: float = 0
    mat: Optional[str] = None

class RouteFactor(SQLModel, table=True):
    """ปัจจัยที่ส่งผลต่อการเดินทาง"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    factor_type: str  # traffic, highway, flood, breakdown, hill
    lat: float
    lng: float
    radius_km: float = 5.0  # รัศมีผลกระทบ (กม.)
    severity: float = 1.0  # ระดับความรุนแรง (1.0 = ปกติ, >1.0 = ช้าลง)
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ProductLayout(SQLModel, table=True):
    """การจัดวางสินค้าในรถ"""
    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_plate: str
    product_type: str
    length: float = 0  # เมตร
    width: float = 0
    height: float = 0
    weight: float = 0
    stackable: bool = True
    priority: int = 0  # ลำดับความสำคัญ
