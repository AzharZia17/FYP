import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from backend.app.database.database import SQLALCHEMY_DATABASE_URL

def check_db():
    try:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("--- Checking Database State ---")
        
        # Check students
        students = db.execute(text("SELECT id, name, roll_number FROM students")).fetchall()
        print(f"Students in DB: {len(students)}")
        for s in students:
            print(f"  ID: {s.id}, Name: {s.name}, Roll: {s.roll_number}")
            
        # Check face encodings
        encodings = db.execute(text("SELECT id, student_id FROM face_encodings")).fetchall()
        print(f"\nFace Encodings in DB: {len(encodings)}")
        
        # Check for specific students mentioned in dataset
        dataset_folders = ["23", "Azhar Zia"]
        for folder in dataset_folders:
            print(f"\nChecking folder: {folder}")
            if folder.isdigit():
                s = db.execute(text("SELECT id, name FROM students WHERE id = :id"), {"id": int(folder)}).fetchone()
            else:
                s = db.execute(text("SELECT id, name FROM students WHERE name = :name"), {"name": folder}).fetchone()
            
            if s:
                print(f"  Found Student: {s.name} (ID: {s.id})")
                enc_count = db.execute(text("SELECT COUNT(*) FROM face_encodings WHERE student_id = :id"), {"id": s.id}).scalar()
                print(f"  Encodings count for this student: {enc_count}")
            else:
                print(f"  Student NOT found in DB search by folder name.")

        db.close()
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_db()
