from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
from ..models import WorkHistory

DEFAULT_SPEED_FACTORS = {
    "Coding": 1.0,
    "Research": 1.0,
    "Report writing": 1.0,
    "Revision": 1.0,
    "General": 1.0
}

class WorkEstimationService:
    @staticmethod
    def record_work(db: Session, task_id: int, task_name: str, category: str, estimated_hours: float, actual_hours: float) -> WorkHistory:
        if estimated_hours <= 0:
            estimated_hours = 0.5
        speed_ratio = round(actual_hours / estimated_hours, 2)
        history = WorkHistory(
            task_id=task_id,
            task_name=task_name,
            category=category,
            estimated_duration=round(estimated_hours, 2),
            actual_duration=round(actual_hours, 2),
            speed_ratio=speed_ratio
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        return history

    @classmethod
    def get_category_speed_factor(cls, db: Session, category: str) -> Tuple[float, int, str]:
        """
        Calculates category speed factor using weighted average of historical completions.
        Returns: (speed_factor, sample_count, explanation)
        """
        records: List[WorkHistory] = db.query(WorkHistory).filter(WorkHistory.category == category).all()

        if not records or len(records) < 2:
            return 1.0, len(records), "Default baseline speed (Requires >= 2 completed tasks for personalized calibration)."

        # Most recent records given higher weight
        ratios = [r.speed_ratio for r in records[-10:]]
        avg_ratio = sum(ratios) / len(ratios)
        # Bounded between 0.6x and 2.2x to prevent runaway estimations
        adjusted = max(0.6, min(2.2, round(avg_ratio, 2)))

        if adjusted > 1.15:
            status = f"Paces slower than initial estimates ({adjusted}x). Automatically allocates extra buffer time."
        elif adjusted < 0.85:
            status = f"Paces faster than initial estimates ({adjusted}x). Streamlines scheduling duration."
        else:
            status = f"Paces accurately on target ({adjusted}x)."

        return adjusted, len(records), status

    @classmethod
    def estimate_task_duration(cls, db: Session, base_duration: float, category: str) -> Tuple[float, str]:
        speed_factor, count, exp = cls.get_category_speed_factor(db, category)
        adjusted_duration = round(base_duration * speed_factor, 1)
        # Ensure at least 0.25h (15 mins)
        adjusted_duration = max(0.25, adjusted_duration)

        explanation = (
            f"Estimated base: {base_duration}h. Category: {category}. "
            f"Historical factor: {speed_factor}x ({count} samples). Final calibrated duration: {adjusted_duration}h."
        )
        return adjusted_duration, explanation
