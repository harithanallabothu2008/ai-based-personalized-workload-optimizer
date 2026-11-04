import io
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.services.work_estimation_service import WorkEstimationService

from sqlalchemy.pool import StaticPool

# Use an in-memory SQLite database with StaticPool so all connections share the same memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    # Seed default availability
    from app import models
    db = TestingSessionLocal()
    for d in range(7):
        db.add(models.DailyAvailability(
            day_of_week=d,
            available_hours=4.0,
            start_hour="17:00",
            end_hour="21:00",
            is_active=True
        ))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_health_check():
    """Verify backend health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Academic Workload Optimizer" in data["app"]

def test_assignment_crud_and_persistence():
    """Verify assignment creation, retrieval, editing, and deletion in SQLite"""
    deadline = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).isoformat()
    payload = {
        "title": "Computer Networks Socket Programming",
        "subject": "Computer Networks",
        "description": "Implement a TCP chat server and client in Python.",
        "instructions": "Support multiple client connections using select or threading.",
        "deadline": deadline,
        "has_no_deadline": False,
        "priority": "High",
        "difficulty": "Hard",
        "estimated_duration": 5.0,
        "completion_status": "Pending"
    }

    # 1. Create
    res_create = client.post("/assignments", json=payload)
    assert res_create.status_code == 201
    created = res_create.json()
    assert created["id"] is not None
    assert created["title"] == payload["title"]
    assignment_id = created["id"]

    # 2. Retrieve
    res_get = client.get(f"/assignments/{assignment_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == assignment_id

    # 3. Update (Edit)
    res_patch = client.patch(f"/assignments/{assignment_id}", json={"priority": "Medium", "estimated_duration": 6.0})
    assert res_patch.status_code == 200
    updated = res_patch.json()
    assert updated["priority"] == "Medium"
    assert updated["estimated_duration"] == 6.0

    # 4. List all
    res_list = client.get("/assignments")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # 5. Delete
    res_del = client.delete(f"/assignments/{assignment_id}")
    assert res_del.status_code == 200
    # Confirm deletion
    res_get_del = client.get(f"/assignments/{assignment_id}")
    assert res_get_del.status_code == 404

def test_invalid_inputs():
    """Verify validation for missing fields and deadline constraints"""
    # Missing subject
    res1 = client.post("/assignments", json={"title": "No Subject"})
    assert res1.status_code == 422

    # Missing deadline without confirming has_no_deadline
    res2 = client.post("/assignments", json={
        "title": "Test Title",
        "subject": "CSE",
        "deadline": None,
        "has_no_deadline": False
    })
    assert res2.status_code == 400
    assert "Deadline date is required" in res2.json()["detail"]

    # Negative duration
    res3 = client.post("/assignments", json={
        "title": "Invalid Duration",
        "subject": "CSE",
        "deadline": datetime.datetime.utcnow().isoformat(),
        "estimated_duration": -2.0
    })
    assert res3.status_code == 422

def test_document_upload_validation():
    """Verify document upload validation rejects illegal file types and empty files"""
    # Reject .txt / .exe
    fake_txt = io.BytesIO(b"Hello plain text")
    res_txt = client.post(
        "/assignments/upload", 
        files={"file": ("malicious.exe", fake_txt, "application/octet-stream")}
    )
    assert res_txt.status_code == 400
    assert "Unsupported file type" in res_txt.json()["detail"]

    # Reject empty file
    empty_pdf = io.BytesIO(b"")
    res_empty = client.post(
        "/assignments/upload",
        files={"file": ("empty.pdf", empty_pdf, "application/pdf")}
    )
    assert res_empty.status_code == 400
    assert "empty" in res_empty.json()["detail"].lower()

def test_missing_ai_api_key_fallback():
    """Verify rules-based fallback operates reliably when no LLM API key is present"""
    # 1. Create an assignment
    res_a = client.post("/assignments", json={
        "title": "Compiler Design Lexical Analyzer",
        "subject": "Compiler Design",
        "deadline": (datetime.datetime.utcnow() + datetime.timedelta(days=4)).isoformat(),
        "has_no_deadline": False,
        "priority": "High",
        "difficulty": "Hard",
        "estimated_duration": 6.0
    })
    a_id = res_a.json()["id"]

    # 2. Generate tasks without API key
    res_tasks = client.post(f"/assignments/{a_id}/tasks")
    assert res_tasks.status_code == 200
    data = res_tasks.json()
    assert data["is_ai_powered"] is False
    assert "Rule-Based Academic Fallback" in data["source_label"]
    assert len(data["tasks"]) >= 4

    # 3. Test doubt assistant fallback
    res_qa = client.post("/assistant/ask", json={
        "question": "What is the time complexity of QuickSort vs MergeSort?",
        "assignment_id": a_id
    })
    assert res_qa.status_code == 200
    qa_data = res_qa.json()
    assert qa_data["is_ai_powered"] is False
    assert "Rule-Based Academic Fallback" in qa_data["source_label"]
    assert "O(N log N)" in qa_data["answer"]

def test_no_historical_work_speed_data():
    """Verify transparent work speed estimation with zero initial records"""
    db = TestingSessionLocal()
    factor, count, exp = WorkEstimationService.get_category_speed_factor(db, "Coding")
    assert factor == 1.0
    assert count == 0
    assert "baseline" in exp.lower()
    db.close()
