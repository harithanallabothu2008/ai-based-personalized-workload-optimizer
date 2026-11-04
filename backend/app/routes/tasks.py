from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Task, Assignment
from ..schemas import TaskCreate, TaskUpdate, TaskResponse
from ..services.task_service import TaskService

router = APIRouter(tags=["Tasks"])

@router.post("/assignments/{assignment_id}/tasks")
async def generate_or_create_tasks_for_assignment(
    assignment_id: int, 
    db: Session = Depends(get_db)
):
    try:
        result = await TaskService.generate_tasks_for_assignment(db, assignment_id)
        return {
            "source_label": result["source_label"],
            "is_ai_powered": result["is_ai_powered"],
            "tasks": [TaskResponse.model_validate(t) for t in result["tasks"]]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate tasks: {str(e)}")

@router.get("/tasks", response_model=List[TaskResponse])
def get_all_tasks(assignment_id: Optional[int] = None, db: Session = Depends(get_db)):
    if assignment_id:
        return TaskService.get_tasks_for_assignment(db, assignment_id)
    return TaskService.get_all_tasks(db)

@router.post("/tasks", response_model=TaskResponse, status_code=201)
def create_manual_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == task_in.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Parent assignment not found")
    return TaskService.create_task(db, task_in)

@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    updated = TaskService.update_task(db, task_id, task_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": f"Task '{task.name}' deleted successfully."}
