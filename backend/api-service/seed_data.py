"""Seed the database with rich sample data for development and testing."""

import random
from datetime import date

from app import create_app, db
from app.models import (
    Competency,
    DevelopmentPlan,
    Employee,
    EmployeeCompetency,
    PerformanceReview,
    TrainingRecord,
    User,
)

app = create_app()


FIRST_NAMES = [
    "Ava", "Liam", "Noah", "Emma", "Mason", "Sophia", "James", "Isabella", "Lucas", "Mia",
    "Ethan", "Amelia", "Logan", "Harper", "Elijah", "Evelyn", "Aria", "Benjamin", "Charlotte",
    "Henry", "Layla", "Alexander", "Zoe", "Michael", "Nora", "Daniel", "Chloe", "Sebastian",
    "Luna", "Matthew", "Ella", "Jackson", "Scarlett", "Owen", "Grace", "Levi", "Avery", "David",
]
LAST_NAMES = [
    "Reed", "Shaw", "Parker", "Cole", "Wright", "Price", "Stone", "Hayes", "Miller", "Long",
    "Bennett", "Foster", "Ward", "Graham", "Kim", "Patel", "Singh", "Nguyen", "Ibrahim", "Davis",
    "Turner", "Brown", "Scott", "Bailey", "Hughes", "Lopez", "Murphy", "Perry", "Sanders", "Morris",
]

DEPARTMENT_ROLES = {
    "Engineering": ["Software Engineer", "Senior Engineer", "Staff Engineer", "QA Engineer"],
    "Marketing": ["Marketing Specialist", "SEO Analyst", "Growth Associate"],
    "Finance": ["Financial Analyst", "Finance Associate", "Accounting Analyst"],
    "Design": ["UX Designer", "Product Designer", "Visual Designer"],
    "HR": ["HR Specialist", "Talent Partner", "People Operations Analyst"],
    "Sales": ["Account Executive", "Sales Development Rep", "Sales Analyst"],
    "Operations": ["Operations Analyst", "Program Coordinator", "Process Specialist"],
    "Product": ["Product Analyst", "Associate Product Manager", "Product Specialist"],
}

DEPARTMENT_MANAGER_COUNTS = {
    "Engineering": 4,
    "Sales": 2,
    "Product": 2,
    "Marketing": 2,
    "Operations": 2,
    "Finance": 2,
    "Design": 2,
    "HR": 1,
}

# Realistic headcount split for 215 employee-role staff.
DEPARTMENT_EMPLOYEE_DISTRIBUTION = {
    "Engineering": 60,
    "Sales": 35,
    "Product": 25,
    "Marketing": 25,
    "Operations": 20,
    "Finance": 18,
    "Design": 18,
    "HR": 14,
}

PERFORMANCE_BANDS = [
    "underperformer",
    "developing",
    "solid",
    "high",
    "top",
]

EMPLOYEE_BAND_WEIGHTS = [0.08, 0.17, 0.45, 0.22, 0.08]
MANAGER_BAND_WEIGHTS = [0.03, 0.10, 0.42, 0.30, 0.15]

PERIOD_SHIFT = {
    "2024-H2": -0.2,
    "2025-H1": 0.0,
    "2025-H2": 0.15,
}

BAND_SCORE_RANGE = {
    "underperformer": (1.0, 2.2),
    "developing": (2.0, 3.2),
    "solid": (3.0, 4.0),
    "high": (3.8, 4.6),
    "top": (4.5, 5.0),
}


def _pick_performance_band(role: str) -> str:
    """Pick a role-adjusted performance band for realistic review spread."""

    weights = MANAGER_BAND_WEIGHTS if role == "manager" else EMPLOYEE_BAND_WEIGHTS
    return random.choices(PERFORMANCE_BANDS, weights=weights, k=1)[0]


def _rating_from_band(band: str, period: str) -> float:
    """Generate a bounded performance rating from the assigned band and period."""

    min_score, max_score = BAND_SCORE_RANGE[band]
    raw_score = random.uniform(min_score, max_score) + PERIOD_SHIFT.get(period, 0.0)
    bounded_score = max(1.0, min(5.0, raw_score))
    return round(bounded_score, 1)


