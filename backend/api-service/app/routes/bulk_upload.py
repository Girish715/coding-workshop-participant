"""Bulk employee import via CSV or Excel files (admin/HR only)."""

from __future__ import annotations

import csv
import io
from datetime import date

from flask import Blueprint, request, jsonify, g
from app import db
from app.models import User, Employee
from app.rbac import roles_required
from app.cache import invalidate
from app.notifications import notify_bulk_import

bulk_upload_bp = Blueprint("bulk_upload", __name__)

REQUIRED_COLUMNS = {"email", "first_name", "last_name", "employee_code"}
OPTIONAL_COLUMNS = {"department", "designation", "hire_date", "manager_code", "status", "role"}
ALL_COLUMNS = REQUIRED_COLUMNS | OPTIONAL_COLUMNS
DEFAULT_PASSWORD = "ChangeMe123!"
VALID_ROLES = {"admin", "hr", "manager", "employee"}
VALID_STATUSES = {"active", "inactive", "on_leave"}


def _safe_str(value: object) -> str:
    """Convert any scalar value to a normalized trimmed string."""

    if value is None:
        return ""
    return str(value).strip()


def _default_designation(role: str, raw_designation: str) -> str:
    """Return designation fallback based on role when field is empty."""

    if raw_designation:
        return raw_designation
    if role == "manager":
        return "Manager"
    if role == "hr":
        return "HR Business Partner"
    if role == "admin":
        return "Administrator"
    return "Associate"


def _parse_hire_date(value: str, row_index: int, row_errors: list[str]) -> str:
    """Validate hire date format and return normalized value."""

    hire_date = _safe_str(value) or "2025-01-01"
    try:
        date.fromisoformat(hire_date)
    except ValueError:
        row_errors.append(f"invalid hire_date '{hire_date}' in row {row_index}; expected YYYY-MM-DD")
    return hire_date


def _parse_csv(stream):
    """Parse a CSV file stream and return a list of row dicts."""
    text = stream.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return [row for row in reader]


