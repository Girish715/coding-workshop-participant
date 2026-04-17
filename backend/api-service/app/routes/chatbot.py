"""Role-aware chatbot endpoints backed by Gemini."""

from __future__ import annotations

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from dotenv import load_dotenv

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from app.access_scope import managed_employee_ids
from app.models import DevelopmentPlan, Employee, PerformanceReview, TrainingRecord
from app.rbac import roles_required

chatbot_bp = Blueprint("chatbot", __name__)

# Ensure local runs pick up backend/api-service/.env without relying on process cwd.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=False)


def _employee_scope_ids() -> set[int] | None:
    """Return scoped employee IDs for manager, or None for org-wide roles."""

    user = g.current_user
    if user.role == "manager":
        return managed_employee_ids()
    return None


def _scoped_summary() -> dict[str, Any]:
    """Build role-scoped analytics context for chatbot responses."""

    ids = _employee_scope_ids()

    employee_query = Employee.query
    review_query = PerformanceReview.query
    plan_query = DevelopmentPlan.query
    training_query = TrainingRecord.query

    if ids is not None:
        if not ids:
            return {
                "scope": "manager_team",
                "total_employees": 0,
                "active_employees": 0,
                "avg_rating": 0,
                "promotion_ready": 0,
                "high_attrition_risk": 0,
                "active_dev_plans": 0,
                "training_completed": 0,
                "departments": [],
                "employees": [],
            }
        employee_query = employee_query.filter(Employee.id.in_(ids))
        review_query = review_query.filter(PerformanceReview.employee_id.in_(ids))
        plan_query = plan_query.filter(DevelopmentPlan.employee_id.in_(ids))
        training_query = training_query.filter(TrainingRecord.employee_id.in_(ids))

    total_employees = employee_query.count()
    active_employees = employee_query.filter_by(status="active").count()
    avg_rating = review_query.with_entities(func.avg(PerformanceReview.overall_rating)).scalar() or 0
    promotion_ready = review_query.filter_by(promotion_ready=True).with_entities(func.count(func.distinct(PerformanceReview.employee_id))).scalar() or 0
    high_attrition_risk = review_query.filter_by(attrition_risk="high").with_entities(func.count(func.distinct(PerformanceReview.employee_id))).scalar() or 0
    active_dev_plans = plan_query.filter(DevelopmentPlan.status.in_(["not_started", "in_progress"])).with_entities(func.count(func.distinct(DevelopmentPlan.employee_id))).scalar() or 0
    training_completed = training_query.filter_by(status="completed").with_entities(func.count(func.distinct(TrainingRecord.employee_id))).scalar() or 0

    dept_rows = employee_query.with_entities(Employee.department, func.count(Employee.id)).group_by(Employee.department).order_by(Employee.department).all()
    departments = [{"department": department, "count": count} for department, count in dept_rows]

    recent_employees = employee_query.order_by(Employee.created_at.desc()).limit(30).all()
    employee_rows = [
        {
            "name": employee.to_dict().get("full_name"),
            "employee_code": employee.employee_code,
            "department": employee.department,
            "designation": employee.designation,
            "manager_name": employee.to_dict().get("manager_name"),
            "status": employee.status,
        }
        for employee in recent_employees
    ]

    return {
        "scope": "manager_team" if ids is not None else "organization",
        "total_employees": total_employees,
        "active_employees": active_employees,
        "avg_rating": round(float(avg_rating), 2),
        "promotion_ready": int(promotion_ready),
        "high_attrition_risk": int(high_attrition_risk),
        "active_dev_plans": int(active_dev_plans),
        "training_completed": int(training_completed),
        "departments": departments,
        "employees": employee_rows,
    }


