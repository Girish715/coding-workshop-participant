"""Access-scope helpers for role-aware employee visibility."""

from typing import Any, Set

from flask import g
from sqlalchemy import false

from app.models import Employee, User


def current_employee() -> Employee | None:
    """Return the employee profile for the authenticated user."""

    user = getattr(g, "current_user", None)
    if not user:
        return None
    return Employee.query.filter_by(user_id=user.id).first()


def managed_employee_ids() -> Set[int]:
    """Return direct employee-report IDs for the authenticated manager."""

    user = getattr(g, "current_user", None)
    if not user or user.role != "manager":
        return set()

    manager = current_employee()
    if not manager:
        return set()

    rows = (
        Employee.query.with_entities(Employee.id)
        .join(User, User.id == Employee.user_id)
        .filter(Employee.manager_id == manager.id, User.role == "employee")
        .all()
    )
    return {row[0] for row in rows}


def manager_can_access_employee(employee_id: int) -> bool:
    """Check whether the authenticated manager can access an employee."""

    user = getattr(g, "current_user", None)
    if not user:
        return False

    if user.role == "admin":
        return True

    if user.role != "manager":
        return False

    return employee_id in managed_employee_ids()


def apply_manager_employee_scope(query: Any, employee_id_column: Any) -> Any:
    """Restrict a query to direct reports when current user is a manager."""

    user = getattr(g, "current_user", None)
    if not user or user.role != "manager":
        return query

    ids = managed_employee_ids()
    if not ids:
        return query.filter(false())

    return query.filter(employee_id_column.in_(ids))