def _parse_excel(stream):
    """Parse an Excel file stream and return a list of row dicts."""
    import openpyxl

    wb = openpyxl.load_workbook(stream, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    headers = [str(h).strip().lower().replace(" ", "_") if h else "" for h in rows[0]]
    result = []
    for row in rows[1:]:
        if all(cell is None for cell in row):
            continue
        row_dict = {}
        for i, header in enumerate(headers):
            if header and i < len(row):
                val = row[i]
                row_dict[header] = str(val).strip() if val is not None else ""
        result.append(row_dict)
    return result


@bulk_upload_bp.route("/preview", methods=["POST"])
@roles_required("admin", "hr")
def preview_upload():
    """Parse and validate an uploaded file without committing to the database."""

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            rows = _parse_csv(file.stream)
        elif filename.endswith((".xlsx", ".xls")):
            rows = _parse_excel(file.stream)
        else:
            return jsonify({"error": "Unsupported file type. Use CSV or Excel (.xlsx)."}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400

    if not rows:
        return jsonify({"error": "File contains no data rows."}), 400

    headers = set(rows[0].keys())
    missing = REQUIRED_COLUMNS - headers
    if missing:
        return jsonify({"error": f"Missing required columns: {', '.join(sorted(missing))}"}), 400

    unsupported = headers - ALL_COLUMNS
    if unsupported:
        return jsonify({"error": f"Unsupported columns found: {', '.join(sorted(unsupported))}"}), 400

    validated = []
    errors = []
    existing_emails = {u.email for u in User.query.with_entities(User.email).all()}
    existing_codes = {e.employee_code for e in Employee.query.with_entities(Employee.employee_code).all()}
    seen_emails = set()
    seen_codes = set()

    for i, row in enumerate(rows, start=2):
        row_errors = []
        email = _safe_str(row.get("email")).lower()
        code = _safe_str(row.get("employee_code"))
        first_name = _safe_str(row.get("first_name"))
        last_name = _safe_str(row.get("last_name"))

        if not email:
            row_errors.append("email is required")
        elif email in existing_emails or email in seen_emails:
            row_errors.append(f"email '{email}' already exists or is duplicated")
        if not code:
            row_errors.append("employee_code is required")
        elif code in existing_codes or code in seen_codes:
            row_errors.append(f"employee_code '{code}' already exists or is duplicated")
        if not first_name:
            row_errors.append("first_name is required")
        if not last_name:
            row_errors.append("last_name is required")

        role = _safe_str(row.get("role") or "employee").lower() or "employee"
        if role not in VALID_ROLES:
            row_errors.append(f"invalid role '{role}'")

        status = _safe_str(row.get("status") or "active").lower() or "active"
        if status not in VALID_STATUSES:
            row_errors.append(f"invalid status '{status}'")

        hire_date = _parse_hire_date(row.get("hire_date"), i, row_errors)
        manager_code = _safe_str(row.get("manager_code"))
        designation = _default_designation(role, _safe_str(row.get("designation")))

        entry = {
            "row": i,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "employee_code": code,
            "department": _safe_str(row.get("department")) or "General",
            "designation": designation,
            "hire_date": hire_date,
            "manager_code": manager_code,
            "status": status,
            "role": role,
            "errors": row_errors,
        }

        if row_errors:
            errors.append(entry)
        else:
            validated.append(entry)
            seen_emails.add(email)
            seen_codes.add(code)

    return jsonify({
        "total": len(rows),
        "valid": len(validated),
        "invalid": len(errors),
        "rows": validated + errors,
    })


@bulk_upload_bp.route("/confirm", methods=["POST"])
@roles_required("admin", "hr")
def confirm_upload():
    """Create employee records from previously validated bulk upload data."""

    data = request.get_json()
    if not data or "rows" not in data:
        return jsonify({"error": "No rows provided"}), 400

    rows = data["rows"]
    if not rows:
        return jsonify({"error": "No rows to import"}), 400

    if g.current_user.role == "hr":
        for row in rows:
            if row.get("role") == "admin":
                return jsonify({"error": "HR cannot create admin users"}), 403

    manager_code_map = {emp.employee_code: emp.id for emp in Employee.query.all()}
    existing_emails = {u.email for u in User.query.with_entities(User.email).all()}
    existing_codes = {e.employee_code for e in Employee.query.with_entities(Employee.employee_code).all()}
    seen_emails = set()
    seen_codes = set()

    created = []
    errors = []
    for row in rows:
        if row.get("errors"):
            errors.append(row)
            continue

        row_email = (row.get("email") or "").strip().lower()
        row_code = (row.get("employee_code") or "").strip()
        row_role = (row.get("role") or "employee").strip().lower() or "employee"
        row_status = (row.get("status") or "active").strip().lower() or "active"
        row_hire_date = (row.get("hire_date") or "2025-01-01").strip() or "2025-01-01"
        row_first_name = (row.get("first_name") or "").strip()
        row_last_name = (row.get("last_name") or "").strip()
        row_department = (row.get("department") or "General").strip() or "General"
        row_designation = _default_designation(row_role, (row.get("designation") or "").strip())
        row_manager_code = (row.get("manager_code") or "").strip()

        row_errors = []
        if row_role not in VALID_ROLES:
            row_errors.append(f"invalid role '{row_role}'")
        if row_status not in VALID_STATUSES:
            row_errors.append(f"invalid status '{row_status}'")
        if row_email in existing_emails or row_email in seen_emails:
            row_errors.append(f"email '{row_email}' already exists or is duplicated")
        if row_code in existing_codes or row_code in seen_codes:
            row_errors.append(f"employee_code '{row_code}' already exists or is duplicated")
        try:
            parsed_hire_date = date.fromisoformat(row_hire_date)
        except ValueError:
            parsed_hire_date = None
            row_errors.append(f"invalid hire_date '{row_hire_date}'; expected YYYY-MM-DD")

        manager_id = None
        if row_role != "manager" and row_manager_code:
            manager_id = manager_code_map.get(row_manager_code)
            if manager_id is None:
                row_errors.append(f"manager_code '{row_manager_code}' not found")

        if row_errors:
            errors.append({**row, "errors": row_errors})
            continue

        try:
            with db.session.begin_nested():
                user = User(email=row_email, role=row_role)
                user.set_password(DEFAULT_PASSWORD)
                db.session.add(user)
                db.session.flush()

                emp = Employee(
                    user_id=user.id,
                    first_name=row_first_name,
                    last_name=row_last_name,
                    employee_code=row_code,
                    department=row_department,
                    designation=row_designation,
                    hire_date=parsed_hire_date,
                    manager_id=manager_id,
                    status=row_status,
                )
                db.session.add(emp)
                db.session.flush()

                manager_code_map[emp.employee_code] = emp.id

            seen_emails.add(row_email)
            seen_codes.add(row_code)
            created.append({
                "email": row_email,
                "employee_code": row_code,
                "full_name": f"{row_first_name} {row_last_name}",
            })
        except Exception as e:
            errors.append({**row, "errors": [str(e)]})

    if created:
        db.session.commit()
        invalidate("employees", "dashboard")
        notify_bulk_import(len(created), g.current_user.id)
        db.session.commit()

    return jsonify({
        "created": len(created),
        "failed": len(errors),
        "employees": created,
        "errors": errors,
    }), 201 if created else 400
