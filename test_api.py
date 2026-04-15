import time

import requests

BASE_URL = "http://127.0.0.1:8000/api"


def login(email: str, password: str) -> str | None:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    print(f"Login {email}: {response.status_code}")
    if response.status_code != 200:
        return None
    return response.json().get("token")


def register(headers: dict[str, str] | None, payload: dict[str, object]) -> requests.Response:
    return requests.post(f"{BASE_URL}/auth/register", json=payload, headers=headers or {}, timeout=10)


timestamp = int(time.time())
payload = {
    "email": f"smoke+{timestamp}@acme.com",
    "password": "P@ssw0rd!",
    "first_name": "Smoke",
    "last_name": "Test",
    "employee_code": f"SMK{timestamp}",
    "department": "Engineering",
    "designation": "Associate",
    "hire_date": "2026-01-01",
    "role": "employee",
}

admin_token = login("admin@acme.com", "admin123")
manager_token = login("mgr1@acme.com", "mgr123")
employee_token = login("emp1@acme.com", "emp123")

admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else None
manager_headers = {"Authorization": f"Bearer {manager_token}"} if manager_token else None
employee_headers = {"Authorization": f"Bearer {employee_token}"} if employee_token else None

anonymous_response = register(None, {**payload, "email": f"anon+{timestamp}@acme.com", "employee_code": f"AN{timestamp}"})
print("Register anonymous (expected 401/422):", anonymous_response.status_code)

if manager_headers:
    manager_response = register(
        manager_headers,
        {**payload, "email": f"mgr+{timestamp}@acme.com", "employee_code": f"MG{timestamp}"},
    )
    print("Register manager (expected 403):", manager_response.status_code)

if employee_headers:
    employee_response = register(
        employee_headers,
        {**payload, "email": f"emp+{timestamp}@acme.com", "employee_code": f"EM{timestamp}"},
    )
    print("Register employee (expected 403):", employee_response.status_code)

if admin_headers:
    admin_response = register(
        admin_headers,
        {**payload, "email": f"admin+{timestamp}@acme.com", "employee_code": f"AD{timestamp}"},
    )
    print("Register admin token (expected 201):", admin_response.status_code)
