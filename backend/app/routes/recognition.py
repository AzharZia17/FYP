from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import base64
import numpy as np
import cv2
import face_recognition
import time
from typing import List, Dict, Any, Optional
from datetime import date

from app.database.database import get_db, SessionLocal
from app.models.student import Student
from app.models.face_encoding import FaceEncoding
# from app.routes.attendance import mark_attendance, AttendanceMarkRequest

router = APIRouter(
    prefix="/api/recognition",
    tags=["Recognition"]
)

# Global cache for encodings to avoid DB hit every 1s
class EncodingsCache:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.last_updated = 0
        self.TTL = 60  # Cache for 60 seconds

    def refresh(self):
        db = SessionLocal()
        try:
            # Only pull student IDs that have encodings to keep the join tight
            records = db.query(FaceEncoding).options(
                # Ensure the student relation is joined efficiently
            ).all()
            
            self.known_face_encodings = [np.array(r.encoding) for r in records]
            self.known_face_names = [r.student.name for r in records]
            self.known_face_ids = [r.student.id for r in records]
            self.last_updated = time.time()
            print(f"[CACHE] Refreshed {len(self.known_face_encodings)} face encodings.")
        finally:
            db.close()

    def get_data(self):
        if time.time() - self.last_updated > self.TTL:
            self.refresh()
        return self.known_face_encodings, self.known_face_names, self.known_face_ids

cache = EncodingsCache()

@router.post("/identify")
async def identify_face(
    image_data: str = Body(..., embed=True), 
    db: Session = Depends(get_db)
):
    """
    Identifies a face from a base64 encoded image frame.
    """
    try:
        # 1. Decode base64 image
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
        image_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # 2. Process for recognition (Downscale for speed)
        small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # 3. Detect and Encode
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        known_encs, known_names, known_ids = cache.get_data()
        
        results = []
        for face_encoding, face_location in zip(face_encodings, face_locations):
            name = "Unknown"
            confidence = 0.0
            student_id = None
            
            if known_encs:
                face_distances = face_recognition.face_distance(known_encs, face_encoding)
                best_match_index = np.argmin(face_distances)
                
                if face_distances[best_match_index] <= 0.4: # Tolerance 0.4 (lower is stricter)
                    similarity = max(0.0, (1.0 - face_distances[best_match_index])) * 100.0
                    name = known_names[best_match_index]
                    confidence = similarity
                    student_id = known_ids[best_match_index]

            # Scale locations back up (we resized by 0.5)
            top, right, bottom, left = [coord * 2 for coord in face_location]
            
            results.append({
                "name": name,
                "confidence": round(confidence, 1),
                "student_id": student_id,
                "box": {"top": top, "right": right, "bottom": bottom, "left": left}
            })

            # 4. Trigger Attendance if matched (Removed: Frontend now handles this explicitly)
            # if student_id and confidence >= 60.0:
            #     ... logic moved to frontend ...
            pass

        return {"faces": results}

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
