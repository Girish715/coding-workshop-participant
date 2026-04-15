from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import DevelopmentPlan

dev_plans_bp = Blueprint("dev_plans", __name__)


@dev_plans_bp.route("", methods=["GET"])
@jwt_required()
def list_plans():
    employee_id = request.args.get("employee_id", type=int)
    status = request.args.get("status")

    query = DevelopmentPlan.query
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if status:
        query = query.filter_by(status=status)

    plans = query.order_by(DevelopmentPlan.created_at.desc()).all()
    return jsonify([p.to_dict() for p in plans])


@dev_plans_bp.route("/<int:plan_id>", methods=["GET"])
@jwt_required()
def get_plan(plan_id):
    plan = DevelopmentPlan.query.get_or_404(plan_id)
    return jsonify(plan.to_dict())


@dev_plans_bp.route("", methods=["POST"])
@jwt_required()
def create_plan():
    data = request.get_json()
    plan = DevelopmentPlan(
        employee_id=data["employee_id"],
        title=data["title"],
        description=data.get("description"),
        goal_type=data["goal_type"],
        target_date=data.get("target_date"),
        status=data.get("status", "not_started"),
        progress_pct=data.get("progress_pct", 0),
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify(plan.to_dict()), 201


@dev_plans_bp.route("/<int:plan_id>", methods=["PUT"])
@jwt_required()
def update_plan(plan_id):
    plan = DevelopmentPlan.query.get_or_404(plan_id)
    data = request.get_json()
    for field in ["title", "description", "goal_type", "target_date", "status", "progress_pct"]:
        if field in data:
            setattr(plan, field, data[field])
    db.session.commit()
    return jsonify(plan.to_dict())


@dev_plans_bp.route("/<int:plan_id>", methods=["DELETE"])
@jwt_required()
def delete_plan(plan_id):
    plan = DevelopmentPlan.query.get_or_404(plan_id)
    db.session.delete(plan)
    db.session.commit()
    return jsonify({"message": "Development plan deleted"}), 200
