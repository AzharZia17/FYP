import cv2
import os
import sys
import time
import requests
import logging
import numpy as np
import face_recognition
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from datetime import datetime, date

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.student import Student
from app.models.face_encoding import FaceEncoding
from app.models.log import Log
from app.models.attendance import Attendance

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

# Setup professional logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/engine.log")
    ]
)
logger = logging.getLogger("RecognitionEngine")

# Configure Requests Session with Retry Logic
session = requests.Session()
retries = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[502, 503, 504],
    allowed_methods=["POST"]
)
session.mount("http://", HTTPAdapter(max_retries=retries))
session.mount("https://", HTTPAdapter(max_retries=retries))

def load_encodings():
    """
    Load all registered face encodings from the PostgreSQL database.
    Returns:
        known_face_encodings: List of face encodings.
        known_face_names: List of corresponding student names.
        known_face_ids: List of corresponding student IDs.
    """
    logger.info("Loading encodings from database...")
    db = SessionLocal()
    try:
        # We join FaceEncoding with Student to easily get the student's name
        records = db.query(FaceEncoding).join(Student).all()
        
        known_face_encodings = []
        known_face_names = []
        known_face_ids = []
        
        for record in records:
            # Convert DB JSON list back to numpy array
            encoding_array = np.array(record.encoding)
            known_face_encodings.append(encoding_array)
            known_face_names.append(record.student.name)
            known_face_ids.append(record.student.id)
            
        logger.info(f"Loaded {len(known_face_encodings)} face encodings.")
        return known_face_encodings, known_face_names, known_face_ids
    finally:
        db.close()

def main():
    known_face_encodings, known_face_names, known_face_ids = load_encodings()

    if not known_face_encodings:
        logger.warning("No encodings found in the database. Everyone will be Unknown.")

    # Get a reference to webcam #0 (the default one)
    video_capture = cv2.VideoCapture(0)

    if not video_capture.isOpened():
        logger.error("Could not open the webcam.")
        return

    # Prepare Unknown Faces directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    unknown_faces_dir = os.path.join(base_dir, "unknown_faces")
    os.makedirs(unknown_faces_dir, exist_ok=True)
    
    # DB Session for logging
    db = SessionLocal()
    
    # Engine configuration
    process_this_frame = True
    face_locations = []
    face_names = []
    face_confidences = []
    face_matched_ids = []
    
    # Cooldown Logic: {student_id: last_marked_timestamp}
    last_marked_time = {}
    MARK_COOLDOWN = 300  # 5 minutes in seconds

    last_unknown_log_time = 0
    UNKNOWN_LOG_COOLDOWN = 5.0  # seconds

    logger.info("Starting Live Recognition Engine! Press 'q' to quit.")

    try:
        while True:
            # Grab a single frame of video
            ret, frame = video_capture.read()
            if not ret:
                logger.error("Failed to capture frame from video source.")
                break

            # Current timestamp for cooldown checks
            current_loop_time = time.time()

            # Only process every other frame of video to save time
            if process_this_frame:
                # Resize frame of video to 1/5 size (0.2) for aggressive performance
                small_frame = cv2.resize(frame, (0, 0), fx=0.2, fy=0.2)
                # Convert from BGR (OpenCV) to RGB (face_recognition)
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                
                # Detect face locations using HOG model (faster for CPUs)
                face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
                face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

                face_names = []
                face_confidences = []
                face_matched_ids = []

                # Confidence threshold
                confidence_threshold = 60.0

                for face_encoding in face_encodings:
                    name = "Unknown"
                    confidence = 0.0
                    matched_id = None

                    if len(known_face_encodings) > 0:
                        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                        best_match_index = np.argmin(face_distances)
                        best_distance = face_distances[best_match_index]
                        
                        # Convert distance to a similarity percentage
                        similarity = max(0.0, (1.0 - best_distance)) * 100.0
                        
                        if similarity >= confidence_threshold:
                            name = known_face_names[best_match_index]
                            confidence = similarity
                            matched_id = known_face_ids[best_match_index]

                    face_names.append(name)
                    face_confidences.append(confidence)
                    face_matched_ids.append(matched_id)

            # Toggle process state
            process_this_frame = not process_this_frame

            # Display the results
            batch_to_mark = []
            
            for (top, right, bottom, left), name, confidence, matched_id in zip(face_locations, face_names, face_confidences, face_matched_ids):
                # Scale back up (1 / 0.2 = 5)
                top *= 5
                right *= 5
                bottom *= 5
                left *= 5

                # Draw a box around the face
                color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom + 5), color, cv2.FILLED)
                
                # Format text: Name (XX.X%) OR Unknown
                label = f"{name} ({confidence:.1f}%)" if name != "Unknown" else "Unknown"
                cv2.putText(frame, label, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.7, (255, 255, 255), 1)

                # 5. Collect Identifications for Batching
                if name != "Unknown" and matched_id is not None:
                    # Check local cooldown
                    last_time = last_marked_time.get(matched_id, 0)
                    if current_loop_time - last_time > MARK_COOLDOWN:
                        batch_to_mark.append({
                            "student_id": matched_id,
                            "confidence": round(float(confidence) / 100.0, 2),
                            "name": name # Extra for logging
                        })

                # 6. Unknown Face Logging
                elif name == "Unknown":
                    if current_loop_time - last_unknown_log_time > UNKNOWN_LOG_COOLDOWN:
                        last_unknown_log_time = current_loop_time
                        face_crop = frame[max(0, top):min(frame.shape[0], bottom), max(0, left):min(frame.shape[1], right)]
                        if face_crop.size > 0:
                            filename = f"unknown_{int(current_loop_time)}.jpg"
                            cv2.imwrite(os.path.join(unknown_faces_dir, filename), face_crop)
                            try:
                                new_log = Log(event_type="warning", message=f"Unknown face detected. Saved as {filename}.")
                                db.add(new_log)
                                db.commit()
                                logger.warning(f"Unknown face captured and logged: {filename}")
                            except Exception as e:
                                logger.error(f"Failed to log unknown face to DB: {e}")
                                db.rollback()

            # 7. Execute Batch Marking if needed (After processing all faces in frame)
            if batch_to_mark:
                try:
                    BATCH_API_URL = "http://127.0.0.1:8000/api/attendance/mark-batch"
                    payload = {"records": [{"student_id": b["student_id"], "confidence": b["confidence"]} for b in batch_to_mark]}
                    response = session.post(BATCH_API_URL, json=payload, timeout=5)
                    
                    if response.status_code == 200:
                        data = response.json()
                        for result in data.get("results", []):
                            if result["status"] == "success":
                                sid = result["student_id"]
                                last_marked_time[sid] = current_loop_time
                                logger.info(f"[BATCH SUCCESS] Recorded ID: {sid}")
                    else:
                        logger.error(f"[BATCH ERROR] API returned {response.status_code}")
                except Exception as e:
                    logger.error(f"[NETWORK ERROR] Failed to send batch: {e}")

            # Show the resulting image
            cv2.imshow('Smart Attendance - Real-time Recognition', frame)

            # Hit 'q' on the keyboard to quit!
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        logger.info("Interrupt received, shutting down...")
    except Exception as e:
        logger.error(f"Critical Engine Failure: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        # Release resources
        video_capture.release()
        cv2.destroyAllWindows()
        db.close()
        logger.info("Resources released. Engine halted.")

if __name__ == "__main__":
    main()