def _gemini_generate(prompt: str) -> tuple[str | None, str | None]:
    """Call Gemini API and return generated text or an error message."""

    provider = os.getenv("CHATBOT_PROVIDER", "fallback").strip().lower()
    if provider != "gemini":
        return None, "Gemini provider is disabled"

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, "Gemini API key is not configured"

    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/gemini-1.5-flash:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 700,
        },
    }

    request_obj = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request_obj, timeout=8) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as err:
        return None, f"Gemini request failed: HTTP {err.code}"
    except URLError as err:
        return None, f"Gemini request failed: {err.reason}"
    except TimeoutError:
        return None, "Gemini request timed out"
    except Exception:
        return None, "Gemini request failed"

    candidates = result.get("candidates", [])
    if not candidates:
        return None, "No response from Gemini"

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    text = "\n".join(part.get("text", "") for part in parts if part.get("text"))
    if not text.strip():
        return None, "Gemini returned an empty response"

    return text.strip(), None


def _build_prompt(user_message: str, summary: dict[str, Any]) -> str:
    """Construct a scoped chatbot prompt with strict role/data boundaries."""

    role = g.current_user.role
    return (
        "You are an HR analytics assistant for ACME.\n"
        "Follow these hard rules:\n"
        "1) Use only the provided scoped data.\n"
        "2) If data is insufficient, say what is missing.\n"
        "3) Do not fabricate employee names, metrics, or events.\n"
        "4) Keep answers concise and actionable for business users.\n\n"
        f"Current timestamp: {datetime.utcnow().isoformat()}Z\n"
        f"User role: {role}\n"
        f"Data scope: {summary.get('scope')}\n\n"
        "Scoped analytics data (JSON):\n"
        f"{json.dumps(summary, ensure_ascii=True)}\n\n"
        "User question:\n"
        f"{user_message}"
    )


def _fallback_answer(summary: dict[str, Any], user_message: str) -> str:
    """Generate a scoped fallback response when Gemini is unavailable."""

    departments = summary.get("departments", [])
    top_departments = ", ".join(
        f"{item.get('department')} ({item.get('count')})"
        for item in departments[:4]
    ) or "No department data"

    guidance = [
        "Use the Dashboard for trend charts and filter by team/department for detail.",
        "Prioritize high attrition risk employees with active development plans and manager check-ins.",
    ]

    return (
        "Quick scoped summary:\n"
        f"- Scope: {summary.get('scope')}\n"
        f"- Total employees: {summary.get('total_employees', 0)}\n"
        f"- Active employees: {summary.get('active_employees', 0)}\n"
        f"- Avg rating: {summary.get('avg_rating', 0)}\n"
        f"- Promotion ready: {summary.get('promotion_ready', 0)}\n"
        f"- High attrition risk: {summary.get('high_attrition_risk', 0)}\n"
        f"- Active development plans: {summary.get('active_dev_plans', 0)}\n"
        f"- Training completed: {summary.get('training_completed', 0)}\n"
        f"- Key departments: {top_departments}\n\n"
        f"Question interpreted: {user_message}\n"
        "Suggested next actions:\n"
        f"1. {guidance[0]}\n"
        f"2. {guidance[1]}"
    )


@chatbot_bp.route("", methods=["POST"])
@roles_required("admin", "manager")
def ask_chatbot():
    """Answer admin/manager questions using role-scoped data and Gemini."""

    data = request.get_json() or {}
    message = str(data.get("message", "")).strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    summary = _scoped_summary()
    prompt = _build_prompt(message, summary)

    answer, error = _gemini_generate(prompt)
    provider = "gemini"
    if error:
        answer = _fallback_answer(summary, message)
        provider = "fallback"

    return jsonify({
        "answer": answer,
        "provider": provider,
        "scope": summary.get("scope"),
        "stats": {
            "total_employees": summary.get("total_employees", 0),
            "active_employees": summary.get("active_employees", 0),
            "avg_rating": summary.get("avg_rating", 0),
            "promotion_ready": summary.get("promotion_ready", 0),
            "high_attrition_risk": summary.get("high_attrition_risk", 0),
        },
    })