import requests
import json

try:
    res = requests.post('http://127.0.0.1:8000/api/auth/signup', json={
        "name": "Test Admin",
        "email": "test@test.com",
        "password": "password",
        "role": "admin"
    })
    print("STATUS CODE:", res.status_code)
    try:
        print("RESPONSE JSON:")
        print(json.dumps(res.json(), indent=2))
    except Exception:
        print("RESPONSE TEXT:", res.text)
except Exception as e:
    print(e)
