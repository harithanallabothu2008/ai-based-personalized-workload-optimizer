import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ScheduledSession, DailyAvailability
from ..schemas import (
    SchedulePlanResponse, 
    ScheduledSessionResponse, 
    ScheduleSessionUpdate, 
    RescheduleRequest,
    DailyAvailabilityResponse,
    DailyAvailabilityBulkUpdate
)
from ..scheduler.scheduling_engine import SchedulingEngine

router = APIRouter(prefix="/planner", tags=["Planner & Schedule"])

@router.post("/generate", response_model=SchedulePlanResponse)
def generate_schedule(
    preserve_completed: bool = Query(True, description="Whether to keep completed sessions untouched"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Executes scheduling algorithm: balances workload, breaks, dependencies, and student hours.
    """
    return SchedulingEngine.generate_schedule(db, preserve_completed=preserve_completed, start_date_str=start_date)

@router.get("/today", response_model=List[ScheduledSessionResponse])
def get_today_schedule(db: Session = Depends(get_db)):
    """
    Fetches scheduled sessions for the current day.
    """
    today_str = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    sessions = db.query(ScheduledSession).filter(
        ScheduledSession.session_date == today_str
    ).order_by(ScheduledSession.start_time.asc()).all()
    return sessions

@router.post("/reschedule", response_model=SchedulePlanResponse)
def reschedule_plan(request: RescheduleRequest, db: Session = Depends(get_db)):
    """
    Adaptive rescheduling: Shifts remaining work forward, recalculates availability,
    and updates deadline risk warnings.
    """
    return SchedulingEngine.reschedule_incomplete_tasks(
        db, 
        trigger_task_id=request.trigger_task_id, 
        reason=request.reason or "Manual adaptive rescheduling triggered by student"
    )

@router.get("/sessions", response_model=List[ScheduledSessionResponse])
def get_all_sessions(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(ScheduledSession)
    if start_date:
        query = query.filter(ScheduledSession.session_date >= start_date)
    if end_date:
        query = query.filter(ScheduledSession.session_date <= end_date)
    return query.order_by(ScheduledSession.session_date.asc(), ScheduledSession.start_time.asc()).all()

@router.patch("/sessions/{session_id}", response_model=ScheduledSessionResponse)
def update_scheduled_session(
    session_id: int, 
    session_update: ScheduleSessionUpdate, 
    db: Session = Depends(get_db)
):
    session = db.query(ScheduledSession).filter(ScheduledSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scheduled session not found")

    update_data = session_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(session, key, value)
    
    session.is_manually_adjusted = True
    db.commit()
    db.refresh(session)
    return session

@router.delete("/sessions/{session_id}")
def delete_scheduled_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ScheduledSession).filter(ScheduledSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Scheduled session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

# --- Student Availability Management ---
@router.get("/availability", response_model=List[DailyAvailabilityResponse])
def get_daily_availability(db: Session = Depends(get_db)):
    return db.query(DailyAvailability).order_by(DailyAvailability.day_of_week.asc()).all()

@router.put("/availability", response_model=List[DailyAvailabilityResponse])
def update_daily_availability(data: DailyAvailabilityBulkUpdate, db: Session = Depends(get_db)):
    for item in data.availability:
        record = db.query(DailyAvailability).filter(DailyAvailability.day_of_week == item.day_of_week).first()
        if record:
            record.available_hours = item.available_hours
            record.start_hour = item.start_hour
            record.end_hour = item.end_hour
            record.is_active = item.is_active
        else:
            db.add(DailyAvailability(**item.model_dump()))
    db.commit()
    return db.query(DailyAvailability).order_by(DailyAvailability.day_of_week.asc()).all()
