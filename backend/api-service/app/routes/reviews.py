from flask import Blueprint, request, jsonify, g
from sqlalchemy.orm import joinedload
from app import db
from app.models import PerformanceReview
from app.access_scope import apply_manager_employee_scope, current_employee, manager_can_access_employee
from app.rbac import roles_required
from app.cache import cached, invalidate
from app.notifications import notify_review_created, notify_review_updated

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("", methods=["GET"])
@roles_required("admin", "hr", "manager", "employee")
@cached("reviews")
def list_reviews():
    employee_id = request.args.get("employee_id", type=int)
    status = request.args.get("status")
    period = request.args.get("period")

    query = PerformanceReview.query.options(joinedload(PerformanceReview.employee), joinedload(PerformanceReview.reviewer))
    query = apply_manager_employee_scope(query, PerformanceReview.employee_id)
    if employee_id:
        if g.current_user.role == "manager" and not manager_can_access_employee(employee_id):
            return jsonify({"error": "Access denied"}), 403
        query = query.filter_by(employee_id=employee_id)
    if status:
        query = query.filter_by(status=status)
    if period:
        query = query.filter_by(review_period=period)

    reviews = query.order_by(PerformanceReview.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews])


@reviews_bp.route("/<int:review_id>", methods=["GET"])
@roles_required("admin", "hr", "manager", "employee")
@cached("reviews")
def get_review(review_id):
    review = PerformanceReview.query.options(joinedload(PerformanceReview.employee), joinedload(PerformanceReview.reviewer)).get_or_404(review_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(review.employee_id):
        return jsonify({"error": "Access denied"}), 403

    return jsonify(review.to_dict())


@reviews_bp.route("", methods=["POST"])
@roles_required("admin", "hr", "manager")
def create_review():
    data = request.get_json()
    if g.current_user.role == "manager" and not manager_can_access_employee(data["employee_id"]):
        return jsonify({"error": "Access denied"}), 403

    reviewer_id = data["reviewer_id"]
    if g.current_user.role == "manager":
        manager = current_employee()
        if not manager:
            return jsonify({"error": "User not found"}), 404
        reviewer_id = manager.id

    review = PerformanceReview(
        employee_id=data["employee_id"],
        reviewer_id=reviewer_id,
        review_period=data["review_period"],
        overall_rating=data["overall_rating"],
        strengths=data.get("strengths"),
        areas_for_improvement=data.get("areas_for_improvement"),
        goals_met=data.get("goals_met"),
        comments=data.get("comments"),
        status=data.get("status", "draft"),
        promotion_ready=data.get("promotion_ready", False),
        attrition_risk=data.get("attrition_risk", "low"),
    )
    db.session.add(review)
    db.session.commit()
    invalidate("reviews", "dashboard")
    notify_review_created(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


@reviews_bp.route("/<int:review_id>", methods=["PUT"])
@roles_required("admin", "hr", "manager")
def update_review(review_id):
    review = PerformanceReview.query.get_or_404(review_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(review.employee_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    for field in ["overall_rating", "strengths", "areas_for_improvement", "goals_met",
                   "comments", "status", "promotion_ready", "attrition_risk"]:
        if field in data:
            setattr(review, field, data[field])
    db.session.commit()
    invalidate("reviews", "dashboard")
    notify_review_updated(review)
    db.session.commit()
    return jsonify(review.to_dict())


@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
@roles_required("admin", "hr", "manager")
def delete_review(review_id):
    review = PerformanceReview.query.get_or_404(review_id)
    if g.current_user.role == "manager" and not manager_can_access_employee(review.employee_id):
        return jsonify({"error": "Access denied"}), 403

    db.session.delete(review)
    db.session.commit()
    invalidate("reviews", "dashboard")
    return jsonify({"message": "Review deleted"}), 200
