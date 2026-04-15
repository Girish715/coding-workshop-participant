from flask import Blueprint, request, jsonify, g
from app import db
from app.models import DevelopmentPlan
from app.access_scope import apply_manager_employee_scope, manager_can_access_employee
from app.rbac import roles_required

dev_plans_bp = Blueprint("dev_plans", __name__)


@dev_plans_bp.route("", methods=["GET"])
@roles_required("admin", "manager", "employee")
def list_plans():
    employee_id = request.args.get("employee_id", type=int)
    status = request.args.get("status")

    query = DevelopmentPlan.query
    query = apply_manager_employee_scope(query, DevelopmentPlan.employee_id)
    if employee_id:
        if g.current_user.role == "manager" and not manager_can_access_employee(employee_id):
            return jsonify({"error": "Access denied"}), 403
        query = query.filter_by(employee_id=employee_id)
    if status:
        query = query.filter_by(status=status)

    plans = query.order_by(DevelopmentPlan.created_at.desc()).all()
    return jsonify([p.to_dict() for p in plans])


@dev_plans_bp.route("/<int:plan_id>", methods=["GET"])
@roles_required("admin", "manager", "employee")
def get_plan(plan_id):
    plan = DevelopmentPlan.query.get_or_404(plan_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(plan.employee_id):
        return jsonify({"error": "Access denied"}), 403

    return jsonify(plan.to_dict())


@dev_plans_bp.route("", methods=["POST"])
@roles_required("admin", "manager")
def create_plan():
    data = request.get_json()
    if g.current_user.role == "manager" and not manager_can_access_employee(data["employee_id"]):
        return jsonify({"error": "Access denied"}), 403

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
@roles_required("admin", "manager")
def update_plan(plan_id):
    plan = DevelopmentPlan.query.get_or_404(plan_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(plan.employee_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    for field in ["title", "description", "goal_type", "target_date", "status", "progress_pct"]:
        if field in data:
            setattr(plan, field, data[field])
    db.session.commit()
    return jsonify(plan.to_dict())


@dev_plans_bp.route("/<int:plan_id>", methods=["DELETE"])
@roles_required("admin", "manager")
def delete_plan(plan_id):
    plan = DevelopmentPlan.query.get_or_404(plan_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(plan.employee_id):
        return jsonify({"error": "Access denied"}), 403

    db.session.delete(plan)
    db.session.commit()
    return jsonify({"message": "Development plan deleted"}), 200
