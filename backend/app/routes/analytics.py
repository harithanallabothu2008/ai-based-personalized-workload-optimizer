import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assignment, Task, WorkHistory, PlanningEvent, ScheduledSession
from ..schemas import (
    AnalyticsResponse, 
    CategorySpeedMetric, 
    WorkHistoryCreate, 
    WorkHistoryResponse
)
from ..services.work_estimation_service import WorkEstimationService

router = APIRouter(tags=["Analytics & Work History"])

@router.get("/analytics/progress", response_model=AnalyticsResponse)
def get_progress_analytics(db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    assignments = db.query(Assignment).all()
    tasks = db.query(Task).all()

    total_assignments = len(assignments)
    pending_assignments = sum(1 for a in assignments if a.completion_status == "Pending")
    in_progress_assignments = sum(1 for a in assignments if a.completion_status == "In Progress")
    completed_assignments = sum(1 for a in assignments if a.completion_status == "Completed")
    overdue_assignments = sum(1 for a in assignments if (a.deadline and a.deadline < now and a.completion_status != "Completed"))

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.completion_status == "Completed")
    pending_tasks = total_tasks - completed_tasks

    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    total_est = sum(t.estimated_duration for t in tasks)
    total_act = sum(t.actual_time_spent for t in tasks)

    # Category speeds
    categories = ["Coding", "Research", "Report writing", "Revision"]
    cat_metrics = []
    for cat in categories:
        factor, count, status = WorkEstimationService.get_category_speed_factor(db, cat)
        cat_metrics.append(CategorySpeedMetric(
            category=cat,
            sample_count=count,
            avg_speed_ratio=factor,
            status=status
        ))

    # Upcoming deadlines (next 7 days)
    upcoming = []
    for a in sorted([a for a in assignments if a.deadline and a.completion_status != "Completed"], key=lambda x: x.deadline):
        days_left = round((a.deadline - now).total_seconds() / 86400.0, 1)
        upcoming.append({
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "deadline": a.deadline.isoformat(),
            "days_left": days_left,
            "priority": a.priority
        })

    # Recent planning events
    events = db.query(PlanningEvent).order_by(PlanningEvent.timestamp.desc()).limit(10).all()
    events_list = [
        {
            "id": e.id,
            "event_type": e.event_type,
            "description": e.description,
            "timestamp": e.timestamp.isoformat()
        }
        for e in events
    ]

    return AnalyticsResponse(
        total_assignments=total_assignments,
        pending_assignments=pending_assignments,
        in_progress_assignments=in_progress_assignments,
        completed_assignments=completed_assignments,
        overdue_assignments=overdue_assignments,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        overall_completion_rate=completion_rate,
        total_estimated_hours=round(total_est, 1),
        total_actual_hours_logged=round(total_act, 1),
        category_speeds=cat_metrics,
        upcoming_deadlines=upcoming,
        recent_events=events_list
    )

@router.post("/work-history", response_model=WorkHistoryResponse, status_code=201)
def log_work_history(entry: WorkHistoryCreate, db: Session = Depends(get_db)):
    record = WorkEstimationService.record_work(
        db=db,
        task_id=entry.task_id or 0,
        task_name=entry.task_name or "Custom Work Block",
        category=entry.category,
        estimated_hours=entry.estimated_duration,
        actual_hours=entry.actual_duration
    )
    return record

@router.get("/work-history", response_model=List[WorkHistoryResponse])
def get_work_history(db: Session = Depends(get_db)):
    return db.query(WorkHistory).order_by(WorkHistory.completed_at.desc()).all()

