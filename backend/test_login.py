import requests
import json

BASE_URL = 'http://127.0.0.1:8000/api'

def test_login():
    print("Testing Login...")
    res = requests.post(f'{BASE_URL}/auth/login', json={
        "email": "test@test.com",
        "password": "password"
    })
    print("STATUS CODE:", res.status_code)
    try:
        print("RESPONSE JSON:")
        print(json.dumps(res.json(), indent=2))
    except Exception:
        print("RESPONSE TEXT:", res.text)

if __name__ == "__main__":
    test_login()
