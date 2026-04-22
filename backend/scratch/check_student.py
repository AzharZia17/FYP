import os
import sys
from sqlalchemy import create_engine, text

# Get DB URL from .env manually to be safe
def get_db_url():
    env_path = os.path.join("backend", ".env")
    config = {}
    with open(env_path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                config[key] = value
    
    return f"postgresql://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}@{config['POSTGRES_HOST']}:{config['POSTGRES_PORT']}/{config['POSTGRES_DB']}"

def check_student_23():
    try:
        url = get_db_url()
        engine = create_engine(url)
        with engine.connect() as conn:
            # Check student 23
            result = conn.execute(text("SELECT id, name FROM students WHERE id = 23")).fetchone()
            if result:
                print(f"Student 23 exists: {result.name}")
            else:
                print("Student 23 DOES NOT exist in the database.")
                
            # Check all students
            all_students = conn.execute(text("SELECT id, name FROM students")).fetchall()
            print(f"Total students in DB: {len(all_students)}")
            for s in all_students:
                print(f"  ID: {s.id}, Name: {s.name}")
                
            # Check encodings for 23
            enc_count = conn.execute(text("SELECT COUNT(*) FROM face_encodings WHERE student_id = 23")).scalar()
            print(f"Encodings for student 23: {enc_count}")
            
            # Check total encodings
            total_enc = conn.execute(text("SELECT COUNT(*) FROM face_encodings")).scalar()
            print(f"Total encodings in DB: {total_enc}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_student_23()
