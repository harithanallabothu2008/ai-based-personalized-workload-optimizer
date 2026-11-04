from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Reminder
from ..schemas import ReminderCreate, ReminderResponse
from ..services.reminder_service import ReminderService

router = APIRouter(prefix="/reminders", tags=["Reminders"])

@router.get("", response_model=List[ReminderResponse])
def get_reminders(
    include_dismissed: bool = Query(False),
    auto_scan: bool = Query(True),
    db: Session = Depends(get_db)
):
    if auto_scan:
        ReminderService.scan_and_generate_system_reminders(db)
    return ReminderService.get_active_reminders(db, include_dismissed=include_dismissed)

@router.post("", response_model=ReminderResponse, status_code=201)
def create_reminder(reminder_in: ReminderCreate, db: Session = Depends(get_db)):
    return ReminderService.create_reminder(db, reminder_in)

@router.patch("/{reminder_id}/read", response_model=ReminderResponse)
def mark_reminder_read(reminder_id: int, db: Session = Depends(get_db)):
    rem = ReminderService.mark_as_read(db, reminder_id)
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return rem

@router.patch("/{reminder_id}/dismiss", response_model=ReminderResponse)
def dismiss_reminder(reminder_id: int, db: Session = Depends(get_db)):
    rem = ReminderService.dismiss_reminder(db, reminder_id)
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return rem

@router.post("/scan")
def scan_reminders(db: Session = Depends(get_db)):
    count = ReminderService.scan_and_generate_system_reminders(db)
    return {"message": f"Scan completed. Generated {count} new reminders."}
