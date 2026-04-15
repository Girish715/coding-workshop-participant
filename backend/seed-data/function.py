"""
Lambda function to seed the database with sample data.
Invoke this once after initial deployment to populate the DB.
"""

import json
import logging
import os
import sys

# Add api-service to path so we can reuse models
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api-service"))

from datetime import date
import psycopg2
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


def get_conn():
    return psycopg2.connect(**PG_CONFIG)


def handler(event=None, context=None):
    """Seed the database with tables and sample data."""
    logger.info("Starting database seed...")

    try:
        conn = get_conn()
        conn.autocommit = True
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

        # Check if already seeded
        cur.execute("SELECT COUNT(*) FROM users")
        if cur.fetchone()[0] > 0:
            logger.info("Database already seeded. Skipping.")
            cur.close()
            conn.close()
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "Database already seeded."}),
            }

        # Users & Employees
        users_data = [
            ("admin@acme.com", "admin123", "admin", "Alice", "Admin", "EMP001", "HR", "HR Director"),
            ("mgr1@acme.com", "mgr123", "manager", "Bob", "Manager", "EMP002", "Engineering", "Engineering Manager"),
            ("mgr2@acme.com", "mgr123", "manager", "Carol", "Lead", "EMP003", "Marketing", "Marketing Manager"),
            ("emp1@acme.com", "emp123", "employee", "David", "Developer", "EMP004", "Engineering", "Senior Engineer"),
            ("emp2@acme.com", "emp123", "employee", "Eve", "Engineer", "EMP005", "Engineering", "Software Engineer"),
            ("emp3@acme.com", "emp123", "employee", "Frank", "Marketer", "EMP006", "Marketing", "Marketing Specialist"),
            ("emp4@acme.com", "emp123", "employee", "Grace", "Analyst", "EMP007", "Finance", "Financial Analyst"),
            ("emp5@acme.com", "emp123", "employee", "Hank", "Designer", "EMP008", "Design", "UX Designer"),
        ]

        emp_ids = []
        for email, pw, role, first, last, code, dept, desig in users_data:
            pw_hash = generate_password_hash(pw)
            cur.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id",
                (email, pw_hash, role),
            )
            user_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO employees (user_id, first_name, last_name, employee_code, department, designation, hire_date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (user_id, first, last, code, dept, desig, date(2022, 1, 15)),
            )
            emp_ids.append(cur.fetchone()[0])

        # Manager assignments
        mgr_map = {3: 1, 4: 1, 5: 2, 6: 0, 7: 2}  # employee index -> manager index
        for emp_idx, mgr_idx in mgr_map.items():
            cur.execute("UPDATE employees SET manager_id = %s WHERE id = %s", (emp_ids[mgr_idx], emp_ids[emp_idx]))

        # Performance Reviews
        reviews = [
            (3, 1, "2025-H1", 4.2, True, "low"), (3, 1, "2024-H2", 3.8, False, "low"),
            (4, 1, "2025-H1", 3.5, False, "medium"), (5, 2, "2025-H1", 4.5, True, "low"),
            (6, 0, "2025-H1", 2.8, False, "high"), (7, 2, "2025-H1", 3.9, False, "low"),
            (1, 0, "2025-H1", 4.0, True, "low"), (2, 0, "2025-H1", 4.3, True, "low"),
        ]
        for emp_i, rev_i, period, rating, promo, risk in reviews:
            cur.execute(
                "INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, overall_rating, "
                "strengths, areas_for_improvement, goals_met, comments, status, promotion_ready, attrition_risk) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'approved', %s, %s)",
                (emp_ids[emp_i], emp_ids[rev_i], period, rating,
                 "Strong technical skills, good team player", "Communication, time management",
                 "Delivered project milestones on time", "Solid contributor this period",
                 promo, risk),
            )

        # Competencies
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
        comp_ids = []
        for name, cat, desc in comp_data:
            cur.execute(
                "INSERT INTO competencies (name, category, description) VALUES (%s, %s, %s) RETURNING id",
                (name, cat, desc),
            )
            comp_ids.append(cur.fetchone()[0])

        # Employee Competencies
        ec_data = [
            (3, 0, 4, 5), (3, 1, 3, 5), (3, 2, 3, 4), (4, 0, 3, 4), (4, 1, 4, 5),
            (5, 4, 4, 5), (5, 5, 2, 4), (6, 6, 3, 5), (7, 7, 4, 5), (7, 4, 2, 4),
        ]
        for emp_i, comp_i, curr, tgt in ec_data:
            cur.execute(
                "INSERT INTO employee_competencies (employee_id, competency_id, current_level, target_level, assessed_date) "
                "VALUES (%s, %s, %s, %s, %s)",
                (emp_ids[emp_i], comp_ids[comp_i], curr, tgt, date(2025, 3, 1)),
            )

        # Development Plans
        plans = [
            (3, "Master System Design", "Complete system design course", "technical", "in_progress", 60),
            (4, "Learn React Advanced Patterns", "Deep dive into React", "skill", "not_started", 0),
            (5, "Project Management Cert", "PMP certification", "career", "in_progress", 30),
            (6, "Data Viz with Python", "Matplotlib & Seaborn mastery", "skill", "completed", 100),
            (7, "Communication Workshop", "Public speaking course", "skill", "in_progress", 45),
        ]
        for emp_i, title, desc, gtype, status, pct in plans:
            cur.execute(
                "INSERT INTO development_plans (employee_id, title, description, goal_type, target_date, status, progress_pct) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (emp_ids[emp_i], title, desc, gtype, date(2025, 12, 31), status, pct),
            )

        # Training Records
        trainings = [
            (3, "AWS Solutions Architect", "AWS", "certification", "completed", 92.0),
            (3, "Python Advanced Patterns", "Udemy", "course", "completed", 88.0),
            (4, "React Masterclass", "Frontend Masters", "course", "in_progress", None),
            (5, "Digital Marketing Strategy", "Coursera", "course", "completed", 95.0),
            (6, "Financial Modeling", "Wall Street Prep", "certification", "enrolled", None),
            (7, "Figma Advanced", "Design Lab", "workshop", "completed", 90.0),
            (1, "Engineering Leadership", "Rands", "mentoring", "in_progress", None),
        ]
        for emp_i, name, provider, ttype, status, score in trainings:
            end = date(2025, 6, 30) if status == "completed" else None
            cur.execute(
                "INSERT INTO training_records (employee_id, training_name, provider, training_type, start_date, end_date, status, score) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (emp_ids[emp_i], name, provider, ttype, date(2025, 1, 10), end, status, score),
            )

        cur.close()
        conn.close()
        logger.info("Database seeded successfully!")

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "message": "Database seeded successfully!",
                "accounts": [
                    {"role": "Admin", "email": "admin@acme.com", "password": "admin123"},
                    {"role": "Manager", "email": "mgr1@acme.com", "password": "mgr123"},
                    {"role": "Employee", "email": "emp1@acme.com", "password": "emp123"},
                ],
            }),
        }

    except Exception as e:
        logger.error("Seed error: %s", str(e), exc_info=True)
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Failed to seed database", "message": str(e)}),
        }


if __name__ == "__main__":
    print(handler())
