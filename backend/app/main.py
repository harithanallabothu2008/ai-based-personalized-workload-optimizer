import os
import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import init_db
from .routes import (
    assignments,
    tasks,
    planner,
    reminders,
    analytics,
    assistant
)

# Load environment configuration
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="AI-Based Personalized Academic Workload Optimizer",
    description="Full-Stack Academic Planning Engine: Document Extraction, Intelligent Scheduling, Adaptive Rescheduling & AI Doubt Assistant",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Initialize SQLite database and tables
    init_db()
    # Ensure uploads folder exists
    upload_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "app": "AI-Based Personalized Academic Workload Optimizer",
        "version": "1.0.0",
        "server_time": datetime.datetime.utcnow().isoformat(),
        "database": "SQLite (Connected)",
        "features": {
            "document_processing": "PyMuPDF & python-docx active",
            "scheduling_engine": "Constraint-Satisfaction Engine active",
            "ai_integration": "LLM API with rule-based fallback active",
            "browser_notifications": "API supported"
        }
    }

# Register route modules
app.include_router(assignments.router)
app.include_router(tasks.router)
app.include_router(planner.router)
app.include_router(reminders.router)
app.include_router(analytics.router)
app.include_router(assistant.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
