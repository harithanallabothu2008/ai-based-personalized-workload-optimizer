from typing import List, Optional
from sqlalchemy.orm import Session
from ..models import Task, Assignment, PlanningEvent
from ..schemas import TaskCreate, TaskUpdate
from .ai_service import AIService
from .work_estimation_service import WorkEstimationService

class TaskService:
    @staticmethod
    def create_task(db: Session, task_in: TaskCreate) -> Task:
        task = Task(**task_in.model_dump())
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_tasks_for_assignment(db: Session, assignment_id: int) -> List[Task]:
        return db.query(Task).filter(Task.assignment_id == assignment_id).order_by(Task.order_index.asc()).all()

    @staticmethod
    def get_all_tasks(db: Session) -> List[Task]:
        return db.query(Task).order_by(Task.order_index.asc()).all()

    @classmethod
    async def generate_tasks_for_assignment(cls, db: Session, assignment_id: int) -> dict:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise ValueError(f"Assignment with ID {assignment_id} does not exist.")

        # Check existing tasks
        existing_tasks = db.query(Task).filter(Task.assignment_id == assignment_id).all()
        if existing_tasks:
            # Return existing tasks
            return {
                "source_label": "Existing Tasks Retrieved",
                "is_ai_powered": False,
                "tasks": existing_tasks
            }

        # Generate structured breakdown using AI / Fallback
        breakdown = await AIService.generate_task_breakdown(
            title=assignment.title,
            subject=assignment.subject,
            description=assignment.description or "",
            difficulty=assignment.difficulty,
            total_hours=assignment.estimated_duration
        )

        created_tasks = []
        for i, t_data in enumerate(breakdown.get("tasks", [])):
            task = Task(
                assignment_id=assignment.id,
                name=t_data.get("name", f"Task {i+1}"),
                description=t_data.get("description", ""),
                category=t_data.get("category", "General"),
                priority=t_data.get("priority", assignment.priority),
                difficulty=t_data.get("difficulty", assignment.difficulty),
                estimated_duration=t_data.get("estimated_duration", 1.0),
                actual_time_spent=0.0,
                deadline=assignment.deadline,
                completion_status="Pending",
                dependencies=str(t_data.get("dependencies", "")),
                order_index=i + 1
            )
            db.add(task)
            created_tasks.append(task)

        db.commit()
        for t in created_tasks:
            db.refresh(t)

        return {
            "source_label": breakdown.get("source_label"),
            "is_ai_powered": breakdown.get("is_ai_powered", False),
            "tasks": created_tasks
        }

    @staticmethod
    def update_task(db: Session, task_id: int, task_update: TaskUpdate) -> Optional[Task]:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        update_data = task_update.model_dump(exclude_unset=True)
        prev_status = task.completion_status
        new_status = update_data.get("completion_status", prev_status)

        for key, value in update_data.items():
            setattr(task, key, value)

        # If task was newly marked as Completed and has actual_time_spent logged, record work history
        if prev_status != "Completed" and new_status == "Completed":
            actual_time = task.actual_time_spent if task.actual_time_spent > 0 else task.estimated_duration
            WorkEstimationService.record_work(
                db=db,
                task_id=task.id,
                task_name=task.name,
                category=task.category,
                estimated_hours=task.estimated_duration,
                actual_hours=actual_time
            )

        db.commit()
        db.refresh(task)

        # Check if all tasks in assignment are completed
        assignment = db.query(Assignment).filter(Assignment.id == task.assignment_id).first()
        if assignment:
            all_sibling_tasks = db.query(Task).filter(Task.assignment_id == assignment.id).all()
            if all_sibling_tasks and all(t.completion_status == "Completed" for t in all_sibling_tasks):
                assignment.completion_status = "Completed"
            elif any(t.completion_status in ("In Progress", "Completed") for t in all_sibling_tasks):
                assignment.completion_status = "In Progress"
            else:
                assignment.completion_status = "Pending"
            db.commit()

        return task
