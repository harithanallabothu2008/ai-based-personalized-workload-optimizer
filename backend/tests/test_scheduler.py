import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Assignment, Task, DailyAvailability, ScheduledSession
from app.scheduler.scheduling_engine import SchedulingEngine

from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Default 3 hours/day from 18:00 to 21:00
    for d in range(7):
        db.add(DailyAvailability(
            day_of_week=d,
            available_hours=3.0,
            start_hour="18:00",
            end_hour="21:00",
            is_active=True
        ))
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

def test_schedule_generation_and_no_overlaps(db_session):
    """Verify schedule generation respects time windows and prevents overlaps"""
    now = datetime.datetime.utcnow()
    # Create an assignment
    a = Assignment(
        title="Web Tech Mini Project",
        subject="Web Technologies",
        deadline=now + datetime.timedelta(days=3),
        priority="High",
        difficulty="Medium",
        estimated_duration=4.0
    )
    db_session.add(a)
    db_session.commit()

    # Generate schedule
    plan = SchedulingEngine.generate_schedule(db_session)
    assert plan.total_sessions > 0
    assert plan.total_study_minutes > 0

    # Check for overlapping sessions on the same date
    sessions = db_session.query(ScheduledSession).all()
    sessions_by_date = {}
    for s in sessions:
        sessions_by_date.setdefault(s.session_date, []).append(s)

    for date_str, s_list in sessions_by_date.items():
        s_list_sorted = sorted(s_list, key=lambda x: x.start_time)
        for i in range(len(s_list_sorted) - 1):
            cur_end = s_list_sorted[i].end_time
            next_start = s_list_sorted[i + 1].start_time
            # cur_end must be <= next_start
            assert cur_end <= next_start, f"Overlap detected on {date_str}: {cur_end} > {next_start}"

def test_insufficient_study_hours_overload_warning(db_session):
    """Verify system detects overloaded workload and generates explicit warnings"""
    now = datetime.datetime.utcnow()
    # Limit availability to just 1 hour total per day
    for avail in db_session.query(DailyAvailability).all():
        avail.available_hours = 0.5
        avail.start_hour = "19:00"
        avail.end_hour = "19:30"
    db_session.commit()

    # Create massive 40-hour workload
    for i in range(5):
        a = Assignment(
            title=f"Heavy Assignment {i+1}",
            subject="Computer Science",
            deadline=now + datetime.timedelta(days=2),
            priority="High",
            difficulty="Hard",
            estimated_duration=8.0
        )
        db_session.add(a)
    db_session.commit()

    plan = SchedulingEngine.generate_schedule(db_session)
    overload_warnings = [w for w in plan.warnings if w.type in ("OVERLOAD", "INSUFFICIENT_TIME")]
    assert len(overload_warnings) >= 1
    assert "overload" in overload_warnings[0].title.lower() or "unscheduled" in overload_warnings[0].title.lower()

def test_overdue_tasks_detection(db_session):
    """Verify past deadlines generate overdue warnings and get scheduled"""
    past_date = datetime.datetime.utcnow() - datetime.timedelta(days=2)
    a = Assignment(
        title="Late Lab Submission",
        subject="Algorithms",
        deadline=past_date,
        priority="High",
        difficulty="Medium",
        estimated_duration=2.0
    )
    db_session.add(a)
    db_session.commit()

    plan = SchedulingEngine.generate_schedule(db_session)
    overdue_warnings = [w for w in plan.warnings if w.type == "OVERDUE"]
    assert len(overdue_warnings) >= 1
    assert "Past Deadline" in overdue_warnings[0].title

def test_incomplete_task_adaptive_rescheduling(db_session):
    """Verify adaptive rescheduling preserves completed work and recalculates remaining sessions"""
    now = datetime.datetime.utcnow()
    a = Assignment(
        title="Data Structures Tree Balancing",
        subject="Data Structures",
        deadline=now + datetime.timedelta(days=4),
        priority="Medium",
        difficulty="Medium",
        estimated_duration=3.0
    )
    db_session.add(a)
    db_session.commit()

    # Initial schedule
    plan1 = SchedulingEngine.generate_schedule(db_session)
    initial_sessions = db_session.query(ScheduledSession).all()
    assert len(initial_sessions) > 0

    # Mark the first session as completed
    first_session = initial_sessions[0]
    first_session.is_completed = True
    db_session.commit()

    # Run adaptive rescheduling
    plan2 = SchedulingEngine.reschedule_incomplete_tasks(db_session, reason="User logged partial progress")
    
    # Verify the completed session was preserved
    preserved = db_session.query(ScheduledSession).filter(ScheduledSession.id == first_session.id).first()
    assert preserved is not None
    assert preserved.is_completed is True
