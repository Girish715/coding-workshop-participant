from datetime import date

from flask import Blueprint, request, jsonify, g
from app import db
from app.models import Employee
from app.access_scope import apply_manager_employee_scope, manager_can_access_employee
from app.rbac import roles_required

employees_bp = Blueprint("employees", __name__)


def _parse_hire_date(value: str) -> date | None:
    """Parse an ISO date string for employee hire date updates."""

    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


@employees_bp.route("", methods=["GET"])
@roles_required("admin", "manager", "employee")
def list_employees():
    department = request.args.get("department")
    status = request.args.get("status")
    search = request.args.get("search")

    query = Employee.query
    query = apply_manager_employee_scope(query, Employee.id)
    if department:
        query = query.filter_by(department=department)
    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(
            db.or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.employee_code.ilike(f"%{search}%"),
            )
        )

    employees = query.order_by(Employee.last_name).all()
    return jsonify([e.to_dict() for e in employees])


@employees_bp.route("/<int:emp_id>", methods=["GET"])
@roles_required("admin", "manager", "employee")
def get_employee(emp_id):
    if g.current_user.role == "manager" and not manager_can_access_employee(emp_id):
        return jsonify({"error": "Access denied"}), 403

    emp = Employee.query.get_or_404(emp_id)
    return jsonify(emp.to_dict())


@employees_bp.route("/<int:emp_id>", methods=["PUT"])
@roles_required("admin", "manager")
def update_employee(emp_id):
    """Update employee details with access-scope and field validation."""

    if g.current_user.role == "manager" and not manager_can_access_employee(emp_id):
        return jsonify({"error": "Access denied"}), 403

    emp = Employee.query.get_or_404(emp_id)
    data = request.get_json() or {}

    valid_statuses = {"active", "inactive", "on_leave"}
    if "status" in data and data["status"] not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400

    if "manager_id" in data:
        manager_id = data["manager_id"]
        if manager_id in ("", None):
            data["manager_id"] = None
        else:
            try:
                manager_id = int(manager_id)
            except (TypeError, ValueError):
                return jsonify({"error": "manager_id must be a number or null"}), 400

            if manager_id == emp.id:
                return jsonify({"error": "Employee cannot be their own manager"}), 400

            manager = Employee.query.get(manager_id)
            if not manager:
                return jsonify({"error": "Manager not found"}), 404

            data["manager_id"] = manager_id

    if "hire_date" in data:
        parsed_hire_date = _parse_hire_date(data["hire_date"])
        if not parsed_hire_date:
            return jsonify({"error": "hire_date must be in YYYY-MM-DD format"}), 400
        emp.hire_date = parsed_hire_date

    for field in [
        "first_name",
        "last_name",
        "employee_code",
        "department",
        "designation",
        "status",
        "manager_id",
    ]:
        if field in data:
            setattr(emp, field, data[field])

    # Managers cannot report to anyone.
    if emp.user and emp.user.role == "manager":
        emp.manager_id = None

    db.session.commit()
    return jsonify(emp.to_dict())


@employees_bp.route("/departments", methods=["GET"])
@roles_required("admin", "manager", "employee")
def list_departments():
    query = Employee.query
    query = apply_manager_employee_scope(query, Employee.id)
    departments = query.with_entities(Employee.department).distinct().all()
    return jsonify([d[0] for d in departments])
