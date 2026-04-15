from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import PerformanceReview

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("", methods=["GET"])
@jwt_required()
def list_reviews():
    employee_id = request.args.get("employee_id", type=int)
    status = request.args.get("status")
    period = request.args.get("period")

    query = PerformanceReview.query
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if status:
        query = query.filter_by(status=status)
    if period:
        query = query.filter_by(review_period=period)

    reviews = query.order_by(PerformanceReview.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews])


@reviews_bp.route("/<int:review_id>", methods=["GET"])
@jwt_required()
def get_review(review_id):
    review = PerformanceReview.query.get_or_404(review_id)
    return jsonify(review.to_dict())


@reviews_bp.route("", methods=["POST"])
@jwt_required()
def create_review():
    data = request.get_json()
    review = PerformanceReview(
        employee_id=data["employee_id"],
        reviewer_id=data["reviewer_id"],
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
    return jsonify(review.to_dict()), 201


@reviews_bp.route("/<int:review_id>", methods=["PUT"])
@jwt_required()
def update_review(review_id):
    review = PerformanceReview.query.get_or_404(review_id)
    data = request.get_json()
    for field in ["overall_rating", "strengths", "areas_for_improvement", "goals_met",
                   "comments", "status", "promotion_ready", "attrition_risk"]:
        if field in data:
            setattr(review, field, data[field])
    db.session.commit()
    return jsonify(review.to_dict())


@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    review = PerformanceReview.query.get_or_404(review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({"message": "Review deleted"}), 200
