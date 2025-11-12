from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from typing import List
from datetime import datetime, timedelta
import os, jwt
from passlib.context import CryptContext

from .db import init_db, get_session
from .models import Customer, Vehicle, User
from .schemas import (
    CustomerIn, CustomerOut, VehicleIn, VehicleOut,
    PlanIn, PlanResult, RouteResult, RouteStop,
    UserRegister, UserLogin, TokenOut
)

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGO = os.getenv("JWT_ALGO", "HS256")
VRP_ENGINE = os.getenv("VRP_ENGINE", "ortools")

app = FastAPI(title="TBR Logistics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Serve frontend ---
import os
from fastapi.staticfiles import StaticFiles

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
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

# Planning
@app.post("/plans/optimize", response_model=PlanResult)
def optimize_plan(payload: PlanIn, session: Session = Depends(get_session)):
    cust_map = {c.code: c for c in session.exec(select(Customer)).all()}
    orders: list[RouteStop] = []
    totalW = 0.0; totalV = 0.0
    for ln in payload.lines:
        c = cust_map.get(ln.customer_code)
        if not c: raise HTTPException(400, f"customer {ln.customer_code} not found")
        orders.append(RouteStop(code=c.code, name=c.name, lat=c.lat, lng=c.lng, w=ln.w, v=ln.v, mat=ln.mat))
        totalW += ln.w; totalV += ln.v

    vehicles = session.exec(select(Vehicle).where(Vehicle.status == "ready")).all()
    if not vehicles: raise HTTPException(400, "no vehicles available")

    origin = {"lat": payload.origin_lat, "lng": payload.origin_lng}

    if VRP_ENGINE.lower() == "ortools":
        routes = solve_vrp_ortools(origin, orders, vehicles)
    else:
        routes = solve_vrp_greedy(origin, orders, vehicles)

    totalKm = sum(r.distanceKm for r in routes)
    totalCost = sum(r.cost for r in routes)
    return PlanResult(
        name=payload.name, date=payload.date,
        origin_lat=payload.origin_lat, origin_lng=payload.origin_lng,
        totalKm=totalKm, totalCost=totalCost, totalW=totalW, totalV=totalV,
        routes=routes,
    )

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

def solve_vrp_ortools(origin: dict, orders: list[RouteStop], vehicles: list[Vehicle]) -> list[RouteResult]:
    from ortools.constraint_solver import pywrapcp, routing_enums_pb2

    locs = [(origin["lat"], origin["lng"])] + [(o.lat, o.lng) for o in orders]

    def dist_m(i, j):
        a, b = locs[i], locs[j]
        return int(round(haversine(a[0], a[1], b[0], b[1]) * 1000))

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
        for a, b in zip(path[:-1], path[1:]):
            dist_m_total += distance_matrix[a][b]
        dist_km = dist_m_total / 1000.0
        cost = dist_km * costs_km[vid]
        veh = vehicles[vid]
        veh_dict = {"plate": veh.plate, "type": veh.type, "capW": veh.capW, "capV": veh.capV, "owner": veh.owner, "costPerKm": veh.costPerKm, "status": veh.status}
        results.append(RouteResult(vehicle=veh_dict, distanceKm=dist_km, cost=cost, orders=seq))

    results = [r for r in results if r.orders]
    return results if results else solve_vrp_greedy(origin, orders, vehicles)
