"""Notification helpers for role-aware system event notifications."""

from __future__ import annotations

from app import db
from app.models import Notification, User, Employee
from app.cache import invalidate


def _user_ids_by_roles(*roles: str) -> set[int]:
    """Return user IDs for users with any of the given roles."""

    return {u.id for u in User.query.filter(User.role.in_(roles)).all()}


def _manager_user_id(employee_id: int) -> int | None:
    """Return the user_id of the manager of the given employee, if any."""

    emp = Employee.query.get(employee_id)
    if emp and emp.manager_id:
        mgr = Employee.query.get(emp.manager_id)
        if mgr:
            return mgr.user_id
    return None


def _employee_user_id(employee_id: int) -> int | None:
    """Return the user_id for a given employee_id."""

    emp = Employee.query.get(employee_id)
    return emp.user_id if emp else None


def _send(
    user_id: int,
    type_: str,
    title: str,
    message: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
) -> None:
    """Insert a single notification row."""

    n = Notification(
        user_id=user_id,
        type=type_,
        title=title,
        message=message,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.session.add(n)


def _send_many(
    user_ids: set[int],
    type_: str,
    title: str,
    message: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
) -> None:
    """Insert notification rows for a set of user IDs."""

    for uid in user_ids:
        _send(uid, type_, title, message, reference_type, reference_id)


def notify_review_created(review):
    """Notify the employee that a review was created for them."""
    uid = _employee_user_id(review.employee_id)
    if uid:
        _send(uid, "review", "New Performance Review",
               f"A review for period {review.review_period} has been created for you.",
               "review", review.id)

    admin_hr_ids = _user_ids_by_roles("admin", "hr")
    _send_many(admin_hr_ids, "review", "Review Created",
               f"A new review for period {review.review_period} was submitted.",
               "review", review.id)
    invalidate("notifications")


def notify_review_updated(review):
    """Notify the employee when their review is updated."""
    uid = _employee_user_id(review.employee_id)
    if uid:
        _send(uid, "review", "Review Updated",
               f"Your review for period {review.review_period} has been updated.",
               "review", review.id)

    admin_hr_ids = _user_ids_by_roles("admin", "hr")
    _send_many(
        admin_hr_ids,
        "review",
        "Review Updated",
        f"Review {review.id} for period {review.review_period} was updated.",
        "review",
        review.id,
    )
    invalidate("notifications")


def notify_dev_plan_created(plan):
    """Notify the employee that a dev plan was assigned."""
    uid = _employee_user_id(plan.employee_id)
    if uid:
        _send(uid, "dev_plan", "New Development Plan",
               f'A development plan "{plan.title}" has been assigned to you.',
               "dev_plan", plan.id)

    mgr_uid = _manager_user_id(plan.employee_id)
    if mgr_uid:
        emp = Employee.query.get(plan.employee_id)
        name = f"{emp.first_name} {emp.last_name}" if emp else "An employee"
        _send(mgr_uid, "dev_plan", "Dev Plan Assigned",
               f'{name} was assigned a new dev plan: "{plan.title}".',
               "dev_plan", plan.id)
    invalidate("notifications")


def notify_dev_plan_updated(plan):
    """Notify employee and manager when development plan details are updated."""

    uid = _employee_user_id(plan.employee_id)
    if uid:
        _send(
            uid,
            "dev_plan",
            "Development Plan Updated",
            f'Your development plan "{plan.title}" has been updated (status: {plan.status}).',
            "dev_plan",
            plan.id,
        )

    mgr_uid = _manager_user_id(plan.employee_id)
    if mgr_uid:
        _send(
            mgr_uid,
            "dev_plan",
            "Team Development Plan Updated",
            f'A development plan "{plan.title}" for your team was updated.',
            "dev_plan",
            plan.id,
        )
    invalidate("notifications")


def notify_training_created(record):
    """Notify the employee about new training enrollment."""
    uid = _employee_user_id(record.employee_id)
    if uid:
        _send(uid, "training", "Training Enrolled",
               f'You have been enrolled in "{record.training_name}".',
               "training", record.id)
    invalidate("notifications")


def notify_training_updated(record):
    """Notify employee when a training record has been changed."""

    uid = _employee_user_id(record.employee_id)
    if uid:
        _send(
            uid,
            "training",
            "Training Record Updated",
            f'Your training record "{record.training_name}" was updated (status: {record.status}).',
            "training",
            record.id,
        )

    admin_hr_ids = _user_ids_by_roles("admin", "hr")
    _send_many(
        admin_hr_ids,
        "training",
        "Training Updated",
        f'Training record "{record.training_name}" was updated.',
        "training",
        record.id,
    )
    invalidate("notifications")


def notify_employee_status_change(emp, old_status, new_status):
    """Notify admin/HR when an employee status changes."""
    admin_hr_ids = _user_ids_by_roles("admin", "hr")
    name = f"{emp.first_name} {emp.last_name}"
    _send_many(admin_hr_ids, "status_change", "Employee Status Changed",
               f"{name} status changed from {old_status} to {new_status}.",
               "employee", emp.id)

    uid = _employee_user_id(emp.id)
    if uid:
        _send(uid, "status_change", "Your Status Was Updated",
               f"Your employment status has been changed to {new_status}.",
               "employee", emp.id)
    invalidate("notifications")


def notify_employee_registered(employee):
    """Notify admin/HR when a new employee is registered."""
    admin_hr_ids = _user_ids_by_roles("admin", "hr")
    name = f"{employee.first_name} {employee.last_name}"
    _send_many(admin_hr_ids, "employee", "New Employee Registered",
               f"{name} ({employee.employee_code}) has been added to the system.",
               "employee", employee.id)
    invalidate("notifications")


def notify_bulk_import(count, user_id):
    """Notify admin/HR about a completed bulk import."""
    admin_hr_ids = _user_ids_by_roles("admin", "hr")
    _send_many(admin_hr_ids, "bulk_import", "Bulk Import Complete",
               f"{count} employee(s) were imported successfully.",
               None, None)

    _send(
        user_id,
        "bulk_import",
        "Bulk Import Finished",
        f"Your import finished successfully with {count} created employee(s).",
        None,
        None,
    )
    invalidate("notifications")
