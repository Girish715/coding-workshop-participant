"""Role-based access control helpers for API endpoints."""

from functools import wraps
from typing import Any, Callable

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models import User

VALID_ROLES = {"admin", "manager", "employee"}


def roles_required(*allowed_roles: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Require a valid JWT and restrict endpoint access to specific roles."""

    invalid_roles = set(allowed_roles) - VALID_ROLES
    if invalid_roles:
        raise ValueError(f"Unknown role(s) configured: {sorted(invalid_roles)}")

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            verify_jwt_in_request()
            identity = get_jwt_identity()
            try:
                user_id = int(identity)
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid token identity"}), 401

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if user.role not in allowed_roles:
                return jsonify({"error": "Access denied"}), 403

            g.current_user = user
            return func(*args, **kwargs)

        return wrapper

    return decorator