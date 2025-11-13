from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from typing import List
from datetime import datetime, timedelta
import os, jwt
import requests
from passlib.context import CryptContext

from .db import init_db, get_session
from .models import Customer, Vehicle, User, Product
from .schemas import (
    CustomerIn, CustomerOut, VehicleIn, VehicleOut,
    PlanIn, PlanResult, RouteResult, RouteStop,
    UserRegister, UserLogin, TokenOut,
    IsochroneRequest, IsochroneResult,
    RouteFactorIn, RouteFactorOut,
    LayoutOptimizationRequest, LayoutOptimizationResult,
    ProductIn, ProductOut
)
from .models import RouteFactor, ProductLayout

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGO = os.getenv("JWT_ALGO", "HS256")
VRP_ENGINE = os.getenv("VRP_ENGINE", "ortools")
LONGDO_API_KEY = os.getenv("LONGDO_API_KEY", "be18ff5b483db0626748b0c4d17ee5a9")
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")

app = FastAPI(title="TBR Logistics API")

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/frontend")
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Serve frontend ---
from fastapi.staticfiles import StaticFiles
import os

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
# ----------------------

security = HTTPBearer()

def create_token(sub: str) -> str:
    payload = {"sub": sub, "exp": datetime.utcnow() + timedelta(hours=12)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def verify_token(token: str) -> str:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return data["sub"]
    except Exception:
        raise HTTPException(401, "invalid token")

def require_user(creds: HTTPAuthorizationCredentials = Depends(security), session: Session = Depends(get_session)) -> User:
    username = verify_token(creds.credentials)
    user = session.exec(select(User).where(User.username == username)).first()
    if not user: raise HTTPException(401, "user not found")
    return user

@app.on_event("startup")
def on_startup():
    init_db()

# Auth
@app.post("/auth/register", response_model=TokenOut)
def register(payload: UserRegister, session: Session = Depends(get_session)):
    exists = session.exec(select(User).where(User.username == payload.username)).first()
    if exists: raise HTTPException(400, "username already exists")
    hashed = pwd_ctx.hash(payload.password)
    user = User(username=payload.username, hashed_password=hashed)
    session.add(user); session.commit()
    return TokenOut(access_token=create_token(payload.username))

@app.post("/auth/login", response_model=TokenOut)
def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == payload.username)).first()
    if not user or not pwd_ctx.verify(payload.password, user.hashed_password):
        raise HTTPException(401, "invalid credentials")
    return TokenOut(access_token=create_token(payload.username))

# Customers
@app.get("/customers", response_model=List[CustomerOut])
def list_customers(q: str | None = None, session: Session = Depends(get_session)):
    from . import crud
    return crud.search_customers(session, q)

@app.post("/customers", response_model=CustomerOut)
def upsert_customer(payload: CustomerIn, user: User = Depends(require_user), session: Session = Depends(get_session)):
    from . import crud
    c = Customer(**payload.dict())
    return crud.upsert_customer(session, c)

@app.delete("/customers/{code}")
def delete_customer(code: str, user: User = Depends(require_user), session: Session = Depends(get_session)):
    c = session.exec(select(Customer).where(Customer.code == code)).first()
    if not c: raise HTTPException(404, "not found")
    session.delete(c); session.commit()
    return {"ok": True}

# Vehicles
@app.get("/vehicles", response_model=List[VehicleOut])
def list_vehicles(q: str | None = None, session: Session = Depends(get_session)):
    from . import crud
    return crud.search_vehicles(session, q)

@app.post("/vehicles", response_model=VehicleOut)
def upsert_vehicle(payload: VehicleIn, user: User = Depends(require_user), session: Session = Depends(get_session)):
    from . import crud
    v = Vehicle(**payload.dict())
    return crud.upsert_vehicle(session, v)

@app.delete("/vehicles/{plate}")
def delete_vehicle(plate: str, user: User = Depends(require_user), session: Session = Depends(get_session)):
    v = session.exec(select(Vehicle).where(Vehicle.plate == plate)).first()
    if not v: raise HTTPException(404, "not found")
    session.delete(v); session.commit()
    return {"ok": True}

# ---------- Products ----------
@app.get("/products", response_model=List[ProductOut])
def list_products(session: Session = Depends(get_session)):
    return list(session.exec(select(Product)))

@app.post("/products", response_model=ProductOut)
def create_product(payload: ProductIn, user: User = Depends(require_user), session: Session = Depends(get_session)):
    existing = session.exec(select(Product).where(Product.code == payload.code)).first()
    if existing:
        raise HTTPException(400, "Product code already exists")
    product = Product(**payload.dict())
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductIn, user: User = Depends(require_user), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    for k, v in payload.dict().items():
        setattr(product, k, v)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@app.delete("/products/{product_id}", response_model=dict)
