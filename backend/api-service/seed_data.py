"""Seed the database with sample data for development."""
from datetime import date
from app import create_app, db
from app.models import (
    User, Employee, PerformanceReview, DevelopmentPlan,
    Competency, EmployeeCompetency, TrainingRecord,
)

app = create_app()


def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # ---- Users & Employees ----
        users_data = [
            {"email": "admin@acme.com", "password": "admin123", "role": "admin",
             "first": "Alice", "last": "Admin", "code": "EMP001", "dept": "HR", "desig": "HR Director"},
            {"email": "mgr1@acme.com", "password": "mgr123", "role": "manager",
             "first": "Bob", "last": "Manager", "code": "EMP002", "dept": "Engineering", "desig": "Engineering Manager"},
            {"email": "mgr2@acme.com", "password": "mgr123", "role": "manager",
             "first": "Carol", "last": "Lead", "code": "EMP003", "dept": "Marketing", "desig": "Marketing Manager"},
            {"email": "emp1@acme.com", "password": "emp123", "role": "employee",
             "first": "David", "last": "Developer", "code": "EMP004", "dept": "Engineering", "desig": "Senior Engineer"},
            {"email": "emp2@acme.com", "password": "emp123", "role": "employee",
             "first": "Eve", "last": "Engineer", "code": "EMP005", "dept": "Engineering", "desig": "Software Engineer"},
            {"email": "emp3@acme.com", "password": "emp123", "role": "employee",
             "first": "Frank", "last": "Marketer", "code": "EMP006", "dept": "Marketing", "desig": "Marketing Specialist"},
            {"email": "emp4@acme.com", "password": "emp123", "role": "employee",
             "first": "Grace", "last": "Analyst", "code": "EMP007", "dept": "Finance", "desig": "Financial Analyst"},
            {"email": "emp5@acme.com", "password": "emp123", "role": "employee",
             "first": "Hank", "last": "Designer", "code": "EMP008", "dept": "Design", "desig": "UX Designer"},
        ]

        employees = []
        for ud in users_data:
            u = User(email=ud["email"], role=ud["role"])
            u.set_password(ud["password"])
            db.session.add(u)
            db.session.flush()
            emp = Employee(
                user_id=u.id,
                first_name=ud["first"],
                last_name=ud["last"],
                employee_code=ud["code"],
                department=ud["dept"],
                designation=ud["desig"],
                hire_date=date(2022, 1, 15),
            )
            db.session.add(emp)
            db.session.flush()
            employees.append(emp)

        # Set managers
        employees[3].manager_id = employees[1].id  # David -> Bob
        employees[4].manager_id = employees[1].id  # Eve -> Bob
        employees[5].manager_id = employees[2].id  # Frank -> Carol
        employees[6].manager_id = employees[0].id  # Grace -> Alice
        employees[7].manager_id = employees[2].id  # Hank -> Carol

        # ---- Performance Reviews ----
        reviews = [
            (employees[3], employees[1], "2025-H1", 4.2, True, "low"),
            (employees[3], employees[1], "2024-H2", 3.8, False, "low"),
            (employees[4], employees[1], "2025-H1", 3.5, False, "medium"),
            (employees[5], employees[2], "2025-H1", 4.5, True, "low"),
            (employees[6], employees[0], "2025-H1", 2.8, False, "high"),
            (employees[7], employees[2], "2025-H1", 3.9, False, "low"),
            (employees[1], employees[0], "2025-H1", 4.0, True, "low"),
            (employees[2], employees[0], "2025-H1", 4.3, True, "low"),
        ]
        for emp, rev, period, rating, promo, risk in reviews:
            db.session.add(PerformanceReview(
                employee_id=emp.id, reviewer_id=rev.id, review_period=period,
                overall_rating=rating,
                strengths="Strong technical skills, good team player",
                areas_for_improvement="Communication, time management",
                goals_met="Delivered project milestones on time",
                comments="Solid contributor this period",
                status="approved", promotion_ready=promo, attrition_risk=risk,
            ))

        # ---- Competencies catalog ----
        comp_data = [
            ("Python", "technical", "Python programming proficiency"),
            ("JavaScript", "technical", "JavaScript / TypeScript skills"),
            ("System Design", "technical", "Designing scalable systems"),
            ("Leadership", "leadership", "Team leadership and mentoring"),
            ("Communication", "communication", "Written and verbal communication"),
            ("Project Management", "management", "Planning and delivery management"),
            ("Data Analysis", "technical", "Statistical analysis and data viz"),
            ("UX Design", "design", "User experience design principles"),
        ]
        competencies = []
        for name, cat, desc in comp_data:
            c = Competency(name=name, category=cat, description=desc)
            db.session.add(c)
            db.session.flush()
            competencies.append(c)

        # ---- Employee Competencies ----
        ec_data = [
            (employees[3], competencies[0], 4, 5),
            (employees[3], competencies[1], 3, 5),
            (employees[3], competencies[2], 3, 4),
            (employees[4], competencies[0], 3, 4),
            (employees[4], competencies[1], 4, 5),
            (employees[5], competencies[4], 4, 5),
            (employees[5], competencies[5], 2, 4),
            (employees[6], competencies[6], 3, 5),
            (employees[7], competencies[7], 4, 5),
            (employees[7], competencies[4], 2, 4),
        ]
        for emp, comp, curr, tgt in ec_data:
            db.session.add(EmployeeCompetency(
                employee_id=emp.id, competency_id=comp.id,
                current_level=curr, target_level=tgt,
                assessed_date=date(2025, 3, 1),
            ))

        # ---- Development Plans ----
        plans = [
            (employees[3], "Master System Design", "Complete system design course", "technical", "in_progress", 60),
            (employees[4], "Learn React Advanced Patterns", "Deep dive into React", "skill", "not_started", 0),
            (employees[5], "Project Management Cert", "PMP certification", "career", "in_progress", 30),
            (employees[6], "Data Viz with Python", "Matplotlib & Seaborn mastery", "skill", "completed", 100),
            (employees[7], "Communication Workshop", "Public speaking course", "skill", "in_progress", 45),
        ]
        for emp, title, desc, gtype, status, pct in plans:
            db.session.add(DevelopmentPlan(
                employee_id=emp.id, title=title, description=desc,
                goal_type=gtype, target_date=date(2025, 12, 31),
                status=status, progress_pct=pct,
            ))

        # ---- Training Records ----
        trainings = [
            (employees[3], "AWS Solutions Architect", "AWS", "certification", "completed", 92.0),
            (employees[3], "Python Advanced Patterns", "Udemy", "course", "completed", 88.0),
            (employees[4], "React Masterclass", "Frontend Masters", "course", "in_progress", None),
            (employees[5], "Digital Marketing Strategy", "Coursera", "course", "completed", 95.0),
            (employees[6], "Financial Modeling", "Wall Street Prep", "certification", "enrolled", None),
            (employees[7], "Figma Advanced", "Design Lab", "workshop", "completed", 90.0),
            (employees[1], "Engineering Leadership", "Rands", "mentoring", "in_progress", None),
        ]
        for emp, name, provider, ttype, status, score in trainings:
            db.session.add(TrainingRecord(
                employee_id=emp.id, training_name=name, provider=provider,
                training_type=ttype, start_date=date(2025, 1, 10),
                end_date=date(2025, 6, 30) if status == "completed" else None,
                status=status, score=score,
            ))

        db.session.commit()
        print("Database seeded successfully!")
        print("Login credentials:")
        print("  Admin:    admin@acme.com / admin123")
        print("  Manager:  mgr1@acme.com  / mgr123")
        print("  Employee: emp1@acme.com  / emp123")


if __name__ == "__main__":
    seed()
