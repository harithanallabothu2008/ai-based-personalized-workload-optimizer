import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from ..models import Task, Assignment, DailyAvailability, ScheduledSession, PlanningEvent
from ..schemas import SchedulePlanResponse, ScheduledSessionResponse, ScheduleWarning

class SchedulingEngine:
    @classmethod
    def generate_schedule(
        cls, 
        db: Session, 
        preserve_completed: bool = True,
        start_date_str: Optional[str] = None
    ) -> SchedulePlanResponse:
        """
        Deterministic, constraint-satisfaction scheduling algorithm.
        Considers deadlines, priorities, dependencies, availability windows, breaks, and overload risks.
        """
        now = datetime.datetime.utcnow()
        if start_date_str:
            try:
                base_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                base_date = now.date()
        else:
            base_date = now.date()

        # 1. Fetch student's configured daily availability (0=Monday, 6=Sunday)
        availability_records = db.query(DailyAvailability).filter(DailyAvailability.is_active == True).all()
        availability_map: Dict[int, DailyAvailability] = {a.day_of_week: a for a in availability_records}

        if not availability_map:
            # Fallback if unseeded
            availability_map = {
                d: DailyAvailability(day_of_week=d, available_hours=3.5, start_hour="17:00", end_hour="21:00", is_active=True)
                for d in range(7)
            }

        # 2. Query pending and in-progress tasks
        pending_tasks = db.query(Task).join(Assignment).filter(
            Task.completion_status != "Completed"
        ).all()

        # Check if assignments exist with no tasks created yet
        assignments_without_tasks = db.query(Assignment).filter(
            Assignment.completion_status != "Completed",
            ~Assignment.tasks.any()
        ).all()

        # If any assignment has no tasks, auto-create basic tasks so they appear in schedule
        if assignments_without_tasks:
            from ..services.task_service import TaskService
            import asyncio
            for a in assignments_without_tasks:
                # Synchronous fallback task generation
                from ..services.ai_service import AIService
                breakdown = AIService._rule_based_task_breakdown(
                    a.title, a.subject, a.description or "", a.difficulty, a.estimated_duration
                )
                for idx, t_info in enumerate(breakdown):
                    nt = Task(
                        assignment_id=a.id,
                        name=t_info["name"],
                        description=t_info["description"],
                        category=t_info["category"],
                        priority=t_info["priority"],
                        difficulty=t_info["difficulty"],
                        estimated_duration=t_info["estimated_duration"],
                        actual_time_spent=0.0,
                        deadline=a.deadline,
                        completion_status="Pending",
                        dependencies=str(t_info["dependencies"]),
                        order_index=idx + 1
                    )
                    db.add(nt)
            db.commit()
            # Re-query
            pending_tasks = db.query(Task).join(Assignment).filter(
                Task.completion_status != "Completed"
            ).all()

        # 3. Clean up uncompleted future sessions if not preserving everything
        if preserve_completed:
            db.query(ScheduledSession).filter(
                ScheduledSession.is_completed == False,
                ScheduledSession.is_manually_adjusted == False
            ).delete()
        else:
            db.query(ScheduledSession).delete()
        db.commit()

        # Existing preserved sessions to avoid collisions
        existing_sessions = db.query(ScheduledSession).all()
        booked_times_by_date: Dict[str, List[Tuple[int, int]]] = {} # date -> list of (start_min, end_min)
        for s in existing_sessions:
            s_min = cls._time_to_minutes(s.start_time)
            e_min = cls._time_to_minutes(s.end_time)
            booked_times_by_date.setdefault(s.session_date, []).append((s_min, e_min))

        warnings: List[ScheduleWarning] = []
        new_sessions: List[ScheduledSession] = []

        if not pending_tasks:
            return SchedulePlanResponse(
                total_sessions=len(existing_sessions),
                total_study_minutes=sum(s.duration_minutes for s in existing_sessions),
                sessions=[ScheduledSessionResponse.model_validate(s) for s in existing_sessions],
                warnings=[ScheduleWarning(
                    type="INFO",
                    title="No Pending Tasks",
                    message="All assignments and tasks are currently completed! Great job.",
                    severity="info"
                )],
                explanation="No pending tasks found. Existing schedule preserved."
            )

        # 4. Score and Sort Tasks by Urgency, Priority, Dependencies, and Difficulty
        # Priority mapping
        prio_weights = {"High": 400, "Medium": 200, "Low": 100}
        diff_weights = {"Hard": 60, "Medium": 30, "Easy": 10}

        def calculate_task_weight(t: Task) -> float:
            base = prio_weights.get(t.priority, 200) + diff_weights.get(t.difficulty, 30)
            if t.deadline:
                delta_hours = (t.deadline - now).total_seconds() / 3600.0
                if delta_hours < 0:
                    base += 2000  # Overdue - highest urgency
                elif delta_hours <= 24:
                    base += 1200
                elif delta_hours <= 48:
                    base += 800
                elif delta_hours <= 96:
                    base += 400
                else:
                    base += max(0, 300 - int(delta_hours / 2))
            else:
                base += 50 # Default baseline when no explicit deadline
            # Dependencies rank: earlier order_index gets bonus
            base -= (t.order_index * 15)
            return base

        # Sort tasks: highest weight first, respecting order_index
        sorted_tasks = sorted(pending_tasks, key=lambda t: (calculate_task_weight(t), -t.order_index), reverse=True)

        # 5. Calculate remaining task work
        task_remaining_minutes: Dict[int, int] = {}
        total_workload_minutes = 0
        for t in sorted_tasks:
            # If actual time logged, remaining is estimated - actual (or at least 30m if still incomplete)
            if t.actual_time_spent > 0 and t.actual_time_spent < t.estimated_duration:
                rem_mins = int((t.estimated_duration - t.actual_time_spent) * 60)
            else:
                rem_mins = int(t.estimated_duration * 60)
            rem_mins = max(25, rem_mins)
            task_remaining_minutes[t.id] = rem_mins
            total_workload_minutes += rem_mins

        # 6. Check total availability in next 7-14 days vs total workload
        planning_days = 14
        total_available_minutes = 0
        for d_offset in range(planning_days):
            cur_date = base_date + datetime.timedelta(days=d_offset)
            dow = cur_date.weekday()
            avail = availability_map.get(dow)
            if avail and avail.is_active:
                total_available_minutes += int(avail.available_hours * 60)

        if total_workload_minutes > total_available_minutes:
            shortage_hours = (total_workload_minutes - total_available_minutes) / 60.0
            warnings.append(ScheduleWarning(
                type="OVERLOAD",
                title="Critical Workload Overload Warning",
                message=(
                    f"Total pending workload ({total_workload_minutes/60.0:.1f} hours) exceeds available study capacity "
                    f"({total_available_minutes/60.0:.1f} hours) over the next {planning_days} days by {shortage_hours:.1f} hours. "
                    "You will not meet all deadlines unless daily availability is increased or workload is reprioritized."
                ),
                severity="danger"
            ))

        # 7. Slot allocation loop day by day
        current_day_offset = 0
        max_days = 21

        task_completion_dates: Dict[int, datetime.datetime] = {}

        while any(task_remaining_minutes[t.id] > 0 for t in sorted_tasks) and current_day_offset < max_days:
            target_date = base_date + datetime.timedelta(days=current_day_offset)
            date_str = target_date.strftime("%Y-%m-%d")
            dow = target_date.weekday()
            avail = availability_map.get(dow)

            if not avail or not avail.is_active or avail.available_hours <= 0:
                current_day_offset += 1
                continue

            day_start_min = cls._time_to_minutes(avail.start_hour)
            day_end_min = cls._time_to_minutes(avail.end_hour)
            max_daily_capacity = int(avail.available_hours * 60)

            cur_min = day_start_min
            daily_used_minutes = 0

            # Get booked slots for this date
            booked = booked_times_by_date.get(date_str, [])

            while cur_min < day_end_min and daily_used_minutes < max_daily_capacity:
                # Find next pending task that has its prerequisites completed
                candidate_task = None
                for t in sorted_tasks:
                    if task_remaining_minutes[t.id] <= 0:
                        continue
                    # Check dependency: if order_index > 1, make sure previous tasks of same assignment are done or scheduled earlier
                    if t.dependencies:
                        # If depends on parent task, check if parent is done or scheduled before this slot
                        dep_ids = [d.strip() for d in t.dependencies.split(",") if d.strip().isdigit()]
                        if any(task_remaining_minutes.get(int(did), 0) > 0 for did in dep_ids):
                            # Dependency still incomplete
                            continue
                    candidate_task = t
                    break

                if not candidate_task:
                    # No runnable task found right now
                    break

                # Determine slot length (45 to 60 mins block, or remaining task time)
                rem_t_mins = task_remaining_minutes[candidate_task.id]
                slot_duration = min(60, rem_t_mins)
                slot_duration = min(slot_duration, day_end_min - cur_min)
                slot_duration = min(slot_duration, max_daily_capacity - daily_used_minutes)

                if slot_duration < 20:
                    # Not enough time left in this day
                    break

                slot_start_time = cls._minutes_to_time(cur_min)
                slot_end_time = cls._minutes_to_time(cur_min + slot_duration)

                # Check collision with preserved sessions
                collision = any(
                    not (cur_min + slot_duration <= b_start or cur_min >= b_end)
                    for (b_start, b_end) in booked
                )

                if collision:
                    # Skip 30 mins ahead
                    cur_min += 30
                    continue

                # Create scheduled session
                assignment = candidate_task.assignment
                session_title = f"{candidate_task.name} ({assignment.subject})" if assignment else candidate_task.name
                session = ScheduledSession(
                    task_id=candidate_task.id,
                    assignment_id=candidate_task.assignment_id,
                    title=session_title,
                    session_type="Study",
                    session_date=date_str,
                    start_time=slot_start_time,
                    end_time=slot_end_time,
                    duration_minutes=slot_duration,
                    priority=candidate_task.priority,
                    is_completed=False,
                    is_manually_adjusted=False,
                    notes=f"Category: {candidate_task.category}. Step {candidate_task.order_index} for '{assignment.title if assignment else ''}'."
                )
                db.add(session)
                new_sessions.append(session)

                task_remaining_minutes[candidate_task.id] -= slot_duration
                daily_used_minutes += slot_duration
                cur_min += slot_duration
                booked.append((cur_min - slot_duration, cur_min))

                # If task finished in this slot, record completion time
                if task_remaining_minutes[candidate_task.id] <= 0:
                    slot_end_dt = datetime.datetime.combine(
                        target_date, 
                        datetime.time(hour=int(slot_end_time.split(":")[0]), minute=int(slot_end_time.split(":")[1]))
                    )
                    task_completion_dates[candidate_task.id] = slot_end_dt

                # Schedule 10 min break if time allows and day not ended
                if cur_min + 10 <= day_end_min and daily_used_minutes + 10 <= max_daily_capacity and task_remaining_minutes[candidate_task.id] > 0:
                    break_session = ScheduledSession(
                        task_id=None,
                        assignment_id=None,
                        title="Rest & Refreshment Break",
                        session_type="Break",
                        session_date=date_str,
                        start_time=cls._minutes_to_time(cur_min),
                        end_time=cls._minutes_to_time(cur_min + 10),
                        duration_minutes=10,
                        priority="Low",
                        is_completed=False,
                        is_manually_adjusted=False,
                        notes="Stand up, hydrate, stretch eyes."
                    )
                    db.add(break_session)
                    new_sessions.append(break_session)
                    booked.append((cur_min, cur_min + 10))
                    cur_min += 10

            booked_times_by_date[date_str] = booked
            current_day_offset += 1

        # 8. Check for deadline breaches and unallocated tasks
        for t in sorted_tasks:
            assignment = t.assignment
            deadline = t.deadline or (assignment.deadline if assignment else None)
            
            # Did it fail to get scheduled before the max horizon?
            if task_remaining_minutes[t.id] > 0:
                warnings.append(ScheduleWarning(
                    type="INSUFFICIENT_TIME",
                    assignment_id=t.assignment_id,
                    task_id=t.id,
                    title=f"Unscheduled Work: {t.name}",
                    message=(
                        f"Task '{t.name}' has {task_remaining_minutes[t.id]/60.0:.1f} hours remaining that could not fit "
                        f"into your configured study hours within the next {max_days} days. Please increase study hours."
                    ),
                    severity="danger"
                ))
            elif deadline and t.id in task_completion_dates:
                finish_dt = task_completion_dates[t.id]
                if finish_dt > deadline:
                    hours_late = (finish_dt - deadline).total_seconds() / 3600.0
                    warnings.append(ScheduleWarning(
                        type="DEADLINE_RISK",
                        assignment_id=t.assignment_id,
                        task_id=t.id,
                        title=f"Deadline Miss Risk: '{assignment.title if assignment else t.name}'",
                        message=(
                            f"Task '{t.name}' is scheduled to finish on {finish_dt.strftime('%b %d at %H:%M')}, "
                            f"which is {hours_late:.1f} hours AFTER its deadline ({deadline.strftime('%b %d at %H:%M')})."
                        ),
                        severity="warning"
                    ))

        # Check overdue assignments that had deadlines in the past
        for a in db.query(Assignment).filter(Assignment.completion_status != "Completed").all():
            if a.deadline and a.deadline < now:
                warnings.append(ScheduleWarning(
                    type="OVERDUE",
                    assignment_id=a.id,
                    title=f"Past Deadline: '{a.title}'",
                    message=f"This assignment had a deadline of {a.deadline.strftime('%b %d, %Y %H:%M')} and is currently overdue. Scheduled with high priority.",
                    severity="warning"
                ))

        # Record planning event
        event = PlanningEvent(
            event_type="ScheduleGenerated",
            description=f"Generated schedule with {len(new_sessions)} sessions and {len(warnings)} diagnostic alerts.",
            details_json=f'{{"total_sessions": {len(new_sessions)}, "warnings_count": {len(warnings)}}}',
            timestamp=datetime.datetime.utcnow()
        )
        db.add(event)
        db.commit()

        # Combine all sessions
        all_sessions = db.query(ScheduledSession).order_by(
            ScheduledSession.session_date.asc(),
            ScheduledSession.start_time.asc()
        ).all()

        total_study = sum(s.duration_minutes for s in all_sessions if s.session_type == "Study")

        return SchedulePlanResponse(
            total_sessions=len(all_sessions),
            total_study_minutes=total_study,
            sessions=[ScheduledSessionResponse.model_validate(s) for s in all_sessions],
            warnings=warnings,
            explanation=(
                f"Schedule optimized using constraint-satisfaction algorithm: "
                f"allocated {total_study/60.0:.1f} study hours across {len([s for s in all_sessions if s.session_type == 'Study'])} sessions "
                f"with structured break intervals. {len(warnings)} workload/deadline warnings identified."
            )
        )

    @classmethod
    def reschedule_incomplete_tasks(cls, db: Session, trigger_task_id: Optional[int] = None, reason: str = "") -> SchedulePlanResponse:
        """
        Adaptive rescheduling: Recalculates remaining schedule, preserves completed work,
        shifts uncompleted blocks forward, and reports impact.
        """
        # Call generate_schedule with preserve_completed = True
        plan = cls.generate_schedule(db, preserve_completed=True)
        
        # Log event
        event = PlanningEvent(
            event_type="Rescheduled",
            description=f"Adaptive rescheduling triggered: {reason}. Recalculated future sessions.",
            details_json=f'{{"trigger_task_id": {trigger_task_id}, "warnings_count": {len(plan.warnings)}}}',
            timestamp=datetime.datetime.utcnow()
        )
        db.add(event)
        db.commit()

        return plan

    @staticmethod
    def _time_to_minutes(time_str: str) -> int:
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])

    @staticmethod
    def _minutes_to_time(minutes: int) -> str:
        h = (minutes // 60) % 24
        m = minutes % 60
        return f"{h:02d}:{m:02d}"
