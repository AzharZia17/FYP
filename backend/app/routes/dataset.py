from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Dict, Any
import os
import base64
import numpy as np
import cv2
from sqlalchemy.orm import Session

from app.services.dataset_service import run_face_capture
from app.database.database import get_db
from app.models.student import Student

router = APIRouter(
    prefix="/api/dataset",
    tags=["Dataset"]
)

class CaptureRequest(BaseModel):
    student_name: str

@router.post("/capture", response_model=Dict[str, Any])
def capture_dataset(request: CaptureRequest):
    """
    Trigger the internal hardware UI to capture 100 face vectors natively.
    This routes OpenCV synchronously to the local terminal/desktop.
    """
    student_name_clean = request.student_name.strip()
    if not student_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student name cannot be empty."
        )

    try:
        # Blocks and opens the OpenCV live window on the host hardware
        captured_count = run_face_capture(student_name_clean)
        
        return {
            "success": True,
            "message": f"Successfully finished capturing dataset for {student_name_clean}",
            "images_captured": captured_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

# Add project root for directory resolution
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class FrameUploadRequest(BaseModel):
    student_id: int
    image_data: str # base64
    frame_number: int

@router.post("/upload-frame")
def upload_frame(request: FrameUploadRequest, db: Session = Depends(get_db)):
    """
    Receives a single frame from the browser and saves it to the student's dataset.
    """
    # 1. Verify student
    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Setup directory using Student ID for robust synchronization
    dataset_dir = os.path.join(base_dir, "dataset", str(student.id))
    os.makedirs(dataset_dir, exist_ok=True)

    # 3. Decode image
    try:
        if "," in request.image_data:
            _, encoded = request.image_data.split(",", 1)
        else:
            encoded = request.image_data
            
        image_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid frame data")

        # 4. Save frame
        # Using student.name for filename clarity but student.id for folder structure
        clean_name = student.name.replace(" ", "_").lower()
        file_path = os.path.join(dataset_dir, f"{clean_name}_{request.frame_number}.jpg")
        cv2.imwrite(file_path, frame)

        return {"status": "success", "file": file_path}

        return {"status": "success", "file": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
