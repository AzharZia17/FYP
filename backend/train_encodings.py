import os
import sys
import time
import face_recognition
import numpy as np
import pickle
from PIL import Image

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.student import Student
from app.models.face_encoding import FaceEncoding

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "encodings_cache.pkl")

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            print(f"[WARNING] Failed to load cache: {e}. Starting fresh.")
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "wb") as f:
            pickle.dump(cache, f)
    except Exception as e:
        print(f"[ERROR] Failed to save cache: {e}")

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

    print("--- Start Deep Learning Encoding Compiler (Incremental Database Sync) ---")
    start_time = time.time()
    
    cache = load_cache()
    print(f"[INFO] Loaded cache with {len(cache)} existing encodings.")
    
    total_folders = 0
    total_images_processed = 0
    total_faces_encoded = 0 # Track total across all students

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

            # We no longer delete all encodings. Instead, we sync incrementally.
            # Get existing image names from DB to ensure we don't duplicate
            db_existing_images = [e.image_name for e in db.query(FaceEncoding.image_name).filter(FaceEncoding.student_id == student.id).all()]
            
            print(f"\nTraining Model for: {student.name} (ID: {student.id}) | Total Images in Folder: {len(images)}")
            
            faces_encoded = 0 # Reset counter for this specific student
            
            for index, filename in enumerate(images):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    img_path = os.path.join(student_folder, filename)
                    total_images_processed += 1
                    
                    # Use a unique key for the cache: (student_id, filename)
                    cache_key = f"{student.id}/{filename}"
                    
                    # 1. Check if already in DB (to avoid duplicates if cache is lost)
                    if filename in db_existing_images:
                        # If not in cache but in DB, populate cache
                        if cache_key not in cache:
                            # We'd need the vector from DB to fully populate cache, but for now we skip
                            pass
                        continue

                    # 2. Check if in cache (to skip processing)
                    if cache_key in cache:
                        encoding_vectors = cache[cache_key]
                        print(f"  [CACHE HIT] Using cached vector for {filename}")
                    else:
                        try:
                            # Load image using PIL to absolutely guarantee 8-bit RGB mode for dlib compatibility
                            pil_img = Image.open(img_path).convert('RGB')
                            image = np.array(pil_img, dtype=np.uint8)
                            
                            # Generate the 128-d encodings for faces detected in the image
                            # Using num_jitters=10 for much higher accuracy during training/registration
                            encodings = face_recognition.face_encodings(image, num_jitters=10)
                            
                            if len(encodings) > 0:
                                encoding_vectors = [enc.tolist() for enc in encodings]
                                cache[cache_key] = encoding_vectors # Save to cache
                            else:
                                if index % 10 == 0:
                                    print(f"  [Notice] No face detected in {filename} (skipped)", flush=True)
                                continue
                        except Exception as e:
                            print(f"Failed to process {filename}: {e}")
                            continue

                    # 3. Save to Database (if we reached here, it's new to DB)
                    for i, vector in enumerate(encoding_vectors):
                        try:
                            # Add to database with image_name for future tracking
                            db_encoding = FaceEncoding(
                                student_id=student.id, 
                                encoding=vector,
                                image_name=filename # Link to the file
                            )
                            db.add(db_encoding)
                            faces_encoded += 1
                            total_faces_encoded += 1
                            
                            if faces_encoded % 10 == 0:
                                db.commit()
                                print(f"  [INFO] Progress: {index+1}/{len(images)} images | Partial Save: {faces_encoded} total faces so far...", flush=True)
                            else:
                                db.flush()
                        except Exception as db_err:
                            db.rollback()
                            print(f"  [ERROR] DB save failed for {filename}: {db_err}")
            
            try:
                db.commit() # Final commit for the student
                # Verify insert with SELECT COUNT(*)
                verify_count = db.query(FaceEncoding).filter(FaceEncoding.student_id == student.id).count()
                print(f"[SUCCESS] Finished '{student.name}'. Total Encodings in DB: {verify_count}.", flush=True)
            except Exception as e:
                print(f"[ERROR] Failed to finish commit for '{student.name}': {e}", flush=True)
                db.rollback()

    save_cache(cache)
    db.close()

    end_time = time.time()
    print(f"\n--- Encoding Compilation Summary ---")
    print(f"Total Profiles Formatted:  {total_folders}")
    print(f"Total Native Images Parsed:{total_images_processed}")
    print(f"Valid Face Vectors Saved:  {total_faces_encoded}")
    print(f"Elapsed Time Benchmark:    {round(end_time - start_time, 2)} seconds")

if __name__ == "__main__":
    compile_dataset()