@router.post("/demo-data")
def load_demo_data(db: Session = Depends(get_db)):
    """
    Seeds rich demonstration data for college project review demonstration.
    """
    now = datetime.datetime.utcnow()

    # Clear existing demo data to avoid collisions
    db.query(ScheduledSession).delete()
    db.query(Task).delete()
    db.query(Assignment).delete()
    db.query(WorkHistory).delete()
    db.commit()

    # 1. Assignment 1: OS Multithreading & Synchronization (Due in 2 days)
    a1 = Assignment(
        title="OS Lab 3: Multithreaded Producer-Consumer with Semaphores",
        subject="Operating Systems",
        description="Implement bounded buffer problem using POSIX pthread and semaphores in C/C++. Analyze race conditions and verify deadlock freedom.",
        instructions="Provide code with Makefile, output logs for 5 producers and 5 consumers, and a 3-page analysis report.",
        deadline=now + datetime.timedelta(days=2, hours=4),
        priority="High",
        difficulty="Hard",
        estimated_duration=6.5,
        completion_status="In Progress"
    )
    db.add(a1)
    db.flush()

    # Tasks for A1
    t1_1 = Task(
        assignment_id=a1.id,
        name="Study Pthread Mutex & POSIX Semaphores documentation",
        category="Research",
        priority="High",
        difficulty="Medium",
        estimated_duration=1.5,
        actual_time_spent=1.5,
        completion_status="Completed",
        order_index=1
    )
    t1_2 = Task(
        assignment_id=a1.id,
        name="Implement circular buffer logic and thread safety locks",
        category="Coding",
        priority="High",
        difficulty="Hard",
        estimated_duration=2.5,
        actual_time_spent=1.0,
        completion_status="In Progress",
        dependencies="1",
        order_index=2
    )
    t1_3 = Task(
        assignment_id=a1.id,
        name="Capture test runs with varying producer/consumer thread counts",
        category="Report writing",
        priority="Medium",
        difficulty="Easy",
        estimated_duration=1.5,
        actual_time_spent=0.0,
        completion_status="Pending",
        dependencies="2",
        order_index=3
    )
    t1_4 = Task(
        assignment_id=a1.id,
        name="Review memory leak report using Valgrind and submit archive",
        category="Revision",
        priority="High",
        difficulty="Easy",
        estimated_duration=1.0,
        actual_time_spent=0.0,
        completion_status="Pending",
        dependencies="3",
        order_index=4
    )
    db.add_all([t1_1, t1_2, t1_3, t1_4])

    # 2. Assignment 2: DBMS Normalization and SQL Queries (Due in 4 days)
    a2 = Assignment(
        title="DBMS Assignment 2: Relational Schema Normalization & Complex Joins",
        subject="Database Systems",
        description="Normalize an unnormalized university registration system up to BCNF. Write complex SQL queries with group by, having, and window functions.",
        instructions="Provide ER diagram, functional dependency list, 3NF/BCNF decomposition proofs, and DDL/DML scripts.",
        deadline=now + datetime.timedelta(days=4, hours=2),
        priority="Medium",
        difficulty="Medium",
        estimated_duration=5.0,
        completion_status="Pending"
    )
    db.add(a2)
    db.flush()

    t2_1 = Task(
        assignment_id=a2.id,
        name="Identify Functional Dependencies & find Candidate Keys",
        category="Research",
        priority="Medium",
        difficulty="Medium",
        estimated_duration=1.5,
        actual_time_spent=0.0,
        completion_status="Pending",
        order_index=1
    )
    t2_2 = Task(
        assignment_id=a2.id,
        name="Decompose relational schemas into 3NF and test for BCNF losslessness",
        category="Coding",
        priority="Medium",
        difficulty="Medium",
        estimated_duration=2.0,
        actual_time_spent=0.0,
        completion_status="Pending",
        dependencies="1",
        order_index=2
    )
    t2_3 = Task(
        assignment_id=a2.id,
        name="Write SQL queries for students enrolled in >3 electives with rank()",
        category="Coding",
        priority="Medium",
        difficulty="Easy",
        estimated_duration=1.5,
        actual_time_spent=0.0,
        completion_status="Pending",
        dependencies="2",
        order_index=3
    )
    db.add_all([t2_1, t2_2, t2_3])

    # 3. Assignment 3: Web Tech Full-Stack Microservice (Due in 6 days)
    a3 = Assignment(
        title="Web Engineering Project: RESTful API with Authentication",
        subject="Web Technologies",
        description="Build JWT authenticated REST API endpoints in FastAPI/Node with responsive frontend interface.",
        instructions="Include Postman collection, database migration scripts, and live demonstration video.",
        deadline=now + datetime.timedelta(days=6, hours=5),
        priority="High",
        difficulty="Hard",
        estimated_duration=7.0,
        completion_status="Pending"
    )
    db.add(a3)

    # 4. History records to demonstrate speed estimation formula
    h1 = WorkHistory(
        task_name="Pthread synchronization experiment",
        category="Coding",
        estimated_duration=2.0,
        actual_duration=2.4,
        speed_ratio=1.2,
        completed_at=now - datetime.timedelta(days=3)
    )
    h2 = WorkHistory(
        task_name="Binary Search Tree lab record",
        category="Coding",
        estimated_duration=1.5,
        actual_duration=1.8,
        speed_ratio=1.2,
        completed_at=now - datetime.timedelta(days=2)
    )
    h3 = WorkHistory(
        task_name="Literature survey on Cloud Virtualization",
        category="Research",
        estimated_duration=2.0,
        actual_duration=1.8,
        speed_ratio=0.9,
        completed_at=now - datetime.timedelta(days=1)
    )
    db.add_all([h1, h2, h3])
    db.commit()

    # Generate initial timetable for demo
    from ..scheduler.scheduling_engine import SchedulingEngine
    plan = SchedulingEngine.generate_schedule(db)

    return {
        "message": "Demo data successfully loaded! 3 assignments, 7 tasks, 3 historical calibration entries, and timetable generated.",
        "assignments_count": 3,
        "sessions_created": plan.total_sessions
    }

@router.delete("/demo-data")
def clear_all_data(db: Session = Depends(get_db)):
    """
    Cleans database tables for fresh user entry.
    """
    db.query(ScheduledSession).delete()
    db.query(Task).delete()
    db.query(Assignment).delete()
    db.query(WorkHistory).delete()
    db.query(PlanningEvent).delete()
    db.commit()
    return {"message": "All database records have been reset."}
