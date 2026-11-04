import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load backend .env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./academic_planner.db")

# Ensure proper relative path for SQLite if used
if DATABASE_URL.startswith("sqlite:///./"):
    base_dir = Path(__file__).resolve().parent.parent
    db_file = DATABASE_URL.replace("sqlite:///./", "")
    full_db_path = base_dir / db_file
    engine = create_engine(
        f"sqlite:///{full_db_path}",
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models
    Base.metadata.create_all(bind=engine)
    
    # Initialize default daily availability if not present
    db = SessionLocal()
    try:
        existing = db.query(models.DailyAvailability).first()
        if not existing:
            # Monday through Sunday defaults (e.g., 3-4 hours on weekdays, 5 hours on weekends)
            defaults = [
                {"day_of_week": 0, "available_hours": 3.5, "start_hour": "17:30", "end_hour": "21:30", "is_active": True},
                {"day_of_week": 1, "available_hours": 3.5, "start_hour": "17:30", "end_hour": "21:30", "is_active": True},
                {"day_of_week": 2, "available_hours": 3.5, "start_hour": "17:30", "end_hour": "21:30", "is_active": True},
                {"day_of_week": 3, "available_hours": 3.5, "start_hour": "17:30", "end_hour": "21:30", "is_active": True},
                {"day_of_week": 4, "available_hours": 4.0, "start_hour": "17:00", "end_hour": "21:30", "is_active": True},
                {"day_of_week": 5, "available_hours": 6.0, "start_hour": "10:00", "end_hour": "17:00", "is_active": True},
                {"day_of_week": 6, "available_hours": 5.0, "start_hour": "11:00", "end_hour": "17:00", "is_active": True},
            ]
            for item in defaults:
                db.add(models.DailyAvailability(**item))
            db.commit()
    finally:
        db.close()
