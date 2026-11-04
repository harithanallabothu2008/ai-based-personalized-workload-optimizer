import os
import json
import httpx
from typing import List, Dict, Any, Optional

class AIService:
    @staticmethod
    def get_api_key() -> Optional[str]:
        key = os.getenv("LLM_API_KEY", "").strip()
        return key if key else None

    @classmethod
    def is_ai_configured(cls) -> bool:
        return bool(cls.get_api_key())

    @classmethod
    async def generate_task_breakdown(
        cls, 
        title: str, 
        subject: str, 
        description: str, 
        difficulty: str, 
        total_hours: float
    ) -> Dict[str, Any]:
        """
        Generates structured subtasks. Uses real LLM if configured, otherwise rule-based fallback.
        """
        api_key = cls.get_api_key()
        if api_key:
            try:
                # Try Gemini or LLM API if key is set
                tasks = await cls._call_gemini_for_tasks(api_key, title, subject, description, difficulty, total_hours)
                if tasks and len(tasks) >= 3:
                    return {
                        "is_ai_powered": True,
                        "source_label": "AI Engine (Gemini LLM)",
                        "tasks": tasks
                    }
            except Exception as e:
                # Log and proceed to fallback
                pass

        # Robust Rule-Based Fallback
        fallback_tasks = cls._rule_based_task_breakdown(title, subject, description, difficulty, total_hours)
        return {
            "is_ai_powered": False,
            "source_label": "Rule-Based Academic Fallback (No External API Key Configured)",
            "tasks": fallback_tasks
        }

    @classmethod
    def _rule_based_task_breakdown(
        cls, 
        title: str, 
        subject: str, 
        description: str, 
        difficulty: str, 
        total_hours: float
    ) -> List[Dict[str, Any]]:
        # Distribute total hours across 5-6 logical academic stages
        diff_multiplier = 1.2 if difficulty == "Hard" else (0.8 if difficulty == "Easy" else 1.0)
        eff_hours = max(2.0, total_hours * diff_multiplier)

        # Proportions: Req (15%), Research (20%), Core/Coding (35%), Report/Screenshots (15%), Review/Prep (15%)
        t1_hrs = max(0.5, round(eff_hours * 0.15, 1))
        t2_hrs = max(0.5, round(eff_hours * 0.20, 1))
        t3_hrs = max(1.0, round(eff_hours * 0.35, 1))
        t4_hrs = max(0.5, round(eff_hours * 0.15, 1))
        t5_hrs = max(0.5, round(eff_hours * 0.15, 1))

        is_coding_subject = any(k in f"{title} {subject} {description}".lower() for k in [
            "code", "programming", "python", "java", "c++", "database", "sql", "web", "react", "algorithm", "data structure", "lab"
        ])

        core_name = "Implement Core Program & Algorithms" if is_coding_subject else "Draft Core Solution & Case Analysis"
        core_cat = "Coding" if is_coding_subject else "Research"

        return [
            {
                "name": f"Understand Requirements & Setup for {title}",
                "description": f"Read assignment specifications, set up development workspace/environment, and verify constraints for {subject}.",
                "category": "Research",
                "priority": "High",
                "difficulty": "Easy",
                "estimated_duration": t1_hrs,
                "dependencies": "",
                "order_index": 1
            },
            {
                "name": f"Background Research & Reference Literature",
                "description": f"Explore textbook chapters, lecture slides, and documentation regarding {subject} relevant to this assignment.",
                "category": "Research",
                "priority": "Medium",
                "difficulty": "Medium",
                "estimated_duration": t2_hrs,
                "dependencies": "1",
                "order_index": 2
            },
            {
                "name": core_name,
                "description": f"Perform main practical work, write functional test cases, and debug issues according to requirements.",
                "category": core_cat,
                "priority": "High",
                "difficulty": difficulty,
                "estimated_duration": t3_hrs,
                "dependencies": "2",
                "order_index": 3
            },
            {
                "name": "Prepare Documentation & Results / Screenshots",
                "description": "Document methodology, capture output test runs/screenshots, and format the assignment according to college guidelines.",
                "category": "Report writing",
                "priority": "Medium",
                "difficulty": "Easy",
                "estimated_duration": t4_hrs,
                "dependencies": "3",
                "order_index": 4
            },
            {
                "name": "Final Review, Plagiarism Check & Submission Preparation",
                "description": "Proofread report, double-check all question criteria, run final code check, and prepare PDF/archive for portal submission.",
                "category": "Revision",
                "priority": "High",
                "difficulty": "Easy",
                "estimated_duration": t5_hrs,
                "dependencies": "4",
                "order_index": 5
            }
        ]

    @classmethod
    async def answer_academic_doubt(
        cls, 
        question: str, 
        assignment_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Answers academic questions with step-by-step guidance.
        """
        api_key = cls.get_api_key()
        if api_key:
            try:
                result = await cls._call_gemini_for_qa(api_key, question, assignment_context)
                if result:
                    return {
                        "answer": result.get("answer", ""),
                        "suggested_steps": result.get("suggested_steps", []),
                        "is_ai_powered": True,
                        "source_label": "AI Engine (Gemini LLM)"
                    }
            except Exception:
                pass

        # Transparent rule-based conceptual assistant fallback
        return cls._rule_based_academic_qa(question, assignment_context)

    @classmethod
    def _rule_based_academic_qa(cls, question: str, assignment_context: Optional[str] = None) -> Dict[str, Any]:
        q_lower = question.lower()
        
        # Check if question is too short or ambiguous
        if len(question.strip().split()) < 3:
            return {
                "answer": (
                    "Your question appears brief or underspecified. For the best academic guidance, "
                    "please include details such as the specific programming language, error message, algorithm, or concept you need help with."
                ),
                "suggested_steps": [
                    "State the specific problem or error message you encountered",
                    "Mention your programming language or framework",
                    "Specify what output you expected versus what actually happened"
                ],
                "is_ai_powered": False,
                "source_label": "Rule-Based Academic Fallback (No External API Key Configured)"
            }

        # Knowledge domain heuristics
        if any(w in q_lower for w in ["time complexity", "big o", "space complexity", "asymptotic"]):
            answer = (
                "Time and Space Complexity Analysis Guide:\n\n"
                "1. Big-O represents the upper bound of runtime as input size (N) grows.\n"
                "2. Constant time O(1): Array index lookup, push/pop on stack.\n"
                "3. Logarithmic time O(log N): Binary search, divide-and-conquer steps.\n"
                "4. Linear time O(N): Single loop through an array/linked list.\n"
                "5. Linearithmic time O(N log N): Merge Sort, Heap Sort, Quick Sort (average).\n"
                "6. Quadratic time O(N^2): Nested loops over the same collection (e.g. Bubble Sort).\n\n"
                "To optimize, look for repeated work inside loops, consider Hash Maps for O(1) lookups, or use two-pointer / binary search techniques."
            )
            steps = [
                "Count loop depths and identify loop step multipliers",
                "Check operations inside the innermost loop for any hidden linear scans",
                "Use hash sets or hash maps to reduce search operations from O(N) to O(1)"
            ]
        elif any(w in q_lower for w in ["database", "sql", "normalization", "acid", "join", "index"]):
            answer = (
                "Database & SQL Core Concepts:\n\n"
                "1. ACID Properties ensure reliable transactions: Atomicity (all or nothing), Consistency (valid state transitions), Isolation (concurrency control), and Durability (permanent persistence).\n"
                "2. Normalization (1NF, 2NF, 3NF, BCNF) eliminates redundancy and prevents update anomalies.\n"
                "3. Foreign Keys enforce referential integrity between parent and child tables.\n"
                "4. Indexes (B-Trees) accelerate SELECT query lookups but introduce write overhead on INSERT/UPDATE operations."
            )
            steps = [
                "Verify primary keys and foreign key constraints on all related entities",
                "Ensure tables meet 3NF: no partial dependencies and no transitive dependencies",
                "Use EXPLAIN query plans to inspect full table scans versus indexed scans"
            ]
        elif any(w in q_lower for w in ["deadlock", "process", "thread", "semaphore", "mutex", "operating system"]):
            answer = (
                "Operating Systems & Concurrency Concepts:\n\n"
                "1. A process is an independent program in execution with its own memory space; threads are lightweight execution paths sharing the parent process memory.\n"
                "2. Deadlock occurs when 4 Coffman conditions hold: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.\n"
                "3. Mutex vs Semaphore: A Mutex provides binary mutual exclusion (only the locking thread can unlock); a Semaphore maintains an integer counter to control access to a finite pool of resources."
            )
            steps = [
                "Acquire locks in a strict global ordering to prevent circular wait",
                "Always release locks inside a 'finally' block or using resource acquisition patterns (e.g., 'with' statement)",
                "Consider timeouts when attempting to acquire contentious shared resources"
            ]
        elif any(w in q_lower for w in ["debug", "error", "exception", "traceback", "not working", "fail"]):
            answer = (
                "Systematic Academic Debugging Methodology:\n\n"
                "1. Read the Stack Trace from bottom to top to identify the exact line and error type (e.g., NullPointerException, IndexError, TypeError).\n"
                "2. Isolate the minimal reproduction case by commenting out auxiliary code or using unit tests.\n"
                "3. Inspect variable states immediately before the failing line using breakpoints or logging.\n"
                "4. Check boundary conditions: empty arrays, 0-indexes, null/None values, and off-by-one errors."
            )
            steps = [
                "Examine the exact traceback line number and error message",
                "Verify data types of all inputs passed into the failing function",
                "Check edge cases: empty strings, null references, and negative values"
            ]
        else:
            context_note = f" (Context: {assignment_context})" if assignment_context else ""
            answer = (
                f"Academic Conceptual Breakdown{context_note}:\n\n"
                f"Regarding '{question}':\n"
                "In computer science academic coursework, solving complex tasks requires breaking them down into input specifications, "
                "algorithmic transformations, state management, and output verification.\n\n"
                "Key steps for your assignment:\n"
                "1. Define the mathematical or logical model for the problem.\n"
                "2. Sketch pseudocode before writing actual syntax.\n"
                "3. Implement test cases for regular, edge, and boundary inputs.\n"
                "4. Structure your report with Introduction, Methodology, System Design, Results, and Conclusion."
            )
            steps = [
                "Review the assignment problem statement and list all input/output constraints",
                "Draft pseudocode and verify theoretical time and space complexity",
                "Implement incrementally with unit tests for each module"
            ]

        return {
            "answer": answer,
            "suggested_steps": steps,
            "is_ai_powered": False,
            "source_label": "Rule-Based Academic Fallback (No External API Key Configured)"
        }

    @classmethod
    async def _call_gemini_for_tasks(cls, api_key: str, title: str, subject: str, desc: str, diff: str, hours: float) -> Optional[List[Dict[str, Any]]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = (
            f"You are an academic planning assistant. Break down this college assignment into 4 to 6 sequential tasks.\n"
            f"Title: {title}\nSubject: {subject}\nDescription: {desc}\nDifficulty: {diff}\nTotal Estimated Hours: {hours}\n"
            f"Return ONLY valid JSON matching this schema:\n"
            f"[\n"
            f"  {{\n"
            f"    \"name\": \"Task title\",\n"
            f"    \"description\": \"Actionable instructions\",\n"
            f"    \"category\": \"Coding|Research|Report writing|Revision\",\n"
            f"    \"priority\": \"High|Medium|Low\",\n"
            f"    \"difficulty\": \"Hard|Medium|Easy\",\n"
            f"    \"estimated_duration\": 1.5,\n"
            f"    \"dependencies\": \"\",\n"
            f"    \"order_index\": 1\n"
            f"  }}\n"
            f"]"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            if resp.status_code == 200:
                data = resp.json()
                text_out = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if "```json" in text_out:
                    text_out = text_out.split("```json")[1].split("```")[0].strip()
                elif "```" in text_out:
                    text_out = text_out.split("```")[1].split("```")[0].strip()
                parsed = json.loads(text_out)
                if isinstance(parsed, list):
                    return parsed
        return None

    @classmethod
    async def _call_gemini_for_qa(cls, api_key: str, question: str, context: Optional[str]) -> Optional[Dict[str, Any]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = (
            f"You are a friendly, encouraging academic tutor for a B.Tech CSE student.\n"
            f"Context: {context or 'General Academic Coursework'}\n"
            f"Question: {question}\n\n"
            f"Provide an explanation in clear, simple English, suitable for college review. Return JSON:\n"
            f"{{\n"
            f"  \"answer\": \"Detailed explanation with concepts and examples\",\n"
            f"  \"suggested_steps\": [\"Step 1\", \"Step 2\", \"Step 3\"]\n"
            f"}}"
        )
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            if resp.status_code == 200:
                data = resp.json()
                text_out = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if "```json" in text_out:
                    text_out = text_out.split("```json")[1].split("```")[0].strip()
                elif "```" in text_out:
                    text_out = text_out.split("```")[1].split("```")[0].strip()
                return json.loads(text_out)
        return None
