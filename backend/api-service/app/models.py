from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="employee")  # admin, manager, employee
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    employee = db.relationship("Employee", backref="user", uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Employee(db.Model):
    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    employee_code = db.Column(db.String(20), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100), nullable=False)
    hire_date = db.Column(db.Date, nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=True)
    status = db.Column(db.String(20), default="active")  # active, inactive, on_leave
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    manager = db.relationship("Employee", remote_side=[id], backref="direct_reports")
    reviews = db.relationship("PerformanceReview", foreign_keys="[PerformanceReview.employee_id]", backref="employee", lazy="dynamic")
    development_plans = db.relationship("DevelopmentPlan", backref="employee", lazy="dynamic")
    competencies = db.relationship("EmployeeCompetency", backref="employee", lazy="dynamic")
    training_records = db.relationship("TrainingRecord", backref="employee", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.user.role if self.user else "employee",
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": f"{self.first_name} {self.last_name}",
            "employee_code": self.employee_code,
            "department": self.department,
            "designation": self.designation,
            "hire_date": self.hire_date.isoformat() if self.hire_date else None,
            "manager_id": self.manager_id,
            "manager_name": f"{self.manager.first_name} {self.manager.last_name}" if self.manager else None,
            "status": self.status,
        }


class PerformanceReview(db.Model):
    __tablename__ = "performance_reviews"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    review_period = db.Column(db.String(50), nullable=False)  # e.g. "2025-Q1"
    overall_rating = db.Column(db.Float, nullable=False)  # 1.0 - 5.0
    strengths = db.Column(db.Text)
    areas_for_improvement = db.Column(db.Text)
    goals_met = db.Column(db.Text)
    comments = db.Column(db.Text)
    status = db.Column(db.String(20), default="draft")  # draft, submitted, approved
    promotion_ready = db.Column(db.Boolean, default=False)
    attrition_risk = db.Column(db.String(20), default="low")  # low, medium, high
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    reviewer = db.relationship("Employee", foreign_keys=[reviewer_id], backref="reviews_given")

    def to_dict(self):
        emp = Employee.query.get(self.employee_id)
        rev = Employee.query.get(self.reviewer_id)
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "reviewer_id": self.reviewer_id,
            "reviewer_name": f"{rev.first_name} {rev.last_name}" if rev else None,
            "review_period": self.review_period,
            "overall_rating": self.overall_rating,
            "strengths": self.strengths,
            "areas_for_improvement": self.areas_for_improvement,
            "goals_met": self.goals_met,
            "comments": self.comments,
            "status": self.status,
            "promotion_ready": self.promotion_ready,
            "attrition_risk": self.attrition_risk,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DevelopmentPlan(db.Model):
    __tablename__ = "development_plans"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    goal_type = db.Column(db.String(50), nullable=False)  # career, skill, leadership, technical
    target_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="not_started")  # not_started, in_progress, completed, on_hold
    progress_pct = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        emp = Employee.query.get(self.employee_id)
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "title": self.title,
            "description": self.description,
            "goal_type": self.goal_type,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "status": self.status,
            "progress_pct": self.progress_pct,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Competency(db.Model):
    __tablename__ = "competencies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # technical, leadership, communication, etc.
    description = db.Column(db.Text)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
        }


class EmployeeCompetency(db.Model):
    __tablename__ = "employee_competencies"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    competency_id = db.Column(db.Integer, db.ForeignKey("competencies.id"), nullable=False)
    current_level = db.Column(db.Integer, nullable=False)  # 1-5
    target_level = db.Column(db.Integer, nullable=False)  # 1-5
    assessed_date = db.Column(db.Date)

    competency = db.relationship("Competency", backref="employee_competencies")

    def to_dict(self):
        emp = Employee.query.get(self.employee_id)
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "competency_id": self.competency_id,
            "competency_name": self.competency.name if self.competency else None,
            "competency_category": self.competency.category if self.competency else None,
            "current_level": self.current_level,
            "target_level": self.target_level,
            "gap": self.target_level - self.current_level,
            "assessed_date": self.assessed_date.isoformat() if self.assessed_date else None,
        }


class TrainingRecord(db.Model):
    __tablename__ = "training_records"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    training_name = db.Column(db.String(200), nullable=False)
    provider = db.Column(db.String(100))
    training_type = db.Column(db.String(50), nullable=False)  # course, workshop, certification, mentoring
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="enrolled")  # enrolled, in_progress, completed, dropped
    score = db.Column(db.Float)
    certificate_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        emp = Employee.query.get(self.employee_id)
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "training_name": self.training_name,
            "provider": self.provider,
            "training_type": self.training_type,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "status": self.status,
            "score": self.score,
            "certificate_url": self.certificate_url,
        }
