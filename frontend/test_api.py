import requests

res = requests.post('http://127.0.0.1:8000/api/auth/login', json={"email": "admin@acme.com", "password": "admin123"})
print("Login:", res.status_code)
if res.status_code == 200:
    token = res.json().get('access_token')
    headers = {"Authorization": f"Bearer {token}"}
    r1 = requests.get('http://127.0.0.1:8000/api/dashboard/stats', headers=headers)
    print("Stats:", r1.status_code, r1.text[:100])
    r2 = requests.get('http://127.0.0.1:8000/api/dashboard/performance-outcomes', headers=headers)
    print("Outcomes:", r2.status_code, r2.text[:100])
    r3 = requests.get('http://127.0.0.1:8000/api/dashboard/skill-distribution', headers=headers)
    print("Skills:", r3.status_code, r3.text[:100])