def delete_product(product_id: int, user: User = Depends(require_user), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    session.delete(product)
    session.commit()
    return {"ok": True}

# Planning
@app.post("/plans/optimize", response_model=PlanResult)
def optimize_plan(payload: PlanIn, session: Session = Depends(get_session)):
    cust_map = {c.code: c for c in session.exec(select(Customer)).all()}
    orders: list[RouteStop] = []
    totalW = 0.0; totalV = 0.0
    
    # เพิ่ม orders จาก lines (สินค้าที่ส่งออก)
    for ln in payload.lines:
        if ln.return_item:
            continue  # ข้าม return items ในส่วนนี้
        c = cust_map.get(ln.customer_code)
        if not c: raise HTTPException(400, f"customer {ln.customer_code} not found")
        orders.append(RouteStop(code=c.code, name=c.name, lat=c.lat, lng=c.lng, w=ln.w, v=ln.v, mat=ln.mat))
        totalW += ln.w; totalV += ln.v
    
    # เพิ่ม return_items (สินค้าที่ขนกลับมาลาน) - Double Handling
    if payload.return_items:
        for ln in payload.return_items:
            c = cust_map.get(ln.customer_code)
            if not c: raise HTTPException(400, f"customer {ln.customer_code} not found")
            # สร้างจุดกลับมาลาน (origin) แต่เก็บข้อมูลสินค้าไว้
            orders.append(RouteStop(
                code=f"RETURN_{c.code}", 
                name=f"กลับลานจาก {c.name}", 
                lat=payload.origin_lat, 
                lng=payload.origin_lng, 
                w=ln.w, 
                v=ln.v, 
                mat=ln.mat
            ))
            totalW += ln.w; totalV += ln.v

    vehicles = session.exec(select(Vehicle).where(Vehicle.status == "ready")).all()
    if not vehicles: raise HTTPException(400, "no vehicles available")
    
    # จำกัดจำนวนรถถ้ามีการกำหนด
    if payload.max_vehicles and payload.max_vehicles > 0:
        vehicles = vehicles[:payload.max_vehicles]
    
    # คำนวณจำนวนรถที่แนะนำ
    recommended_vehicles = calculate_recommended_vehicles(orders, vehicles)

    origin = {"lat": payload.origin_lat, "lng": payload.origin_lng}
    
    # ใช้ real routing ถ้าต้องการ
    use_real_routing = payload.consider_traffic or payload.consider_highway
    consider_factors = (payload.consider_traffic or payload.consider_flood or 
                       payload.consider_breakdown or payload.consider_hills)

    if VRP_ENGINE.lower() == "ortools":
        routes = solve_vrp_ortools(origin, orders, vehicles, 
                                 use_real_routing=use_real_routing,
                                 date=payload.date,
                                 consider_factors=consider_factors,
                                 session=session)
    else:
        routes = solve_vrp_greedy(origin, orders, vehicles)

    totalKm = sum(r.distanceKm for r in routes)
    totalCost = sum(r.cost for r in routes)
    
    result = PlanResult(
        name=payload.name, date=payload.date,
        origin_lat=payload.origin_lat, origin_lng=payload.origin_lng,
        totalKm=totalKm, totalCost=totalCost, totalW=totalW, totalV=totalV,
        routes=routes,
    )
    
    # เพิ่มข้อมูลแนะนำ
    result.recommended_vehicles = recommended_vehicles
    result.actual_vehicles = len(routes)
    
    return result

def calculate_recommended_vehicles(orders: list[RouteStop], vehicles: list[Vehicle]) -> int:
    """คำนวณจำนวนรถที่แนะนำ"""
    if not orders or not vehicles:
        return 1
    
    totalW = sum(o.w or 0 for o in orders)
    totalV = sum(o.v or 0 for o in orders)
    
    # หารถที่ใหญ่ที่สุด
    maxW = max((v.capW or 0) for v in vehicles)
    maxV = max((v.capV or 0) for v in vehicles)
    
    if maxW == 0 and maxV == 0:
        return 1
    
    # คำนวณจำนวนรถขั้นต่ำ
    min_by_weight = int(totalW / maxW) + 1 if maxW > 0 else 1
    min_by_volume = int(totalV / maxV) + 1 if maxV > 0 else 1
    
    recommended = max(min_by_weight, min_by_volume)
    
    # เพิ่ม buffer 20% สำหรับการกระจายสินค้า
    recommended = int(recommended * 1.2) + 1
    
    return min(recommended, len(vehicles))

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    from math import radians, sin, cos, asin, sqrt
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    return 2 * R * asin(sqrt(a))

def nearest_neighbor(origin: dict, orders: list[RouteStop]) -> list[RouteStop]:
    remaining = orders[:]
    seq: list[RouteStop] = []
    cur = origin
    while remaining:
        best = None; bestD = 1e9; idx = -1
        for i, o in enumerate(remaining):
            d = haversine(cur["lat"], cur["lng"], o.lat, o.lng)
            if d < bestD: best = o; bestD = d; idx = i
        seq.append(best); cur = {"lat": best.lat, "lng": best.lng}
        remaining.pop(idx)
    return seq

def route_distance(origin: dict, seq: list[RouteStop]) -> float:
    dist = 0.0
    cur = origin
    for o in seq:
        dist += haversine(cur["lat"], cur["lng"], o.lat, o.lng)
        cur = {"lat": o.lat, "lng": o.lng}
    dist += haversine(cur["lat"], cur["lng"], origin["lat"], origin["lng"])
    return dist

def solve_vrp_greedy(origin: dict, orders: list[RouteStop], vehicles: list[Vehicle]) -> list[RouteResult]:
    def pick_vehicle(vehicles, pack_w, pack_v):
        fit = [v for v in vehicles if (v.capW or 0) >= pack_w and (v.capV or 0) >= pack_v]
        fit = sorted(fit, key=lambda v: (v.capW or 0, v.capV or 0))
        return (fit[0] if fit else sorted(vehicles, key=lambda v: (v.capW or 0))[0])

    remaining = orders[:]
    remaining.sort(key=lambda x: -(x.w or 0))
    routes = []
    while remaining:
        pack = []
        sumw = 0.0; sumv = 0.0
        i = 0
        while i < len(remaining):
            o = remaining[i]
            vw = sumw + (o.w or 0); vv = sumv + (o.v or 0)
            veh = pick_vehicle(vehicles, vw, vv)
            if (veh.capW or 0) >= vw and (veh.capV or 0) >= vv:
                pack.append(o); sumw = vw; sumv = vv; remaining.pop(i)
            else:
                i += 1
        veh = pick_vehicle(vehicles, sumw, sumv)
        seq = nearest_neighbor(origin, pack)
        dist = route_distance(origin, seq)
        cost = dist * float(veh.costPerKm or 20)
        veh_dict = {"plate": veh.plate, "type": veh.type, "capW": veh.capW, "capV": veh.capV, "owner": veh.owner, "costPerKm": veh.costPerKm, "status": veh.status}
        routes.append(RouteResult(vehicle=veh_dict, distanceKm=dist, cost=cost, orders=seq))
    return routes

def get_route_factors(lat: float, lng: float, date: str, session: Session) -> dict:
    """ดึงปัจจัยที่ส่งผลต่อการเดินทาง ณ จุดนั้น"""
    factors = session.exec(
        select(RouteFactor).where(
            RouteFactor.active == True
        )
    ).all()
    
    result = {
        "traffic_multiplier": 1.0,
        "highway_bonus": 0.0,  # ลดต้นทุนถ้าใช้ทางด่วน
        "flood_delay": 0.0,
        "breakdown_risk": 0.0,
        "hill_multiplier": 1.0
    }
    
    for factor in factors:
        # ตรวจสอบว่าอยู่ในรัศมีหรือไม่
        dist_km = haversine(lat, lng, factor.lat, factor.lng)
        if dist_km <= factor.radius_km:
            # ตรวจสอบวันที่
            if factor.start_date and factor.end_date:
                if not (factor.start_date <= date <= factor.end_date):
                    continue
            
            if factor.factor_type == "traffic":
                result["traffic_multiplier"] = max(result["traffic_multiplier"], factor.severity)
            elif factor.factor_type == "highway":
                result["highway_bonus"] = -0.1  # ลดต้นทุน 10%
            elif factor.factor_type == "flood":
                result["flood_delay"] = max(result["flood_delay"], (factor.severity - 1.0) * 30)  # นาที
            elif factor.factor_type == "breakdown":
                result["breakdown_risk"] = max(result["breakdown_risk"], (factor.severity - 1.0) * 0.1)
            elif factor.factor_type == "hill":
                result["hill_multiplier"] = max(result["hill_multiplier"], factor.severity)
    
    return result

def calculate_enhanced_cost(distance_km: float, base_cost_per_km: float, factors: dict, 
                           vehicle_type: str, weight: float) -> float:
    """คำนวณต้นทุนที่แม่นยำโดยพิจารณาปัจจัยต่างๆ"""
    base_cost = distance_km * base_cost_per_km
    
    # ปัจจัยจราจร
    traffic_cost = base_cost * (factors["traffic_multiplier"] - 1.0)
    
    # โบนัสทางด่วน
    highway_saving = base_cost * abs(factors["highway_bonus"])
    
    # ค่าเสียเวลา (น้ำท่วม)
    time_cost = factors["flood_delay"] * 0.5  # 500 บาท/ชั่วโมง = 0.5 บาท/นาที
    
    # ความเสี่ยงรถเสีย
    breakdown_cost = base_cost * factors["breakdown_risk"] * 0.1
    
    # เนินเขา (เพิ่มการใช้เชื้อเพลิง)
    hill_cost = base_cost * (factors["hill_multiplier"] - 1.0) * 0.3
    
    # น้ำหนัก (รถหนักใช้เชื้อเพลิงมากขึ้น)
    weight_factor = 1.0 + (weight / 10.0) * 0.05  # เพิ่ม 5% ต่อ 10 ตัน
    
    total_cost = (base_cost + traffic_cost - highway_saving + time_cost + 
                 breakdown_cost + hill_cost) * weight_factor
    
    return max(total_cost, base_cost * 0.8)  # อย่างน้อย 80% ของต้นทุนฐาน

def optimize_product_layout(vehicle: Vehicle, products: list[dict], session: Session = None) -> LayoutOptimizationResult:
    """วาง Layout สินค้าให้ optimize (3D Bin Packing) - ใช้ข้อมูลสินค้าจริง"""
    # ประมาณขนาดรถจากประเภท (แปลงเป็น cm)
    vehicle_dims = {
        "6W": {"length": 600, "width": 220, "height": 250},  # cm
        "10W": {"length": 900, "width": 240, "height": 280},
        "18W": {"length": 1300, "width": 250, "height": 300}
    }
    
    dims = vehicle_dims.get(vehicle.type, {"length": 600, "width": 220, "height": 250})
    
    # แปลง products ให้ใช้ข้อมูลจริงจาก Product database
    processed_products = []
    for p in products:
        product_code = p.get("product_code")
        quantity = p.get("quantity", 1)
        
        # ถ้ามี product_code ให้ดึงข้อมูลจาก database
        if product_code and session:
            product = session.exec(select(Product).where(Product.code == product_code)).first()
            if product:
                # แปลงขนาดจาก cm เป็น cm (ไม่ต้องแปลง)
                for _ in range(int(quantity)):
                    processed_products.append({
                        "length": product.length_cm,
                        "width": product.width_cm,
                        "height": product.height_cm,
                        "weight": product.weight_kg / 1000,  # แปลงเป็นตัน
                        "stackable": product.stackable,
                        "max_stack": product.max_stack,
                        "product_code": product.code,
                        "product_name": product.name
                    })
                continue
        
        # ถ้าไม่มี product_code ใช้ข้อมูลที่ส่งมา (แปลงเป็น cm ถ้าจำเป็น)
        p_length = p.get("length", 0) * 100 if p.get("length", 0) < 10 else p.get("length", 0)  # ถ้าน้อยกว่า 10 คิดว่าเป็นเมตร
        p_width = p.get("width", 0) * 100 if p.get("width", 0) < 10 else p.get("width", 0)
        p_height = p.get("height", 0) * 100 if p.get("height", 0) < 10 else p.get("height", 0)
        p_weight = p.get("weight", 0)
        
        for _ in range(int(quantity)):
            processed_products.append({
                "length": p_length,
                "width": p_width,
                "height": p_height,
                "weight": p_weight,
                "stackable": p.get("stackable", True),
                "max_stack": p.get("max_stack"),
                "product_code": product_code,
                "product_name": p.get("name", "Unknown")
            })
    
    # First Fit Decreasing Algorithm (simplified 3D bin packing)
    products_sorted = sorted(processed_products, key=lambda p: -(p.get("length", 0) * p.get("width", 0) * p.get("height", 0)))
    
    layout = []
    current_x = 0
    current_y = 0
    current_z = 0
    current_row_height = 0
    total_volume = 0
    total_weight = 0
    warnings = []
    stack_counts = {}  # เก็บจำนวนที่ซ้อนกัน
    
    for i, product in enumerate(products_sorted):
        p_length = product.get("length", 0)
        p_width = product.get("width", 0)
        p_height = product.get("height", 0)
        p_weight = product.get("weight", 0)
        stackable = product.get("stackable", True)
        max_stack = product.get("max_stack")
        
        # ตรวจสอบน้ำหนัก (vehicle.capW เป็นตัน)
        if total_weight + p_weight > vehicle.capW * 1000:  # แปลงเป็น kg
            warnings.append(f"สินค้า {product.get('product_name', i+1)} น้ำหนักเกินความจุ")
            continue
        
        # ตรวจสอบการซ้อนกัน
        stack_key = f"{current_x}_{current_y}"
        current_stack = stack_counts.get(stack_key, 0)
        if not stackable or (max_stack and current_stack >= max_stack):
            # ต้องวางใหม่
            if current_x + p_length > dims["length"]:
                current_x = 0
                current_y += current_row_height if current_row_height > 0 else p_width
                current_row_height = 0
                stack_counts = {}  # รีเซ็ต stack counts เมื่อขึ้นแถวใหม่
        else:
            # ซ้อนได้
            current_z = current_stack * p_height
        
        # ตรวจสอบขอบเขต
        if current_x + p_length > dims["length"]:
            current_x = 0
            current_y += current_row_height if current_row_height > 0 else p_width
            current_row_height = 0
            current_z = 0
            stack_counts = {}
        
        if current_y + p_width > dims["width"]:
            current_y = 0
            current_z = 0
            current_row_height = 0
            stack_counts = {}
        
        if current_z + p_height > dims["height"]:
            warnings.append(f"สินค้า {product.get('product_name', i+1)} สูงเกินความจุ")
            continue
        
        # ตรวจสอบปริมาตร (cm³ แปลงเป็น m³)
        volume_cm3 = p_length * p_width * p_height
        volume_m3 = volume_cm3 / 1000000
        if total_volume + volume_m3 > vehicle.capV:
            warnings.append(f"สินค้า {product.get('product_name', i+1)} ปริมาตรเกินความจุ")
            continue
        
        layout.append({
            "product_index": i,
            "x": current_x,
            "y": current_y,
            "z": current_z,
            "length": p_length,
            "width": p_width,
            "height": p_height,
            "weight": p_weight,
            "product_code": product.get("product_code"),
            "product_name": product.get("product_name")
        })
        
        current_x += p_length
        current_row_height = max(current_row_height, p_height)
        total_volume += volume_m3
        total_weight += p_weight * 1000  # แปลงเป็น kg
        
        # อัปเดต stack count
        stack_key = f"{current_x - p_length}_{current_y}"
        stack_counts[stack_key] = stack_counts.get(stack_key, 0) + 1
    
    utilization = (total_volume / vehicle.capV * 100) if vehicle.capV > 0 else 0
    
    return LayoutOptimizationResult(
        vehicle_plate=vehicle.plate,
        total_volume_used=total_volume,
        total_weight_used=total_weight / 1000,  # แปลงกลับเป็นตัน
        utilization_percent=utilization,
        layout=layout,
        warnings=warnings
    )

def solve_vrp_ortools(origin: dict, orders: list[RouteStop], vehicles: list[Vehicle], 
                     use_real_routing: bool = False, date: str = "", 
                     consider_factors: bool = True, session: Session = None) -> list[RouteResult]:
    from ortools.constraint_solver import pywrapcp, routing_enums_pb2

    locs = [(origin["lat"], origin["lng"])] + [(o.lat, o.lng) for o in orders]

    def dist_m(i, j):
        a, b = locs[i], locs[j]
        base_dist = 0
        if use_real_routing and i != j:
            # ใช้ real routing API สำหรับระยะทางที่แม่นยำ
            route_data = get_longdo_route([{"lat": a[0], "lng": a[1]}, {"lat": b[0], "lng": b[1]}])
            base_dist = route_data.get("distance_km", 0) * 1000
        else:
            base_dist = haversine(a[0], a[1], b[0], b[1]) * 1000
        
        # ปรับตามปัจจัยต่างๆ
        if consider_factors and session and date:
            factors_a = get_route_factors(a[0], a[1], date, session)
            factors_b = get_route_factors(b[0], b[1], date, session)
            # ใช้ค่าเฉลี่ยของปัจจัยทั้งสองจุด
            avg_traffic = (factors_a["traffic_multiplier"] + factors_b["traffic_multiplier"]) / 2
            avg_hill = (factors_a["hill_multiplier"] + factors_b["hill_multiplier"]) / 2
            base_dist = base_dist * avg_traffic * avg_hill
        
        return int(round(base_dist))

    n = len(locs)
    distance_matrix = [[dist_m(i,j) for j in range(n)] for i in range(n)]

    demands_w = [0] + [int(round((o.w or 0) * 1000)) for o in orders]
    demands_v = [0] + [int(round((o.v or 0) * 1000)) for o in orders]

    caps_w = [int(round((v.capW or 0) * 1000)) for v in vehicles]
    caps_v = [int(round((v.capV or 0) * 1000)) for v in vehicles]
    costs_km = [float(v.costPerKm or 20.0) for v in vehicles]

    manager = pywrapcp.RoutingIndexManager(n, len(vehicles), 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        i = manager.IndexToNode(from_index)
        j = manager.IndexToNode(to_index)
        return distance_matrix[i][j]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_w_callback(from_index):
        i = manager.IndexToNode(from_index)
        return demands_w[i]
    demand_w_index = routing.RegisterUnaryTransitCallback(demand_w_callback)
    routing.AddDimensionWithVehicleCapacity(demand_w_index, 0, caps_w, True, "Weight")

    def demand_v_callback(from_index):
        i = manager.IndexToNode(from_index)
        return demands_v[i]
    demand_v_index = routing.RegisterUnaryTransitCallback(demand_v_callback)
    routing.AddDimensionWithVehicleCapacity(demand_v_index, 0, caps_v, True, "Volume")

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_params.time_limit.FromSeconds(5)

    solution = routing.SolveWithParameters(search_params)
    if solution is None:
        return solve_vrp_greedy(origin, orders, vehicles)

    results = []
    for vid in range(len(vehicles)):
        index = routing.Start(vid)
        if routing.IsEnd(solution.Value(routing.NextVar(index))):
            continue
        seq = []
        path = []
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            path.append(node)
            index = solution.Value(routing.NextVar(index))
        path.append(manager.IndexToNode(index))

        for node in path[1:-1]:
            o = orders[node-1]
            seq.append(RouteStop(code=o.code, name=o.name, lat=o.lat, lng=o.lng, w=o.w, v=o.v, mat=o.mat))

        dist_m_total = 0
        route_weight = sum(o.w or 0 for o in seq)
        
        # คำนวณต้นทุนที่แม่นยำ
        if consider_factors and session and date:
            # หาปัจจัยเฉลี่ยตลอดเส้นทาง
            avg_factors = {
                "traffic_multiplier": 1.0,
                "highway_bonus": 0.0,
                "flood_delay": 0.0,
                "breakdown_risk": 0.0,
                "hill_multiplier": 1.0
            }
            route_points = [origin] + [{"lat": o.lat, "lng": o.lng} for o in seq]
            for point in route_points:
                factors = get_route_factors(point["lat"], point["lng"], date, session)
                for key in avg_factors:
                    avg_factors[key] = (avg_factors[key] + factors[key]) / 2
            
            for a, b in zip(path[:-1], path[1:]):
                dist_m_total += distance_matrix[a][b]
            dist_km = dist_m_total / 1000.0
            cost = calculate_enhanced_cost(dist_km, costs_km[vid], avg_factors, vehicles[vid].type, route_weight)
        else:
            for a, b in zip(path[:-1], path[1:]):
                dist_m_total += distance_matrix[a][b]
            dist_km = dist_m_total / 1000.0
            cost = dist_km * costs_km[vid]
        
        veh = vehicles[vid]
        veh_dict = {"plate": veh.plate, "type": veh.type, "capW": veh.capW, "capV": veh.capV, "owner": veh.owner, "costPerKm": veh.costPerKm, "status": veh.status}
        results.append(RouteResult(vehicle=veh_dict, distanceKm=dist_km, cost=cost, orders=seq))

    results = [r for r in results if r.orders]
    return results if results else solve_vrp_greedy(origin, orders, vehicles)

# ---------- Routing APIs ----------
def get_longdo_route(waypoints: List[dict]) -> dict:
    """เรียก Longdo Map Routing API"""
    LONGDO_API_KEY = "be18ff5b483db0626748b0c4d17ee5a9"
    
    try:
        if not waypoints or len(waypoints) < 2:
            return {"distance_km": 0, "duration_seconds": 0, "geometry": []}
        
        # Longdo Route API format: lat,lon|lat,lon|...
        points = "|".join([f"{wp.get('lat', 0)},{wp.get('lng', wp.get('lon', 0))}" for wp in waypoints])
        url = f"https://search.longdo.com/mapsearch/json/route"
        params = {
            "key": LONGDO_API_KEY,
            "points": points,
            "mode": "fastest"  # fastest, shortest, avoid_highway
        }
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data and isinstance(data, dict) and data.get("code") == 0:
                route_data = data.get("data")
                if route_data and isinstance(route_data, list) and len(route_data) > 0:
                    route = route_data[0]
                    if route and isinstance(route, dict):
                        distance = route.get("distance", 0)
                        if isinstance(distance, (int, float)):
                            distance_km = distance / 1000.0
                        else:
                            distance_km = 0
                        
                        duration = route.get("time", 0)
                        if not isinstance(duration, (int, float)):
                            duration = 0
                        
                        geometry = route.get("geometry", [])
                        if not isinstance(geometry, list):
                            geometry = []
                        
                return {
                            "distance_km": distance_km,
                            "duration_seconds": int(duration),
                            "geometry": geometry
                        }
        
        # Fallback: ใช้ Haversine ถ้า API ไม่สำเร็จ
        if len(waypoints) >= 2:
            total_dist = 0
            for i in range(len(waypoints) - 1):
                wp1 = waypoints[i]
                wp2 = waypoints[i + 1]
                lat1 = wp1.get("lat", 0)
                lng1 = wp1.get("lng", wp1.get("lon", 0))
                lat2 = wp2.get("lat", 0)
                lng2 = wp2.get("lng", wp2.get("lon", 0))
                total_dist += haversine(lat1, lng1, lat2, lng2)
            return {"distance_km": total_dist, "duration_seconds": int(total_dist * 60), "geometry": []}
        
    except Exception as e:
        print(f"Longdo API error: {e}")
        # Fallback: ใช้ Haversine
        if waypoints and len(waypoints) >= 2:
            try:
                total_dist = 0
                for i in range(len(waypoints) - 1):
                    wp1 = waypoints[i]
                    wp2 = waypoints[i + 1]
                    lat1 = wp1.get("lat", 0)
                    lng1 = wp1.get("lng", wp1.get("lon", 0))
                    lat2 = wp2.get("lat", 0)
                    lng2 = wp2.get("lng", wp2.get("lon", 0))
                    total_dist += haversine(lat1, lng1, lat2, lng2)
                return {"distance_km": total_dist, "duration_seconds": int(total_dist * 60), "geometry": []}
            except:
                pass
    
    return {"distance_km": 0, "duration_seconds": 0, "geometry": []}

def get_tomtom_route(waypoints: List[dict], traffic: bool = False) -> dict:
    """เรียก TomTom Routing API"""
    if not TOMTOM_API_KEY:
        return {"distance_km": 0, "duration_seconds": 0, "geometry": []}
    try:
        # Format: lat1,lon1:lat2,lon2:...
        points = ":".join([f"{wp['lat']},{wp['lng']}" for wp in waypoints])
        url = f"https://api.tomtom.com/routing/1/calculateRoute/{points}/json"
        params = {
            "key": TOMTOM_API_KEY,
            "routeType": "fastest",
            "traffic": "true" if traffic else "false",
            "travelMode": "truck"
        }
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            routes = data.get("routes", [])
            if routes:
                route = routes[0]
                summary = route.get("summary", {})
                return {
                    "distance_km": summary.get("lengthInMeters", 0) / 1000.0,
                    "duration_seconds": summary.get("travelTimeInSeconds", 0),
                    "geometry": route.get("legs", [{}])[0].get("points", [])
                }
    except Exception as e:
        print(f"TomTom API error: {e}")
    return {"distance_km": 0, "duration_seconds": 0, "geometry": []}

@app.post("/api/routing/route")
def calculate_route(payload: dict):
    """คำนวณเส้นทางระหว่างหลายจุด"""
    waypoints = payload.get("waypoints", [])
    provider = payload.get("provider", "longdo")
    traffic = payload.get("traffic", False)
    
    if provider == "tomtom":
        return get_tomtom_route(waypoints, traffic)
    else:
        return get_longdo_route(waypoints)

@app.post("/api/routing/optimize-waypoints", response_model=dict)
def optimize_waypoints(payload: dict):
    """จัดลำดับ waypoints ให้เหมาะสมที่สุด (TomTom Waypoint Optimization)"""
    waypoints = payload.get("waypoints", [])
    origin = payload.get("origin", {})
    
    if not TOMTOM_API_KEY or len(waypoints) < 2:
        # Fallback to simple nearest neighbor
        return {"optimized_order": list(range(len(waypoints)))}
    
    try:
        # TomTom Waypoint Optimization API
        points = ":".join([f"{wp['lat']},{wp['lng']}" for wp in waypoints])
        url = f"https://api.tomtom.com/routing/1/calculateRoute/{origin['lat']},{origin['lng']}:{points}/json"
        params = {
            "key": TOMTOM_API_KEY,
            "routeType": "fastest",
            "optimize": "true",
            "travelMode": "truck"
        }
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            routes = data.get("routes", [])
            if routes:
                # Extract optimized order from route
                return {"optimized_order": list(range(len(waypoints)))}
    except Exception as e:
        print(f"TomTom optimization error: {e}")
    
    return {"optimized_order": list(range(len(waypoints)))}

@app.post("/api/routing/isochrone", response_model=IsochroneResult)
def calculate_isochrone(req: IsochroneRequest):
    """คำนวณ Isochrone (ขอบเขตตามเวลา) หรือ IsoDistance (ขอบเขตตามระยะทาง)"""
    # ใช้ Longdo หรือ TomTom สำหรับ isochrone
    # สำหรับตอนนี้ใช้ approximation แบบง่าย
    try:
        if TOMTOM_API_KEY:
            # TomTom Reachable Range API
            url = f"https://api.tomtom.com/routing/1/calculateReachableRange/{req.lat},{req.lng}/json"
            params = {
                "key": TOMTOM_API_KEY,
                "timeBudgetInSec": req.time_minutes * 60 if req.time_minutes else 1800,
                "routeType": "fastest",
                "travelMode": "truck"
            }
            if req.distance_km:
                params["distanceBudgetInMeters"] = int(req.distance_km * 1000)
            
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                reachable_range = data.get("reachableRange", {})
                boundary = reachable_range.get("boundary", [])
                coordinates = [[p.get("latitude"), p.get("longitude")] for p in boundary]
                return IsochroneResult(
                    coordinates=coordinates,
                    time_minutes=req.time_minutes or 30,
                    distance_km=req.distance_km
                )
    except Exception as e:
        print(f"Isochrone API error: {e}")
    
    # Fallback: สร้างวงกลมแบบง่าย
    from math import cos, radians
    # ประมาณ 1 องศา ≈ 111 km
    radius_deg = (req.distance_km or (req.time_minutes * 60 / 3600 * 60)) / 111.0
    import math
    coordinates = []
    for i in range(0, 360, 10):
        angle = math.radians(i)
        lat = req.lat + radius_deg * math.cos(angle)
        lng = req.lng + radius_deg * math.sin(angle) / math.cos(math.radians(req.lat))
        coordinates.append([lat, lng])
    
    return IsochroneResult(
        coordinates=coordinates,
        time_minutes=req.time_minutes or 30,
        distance_km=req.distance_km
    )

# --- DEFAULT ADMIN SEED (optional, ใช้กับ ENV) ---
import os
from sqlmodel import select
from .db import get_session
from .models import User
from passlib.context import CryptContext
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def ensure_default_admin():
    admin_u = os.getenv("ADMIN_USERNAME")
    admin_p = os.getenv("ADMIN_PASSWORD")
    if not admin_u or not admin_p:
        return
    # เปิด session แบบสั้น ๆ จาก dependency
    try:
        gen = get_session()
        session = next(gen)
        try:
            exists = session.exec(select(User).where(User.username == admin_u)).first()
            if not exists:
                user = User(username=admin_u, hashed_password=pwd_ctx.hash(admin_p))
                session.add(user)
                session.commit()
                print(f"[admin-seed] created default admin: {admin_u}")
            else:
                print(f"[admin-seed] admin exists: {admin_u}")
        finally:
            try:
                next(gen)
            except StopIteration:
                pass
    except Exception as e:
        print("[admin-seed] skip due to error:", e)

@app.post("/api/routing/layout-optimize", response_model=LayoutOptimizationResult)
def optimize_layout(payload: LayoutOptimizationRequest, session: Session = Depends(get_session)):
    """Optimize product layout in vehicle"""
    vehicle = session.exec(select(Vehicle).where(Vehicle.plate == payload.vehicle_plate)).first()
    if not vehicle:
        raise HTTPException(404, "vehicle not found")
    return optimize_product_layout(vehicle, payload.products, session)

@app.post("/route-factors", response_model=RouteFactorOut)
def create_route_factor(payload: RouteFactorIn, user: User = Depends(require_user), session: Session = Depends(get_session)):
    """สร้างปัจจัยที่ส่งผลต่อการเดินทาง"""
    factor = RouteFactor(**payload.dict())
    session.add(factor)
    session.commit()
    session.refresh(factor)
    return factor

@app.get("/route-factors", response_model=List[RouteFactorOut])
def list_route_factors(session: Session = Depends(get_session)):
    """รายการปัจจัยทั้งหมด"""
    return list(session.exec(select(RouteFactor)))

@app.delete("/route-factors/{factor_id}")
def delete_route_factor(factor_id: int, user: User = Depends(require_user), session: Session = Depends(get_session)):
    """ลบปัจจัย"""
    factor = session.exec(select(RouteFactor).where(RouteFactor.id == factor_id)).first()
    if not factor:
        raise HTTPException(404, "not found")
    session.delete(factor)
    session.commit()
    return {"ok": True}

@app.post("/plans/batch")
def create_batch_plans(payload: dict, session: Session = Depends(get_session)):
    """สร้างแผนหลายแผน (รายวัน/รายสัปดาห์/รายเดือน/รายปี)"""
    plan_type = payload.get("plan_type", "daily")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    base_plan = payload.get("base_plan")  # PlanIn structure
    
    if not start_date or not end_date or not base_plan:
        raise HTTPException(400, "missing required fields")
    
    from datetime import datetime, timedelta
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    plans = []
    current = start
    
    while current <= end:
        plan_date = current.strftime("%Y-%m-%d")
        plan_payload = PlanIn(**{**base_plan, "date": plan_date})
        
        # เรียก optimize_plan
        result = optimize_plan(plan_payload, session)
        plans.append(result)
        
        # เพิ่มวัน/สัปดาห์/เดือน/ปี
        if plan_type == "daily":
            current += timedelta(days=1)
        elif plan_type == "weekly":
            current += timedelta(weeks=1)
        elif plan_type == "monthly":
            current += timedelta(days=30)
        elif plan_type == "yearly":
            current += timedelta(days=365)
    
    return {"plans": plans, "count": len(plans)}

@app.on_event("startup")
def on_startup():
    init_db()
    ensure_default_admin()
