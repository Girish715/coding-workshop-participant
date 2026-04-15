from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Employee

employees_bp = Blueprint("employees", __name__)


@employees_bp.route("", methods=["GET"])
@jwt_required()
def list_employees():
    department = request.args.get("department")
    status = request.args.get("status")
    search = request.args.get("search")

    query = Employee.query
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
@jwt_required()
def get_employee(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    return jsonify(emp.to_dict())


@employees_bp.route("/<int:emp_id>", methods=["PUT"])
@jwt_required()
def update_employee(emp_id):
    emp = Employee.query.get_or_404(emp_id)
    data = request.get_json()
    for field in ["first_name", "last_name", "department", "designation", "status", "manager_id"]:
        if field in data:
            setattr(emp, field, data[field])
    db.session.commit()
    return jsonify(emp.to_dict())


@employees_bp.route("/departments", methods=["GET"])
@jwt_required()
def list_departments():
    departments = db.session.query(Employee.department).distinct().all()
    return jsonify([d[0] for d in departments])
