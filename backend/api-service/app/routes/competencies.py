from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import Competency, EmployeeCompetency

competencies_bp = Blueprint("competencies", __name__)


# --- Competency catalog ---
@competencies_bp.route("/catalog", methods=["GET"])
@jwt_required()
def list_competencies():
    comps = Competency.query.order_by(Competency.category, Competency.name).all()
    return jsonify([c.to_dict() for c in comps])


@competencies_bp.route("/catalog", methods=["POST"])
@jwt_required()
def create_competency():
    data = request.get_json()
    comp = Competency(
        name=data["name"],
        category=data["category"],
        description=data.get("description"),
    )
    db.session.add(comp)
    db.session.commit()
    return jsonify(comp.to_dict()), 201


# --- Employee competency assessments ---
@competencies_bp.route("", methods=["GET"])
@jwt_required()
def list_employee_competencies():
    employee_id = request.args.get("employee_id", type=int)
    query = EmployeeCompetency.query
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    items = query.all()
    return jsonify([i.to_dict() for i in items])


@competencies_bp.route("", methods=["POST"])
@jwt_required()
def create_employee_competency():
    data = request.get_json()
    ec = EmployeeCompetency(
        employee_id=data["employee_id"],
        competency_id=data["competency_id"],
        current_level=data["current_level"],
        target_level=data["target_level"],
        assessed_date=data.get("assessed_date"),
    )
    db.session.add(ec)
    db.session.commit()
    return jsonify(ec.to_dict()), 201


@competencies_bp.route("/<int:ec_id>", methods=["PUT"])
@jwt_required()
def update_employee_competency(ec_id):
    ec = EmployeeCompetency.query.get_or_404(ec_id)
    data = request.get_json()
    for field in ["current_level", "target_level", "assessed_date"]:
        if field in data:
            setattr(ec, field, data[field])
    db.session.commit()
    return jsonify(ec.to_dict())


@competencies_bp.route("/<int:ec_id>", methods=["DELETE"])
@jwt_required()
def delete_employee_competency(ec_id):
    ec = EmployeeCompetency.query.get_or_404(ec_id)
    db.session.delete(ec)
    db.session.commit()
    return jsonify({"message": "Competency record deleted"}), 200
