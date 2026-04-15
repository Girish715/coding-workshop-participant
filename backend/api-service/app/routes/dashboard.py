from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from app import db
from app.models import Employee, PerformanceReview, DevelopmentPlan, EmployeeCompetency, TrainingRecord

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    total_employees = Employee.query.filter_by(status="active").count()
    total_reviews = PerformanceReview.query.count()
    avg_rating = db.session.query(func.avg(PerformanceReview.overall_rating)).scalar() or 0
    active_plans = DevelopmentPlan.query.filter(DevelopmentPlan.status.in_(["not_started", "in_progress"])).count()
    training_completed = TrainingRecord.query.filter_by(status="completed").count()
    high_risk = PerformanceReview.query.filter_by(attrition_risk="high").count()
    promotion_ready = PerformanceReview.query.filter_by(promotion_ready=True).count()

    return jsonify({
        "total_employees": total_employees,
        "total_reviews": total_reviews,
        "avg_rating": round(float(avg_rating), 2),
        "active_development_plans": active_plans,
        "training_completed": training_completed,
        "high_attrition_risk": high_risk,
        "promotion_ready": promotion_ready,
    })


@dashboard_bp.route("/employees/promotion-ready", methods=["GET"])
@jwt_required()
def promotion_ready_employees():
    reviews = PerformanceReview.query.filter_by(promotion_ready=True).all()
    seen = {}
    for r in reviews:
        emp = Employee.query.get(r.employee_id)
        if emp and emp.id not in seen:
            seen[emp.id] = {**emp.to_dict(), "latest_rating": r.overall_rating, "review_period": r.review_period}
    return jsonify(list(seen.values()))


@dashboard_bp.route("/employees/high-attrition-risk", methods=["GET"])
@jwt_required()
def high_attrition_risk_employees():
    reviews = PerformanceReview.query.filter_by(attrition_risk="high").all()
    seen = {}
    for r in reviews:
        emp = Employee.query.get(r.employee_id)
        if emp and emp.id not in seen:
            seen[emp.id] = {**emp.to_dict(), "latest_rating": r.overall_rating, "attrition_risk": r.attrition_risk, "review_period": r.review_period}
    return jsonify(list(seen.values()))


@dashboard_bp.route("/employees/active", methods=["GET"])
@jwt_required()
def active_employees():
    employees = Employee.query.filter_by(status="active").order_by(Employee.last_name).all()
    return jsonify([e.to_dict() for e in employees])


@dashboard_bp.route("/employees/training-completed", methods=["GET"])
@jwt_required()
def training_completed_employees():
    results = (
        db.session.query(
            Employee,
            func.count(TrainingRecord.id).label("completed_count"),
        )
        .join(TrainingRecord, TrainingRecord.employee_id == Employee.id)
        .filter(TrainingRecord.status == "completed")
        .group_by(Employee.id)
        .all()
    )
    return jsonify([{**emp.to_dict(), "completed_trainings": count} for emp, count in results])


@dashboard_bp.route("/employees/active-dev-plans", methods=["GET"])
@jwt_required()
def active_dev_plan_employees():
    results = (
        db.session.query(
            Employee,
            func.count(DevelopmentPlan.id).label("plan_count"),
        )
        .join(DevelopmentPlan, DevelopmentPlan.employee_id == Employee.id)
        .filter(DevelopmentPlan.status.in_(["not_started", "in_progress"]))
        .group_by(Employee.id)
        .all()
    )
    return jsonify([{**emp.to_dict(), "active_plans": count} for emp, count in results])


@dashboard_bp.route("/team-performance", methods=["GET"])
@jwt_required()
def team_performance():
    results = (
        db.session.query(
            Employee.department,
            func.avg(PerformanceReview.overall_rating).label("avg_rating"),
            func.count(func.distinct(Employee.id)).label("employee_count"),
            func.count(PerformanceReview.id).label("review_count"),
            func.sum(db.case((PerformanceReview.promotion_ready == True, 1), else_=0)).label("promotion_ready"),
            func.sum(db.case((PerformanceReview.attrition_risk == "high", 1), else_=0)).label("high_risk"),
            func.avg(
                db.case(
                    (PerformanceReview.goals_met.isnot(None), func.length(PerformanceReview.goals_met)),
                    else_=0,
                )
            ).label("avg_goals_detail"),
        )
        .join(PerformanceReview, PerformanceReview.employee_id == Employee.id)
        .group_by(Employee.department)
        .all()
    )
    data = []
    for r in results:
        training_count = (
            db.session.query(func.count(TrainingRecord.id))
            .join(Employee, Employee.id == TrainingRecord.employee_id)
            .filter(Employee.department == r.department, TrainingRecord.status == "completed")
            .scalar() or 0
        )
        data.append({
            "department": r.department,
            "avg_rating": round(float(r.avg_rating), 2),
            "employee_count": r.employee_count,
            "review_count": r.review_count,
            "promotion_ready": int(r.promotion_ready or 0),
            "high_risk": int(r.high_risk or 0),
            "trainings_completed": training_count,
        })
    return jsonify(data)


@dashboard_bp.route("/rating-distribution", methods=["GET"])
@jwt_required()
def rating_distribution():
    results = (
        db.session.query(
            func.floor(PerformanceReview.overall_rating).label("rating"),
            func.count().label("count"),
        )
        .group_by(func.floor(PerformanceReview.overall_rating))
        .order_by("rating")
        .all()
    )
    return jsonify([{"rating": int(r.rating), "count": r.count} for r in results])


@dashboard_bp.route("/department-performance", methods=["GET"])
@jwt_required()
def department_performance():
    results = (
        db.session.query(
            Employee.department,
            func.avg(PerformanceReview.overall_rating).label("avg_rating"),
            func.count(PerformanceReview.id).label("review_count"),
        )
        .join(PerformanceReview, PerformanceReview.employee_id == Employee.id)
        .group_by(Employee.department)
        .all()
    )
    return jsonify([
        {"department": r.department, "avg_rating": round(float(r.avg_rating), 2), "review_count": r.review_count}
        for r in results
    ])


@dashboard_bp.route("/skill-gaps", methods=["GET"])
@jwt_required()
def skill_gaps():
    results = (
        db.session.query(
            EmployeeCompetency,
        )
        .filter(EmployeeCompetency.target_level - EmployeeCompetency.current_level >= 2)
        .all()
    )
    return jsonify([ec.to_dict() for ec in results])
