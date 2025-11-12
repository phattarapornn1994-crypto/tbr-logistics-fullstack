from sqlmodel import SQLModel, Session, create_engine
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/logistics.db"

@lru_cache
def get_settings() -> Settings:
    return Settings()

def _engine():
    url = get_settings().DATABASE_URL
    return create_engine(url, echo=False)

engine = _engine()

def init_db():
    from . import models  # register models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
