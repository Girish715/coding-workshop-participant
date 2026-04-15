from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token
from app import db
from app.models import User, Employee
from app.rbac import VALID_ROLES, roles_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
@roles_required("admin")
def register():
    data = request.get_json() or {}
    valid_statuses = {"active", "inactive", "on_leave"}

    required_fields = ["email", "password", "first_name", "last_name", "employee_code"]
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400

    requested_role = data.get("role", "employee")
    if requested_role not in VALID_ROLES:
        return jsonify({"error": "Invalid role"}), 400

    requested_status = data.get("status", "active")
    if requested_status not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400

    user = User(email=data["email"], role=requested_role)
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    employee = Employee(
        user_id=user.id,
        first_name=data["first_name"],
        last_name=data["last_name"],
        employee_code=data["employee_code"],
        department=data.get("department", "General"),
        designation=data.get("designation", "Associate"),
        hire_date=data.get("hire_date", "2025-01-01"),
        manager_id=data.get("manager_id"),
        status=requested_status,
    )
    db.session.add(employee)
    db.session.commit()

    return jsonify({"user": user.to_dict(), "employee": employee.to_dict()}), 201


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
@roles_required("admin", "manager", "employee")
def me():
    user = g.current_user
    employee = Employee.query.filter_by(user_id=user.id).first()
    return jsonify({"user": user.to_dict(), "employee": employee.to_dict() if employee else None})