def _review_text_for_band(band: str) -> tuple[str, str, str, str]:
    """Return realistic review comments tailored to employee performance band."""

    if band == "top":
        return (
            "Delivers exceptional outcomes and mentors others effectively",
            "Can delegate more to scale impact",
            "Exceeded strategic goals and improved team velocity",
            "Consistently among top performers",
        )
    if band == "high":
        return (
            "Strong ownership, quality delivery, and collaboration",
            "Improve cross-functional visibility and planning depth",
            "Met all core goals and delivered stretch commitments",
            "Reliable high performer with growth potential",
        )
    if band == "solid":
        return (
            "Consistent delivery with good team collaboration",
            "Sharpen prioritization and communication under pressure",
            "Met most goals with dependable execution",
            "Solid contributor with stable performance",
        )
    if band == "developing":
        return (
            "Shows effort and willingness to learn",
            "Needs stronger consistency, quality checks, and planning",
            "Partially met goals with support from manager",
            "Progressing but needs structured coaching",
        )
    return (
        "Demonstrates commitment but struggles with core expectations",
        "Requires immediate improvement in execution and reliability",
        "Did not meet several key goals for the period",
        "Performance improvement plan is recommended",
    )


def _review_periods_for_employee() -> list[str]:
    """Return a realistic, variable set of review periods for an employee."""

    period_candidates = ["2024-H2", "2025-H1", "2025-H2", "2026-H1"]
    period_count = random.choices([1, 2, 3, 4], weights=[0.08, 0.22, 0.48, 0.22], k=1)[0]
    selected_periods = random.sample(period_candidates, k=period_count)
    return sorted(selected_periods, key=period_candidates.index)


def _training_statuses_for_employee(performance_band: str, training_count: int) -> list[str]:
    """Generate varied training statuses with completion bias by performance band."""

    completed_weight_by_band = {
        "underperformer": 0.18,
        "developing": 0.28,
        "solid": 0.42,
        "high": 0.58,
        "top": 0.7,
    }
    completed_weight = completed_weight_by_band.get(performance_band, 0.4)
    in_progress_weight = max(0.15, 0.55 - completed_weight / 2)
    enrolled_weight = max(0.1, 1 - (completed_weight + in_progress_weight))

    return random.choices(
        ["completed", "in_progress", "enrolled"],
        weights=[completed_weight, in_progress_weight, enrolled_weight],
        k=training_count,
    )


def make_employee_code(index: int) -> str:
    """Generate a unique employee code."""

    return f"EMP{index:04d}"


