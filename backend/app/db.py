from sqlmodel import SQLModel, Session, create_engine
from pathlib import Path
import os

DB_PATH = os.getenv("DB_PATH", "./data/logistics.db")
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def init_db():
    from . import models  # ensure models imported
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
