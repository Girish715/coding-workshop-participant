"""Lambda function to rebuild and seed PostgreSQL with a rich demo dataset."""

import json
import logging
import os
from datetime import date

import psycopg2
from psycopg2.extensions import connection as PgConnection
from psycopg2.extensions import cursor as PgCursor
from werkzeug.security import generate_password_hash

logger = logging.getLogger()
logger.setLevel(logging.INFO)

PG_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASS", "postgres"),
    "dbname": os.getenv("POSTGRES_NAME", "employee_perf_db"),
    "connect_timeout": 15,
}

DEPARTMENT_MANAGER_COUNTS = {
    "Engineering": 6,
    "Product": 3,
    "Design": 2,
    "HR": 2,
    "Finance": 2,
    "Operations": 2,
    "Sales": 2,
    "Marketing": 2,
}

DEPARTMENT_EMPLOYEE_COUNTS = {
    "Engineering": 90,
    "Product": 24,
    "Design": 16,
    "HR": 12,
    "Finance": 14,
    "Operations": 18,
    "Sales": 24,
    "Marketing": 20,
}

FIRST_NAMES = [
    "Aarav", "Aisha", "Akash", "Amelia", "Arjun", "Ava", "Benjamin", "Camila",
    "Charlotte", "Daniel", "Diya", "Elena", "Ethan", "Fatima", "Grace", "Harper",
    "Isha", "Ivy", "James", "Jiya", "Kabir", "Liam", "Lucas", "Maya", "Mia",
    "Noah", "Olivia", "Omar", "Priya", "Riya", "Rohan", "Sara", "Sophia", "Tara",
    "Vihaan", "William", "Yash", "Zara",
]

LAST_NAMES = [
    "Anderson", "Baker", "Banerjee", "Brown", "Carter", "Chopra", "Clark", "Das",
    "Davis", "Diaz", "Edwards", "Evans", "Fernandez", "Garcia", "Gupta", "Hall",
    "Harris", "Iyer", "Jackson", "Jain", "Johnson", "Kapoor", "Khan", "Kumar",
    "Lewis", "Martin", "Mehta", "Miller", "Moore", "Nair", "Nelson", "Patel",
    "Reed", "Shah", "Singh", "Smith", "Taylor", "Thomas", "Verma", "Walker", "Wilson",
]

DEPARTMENT_ROLES = {
    "Engineering": ["Software Engineer", "Senior Engineer", "Tech Lead", "QA Engineer", "DevOps Engineer"],
    "Product": ["Product Analyst", "Product Manager", "Senior Product Manager"],
    "Design": ["UX Designer", "UI Designer", "Product Designer"],
    "HR": ["HR Specialist", "Talent Partner", "HR Business Partner"],
    "Finance": ["Financial Analyst", "Finance Manager", "Controller"],
    "Operations": ["Operations Specialist", "Program Manager", "Process Analyst"],
    "Sales": ["Account Executive", "Sales Manager", "Business Development Rep"],
    "Marketing": ["Marketing Specialist", "Growth Manager", "Content Strategist"],
}

TRAINING_CATALOG = [
    ("Foundations Program", "course"),
    ("Role Mastery Workshop", "workshop"),
    ("Cross-Functional Collaboration", "mentoring"),
    ("Data-Driven Decisions", "workshop"),
    ("Leadership Essentials", "course"),
    ("Customer Discovery", "mentoring"),
]


def get_conn() -> PgConnection:
    """Create PostgreSQL connection using Lambda environment variables."""

    return psycopg2.connect(**PG_CONFIG)


