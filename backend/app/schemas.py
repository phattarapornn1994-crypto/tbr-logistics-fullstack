from typing import List, Optional
from pydantic import BaseModel

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
