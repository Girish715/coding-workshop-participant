import os
from dotenv import load_dotenv

load_dotenv()

# Build PostgreSQL connection string from Terraform-injected env vars
_pg_host = os.getenv("POSTGRES_HOST", "localhost")
_pg_port = os.getenv("POSTGRES_PORT", "5432")
_pg_user = os.getenv("POSTGRES_USER", "postgres")
_pg_pass = os.getenv("POSTGRES_PASS", "postgres")
_pg_name = os.getenv("POSTGRES_NAME", "employee_perf_db")


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"postgresql://{_pg_user}:{_pg_pass}@{_pg_host}:{_pg_port}/{_pg_name}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
