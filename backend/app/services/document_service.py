import os
import re
import uuid
import datetime
from pathlib import Path
from typing import Tuple, Optional, List
from fastapi import UploadFile, HTTPException

import fitz  # PyMuPDF
import docx  # python-docx

# Upload directory configuration
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

class DocumentService:
    @staticmethod
    def validate_and_save_file(file: UploadFile, contents: bytes) -> Tuple[Path, str]:
        filename = file.filename or "uploaded_document"
        ext = Path(filename).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Only .pdf and .docx files are permitted."
            )

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of 15MB (File size: {len(contents)/(1024*1024):.2f}MB)."
            )

        if len(contents) == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty (0 bytes)."
            )

        # Generate unique safe filename
        safe_base = re.sub(r'[^a-zA-Z0-9_\-.]', '_', filename)
        unique_name = f"{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}_{safe_base}"
        saved_path = UPLOAD_DIR / unique_name

        with open(saved_path, "wb") as f:
            f.write(contents)

        return saved_path, unique_name

    @staticmethod
    def extract_text(file_path: Path) -> Tuple[str, str, bool]:
        """
        Extracts raw text from PDF or DOCX.
        Returns: (extracted_text, engine_name, is_empty_or_scanned)
        """
        ext = file_path.suffix.lower()
        text = ""

        if ext == ".pdf":
            try:
                doc = fitz.open(file_path)
                for page in doc:
                    text += page.get_text() + "\n"
                doc.close()
                engine = "PyMuPDF"
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to parse PDF document: {str(e)}")

        elif ext == ".docx":
            try:
                doc = docx.Document(file_path)
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                # Also include table cells if any
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                        if row_text:
                            paragraphs.append(row_text)
                text = "\n".join(paragraphs)
                engine = "python-docx"
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to parse DOCX document: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

        cleaned = text.strip()
        is_scanned_or_empty = len(cleaned) < 25

        return cleaned, engine, is_scanned_or_empty

    @classmethod
    def analyze_document_content(cls, file_path: Path, original_filename: str) -> dict:
        text, engine, is_scanned_or_empty = cls.extract_text(file_path)

        if is_scanned_or_empty:
            return {
                "title": Path(original_filename).stem.replace("_", " ").title(),
                "subject": "General / Unspecified",
                "deadline": None,
                "has_detected_deadline": False,
                "instructions": (
                    "Notice: The uploaded document appears to be scanned, image-only, or contains no readable digital text. "
                    "Optical Character Recognition (OCR) is not enabled in this offline environment. "
                    "Please manually inspect your document and fill in the assignment details below."
                ),
                "deliverables": ["Manual Submission Review"],
                "suggested_priority": "Medium",
                "suggested_difficulty": "Medium",
                "suggested_estimated_hours": 4.0,
                "extraction_source": engine,
                "raw_snippet": "[No selectable text detected in document]"
            }

        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 1. Identify Title
        title = ""
        # Look for headers like Assignment, Lab, Homework, Project
        for line in lines[:10]:
            if re.search(r'\b(assignment|lab\s+practical|project|homework|coursework|case\s+study|mini\s+project)\b', line, re.IGNORECASE):
                title = line
                break
        if not title and lines:
            title = lines[0][:100]
        if not title:
            title = Path(original_filename).stem.replace("_", " ").title()

        # 2. Identify Subject
        subject_matches = [
            "Data Structures & Algorithms", "Operating Systems", "Database Management Systems",
            "Computer Networks", "Software Engineering", "Artificial Intelligence",
            "Machine Learning", "Web Development", "Computer Architecture",
            "Theory of Computation", "Cloud Computing", "Cyber Security"
        ]
        found_subject = "Computer Science"
        for subj in subject_matches:
            if re.search(r'\b' + re.escape(subj) + r'\b', text, re.IGNORECASE):
                found_subject = subj
                break
        else:
            # Check for generic course code like CS101, CSE302, etc.
            course_code = re.search(r'\b([A-Z]{2,4}\s*[-_]?\s*\d{3,4})\b', text)
            if course_code:
                found_subject = f"Course {course_code.group(1)}"

        # 3. Identify Deadline
        deadline_str = None
        has_detected_deadline = False
        deadline_patterns = [
            r'(?:due\s+date|deadline|submission\s+date|submit\s+by|target\s+date)[:\s]+([A-Za-z0-9, \/\-\.]{6,30})',
            r'\b(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\b',
            r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b',
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b'
        ]

        for pat in deadline_patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                raw_match = match.group(1) if match.groups() else match.group(0)
                cleaned_date = raw_match.strip()
                # Parse to ISO string if possible
                parsed_iso = cls._try_parse_date(cleaned_date)
                if parsed_iso:
                    deadline_str = parsed_iso
                    has_detected_deadline = True
                    break

        # 4. Extract Deliverables & Instructions
        deliverables: List[str] = []
        instructions = ""

        # Check for bullet points or numbered lists
        list_items = re.findall(r'(?:^|\n)\s*(?:[-*•]|\d+\.)\s+(.+)', text)
        if list_items:
            deliverables = [item.strip() for item in list_items[:6] if len(item.strip()) > 8]

        # Extract snippet for instructions
        instr_match = re.search(r'(?:instructions?|guidelines?|tasks?|objectives?)[:\s]+([\s\S]{30,500})', text, re.IGNORECASE)
        if instr_match:
            instructions = instr_match.group(1).strip()
        else:
            instructions = "\n".join(lines[:6])

        # Priority & Difficulty heuristics
        suggested_priority = "Medium"
        if re.search(r'\b(urgent|critical|final|exam|major\s+project|weightage\s*:\s*[3-9]\d%)\b', text, re.IGNORECASE):
            suggested_priority = "High"

        suggested_difficulty = "Medium"
        if re.search(r'\b(advanced|complex|multi-tier|distributed|compiler|kernel|hard)\b', text, re.IGNORECASE):
            suggested_difficulty = "Hard"
        elif re.search(r'\b(introductory|basic|simple|overview|summary)\b', text, re.IGNORECASE):
            suggested_difficulty = "Easy"

        estimated_hours = 4.0
        if suggested_difficulty == "Hard":
            estimated_hours = 8.0
        elif suggested_difficulty == "Easy":
            estimated_hours = 2.5

        return {
            "title": title[:180],
            "subject": found_subject[:90],
            "deadline": deadline_str,
            "has_detected_deadline": has_detected_deadline,
            "instructions": instructions[:1000],
            "deliverables": deliverables if deliverables else ["Final Document / Source Code Submission"],
            "suggested_priority": suggested_priority,
            "suggested_difficulty": suggested_difficulty,
            "suggested_estimated_hours": estimated_hours,
            "extraction_source": engine,
            "raw_snippet": text[:400] + ("..." if len(text) > 400 else "")
        }

    @staticmethod
    def _try_parse_date(date_str: str) -> Optional[str]:
        cleaned = re.sub(r'[^\w\s\/:,\.-]', '', date_str).strip()
        # Common date formats
        formats = [
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%B %d, %Y",
            "%b %d, %Y",
            "%d %B %Y",
            "%d %b %Y"
        ]
        for fmt in formats:
            try:
                dt = datetime.datetime.strptime(cleaned, fmt)
                # If parsed date is past year or unspec, normalize
                return dt.isoformat()
            except ValueError:
                continue
        return None
