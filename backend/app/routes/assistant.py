from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Assignment
from ..schemas import AssistantAskRequest, AssistantAskResponse
from ..services.ai_service import AIService
from ..services.document_service import DocumentService

router = APIRouter(prefix="/assistant", tags=["AI Academic Assistant"])

@router.post("/ask", response_model=AssistantAskResponse)
async def ask_academic_assistant(request: AssistantAskRequest, db: Session = Depends(get_db)):
    assignment_context = None
    assignment_title = None

    if request.assignment_id:
        assignment = db.query(Assignment).filter(Assignment.id == request.assignment_id).first()
        if assignment:
            assignment_title = assignment.title
            doc_snippet = ""
            if assignment.document_path:
                try:
                    f_path = Path(assignment.document_path)
                    if f_path.exists():
                        doc_text, _, _ = DocumentService.extract_text(f_path)
                        if doc_text:
                            doc_snippet = f"\nUploaded Document Excerpt:\n{doc_text[:1200]}"
                except Exception:
                    pass

            assignment_context = (
                f"Subject: {assignment.subject}\n"
                f"Assignment: {assignment.title}\n"
                f"Instructions: {assignment.instructions or assignment.description or 'N/A'}"
                f"{doc_snippet}"
            )

    result = await AIService.answer_academic_doubt(
        question=request.question,
        assignment_context=assignment_context or request.context
    )

    return AssistantAskResponse(
        answer=result["answer"],
        is_ai_powered=result["is_ai_powered"],
        source_label=result["source_label"],
        related_assignment_title=assignment_title,
        suggested_steps=result.get("suggested_steps", [])
    )

@router.get("/status")
def get_ai_status():
    configured = AIService.is_ai_configured()
    return {
        "is_ai_configured": configured,
        "engine": "External LLM (Gemini)" if configured else "Intelligent Academic Rule-Based Fallback",
        "description": (
            "External LLM API active via backend .env" if configured else
            "Running in standalone offline mode. Conceptual doubt answering and task decomposition operate via built-in computer science heuristics."
        )
    }
