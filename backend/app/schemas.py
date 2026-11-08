from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict

# --- ASSIGNMENT SCHEMAS ---
class AssignmentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    has_no_deadline: bool = False
    priority: str = Field("Medium", pattern="^(High|Medium|Low)$")
    difficulty: str = Field("Medium", pattern="^(Hard|Medium|Easy)$")
    estimated_duration: float = Field(4.0, ge=0.1, le=500.0)
    completion_status: str = Field("Pending", pattern="^(Pending|In Progress|Completed|Overdue)$")
    document_filename: Optional[str] = None
    document_path: Optional[str] = None

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    has_no_deadline: Optional[bool] = None
    priority: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_duration: Optional[float] = None
    completion_status: Optional[str] = None
    document_filename: Optional[str] = None
    document_path: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    assignment_id: int
    name: str
    description: Optional[str] = None
    category: str
    priority: str
    difficulty: str
    estimated_duration: float
    actual_time_spent: float
    deadline: Optional[datetime] = None
    completion_status: str
    dependencies: Optional[str] = None
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssignmentResponse(AssignmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    tasks: List[TaskResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- TASK SCHEMAS ---
class TaskBase(BaseModel):
    assignment_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field("Coding")
    priority: str = Field("Medium", pattern="^(High|Medium|Low)$")
    difficulty: str = Field("Medium", pattern="^(Hard|Medium|Easy)$")
    estimated_duration: float = Field(1.0, ge=0.1, le=100.0)
    actual_time_spent: float = Field(0.0, ge=0.0)
    deadline: Optional[datetime] = None
    completion_status: str = Field("Pending", pattern="^(Pending|In Progress|Completed)$")
    dependencies: Optional[str] = None
    order_index: int = 0

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_duration: Optional[float] = None
    actual_time_spent: Optional[float] = None
    deadline: Optional[datetime] = None
    completion_status: Optional[str] = None
    dependencies: Optional[str] = None
    order_index: Optional[int] = None

# --- AVAILABILITY SCHEMAS ---
class DailyAvailabilityBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    available_hours: float = Field(..., ge=0.0, le=24.0)
    start_hour: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_hour: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    is_active: bool = True

class DailyAvailabilityResponse(DailyAvailabilityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class DailyAvailabilityBulkUpdate(BaseModel):
    availability: List[DailyAvailabilityBase]

# --- SESSION & SCHEDULER SCHEMAS ---
class ScheduledSessionResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    assignment_id: Optional[int] = None
    title: str
    session_type: str
    session_date: str
    start_time: str
    end_time: str
    duration_minutes: int
    priority: str
    is_completed: bool
    is_manually_adjusted: bool
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScheduleSessionUpdate(BaseModel):
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_completed: Optional[bool] = None
    notes: Optional[str] = None

class ScheduleWarning(BaseModel):
    type: str  # OVERLOAD, DEADLINE_RISK, DEPENDENCY_CONFLICT, INSUFFICIENT_TIME
    assignment_id: Optional[int] = None
    task_id: Optional[int] = None
    title: str
    message: str
    severity: str = "warning"  # info, warning, danger

class SchedulePlanResponse(BaseModel):
    total_sessions: int
    total_study_minutes: int
    sessions: List[ScheduledSessionResponse]
    warnings: List[ScheduleWarning]
    explanation: str

class RescheduleRequest(BaseModel):
    trigger_task_id: Optional[int] = None
    reason: Optional[str] = "Student update on task progress or recorded hours"

# --- REMINDER SCHEMAS ---
class ReminderCreate(BaseModel):
    assignment_id: Optional[int] = None
    task_id: Optional[int] = None
    title: str
    message: str
    reminder_type: str = "General"
    trigger_time: datetime

class ReminderResponse(BaseModel):
    id: int
    assignment_id: Optional[int] = None
    task_id: Optional[int] = None
    title: str
    message: str
    reminder_type: str
    trigger_time: datetime
    is_read: bool
    is_dismissed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- WORK HISTORY & ANALYTICS SCHEMAS ---
class WorkHistoryCreate(BaseModel):
    task_id: Optional[int] = None
    task_name: Optional[str] = None
    category: str = "Coding"
    estimated_duration: float
    actual_duration: float

class WorkHistoryResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    task_name: Optional[str] = None
    category: str
    estimated_duration: float
    actual_duration: float
    speed_ratio: float
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CategorySpeedMetric(BaseModel):
    category: str
    sample_count: int
    avg_speed_ratio: float  # >1 means takes longer than estimated; <1 means faster
    status: str

class AnalyticsResponse(BaseModel):
    total_assignments: int
    pending_assignments: int
    in_progress_assignments: int
    completed_assignments: int
    overdue_assignments: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overall_completion_rate: float
    total_estimated_hours: float
    total_actual_hours_logged: float
    category_speeds: List[CategorySpeedMetric]
    upcoming_deadlines: List[dict]
    recent_events: List[dict]

# --- DOCUMENT EXTRACTION SCHEMAS ---
class ExtractedAssignmentData(BaseModel):
    title: str
    subject: str
    deadline: Optional[str] = None
    instructions: str
    deliverables: List[str] = []
    suggested_priority: str = "Medium"
    suggested_difficulty: str = "Medium"
    suggested_estimated_hours: float = 4.0
    extraction_source: str  # "PyMuPDF" or "python-docx"
    raw_snippet: str
    has_detected_deadline: bool = False
    document_filename: Optional[str] = None
    document_path: Optional[str] = None

# --- ASSISTANT SCHEMAS ---
class AssistantAskRequest(BaseModel):
    question: str = Field(..., min_length=3)
    assignment_id: Optional[int] = None
    context: Optional[str] = None

class AssistantAskResponse(BaseModel):
    answer: str
    is_ai_powered: bool
    source_label: str  # "AI Engine (Gemini/LLM)" or "Rule-Based Academic Fallback"
    related_assignment_title: Optional[str] = None
    suggested_steps: List[str] = []
