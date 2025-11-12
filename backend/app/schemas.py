from typing import List, Optional
from pydantic import BaseModel

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CustomerIn(BaseModel):
    code: str
    name: str
    contact: Optional[str] = None
    type: Optional[str] = None
    hours: Optional[str] = None
    note: Optional[str] = None
    addr: Optional[str] = None
    lat: float
    lng: float

class CustomerOut(CustomerIn):
    id: int

class VehicleIn(BaseModel):
    plate: str
    type: Optional[str] = None
    capW: float = 0
    capV: float = 0
    owner: Optional[str] = None
    costPerKm: float = 0
    status: str = "ready"

class VehicleOut(VehicleIn):
    id: int

class PlanLineIn(BaseModel):
    customer_code: str
    w: float
    v: float
    mat: Optional[str] = None

class PlanIn(BaseModel):
    name: str
    date: str
    origin_lat: float
    origin_lng: float
    lines: List[PlanLineIn]
    plan_type: str = "daily"  # daily, weekly, monthly, yearly
    max_vehicles: Optional[int] = None  # 0 or null = auto
    consider_traffic: bool = True
    consider_highway: bool = True
    consider_flood: bool = True
    consider_breakdown: bool = True
    consider_hills: bool = True

class RouteStop(BaseModel):
    code: str
    name: str
    lat: float
    lng: float
    w: float
    v: float
    mat: Optional[str] = None

class RouteResult(BaseModel):
    vehicle: VehicleIn
    distanceKm: float
    cost: float
    orders: List[RouteStop]

class PlanResult(BaseModel):
    name: str
    date: str
    origin_lat: float
    origin_lng: float
    totalKm: float
    totalCost: float
    totalW: float
    totalV: float
    routes: List[RouteResult]
    recommended_vehicles: Optional[int] = None
    actual_vehicles: Optional[int] = None

class IsochroneRequest(BaseModel):
    lat: float
    lng: float
    time_minutes: Optional[int] = 30
    distance_km: Optional[float] = None

class IsochroneResult(BaseModel):
    coordinates: List[List[float]]
    time_minutes: int
    distance_km: Optional[float] = None

class RouteFactorIn(BaseModel):
    name: str
    factor_type: str
    lat: float
    lng: float
    radius_km: float = 5.0
    severity: float = 1.0
    active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class RouteFactorOut(RouteFactorIn):
    id: int

class LayoutOptimizationRequest(BaseModel):
    vehicle_plate: str
    products: List[dict]  # [{type, length, width, height, weight, stackable}]

class LayoutOptimizationResult(BaseModel):
    vehicle_plate: str
    total_volume_used: float
    total_weight_used: float
    utilization_percent: float
    layout: List[dict]  # 3D positions
    warnings: List[str] = []