def insert_user_and_employee(
    cur: PgCursor,
    *,
    email: str,
    password_hash: str,
    role: str,
    first_name: str,
    last_name: str,
    employee_code: str,
    department: str,
    designation: str,
    hire_date: date,
    status: str,
    manager_id: int | None,
) -> tuple[int, int]:
    """Insert user + employee rows and return (user_id, employee_id)."""

    cur.execute(
        "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id",
        (email, password_hash, role),
    )
    user_id = cur.fetchone()[0]

    cur.execute(
        """
        INSERT INTO employees (
            user_id, first_name, last_name, employee_code, department,
            designation, hire_date, manager_id, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            user_id,
            first_name,
            last_name,
            employee_code,
            department,
            designation,
            hire_date,
            manager_id,
            status,
        ),
    )
    employee_id = cur.fetchone()[0]
    return user_id, employee_id


def _status_for_index(index: int) -> str:
    if index % 21 == 0:
        return "inactive"
    if index % 9 == 0:
        return "on_leave"
    return "active"


def handler(event=None, context=None):
    """Rebuild schema tables and seed large demo dataset for AWS/local."""
    logger.info("Starting database seed...")

    try:
        conn = get_conn()
        conn.autocommit = False
        cur = conn.cursor()

        # Create tables
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(256) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
                first_name VARCHAR(80) NOT NULL,
                last_name VARCHAR(80) NOT NULL,
                employee_code VARCHAR(20) UNIQUE NOT NULL,
                department VARCHAR(100) NOT NULL,
                designation VARCHAR(100) NOT NULL,
                hire_date DATE NOT NULL,
                manager_id INTEGER REFERENCES employees(id),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS performance_reviews (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                reviewer_id INTEGER NOT NULL REFERENCES employees(id),
                review_period VARCHAR(50) NOT NULL,
                overall_rating FLOAT NOT NULL,
                strengths TEXT,
                areas_for_improvement TEXT,
                goals_met TEXT,
                comments TEXT,
                status VARCHAR(20) DEFAULT 'draft',
                promotion_ready BOOLEAN DEFAULT FALSE,
                attrition_risk VARCHAR(20) DEFAULT 'low',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS development_plans (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                title VARCHAR(200) NOT NULL,
                description TEXT,
                goal_type VARCHAR(50) NOT NULL,
                target_date DATE,
                status VARCHAR(20) DEFAULT 'not_started',
                progress_pct INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS competencies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT
            );
            CREATE TABLE IF NOT EXISTS employee_competencies (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                competency_id INTEGER NOT NULL REFERENCES competencies(id),
                current_level INTEGER NOT NULL,
                target_level INTEGER NOT NULL,
                assessed_date DATE
            );
            CREATE TABLE IF NOT EXISTS training_records (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                training_name VARCHAR(200) NOT NULL,
                provider VARCHAR(100),
                training_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                status VARCHAR(20) DEFAULT 'enrolled',
                score FLOAT,
                certificate_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        logger.info("Tables created.")

        cur.execute(
            """
            TRUNCATE TABLE
                training_records,
                employee_competencies,
                development_plans,
                performance_reviews,
                competencies,
                employees,
                users
            RESTART IDENTITY CASCADE
            """
        )

        all_people: list[dict] = []
        managers_by_department: dict[str, list[int]] = {key: [] for key in DEPARTMENT_MANAGER_COUNTS}
        employee_number = 1

        # Compute each password hash once to keep Lambda runtime within timeout.
        admin_password_hash = generate_password_hash("admin123")
        hr_password_hash = generate_password_hash("hr123")
        manager_password_hash = generate_password_hash("mgr123")
        employee_password_hash = generate_password_hash("emp123")

        # Admin accounts
        _, admin_emp_1 = insert_user_and_employee(
            cur,
            email="admin@acme.com",
            password_hash=admin_password_hash,
            role="admin",
            first_name="Girish",
            last_name="Admin",
            employee_code=f"EMP{employee_number:04d}",
            department="HR",
            designation="HR Director",
            hire_date=date(2021, 2, 10),
            status="active",
            manager_id=None,
        )
        all_people.append({"employee_id": admin_emp_1, "role": "admin", "department": "HR", "manager_id": None})
        employee_number += 1

        _, admin_emp_2 = insert_user_and_employee(
            cur,
            email="admin2@acme.com",
            password_hash=admin_password_hash,
            role="admin",
            first_name="Rohan",
            last_name="Governance",
            employee_code=f"EMP{employee_number:04d}",
            department="Operations",
            designation="Operations Director",
            hire_date=date(2020, 8, 5),
            status="active",
            manager_id=None,
        )
        all_people.append({"employee_id": admin_emp_2, "role": "admin", "department": "Operations", "manager_id": None})
        employee_number += 1

        # HR account
        _, hr_emp_1 = insert_user_and_employee(
            cur,
            email="hr1@acme.com",
            password_hash=hr_password_hash,
            role="hr",
            first_name="Aisha",
            last_name="PeopleOps",
            employee_code=f"EMP{employee_number:04d}",
            department="HR",
            designation="HR Business Partner",
            hire_date=date(2022, 3, 14),
            status="active",
            manager_id=None,
        )
        all_people.append({"employee_id": hr_emp_1, "role": "hr", "department": "HR", "manager_id": None})
        employee_number += 1

        # Manager accounts
        manager_index = 1
        for department, count in DEPARTMENT_MANAGER_COUNTS.items():
            for _ in range(count):
                first_name = FIRST_NAMES[(manager_index * 3) % len(FIRST_NAMES)]
                last_name = LAST_NAMES[(manager_index * 5) % len(LAST_NAMES)]

                _, manager_emp_id = insert_user_and_employee(
                    cur,
                    email=f"mgr{manager_index}@acme.com",
                    password_hash=manager_password_hash,
                    role="manager",
                    first_name=first_name,
                    last_name=last_name,
                    employee_code=f"EMP{employee_number:04d}",
                    department=department,
                    designation=f"{department} Manager",
                    hire_date=date(2021, (manager_index % 12) + 1, ((manager_index * 2) % 27) + 1),
                    status="active",
                    manager_id=None,
                )

                managers_by_department[department].append(manager_emp_id)
                all_people.append(
                    {
                        "employee_id": manager_emp_id,
                        "role": "manager",
                        "department": department,
                        "manager_id": None,
                    }
                )
                manager_index += 1
                employee_number += 1

        # Individual contributor accounts
        employee_index = 1
        for department, count in DEPARTMENT_EMPLOYEE_COUNTS.items():
            for _ in range(count):
                manager_pool = managers_by_department[department]
                manager_id = manager_pool[(employee_index - 1) % len(manager_pool)]
                first_name = FIRST_NAMES[employee_index % len(FIRST_NAMES)]
                last_name = LAST_NAMES[(employee_index * 7) % len(LAST_NAMES)]
                designation = DEPARTMENT_ROLES[department][employee_index % len(DEPARTMENT_ROLES[department])]
                status = _status_for_index(employee_index)

                _, emp_id = insert_user_and_employee(
                    cur,
                    email=f"emp{employee_index}@acme.com",
                    password_hash=employee_password_hash,
                    role="employee",
                    first_name=first_name,
                    last_name=last_name,
                    employee_code=f"EMP{employee_number:04d}",
                    department=department,
                    designation=designation,
                    hire_date=date(2022 + (employee_index % 4), (employee_index % 12) + 1, ((employee_index * 2) % 27) + 1),
                    status=status,
                    manager_id=manager_id,
                )

                all_people.append(
                    {
                        "employee_id": emp_id,
                        "role": "employee",
                        "department": department,
                        "manager_id": manager_id,
                    }
                )

                employee_index += 1
                employee_number += 1

        competency_rows = [
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
        competency_ids: list[int] = []
        for name, category, description in competency_rows:
            cur.execute(
                "INSERT INTO competencies (name, category, description) VALUES (%s, %s, %s) RETURNING id",
                (name, category, description),
            )
            competency_ids.append(cur.fetchone()[0])

        # Reviews, plans, competencies and training records for all non-admins.
        for idx, person in enumerate([p for p in all_people if p["role"] != "admin"], start=1):
            reviewer_id = person["manager_id"] or admin_emp_1
            base_rating = 2.8 + ((idx % 25) / 10)
            rating_h1 = min(5.0, round(base_rating, 1))
            rating_h2 = min(5.0, round(base_rating + 0.2, 1))

            for period, rating in (("2025-H1", rating_h1), ("2025-H2", rating_h2)):
                attrition_risk = "low"
                if rating < 3.0:
                    attrition_risk = "high"
                elif rating < 3.6:
                    attrition_risk = "medium"

                cur.execute(
                    """
                    INSERT INTO performance_reviews (
                        employee_id, reviewer_id, review_period, overall_rating,
                        strengths, areas_for_improvement, goals_met, comments,
                        status, promotion_ready, attrition_risk
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'approved', %s, %s)
                    """,
                    (
                        person["employee_id"],
                        reviewer_id,
                        period,
                        rating,
                        "Strong ownership and collaboration",
                        "Improve cross-team communication and planning",
                        "Delivered quarterly targets and supported peers",
                        "Consistent contribution with visible growth",
                        rating >= 4.6,
                        attrition_risk,
                    ),
                )

            progress_primary = (idx * 11) % 101
            status_primary = "completed" if progress_primary == 100 else ("in_progress" if progress_primary > 0 else "not_started")
            progress_secondary = (idx * 17) % 101
            status_secondary = "completed" if progress_secondary == 100 else ("in_progress" if progress_secondary > 0 else "not_started")

            cur.execute(
                """
                INSERT INTO development_plans (
                    employee_id, title, description, goal_type, target_date, status, progress_pct
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    person["employee_id"],
                    f"Career Growth Plan - {person['department']}",
                    "Structured growth plan aligned to department expectations.",
                    "career",
                    date(2026, 12, 31),
                    status_primary,
                    progress_primary,
                ),
            )
            cur.execute(
                """
                INSERT INTO development_plans (
                    employee_id, title, description, goal_type, target_date, status, progress_pct
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    person["employee_id"],
                    f"Skill Deepening Plan - {person['department']}",
                    "Focused capability upgrade plan with measurable milestones.",
                    "skill",
                    date(2026, 12, 31),
                    status_secondary,
                    progress_secondary,
                ),
            )

            for comp_offset in range(4):
                comp_id = competency_ids[(idx + comp_offset * 2) % len(competency_ids)]
                current_level = 2 + ((idx + comp_offset) % 3)
                target_level = min(5, current_level + 1 + (comp_offset % 2))
                cur.execute(
                    """
                    INSERT INTO employee_competencies (
                        employee_id, competency_id, current_level, target_level, assessed_date
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        person["employee_id"],
                        comp_id,
                        current_level,
                        target_level,
                        date(2025, ((idx + comp_offset) % 12) + 1, ((idx + comp_offset * 3) % 27) + 1),
                    ),
                )

            for train_offset in range(2):
                training_name, training_type = TRAINING_CATALOG[(idx + train_offset) % len(TRAINING_CATALOG)]
                training_status = "completed" if (idx + train_offset) % 3 == 0 else "in_progress"
                training_score = 78 + ((idx + train_offset) % 20) if training_status == "completed" else None
                training_end = date(2025, ((idx + train_offset) % 12) + 1, ((idx * 2 + train_offset) % 27) + 1) if training_status == "completed" else None

                cur.execute(
                    """
                    INSERT INTO training_records (
                        employee_id, training_name, provider, training_type,
                        start_date, end_date, status, score
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        person["employee_id"],
                        f"{person['department']} {training_name}",
                        ["Coursera", "Udemy", "Internal L&D", "LinkedIn Learning"][(idx + train_offset) % 4],
                        training_type,
                        date(2025, ((idx + train_offset * 2) % 12) + 1, ((idx + train_offset) % 27) + 1),
                        training_end,
                        training_status,
                        training_score,
                    ),
                )

        conn.commit()

        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM employees")
        total_employees = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM performance_reviews")
        total_reviews = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM development_plans")
        total_plans = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM employee_competencies")
        total_employee_competencies = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM training_records")
        total_training_records = cur.fetchone()[0]

        cur.close()
        conn.close()
        logger.info("Database seeded successfully with expanded dataset.")

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Database rebuilt and seeded successfully!",
                "counts": {
                    "users": total_users,
                    "employees": total_employees,
                    "reviews": total_reviews,
                    "development_plans": total_plans,
                    "employee_competencies": total_employee_competencies,
                    "training_records": total_training_records,
                },
                "accounts": [
                    {"role": "Admin", "email": "admin@acme.com", "password": "admin123"},
                    {"role": "HR", "email": "hr1@acme.com", "password": "hr123"},
                    {"role": "Manager", "email": "mgr1@acme.com", "password": "mgr123"},
                    {"role": "Employee", "email": "emp1@acme.com", "password": "emp123"},
                ],
            }),
        }

    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        logger.error("Seed error: %s", str(e), exc_info=True)
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Failed to seed database", "message": str(e)}),
        }


if __name__ == "__main__":
    print(handler())
