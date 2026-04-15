from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User, Employee

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(email=data["email"], role=data.get("role", "employee"))
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
    )
    db.session.add(employee)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict(), "employee": employee.to_dict()}), 201


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
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    employee = Employee.query.filter_by(user_id=user.id).first()
    return jsonify({"user": user.to_dict(), "employee": employee.to_dict() if employee else None})