def create_user_and_employee(
    *,
    email: str,
    password: str,
    role: str,
    first_name: str,
    last_name: str,
    employee_code: str,
    department: str,
    designation: str,
    hire_date: date,
    status: str,
) -> Employee:
    """Create linked User and Employee records and return the employee row."""

    user = User(email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    employee = Employee(
        user_id=user.id,
        first_name=first_name,
        last_name=last_name,
        employee_code=employee_code,
        department=department,
        designation=designation,
        hire_date=hire_date,
        status=status,
    )
    db.session.add(employee)
    db.session.flush()
    return employee


def seed() -> None:
    """Rebuild and seed the database with a larger test dataset."""

    random.seed(42)

    with app.app_context():
        db.drop_all()
        db.create_all()

        all_employees: list[Employee] = []

        admins = [
            create_user_and_employee(
                email="admin@acme.com",
                password="admin123",
                role="admin",
                first_name="Girish",
                last_name="Admin",
                employee_code=make_employee_code(1),
                department="HR",
                designation="HR Director",
                hire_date=date(2021, 2, 10),
                status="active",
            ),
            create_user_and_employee(
                email="admin2@acme.com",
                password="admin123",
                role="admin",
                first_name="Rohan",
                last_name="Governance",
                employee_code=make_employee_code(2),
                department="Operations",
                designation="Operations Director",
                hire_date=date(2020, 8, 5),
                status="active",
            ),
        ]
        all_employees.extend(admins)

        hr_users = [
            create_user_and_employee(
                email="hr1@acme.com",
                password="hr123",
                role="hr",
                first_name="Aisha",
                last_name="PeopleOps",
                employee_code=make_employee_code(3),
                department="HR",
                designation="HR Business Partner",
                hire_date=date(2022, 3, 14),
                status="active",
            ),
        ]
        all_employees.extend(hr_users)

        manager_specs = []
        manager_index = 1
        for department, count in DEPARTMENT_MANAGER_COUNTS.items():
            for _ in range(count):
                manager_first = FIRST_NAMES[(manager_index * 2) % len(FIRST_NAMES)]
                manager_last = LAST_NAMES[(manager_index * 5) % len(LAST_NAMES)]
                manager_specs.append(
                    (
                        f"mgr{manager_index}@acme.com",
                        manager_first,
                        manager_last,
                        department,
                        f"{department} Manager",
                    )
                )
                manager_index += 1

        managers: list[Employee] = []
        manager_start_code = len(all_employees) + 1
        for i, (email, first_name, last_name, department, designation) in enumerate(manager_specs, start=manager_start_code):
            manager = create_user_and_employee(
                email=email,
                password="mgr123",
                role="manager",
                first_name=first_name,
                last_name=last_name,
                employee_code=make_employee_code(i),
                department=department,
                designation=designation,
                hire_date=date(2021, random.randint(1, 12), random.randint(1, 28)),
                status="active",
            )
            managers.append(manager)
            all_employees.append(manager)

        for manager in managers:
            manager.manager_id = None

        employee_count = sum(DEPARTMENT_EMPLOYEE_DISTRIBUTION.values())
        start_index = manager_start_code + len(manager_specs)
        non_admin_staff: list[Employee] = [*hr_users, *managers]

        department_slots: list[str] = []
        for department, count in DEPARTMENT_EMPLOYEE_DISTRIBUTION.items():
            department_slots.extend([department] * count)

        for index in range(employee_count):
            first_name = FIRST_NAMES[index % len(FIRST_NAMES)]
            last_name = LAST_NAMES[(index * 3) % len(LAST_NAMES)]
            department = department_slots[index]
            designation = DEPARTMENT_ROLES[department][index % len(DEPARTMENT_ROLES[department])]

            status = "active"
            # Keep statuses realistic: mostly active, some on leave, few inactive.
            if index % 11 == 0:
                status = "on_leave"
            elif index % 23 == 0:
                status = "inactive"

            emp = create_user_and_employee(
                email=f"emp{index + 1}@acme.com",
                password="emp123",
                role="employee",
                first_name=first_name,
                last_name=last_name,
                employee_code=make_employee_code(start_index + index),
                department=department,
                designation=designation,
                hire_date=date(2022 + (index % 4), (index % 12) + 1, ((index * 2) % 27) + 1),
                status=status,
            )

            dept_managers = [manager for manager in managers if manager.department == department]
            if not dept_managers:
                dept_managers = managers
            emp.manager_id = dept_managers[index % len(dept_managers)].id

            non_admin_staff.append(emp)
            all_employees.append(emp)

        competency_specs = [
            ("Python", "technical", "Python programming proficiency"),
            ("JavaScript", "technical", "JavaScript / TypeScript skills"),
            ("System Design", "technical", "Designing scalable systems"),
            ("Leadership", "leadership", "Team leadership and mentoring"),
            ("Communication", "communication", "Written and verbal communication"),
            ("Project Management", "management", "Planning and delivery management"),
            ("Data Analysis", "technical", "Statistical analysis and data visualization"),
            ("UX Design", "design", "User experience design principles"),
            ("Stakeholder Management", "leadership", "Managing internal and external stakeholders"),
            ("Cloud Fundamentals", "technical", "Working knowledge of cloud architecture"),
            ("Sales Negotiation", "business", "Customer negotiation and objection handling"),
            ("Product Discovery", "product", "User research and product discovery practices"),
        ]

        competencies: list[Competency] = []
        for name, category, description in competency_specs:
            competency = Competency(name=name, category=category, description=description)
            db.session.add(competency)
            db.session.flush()
            competencies.append(competency)

        review_count = 0
        plan_count = 0
        training_count = 0
        employee_competency_count = 0

        for idx, employee in enumerate(non_admin_staff):
            reviewer_id = employee.manager_id or admins[0].id
            if idx < len(PERFORMANCE_BANDS):
                performance_band = PERFORMANCE_BANDS[idx]
            else:
                performance_band = _pick_performance_band(employee.user.role if employee.user else "employee")
            strengths, improvements, goals_met, comments = _review_text_for_band(performance_band)
            review_periods = _review_periods_for_employee()

            for p_idx, period in enumerate(review_periods):
                rating = _rating_from_band(performance_band, period)
                attrition_risk = "low"
                if rating < 2.5:
                    attrition_risk = "high"
                elif rating < 3.5:
                    attrition_risk = "medium"

                review_status = "approved"
                if period in ["2025-H2", "2026-H1"] and rating < 2.3:
                    review_status = "submitted"

                db.session.add(
                    PerformanceReview(
                        employee_id=employee.id,
                        reviewer_id=reviewer_id,
                        review_period=period,
                        overall_rating=rating,
                        strengths=strengths,
                        areas_for_improvement=improvements,
                        goals_met=goals_met,
                        comments=comments,
                        status=review_status,
                        promotion_ready=rating >= 4.6,
                        attrition_risk=attrition_risk,
                    )
                )
                review_count += 1

            plan_templates = [
                ("Career Growth Plan", "career"),
                ("Skill Deepening Plan", "skill"),
            ]
            for template_idx, (title_prefix, goal_type) in enumerate(plan_templates):
                progress = (idx * 13 + template_idx * 27) % 101
                status = "not_started"
                if progress >= 100:
                    status = "completed"
                elif progress > 0:
                    status = "in_progress"

                db.session.add(
                    DevelopmentPlan(
                        employee_id=employee.id,
                        title=f"{title_prefix}: {employee.department}",
                        description=f"Structured development plan for {employee.first_name} in {employee.department}",
                        goal_type=goal_type,
                        target_date=date(2026, 12, 31),
                        status=status,
                        progress_pct=progress,
                    )
                )
                plan_count += 1

            for c_idx in range(4):
                competency = competencies[(idx + c_idx * 2) % len(competencies)]
                current_level = 2 + ((idx + c_idx) % 3)
                target_level = min(5, current_level + 1 + (c_idx % 2))

                db.session.add(
                    EmployeeCompetency(
                        employee_id=employee.id,
                        competency_id=competency.id,
                        current_level=current_level,
                        target_level=target_level,
                        assessed_date=date(2025, ((idx + c_idx) % 12) + 1, ((idx + c_idx * 2) % 27) + 1),
                    )
                )
                employee_competency_count += 1

            training_catalog = [
                ("Foundations Program", "course"),
                ("Role Mastery Program", "workshop"),
                ("Cross-Functional Collaboration", "mentoring"),
                ("Leadership Essentials", "course"),
                ("Data-Driven Decisions", "workshop"),
                ("Customer Discovery", "mentoring"),
            ]
            trainings_for_employee = random.randint(2, 5)
            training_statuses = _training_statuses_for_employee(performance_band, trainings_for_employee)

            for t_idx in range(trainings_for_employee):
                name_suffix, training_type = training_catalog[(idx + t_idx) % len(training_catalog)]
                status = training_statuses[t_idx]
                score = None
                end_date = None
                if status == "completed":
                    score = 75 + ((idx + t_idx) % 20)
                    end_date = date(2025, ((idx + t_idx) % 12) + 1, ((idx + t_idx * 3) % 27) + 1)

                db.session.add(
                    TrainingRecord(
                        employee_id=employee.id,
                        training_name=f"{employee.department} {name_suffix}",
                        provider=["Coursera", "Udemy", "Internal L&D", "LinkedIn Learning"][(idx + t_idx) % 4],
                        training_type=training_type,
                        start_date=date(2025, ((idx + t_idx * 2) % 12) + 1, ((idx + t_idx) % 27) + 1),
                        end_date=end_date,
                        status=status,
                        score=score,
                    )
                )
                training_count += 1

        db.session.commit()

        print("Database seeded successfully with expanded dataset!")
        print("Summary:")
        print(f"  Users:                {User.query.count()}")
        print(f"  Employees:            {Employee.query.count()}")
        print(f"  Reviews:              {PerformanceReview.query.count()} (created {review_count})")
        print(f"  Development plans:    {DevelopmentPlan.query.count()} (created {plan_count})")
        print(f"  Competencies:         {Competency.query.count()}")
        print(f"  Employee competencies:{EmployeeCompetency.query.count()} (created {employee_competency_count})")
        print(f"  Training records:     {TrainingRecord.query.count()} (created {training_count})")
        print("\nLogin credentials:")
        print("  Admin:    admin@acme.com / admin123")
        print("  HR:       hr1@acme.com   / hr123")
        print("  Manager:  mgr1@acme.com  / mgr123")
        print("  Employee: emp1@acme.com  / emp123")


if __name__ == "__main__":
    seed()
