from flask import Blueprint, request, jsonify, g
from sqlalchemy.orm import joinedload
from app import db
from app.models import Competency, EmployeeCompetency
from app.access_scope import apply_manager_employee_scope, manager_can_access_employee
from app.rbac import roles_required
from app.cache import cached, invalidate

competencies_bp = Blueprint("competencies", __name__)


# --- Competency catalog ---
@competencies_bp.route("/catalog", methods=["GET"])
@roles_required("admin", "hr", "manager", "employee")
@cached("competencies")
def list_competencies():
    comps = Competency.query.order_by(Competency.category, Competency.name).all()
    return jsonify([c.to_dict() for c in comps])


@competencies_bp.route("/catalog", methods=["POST"])
@roles_required("admin", "hr", "manager")
def create_competency():
    data = request.get_json()
    comp = Competency(
        name=data["name"],
        category=data["category"],
        description=data.get("description"),
    )
    db.session.add(comp)
    db.session.commit()
    invalidate("competencies", "dashboard")
    return jsonify(comp.to_dict()), 201


# --- Employee competency assessments ---
@competencies_bp.route("", methods=["GET"])
@roles_required("admin", "hr", "manager", "employee")
@cached("competencies")
def list_employee_competencies():
    employee_id = request.args.get("employee_id", type=int)
    query = EmployeeCompetency.query.options(joinedload(EmployeeCompetency.employee), joinedload(EmployeeCompetency.competency))
    query = apply_manager_employee_scope(query, EmployeeCompetency.employee_id)
    if employee_id:
        if g.current_user.role == "manager" and not manager_can_access_employee(employee_id):
            return jsonify({"error": "Access denied"}), 403
        query = query.filter_by(employee_id=employee_id)
    items = query.all()
    return jsonify([i.to_dict() for i in items])


@competencies_bp.route("", methods=["POST"])
@roles_required("admin", "hr", "manager")
def create_employee_competency():
    data = request.get_json()
    if g.current_user.role == "manager" and not manager_can_access_employee(data["employee_id"]):
        return jsonify({"error": "Access denied"}), 403

    ec = EmployeeCompetency(
        employee_id=data["employee_id"],
        competency_id=data["competency_id"],
        current_level=data["current_level"],
        target_level=data["target_level"],
        assessed_date=data.get("assessed_date"),
    )
    db.session.add(ec)
    db.session.commit()
    invalidate("competencies", "dashboard")
    return jsonify(ec.to_dict()), 201


@competencies_bp.route("/<int:ec_id>", methods=["PUT"])
@roles_required("admin", "hr", "manager")
def update_employee_competency(ec_id):
    ec = EmployeeCompetency.query.get_or_404(ec_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(ec.employee_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    for field in ["current_level", "target_level", "assessed_date"]:
        if field in data:
            setattr(ec, field, data[field])
    db.session.commit()
    invalidate("competencies", "dashboard")
    return jsonify(ec.to_dict())


@competencies_bp.route("/<int:ec_id>", methods=["DELETE"])
@roles_required("admin", "hr", "manager")
def delete_employee_competency(ec_id):
    ec = EmployeeCompetency.query.get_or_404(ec_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(ec.employee_id):
        return jsonify({"error": "Access denied"}), 403

    db.session.delete(ec)
    db.session.commit()
    invalidate("competencies", "dashboard")
    return jsonify({"message": "Competency record deleted"}), 200
