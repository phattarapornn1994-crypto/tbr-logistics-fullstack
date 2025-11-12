from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
from .db import init_db, get_session
from .models import Customer, Vehicle
from .schemas import CustomerIn, CustomerOut, VehicleIn, VehicleOut, PlanIn, PlanResult, RouteResult, RouteStop

app = FastAPI(title="TBR Logistics API")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# ---------------- Customers ----------------
@app.get("/customers", response_model=List[CustomerOut])
def list_customers(q: str | None = None, session: Session = Depends(get_session)):
    from . import crud
    return crud.search_customers(session, q)

@app.post("/customers", response_model=CustomerOut)
def upsert_customer(payload: CustomerIn, session: Session = Depends(get_session)):
    from . import crud
    c = Customer(**payload.dict())
    return crud.upsert_customer(session, c)

@app.delete("/customers/{code}")
def delete_customer(code: str, session: Session = Depends(get_session)):
    c = session.exec(select(Customer).where(Customer.code == code)).first()
    if not c:
        raise HTTPException(404, "not found")
    session.delete(c); session.commit()
    return {"ok": True}

# ---------------- Vehicles ----------------
@app.get("/vehicles", response_model=List[VehicleOut])
def list_vehicles(q: str | None = None, session: Session = Depends(get_session)):
    from . import crud
    return crud.search_vehicles(session, q)

@app.post("/vehicles", response_model=VehicleOut)
def upsert_vehicle(payload: VehicleIn, session: Session = Depends(get_session)):
    from . import crud
    v = Vehicle(**payload.dict())
    return crud.upsert_vehicle(session, v)

@app.delete("/vehicles/{plate}")
def delete_vehicle(plate: str, session: Session = Depends(get_session)):
    v = session.exec(select(Vehicle).where(Vehicle.plate == plate)).first()
    if not v:
        raise HTTPException(404, "not found")
    session.delete(v); session.commit()
    return {"ok": True}

# ---------------- Planning ----------------
@app.post("/plans/optimize", response_model=PlanResult)
def optimize_plan(payload: PlanIn, session: Session = Depends(get_session)):
    # prepare customer lookup
    cust_map = {c.code: c for c in session.exec(select(Customer)).all()}

    orders: list[RouteStop] = []
    totalW = 0.0; totalV = 0.0
    for ln in payload.lines:
        c = cust_map.get(ln.customer_code)
        if not c:
            raise HTTPException(400, f"customer {ln.customer_code} not found")
        orders.append(RouteStop(code=c.code, name=c.name, lat=c.lat, lng=c.lng, w=ln.w, v=ln.v, mat=ln.mat))
        totalW += ln.w; totalV += ln.v

    vehicles = session.exec(select(Vehicle).where(Vehicle.status == "ready")).all()
    if not vehicles:
        raise HTTPException(400, "no vehicles available")

    origin = {"lat": payload.origin_lat, "lng": payload.origin_lng}

    # 1) clustering by greedy radius (25km)
    def km(a,b):
        return haversine(a["lat"], a["lng"], b["lat"], b["lng"])

    groups: list[list[RouteStop]] = []
    RADIUS = 25.0
    for o in orders:
        found = None
        for g in groups:
            if any(km({"lat":x.lat, "lng":x.lng}, {"lat":o.lat, "lng":o.lng}) < RADIUS for x in g):
                found = g; break
        if not found:
            groups.append([o])
        else:
            found.append(o)

    # 2) vehicle assignment & 3) nearest neighbor sequencing
    routes: list[RouteResult] = []
    for grp in groups:
        remaining = grp[:]
        remaining.sort(key=lambda x: -x.w)
        while remaining:
            veh = pick_vehicle(vehicles, remaining)
            pack: list[RouteStop] = []
            wsum = 0.0; vsum = 0.0
            i = 0
            while i < len(remaining):
                o = remaining[i]
                if wsum + o.w <= veh.capW and vsum + o.v <= veh.capV:
                    pack.append(o); wsum += o.w; vsum += o.v; remaining.pop(i)
                else:
                    i += 1
            seq = nearest_neighbor(origin, pack)
            dist = route_distance(origin, seq)
            cost = dist * float(veh.costPerKm or 20)
            # convert Vehicle to VehicleIn-like dict
            veh_dict = {"plate": veh.plate, "type": veh.type, "capW": veh.capW, "capV": veh.capV, "owner": veh.owner, "costPerKm": veh.costPerKm, "status": veh.status}
            routes.append(PlanResult.__fields__["routes"].annotation.__args__[0](vehicle=veh_dict, distanceKm=dist, cost=cost, orders=seq))  # type: ignore

    totalKm = sum(r.distanceKm for r in routes)
    totalCost = sum(r.cost for r in routes)

    return PlanResult(
        name=payload.name,
        date=payload.date,
        origin_lat=payload.origin_lat,
        origin_lng=payload.origin_lng,
        totalKm=totalKm,
        totalCost=totalCost,
        totalW=totalW,
        totalV=totalV,
        routes=routes,
    )

# ---------- helpers ----------
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
    dist += haversine(cur["lat"], cur["lng"], origin["lat"], origin["lng"])  # return depot
    return dist

def pick_vehicle(vehicles: list[Vehicle], orders: list[RouteStop]) -> Vehicle:
    needW = sum(o.w for o in orders)
    needV = sum(o.v for o in orders)
    fit = [v for v in vehicles if v.capW >= needW and v.capV >= needV]
    cand = fit if fit else vehicles
    cand = sorted(cand, key=lambda v: v.capW)
    return cand[0]
