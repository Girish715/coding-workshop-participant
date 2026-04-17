from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token
from app import db
from app.models import User, Employee
from app.rbac import VALID_ROLES, roles_required
from app.cache import invalidate
from app.notifications import notify_employee_registered

auth_bp = Blueprint("auth", __name__)
EMPLOYEE_TEMP_PASSWORDS = {"emp123", "ChangeMe123!"}


@auth_bp.route("/register", methods=["POST"])
@roles_required("admin", "hr")
def register():
    """Create a new user and employee profile (admin only)."""

    data = request.get_json() or {}
    valid_statuses = {"active", "inactive", "on_leave"}

    required_fields = ["email", "first_name", "last_name", "employee_code"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400

    requested_role = data.get("role", "employee")
    if requested_role not in VALID_ROLES:
        return jsonify({"error": "Invalid role"}), 400

    if g.current_user.role == "hr" and requested_role == "admin":
        return jsonify({"error": "HR cannot create admin users"}), 403

    requested_status = data.get("status", "active")
    if requested_status not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400

    password = data.get("password")
    if requested_role != "employee" and not password:
        return jsonify({"error": "Password is required for non-employee roles"}), 400

    if requested_role == "employee":
        password = password or "ChangeMe123!"

    user = User(email=data["email"], role=requested_role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    manager_id = data.get("manager_id")
    if requested_role == "manager":
        manager_id = None

    employee = Employee(
        user_id=user.id,
        first_name=data["first_name"],
        last_name=data["last_name"],
        employee_code=data["employee_code"],
        department=data.get("department", "General"),
        designation=data.get("designation", "Associate"),
        hire_date=data.get("hire_date", "2025-01-01"),
        manager_id=manager_id,
        status=requested_status,
    )
    db.session.add(employee)
    db.session.commit()
    invalidate("employees", "dashboard")
    notify_employee_registered(employee)
    db.session.commit()

    return jsonify({"user": user.to_dict(), "employee": employee.to_dict()}), 201


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Allow existing employees to activate their account with a new password."""

    data = request.get_json() or {}
    required_fields = ["email", "employee_code", "password"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    password = str(data.get("password", ""))
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    user = User.query.filter_by(email=data["email"], role="employee").first()
    if not user:
        return jsonify({"error": "Employee account not found"}), 404

    employee = Employee.query.filter_by(user_id=user.id, employee_code=data["employee_code"]).first()
    if not employee:
        return jsonify({"error": "Employee details do not match"}), 403

    if not any(user.check_password(temp_password) for temp_password in EMPLOYEE_TEMP_PASSWORDS):
        return jsonify({"error": "Account already activated. Please use login."}), 409

    user.set_password(password)
    db.session.commit()

    return jsonify({"message": "Account created successfully. Please log in."}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    employee = Employee.query.filter_by(user_id=user.id).first()
    return jsonify({
        "token": token,
        "user": user.to_dict(),
        "employee": employee.to_dict() if employee else None,
    })


@auth_bp.route("/me", methods=["GET"])
@roles_required("admin", "hr", "manager", "employee")
def me():
    user = g.current_user
    employee = Employee.query.filter_by(user_id=user.id).first()
    return jsonify({"user": user.to_dict(), "employee": employee.to_dict() if employee else None})
