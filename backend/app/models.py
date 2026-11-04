import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    has_no_deadline = Column(Boolean, default=False)
    priority = Column(String(20), default="Medium")  # High, Medium, Low
    difficulty = Column(String(20), default="Medium")  # Hard, Medium, Easy
    estimated_duration = Column(Float, default=4.0)  # Total estimated hours
    completion_status = Column(String(30), default="Pending")  # Pending, In Progress, Completed, Overdue
    document_filename = Column(String(255), nullable=True)
    document_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    tasks = relationship("Task", back_populates="assignment", cascade="all, delete-orphan")
    scheduled_sessions = relationship("ScheduledSession", back_populates="assignment", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="Coding")  # Coding, Research, Report writing, Revision, General
    priority = Column(String(20), default="Medium")  # High, Medium, Low
    difficulty = Column(String(20), default="Medium")  # Hard, Medium, Easy
    estimated_duration = Column(Float, default=1.0)  # In hours
    actual_time_spent = Column(Float, default=0.0)  # In hours
    deadline = Column(DateTime, nullable=True)
    completion_status = Column(String(30), default="Pending")  # Pending, In Progress, Completed
    dependencies = Column(String(255), nullable=True)  # Comma-separated parent task IDs
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    assignment = relationship("Assignment", back_populates="tasks")
    scheduled_sessions = relationship("ScheduledSession", back_populates="task", cascade="all, delete-orphan")


class DailyAvailability(Base):
    __tablename__ = "daily_availability"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(Integer, unique=True, index=True)  # 0=Monday, 6=Sunday
    available_hours = Column(Float, default=3.0)
    start_hour = Column(String(10), default="17:00")  # HH:MM
    end_hour = Column(String(10), default="21:00")    # HH:MM
    is_active = Column(Boolean, default=True)


class ScheduledSession(Base):
    __tablename__ = "scheduled_sessions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    session_type = Column(String(30), default="Study")  # Study, Break, Review
    session_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(10), nullable=False)    # HH:MM
    end_time = Column(String(10), nullable=False)      # HH:MM
    duration_minutes = Column(Integer, nullable=False)
    priority = Column(String(20), default="Medium")
    is_completed = Column(Boolean, default=False)
    is_manually_adjusted = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="scheduled_sessions")
    assignment = relationship("Assignment", back_populates="scheduled_sessions")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    reminder_type = Column(String(50), default="General")  # Deadline, StudySession, OverloadWarning, IncompleteTask
    trigger_time = Column(DateTime, default=datetime.datetime.utcnow)
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class WorkHistory(Base):
    __tablename__ = "work_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    task_name = Column(String(255), nullable=True)
    category = Column(String(50), default="Coding")
    estimated_duration = Column(Float, nullable=False)
    actual_duration = Column(Float, nullable=False)
    speed_ratio = Column(Float, nullable=False)  # actual / estimated
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)


class PlanningEvent(Base):
    __tablename__ = "planning_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # ScheduleGenerated, Rescheduled, OverloadWarning
    description = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
