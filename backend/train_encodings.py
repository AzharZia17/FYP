import os
import sys
import pickle
import time
import face_recognition

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.student import Student
from app.models.face_encoding import FaceEncoding

def compile_dataset():
    """
    Scans the dataset directory, reads every valid student image, converts it into a 128-dimensional
    face_recognition vector, and stores them in the PostgreSQL database.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "dataset")

    if not os.path.exists(dataset_dir):
        print(f"Error: Dataset directory does not exist at {dataset_dir}")
        return

    print("--- Start Deep Learning Encoding Compiler (Database Encoding) ---")
    start_time = time.time()
    
    total_folders = 0
    total_images_processed = 0
    faces_encoded = 0

    db = SessionLocal()

    # Iterate through all Folders inherently mapped to Student IDs
    for folder_name in os.listdir(dataset_dir):
        student_folder = os.path.join(dataset_dir, folder_name)
        
        # Make sure it's a directory
        if os.path.isdir(student_folder):
            total_folders += 1
            images = [f for f in os.listdir(student_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            
            # Try to interpret folder name as Student ID
            try:
                student_id = int(folder_name)
                student = db.query(Student).filter(Student.id == student_id).first()
            except ValueError:
                # Fallback: find by name if folder is still named after the student
                student = db.query(Student).filter(Student.name == folder_name).first()

            if not student:
                print(f"[ERROR] Student record not found for folder '{folder_name}'. Skipping.")
                continue

            # Check if student already has encodings to avoid redundant work
            existing_encodings_count = db.query(FaceEncoding).filter(FaceEncoding.student_id == student.id).count()
            if existing_encodings_count > 0:
                print(f"[SKIP] Student {student.name} already has {existing_encodings_count} encodings. Skipping.")
                continue

            print(f"\nTraining Model for: {student.name} (ID: {student.id}) | Images: {len(images)}")
            
            for index, filename in enumerate(images):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    img_path = os.path.join(student_folder, filename)
                    total_images_processed += 1
                    
                    try:
                        # Load image using face_recognition
                        image = face_recognition.load_image_file(img_path)
                        
                        # Generate the 128-d encodings for faces detected in the image
                        encodings = face_recognition.face_encodings(image)
                        
                        if len(encodings) > 0:
                            # We append the strongest face found
                            encoding_vector = encodings[0].tolist()
                            
                            db_encoding = FaceEncoding(student_id=student.id, encoding=encoding_vector)
                            db.add(db_encoding)
                            faces_encoded += 1
                        else:
                            print(f"[Warning] No face strictly detected by dlib in {filename}")

                    except Exception as e:
                        print(f"Failed to process {filename}: {e}")
            
            try:
                db.commit()
                print(f"Committed {len(images)} associated face encodings to the DB.")
            except Exception as e:
                print(f"Failed to commit encodings for '{student.name}': {e}")
                db.rollback()

    db.close()

    end_time = time.time()
    print(f"\n--- Encoding Compilation Summary ---")
    print(f"Total Profiles Formatted:  {total_folders}")
    print(f"Total Native Images Parsed:{total_images_processed}")
    print(f"Valid Face Vectors Recorded:{faces_encoded}")
    print(f"Elapsed Time Benchmark:    {round(end_time - start_time, 2)} seconds")

if __name__ == "__main__":
    compile_dataset()
