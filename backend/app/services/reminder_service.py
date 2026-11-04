import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from ..models import Reminder, Assignment, ScheduledSession, Task
from ..schemas import ReminderCreate

class ReminderService:
    @staticmethod
    def get_active_reminders(db: Session, include_dismissed: bool = False) -> List[Reminder]:
        query = db.query(Reminder)
        if not include_dismissed:
            query = query.filter(Reminder.is_dismissed == False)
        return query.order_by(Reminder.trigger_time.desc()).all()

    @staticmethod
    def create_reminder(db: Session, reminder_in: ReminderCreate) -> Reminder:
        reminder = Reminder(
            assignment_id=reminder_in.assignment_id,
            task_id=reminder_in.task_id,
            title=reminder_in.title,
            message=reminder_in.message,
            reminder_type=reminder_in.reminder_type,
            trigger_time=reminder_in.trigger_time,
            is_read=False,
            is_dismissed=False
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def mark_as_read(db: Session, reminder_id: int) -> Optional[Reminder]:
        reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
        if reminder:
            reminder.is_read = True
            db.commit()
            db.refresh(reminder)
        return reminder

    @staticmethod
    def dismiss_reminder(db: Session, reminder_id: int) -> Optional[Reminder]:
        reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
        if reminder:
            reminder.is_dismissed = True
            db.commit()
            db.refresh(reminder)
        return reminder

    @classmethod
    def scan_and_generate_system_reminders(cls, db: Session) -> int:
        """
        Scans upcoming deadlines and scheduled sessions to generate timely reminders.
        Returns count of newly generated reminders.
        """
        now = datetime.datetime.utcnow()
        new_count = 0

        # 1. Check assignments with upcoming deadlines
        assignments = db.query(Assignment).filter(
            Assignment.deadline != None,
            Assignment.completion_status != "Completed"
        ).all()

        for a in assignments:
            if not a.deadline:
                continue
            time_diff = a.deadline - now
            hours_left = time_diff.total_seconds() / 3600.0

            # If overdue
            if hours_left < 0:
                title = f"OVERDUE: {a.title}"
                msg = f"The deadline for '{a.title}' ({a.subject}) passed {abs(hours_left):.1f} hours ago. Review your schedule to complete remaining tasks."
                rem_type = "OverdueWarning"
            elif 0 <= hours_left <= 24:
                title = f"Urgent: {a.title} due in < 24h"
                msg = f"'{a.title}' is due in {hours_left:.1f} hours ({a.deadline.strftime('%b %d, %H:%M')}). Priority: {a.priority}."
                rem_type = "Deadline"
            elif 24 < hours_left <= 48:
                title = f"Upcoming: {a.title} due in 2 days"
                msg = f"'{a.title}' ({a.subject}) deadline is approaching on {a.deadline.strftime('%b %d, %H:%M')}."
                rem_type = "Deadline"
            else:
                continue

            # Avoid duplicates within same 12 hours
            twelve_hours_ago = now - datetime.timedelta(hours=12)
            exists = db.query(Reminder).filter(
                Reminder.assignment_id == a.id,
                Reminder.title == title,
                Reminder.created_at >= twelve_hours_ago
            ).first()

            if not exists:
                rem = Reminder(
                    assignment_id=a.id,
                    title=title,
                    message=msg,
                    reminder_type=rem_type,
                    trigger_time=now,
                    is_read=False,
                    is_dismissed=False
                )
                db.add(rem)
                new_count += 1

        # 2. Check today's study sessions
        today_str = now.strftime("%Y-%m-%d")
        today_sessions = db.query(ScheduledSession).filter(
            ScheduledSession.session_date == today_str,
            ScheduledSession.session_type == "Study",
            ScheduledSession.is_completed == False
        ).all()

        for s in today_sessions:
            title = f"Today's Study Session: {s.title}"
            exists = db.query(Reminder).filter(
                Reminder.title == title,
                Reminder.created_at >= (now - datetime.timedelta(hours=18))
            ).first()

            if not exists:
                rem = Reminder(
                    assignment_id=s.assignment_id,
                    task_id=s.task_id,
                    title=title,
                    message=f"Scheduled for today {s.start_time} - {s.end_time} ({s.duration_minutes} mins). Priority: {s.priority}.",
                    reminder_type="StudySession",
                    trigger_time=now,
                    is_read=False,
                    is_dismissed=False
                )
                db.add(rem)
                new_count += 1

        db.commit()
        return new_count
