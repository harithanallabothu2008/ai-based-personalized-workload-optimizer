import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assignment, Task
from ..schemas import (
    AssignmentCreate, 
    AssignmentUpdate, 
    AssignmentResponse,
    ExtractedAssignmentData
)
from ..services.document_service import DocumentService
from ..services.task_service import TaskService

router = APIRouter(prefix="/assignments", tags=["Assignments"])

@router.post("", response_model=AssignmentResponse, status_code=201)
def create_assignment(assignment_in: AssignmentCreate, db: Session = Depends(get_db)):
    # Validate deadline consistency
    if not assignment_in.has_no_deadline and assignment_in.deadline is None:
        raise HTTPException(
            status_code=400,
            detail="Deadline date is required unless 'has_no_deadline' is explicitly confirmed."
        )

    assignment = Assignment(**assignment_in.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("", response_model=List[AssignmentResponse])
def get_assignments(db: Session = Depends(get_db)):
    # Update overdue statuses on retrieval
    now = datetime.datetime.utcnow()
    assignments = db.query(Assignment).all()
    for a in assignments:
        if a.deadline and a.deadline < now and a.completion_status not in ("Completed", "Overdue"):
            a.completion_status = "Overdue"
    db.commit()
    return assignments

@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@router.patch("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(assignment_id: int, update_in: AssignmentUpdate, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_dict = update_in.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(assignment, key, value)

    db.commit()
    db.refresh(assignment)
    return assignment

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    db.delete(assignment)
    db.commit()
    return {"message": f"Assignment '{assignment.title}' (ID {assignment_id}) and related tasks deleted successfully."}

@router.post("/upload", response_model=ExtractedAssignmentData)
async def upload_assignment_document(file: UploadFile = File(...)):
    """
    Accepts PDF or DOCX, parses content with PyMuPDF or python-docx,
    extracts title, subject, instructions, deliverables, and deadline.
    Returns draft data for user confirmation without saving to DB yet.
    """
    contents = await file.read()
    saved_path, unique_name = DocumentService.validate_and_save_file(file, contents)
    analysis = DocumentService.analyze_document_content(saved_path, file.filename or unique_name)
    
    return ExtractedAssignmentData(
        title=analysis["title"],
        subject=analysis["subject"],
        deadline=analysis["deadline"],
        instructions=analysis["instructions"],
        deliverables=analysis["deliverables"],
        suggested_priority=analysis["suggested_priority"],
        suggested_difficulty=analysis["suggested_difficulty"],
        suggested_estimated_hours=analysis["suggested_estimated_hours"],
        extraction_source=analysis["extraction_source"],
        raw_snippet=analysis["raw_snippet"],
        has_detected_deadline=analysis["has_detected_deadline"],
        document_filename=file.filename or unique_name,
        document_path=str(saved_path)
    )
