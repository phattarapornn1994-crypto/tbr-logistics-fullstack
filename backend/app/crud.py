from typing import List, Optional
from sqlmodel import select, Session
from .models import Customer, Vehicle, Plan, PlanLine, User

def get_user_by_username(session: Session, username: str) -> Optional[User]:
    return session.exec(select(User).where(User.username == username)).first()

def create_user(session: Session, username: str, hashed_password: str) -> User:
    u = User(username=username, hashed_password=hashed_password)
    session.add(u); session.commit(); session.refresh(u)
    return u

def upsert_customer(session: Session, c: Customer) -> Customer:
    existing = session.exec(select(Customer).where(Customer.code == c.code)).first()
    if existing:
        for k, v in c.model_dump().items():
            if k != "id":
                setattr(existing, k, v)
        session.add(existing); session.commit(); session.refresh(existing)
        return existing
    session.add(c); session.commit(); session.refresh(c)
    return c

def search_customers(session: Session, q: Optional[str] = None) -> List[Customer]:
    stmt = select(Customer)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Customer.code.like(like)) | (Customer.name.like(like)))
    return list(session.exec(stmt))

def upsert_vehicle(session: Session, v: Vehicle) -> Vehicle:
    existing = session.exec(select(Vehicle).where(Vehicle.plate == v.plate)).first()
    if existing:
        for k, val in v.model_dump().items():
            if k != "id":
                setattr(existing, k, val)
        session.add(existing); session.commit(); session.refresh(existing)
        return existing
    session.add(v); session.commit(); session.refresh(v)
    return v

def search_vehicles(session: Session, q: Optional[str] = None) -> List[Vehicle]:
    stmt = select(Vehicle)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Vehicle.plate.like(like)) | (Vehicle.type.like(like)))
    return list(session.exec(stmt))
