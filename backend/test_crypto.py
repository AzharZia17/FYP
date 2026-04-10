try:
    from app.core import security
    hash_test = security.get_password_hash("password123")
    print("HASH SUCCESS:", hash_test)
except Exception as e:
    import traceback
    print("HASH ERROR:")
    traceback.print_exc()
