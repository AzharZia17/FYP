from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import base64
import numpy as np
import cv2
import face_recognition
import time
from typing import List, Dict, Any, Optional
from datetime import date
from collections import defaultdict

from app.database.database import get_db, SessionLocal
from app.models.student import Student
from app.models.face_encoding import FaceEncoding
from app.models.attendance import Attendance

router = APIRouter(
    prefix="/api/recognition",
    tags=["Recognition"]
)

class SessionMarkedStudents:
    def __init__(self):
        self.marked_today = set()
        self.current_date = date.today()

    def check_refresh(self):
        if date.today() != self.current_date:
            self.marked_today = set()
            self.current_date = date.today()

    def add(self, student_id: int):
        self.check_refresh()
        self.marked_today.add(student_id)

    def is_marked(self, student_id: int, db: Session) -> bool:
        self.check_refresh()
        if student_id in self.marked_today:
            return True
        
        exists = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.date == self.current_date
        ).first() is not None
        
        if exists:
            self.marked_today.add(student_id)
        return exists

marked_cache = SessionMarkedStudents()

class EncodingsCache:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.loaded = False

    def refresh(self):
        db = SessionLocal()
        try:
            records = db.query(FaceEncoding).all()
            
            # Limit encodings per user to 5 to optimize distance calculations
            user_encodings = defaultdict(list)
            for r in records:
                if len(user_encodings[r.student.id]) < 5:
                    user_encodings[r.student.id].append(r)
            
            self.known_face_encodings = []
            self.known_face_names = []
            self.known_face_ids = []
            
            for student_id, encs in user_encodings.items():
                for r in encs:
                    self.known_face_encodings.append(np.array(r.encoding))
                    self.known_face_names.append(r.student.name)
                    self.known_face_ids.append(student_id)
            
            self.loaded = True
        finally:
            db.close()

    def get_data(self):
        if not self.loaded:
            self.refresh()
        return self.known_face_encodings, self.known_face_names, self.known_face_ids

cache = EncodingsCache()

recognition_cooldowns = {}
COOLDOWN_SECONDS = 3

@router.post("/identify")
async def identify_face(
    image_data: str = Body(..., embed=True), 
    db: Session = Depends(get_db)
):
    global recognition_cooldowns

    try:
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Process every frame that the client sends. The client manages its own FPS/setInterval.
        # Resize frames for performance but keep resolution high enough for multiple small faces
        small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # Uses HOG which is a fast face detection model
        # For even higher accuracy, users should ensure training images are diverse
        face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        known_encs, known_names, known_ids = cache.get_data()
        
        results = []
        for face_encoding, face_location in zip(face_encodings, face_locations):
            name = "Unknown"
            confidence = 0.0
            student_id = None
            status_text = "Unknown Face"
            color = "#ef4444" 
            
            if known_encs:
                # 1. Get distances to all known encodings
                face_distances = face_recognition.face_distance(known_encs, face_encoding)
                
                # 2. Find best match
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    best_dist = face_distances[best_match_index]
                    
                    # 3. Dynamic Thresholding (0.5 is a good balance for accuracy vs recall)
                    # Anything below 0.4 is a VERY strong match, above 0.6 is weak.
                    THRESHOLD = 0.5 
                    
                    if best_dist < THRESHOLD:
                        student_id = int(known_ids[best_match_index])
                        name = known_names[best_match_index]
                        
                        # Convert distance to human-friendly confidence percentage
                        # Linear mapping from [0, THRESHOLD] to [100, 60] roughly
                        confidence = round(max(0, (1.0 - best_dist) * 100), 1)
                        
                        # 4. Final Status Determination
                        if confidence < 60.0:
                            status_text = "Low Confidence"
                            color = "#f59e0b" 
                        else:
                            # Use mark_cache to check if marked today
                            # This is a critical stable check
                            if marked_cache.is_marked(student_id, db):
                                status_text = "Already Marked"
                                color = "#10b981" 
                            else:
                                status_text = "Attendance Marked"
                                color = "#3b82f6" # Use blue for "About to mark" or "Potential match"
                    else:
                        name = "Unknown"
                        status_text = "Unknown Face"
                        color = "#ef4444"

            # Scale locations back up by multiplier 2 (since fx=0.5)
            top, right, bottom, left = [coord * 2 for coord in face_location]
            
            results.append({
                "name": name,
                "confidence": confidence,
                "student_id": student_id,
                "status": status_text,
                "color": color,
                "box": {"top": top, "right": right, "bottom": bottom, "left": left}
            })

        return {"faces": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
