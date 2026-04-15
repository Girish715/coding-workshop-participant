from flask import Blueprint, jsonify, g
from sqlalchemy import func
from app import db
from app.models import Employee, PerformanceReview, DevelopmentPlan, EmployeeCompetency, TrainingRecord
from app.access_scope import managed_employee_ids
from app.rbac import roles_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
@roles_required("admin", "manager", "employee")
def get_stats():
    is_manager = g.current_user.role == "manager"
    team_ids = managed_employee_ids() if is_manager else None

    employees_query = Employee.query.filter_by(status="active")
    reviews_query = PerformanceReview.query
    plans_query = DevelopmentPlan.query.filter(DevelopmentPlan.status.in_(["not_started", "in_progress"]))
    training_query = TrainingRecord.query.filter_by(status="completed")
    high_risk_query = PerformanceReview.query.filter_by(attrition_risk="high")
    promotion_ready_query = PerformanceReview.query.filter_by(promotion_ready=True)

    if team_ids is not None:
        if not team_ids:
            return jsonify({
                "total_employees": 0,
                "total_reviews": 0,
                "avg_rating": 0,
                "active_development_plans": 0,
                "training_completed": 0,
                "high_attrition_risk": 0,
                "promotion_ready": 0,
            })

        employees_query = employees_query.filter(Employee.id.in_(team_ids))
        reviews_query = reviews_query.filter(PerformanceReview.employee_id.in_(team_ids))
        plans_query = plans_query.filter(DevelopmentPlan.employee_id.in_(team_ids))
        training_query = training_query.filter(TrainingRecord.employee_id.in_(team_ids))
        high_risk_query = high_risk_query.filter(PerformanceReview.employee_id.in_(team_ids))
        promotion_ready_query = promotion_ready_query.filter(PerformanceReview.employee_id.in_(team_ids))

    total_employees = employees_query.count()
    total_reviews = reviews_query.count()
    avg_rating = reviews_query.with_entities(func.avg(PerformanceReview.overall_rating)).scalar() or 0
    active_plans = plans_query.count()
    training_completed = training_query.count()
    high_risk = high_risk_query.count()
    promotion_ready = promotion_ready_query.count()

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
@roles_required("admin", "manager", "employee")
def promotion_ready_employees():
    query = PerformanceReview.query.filter_by(promotion_ready=True)
    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(PerformanceReview.employee_id.in_(team_ids))

    reviews = query.all()
    seen = {}
    for r in reviews:
        emp = Employee.query.get(r.employee_id)
        if emp and emp.id not in seen:
            seen[emp.id] = {**emp.to_dict(), "latest_rating": r.overall_rating, "review_period": r.review_period}
    return jsonify(list(seen.values()))


@dashboard_bp.route("/employees/high-attrition-risk", methods=["GET"])
@roles_required("admin", "manager", "employee")
def high_attrition_risk_employees():
    query = PerformanceReview.query.filter_by(attrition_risk="high")
    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(PerformanceReview.employee_id.in_(team_ids))

    reviews = query.all()
    seen = {}
    for r in reviews:
        emp = Employee.query.get(r.employee_id)
        if emp and emp.id not in seen:
            seen[emp.id] = {**emp.to_dict(), "latest_rating": r.overall_rating, "attrition_risk": r.attrition_risk, "review_period": r.review_period}
    return jsonify(list(seen.values()))


@dashboard_bp.route("/employees/active", methods=["GET"])
@roles_required("admin", "manager", "employee")
def active_employees():
    query = Employee.query.filter_by(status="active")
    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(Employee.id.in_(team_ids))

    employees = query.order_by(Employee.last_name).all()
    return jsonify([e.to_dict() for e in employees])


@dashboard_bp.route("/employees/training-completed", methods=["GET"])
@roles_required("admin", "manager", "employee")
def training_completed_employees():
    query = (
        db.session.query(
            Employee,
            func.count(TrainingRecord.id).label("completed_count"),
        )
        .join(TrainingRecord, TrainingRecord.employee_id == Employee.id)
        .filter(TrainingRecord.status == "completed")
    )

    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(Employee.id.in_(team_ids))

    results = query.group_by(Employee.id).all()
    return jsonify([{**emp.to_dict(), "completed_trainings": count} for emp, count in results])


@dashboard_bp.route("/employees/active-dev-plans", methods=["GET"])
@roles_required("admin", "manager", "employee")
def active_dev_plan_employees():
    query = (
        db.session.query(
            Employee,
            func.count(DevelopmentPlan.id).label("plan_count"),
        )
        .join(DevelopmentPlan, DevelopmentPlan.employee_id == Employee.id)
        .filter(DevelopmentPlan.status.in_(["not_started", "in_progress"]))
    )

    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(Employee.id.in_(team_ids))

    results = query.group_by(Employee.id).all()
    return jsonify([{**emp.to_dict(), "active_plans": count} for emp, count in results])


@dashboard_bp.route("/team-performance", methods=["GET"])
@roles_required("admin", "manager", "employee")
def team_performance():
    query = (
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
    )

    team_ids = None
    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(Employee.id.in_(team_ids))

    results = query.group_by(Employee.department).all()
    data = []
    for r in results:
        training_query = (
            db.session.query(func.count(TrainingRecord.id))
            .join(Employee, Employee.id == TrainingRecord.employee_id)
            .filter(Employee.department == r.department, TrainingRecord.status == "completed")
        )
        if team_ids is not None:
            training_query = training_query.filter(Employee.id.in_(team_ids))

        training_count = training_query.scalar() or 0
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
@roles_required("admin", "manager", "employee")
def rating_distribution():
    query = (
        db.session.query(
            func.floor(PerformanceReview.overall_rating).label("rating"),
            func.count().label("count"),
        )
    )

    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(PerformanceReview.employee_id.in_(team_ids))

    results = query.group_by(func.floor(PerformanceReview.overall_rating)).order_by("rating").all()
    return jsonify([{"rating": int(r.rating), "count": r.count} for r in results])


@dashboard_bp.route("/department-performance", methods=["GET"])
@roles_required("admin", "manager", "employee")
def department_performance():
    query = (
        db.session.query(
            Employee.department,
            func.avg(PerformanceReview.overall_rating).label("avg_rating"),
            func.count(PerformanceReview.id).label("review_count"),
        )
        .join(PerformanceReview, PerformanceReview.employee_id == Employee.id)
    )

    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(Employee.id.in_(team_ids))

    results = query.group_by(Employee.department).all()
    return jsonify([
        {"department": r.department, "avg_rating": round(float(r.avg_rating), 2), "review_count": r.review_count}
        for r in results
    ])


@dashboard_bp.route("/skill-gaps", methods=["GET"])
@roles_required("admin", "manager", "employee")
def skill_gaps():
    query = (
        db.session.query(
            EmployeeCompetency,
        )
        .filter(EmployeeCompetency.target_level - EmployeeCompetency.current_level >= 2)
    )

    if g.current_user.role == "manager":
        team_ids = managed_employee_ids()
        if not team_ids:
            return jsonify([])
        query = query.filter(EmployeeCompetency.employee_id.in_(team_ids))

    results = query.all()
    return jsonify([ec.to_dict() for ec in results])
