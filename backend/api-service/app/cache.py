"""Lightweight server-side TTL cache for read-heavy API endpoints.

Caches are keyed by (endpoint, user_id, query_string) so each user sees
their own scoped data.  Any write operation should call the relevant
``invalidate_*`` helper to bust stale entries.
"""

import threading
from functools import wraps

from cachetools import TTLCache
from flask import g, request, jsonify

_lock = threading.Lock()

# Separate caches per domain so invalidation is surgical.
_employees_cache: TTLCache = TTLCache(maxsize=256, ttl=60)
_reviews_cache: TTLCache = TTLCache(maxsize=256, ttl=60)
_dev_plans_cache: TTLCache = TTLCache(maxsize=256, ttl=60)
_competencies_cache: TTLCache = TTLCache(maxsize=256, ttl=60)
_training_cache: TTLCache = TTLCache(maxsize=256, ttl=60)
_dashboard_cache: TTLCache = TTLCache(maxsize=256, ttl=30)
_notifications_cache: TTLCache = TTLCache(maxsize=256, ttl=15)

DOMAIN_CACHES = {
    "employees": _employees_cache,
    "reviews": _reviews_cache,
    "dev_plans": _dev_plans_cache,
    "competencies": _competencies_cache,
    "training": _training_cache,
    "dashboard": _dashboard_cache,
    "notifications": _notifications_cache,
}


def _cache_key() -> str:
    user_id = getattr(g, "current_user", None)
    uid = user_id.id if user_id else "anon"
    return f"{request.endpoint}:{uid}:{request.query_string.decode()}"


def cached(domain: str):
    """Decorator that caches the JSON response of a GET endpoint."""

    cache = DOMAIN_CACHES[domain]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = _cache_key()
            with _lock:
                hit = cache.get(key)
            if hit is not None:
                return hit

            result = fn(*args, **kwargs)
            with _lock:
                cache[key] = result
            return result

        return wrapper

    return decorator


def invalidate(*domains: str):
    """Clear one or more domain caches entirely."""

    with _lock:
        for domain in domains:
            cache = DOMAIN_CACHES.get(domain)
            if cache is not None:
                cache.clear()
