from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import datetime, date
from typing import List, Optional
import json

from app.database.database import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.utils.schemas import AttendanceResponse

router = APIRouter(
    prefix="/api/attendance",
    tags=["Attendance"]
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Handle stale connections
                continue

manager = ConnectionManager()


class AttendanceMarkRequest(BaseModel):
    student_id: int
    confidence: float

class BatchMarkRequest(BaseModel):
    records: List[AttendanceMarkRequest]

@router.post("/mark", status_code=status.HTTP_201_CREATED)
async def mark_attendance(request: AttendanceMarkRequest, db: Session = Depends(get_db)):
    """
    Marks attendance automatically. 
    Checks for duplication. Determines Present or Late status.
    """
    # Verify student exists
    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    today = date.today()
    
    # Check for duplication
    existing_record = db.query(Attendance).filter(
        Attendance.student_id == request.student_id,
        Attendance.date == today
    ).first()
    
    if existing_record:
        # 200 OK since it's not actually an error but we don't need to insert
        return {"status": "skipped", "message": f"Attendance already marked for {student.name} today."}

    current_time = datetime.now()
    threshold_time = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
    calculated_status = "present" if current_time <= threshold_time else "late"

    try:
        new_attendance = Attendance(
            student_id=request.student_id,
            date=today,
            time=current_time,
            status=calculated_status,
            confidence=request.confidence
        )
        db.add(new_attendance)
        db.commit()
        db.refresh(new_attendance)

        # Real-time Broadcast
        try:
            broadcast_data = {
                "type": "NEW_ATTENDANCE",
                "data": {
                    "id": new_attendance.id,
                    "student_id": new_attendance.student_id,
                    "date": str(new_attendance.date),
                    "time": new_attendance.time.isoformat(),
                    "status": new_attendance.status,
                    "confidence": new_attendance.confidence,
                    "student": {
                        "name": student.name,
                        "roll_number": student.roll_number,
                        "department": student.department
                    }
                }
            }
            await manager.broadcast(json.dumps(broadcast_data))
        except Exception as e:
            print(f"Failed to broadcast live update: {e}")

        return {
            "status": "success", 
            "message": f"Successfully marked {student.name} as {calculated_status}.",
            "attendance_status": calculated_status
        }
    except IntegrityError:
        db.rollback()
        return {
            "status": "skipped", 
            "message": "Constraint caught duplicate.",
            "attendance_status": "already_marked"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log attendance: {str(e)}")

@router.post("/mark-batch")
async def mark_attendance_batch(request: BatchMarkRequest, db: Session = Depends(get_db)):
    """
    Experimental: Marks multiple attendance records at once.
    Reduces HTTP overhead for high-traffic recognition frames.
    """
    results = []
    today = date.today()
    current_time = datetime.now()
    threshold_time = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
    
    for item in request.records:
        student = db.query(Student).filter(Student.id == item.student_id).first()
        if not student:
            results.append({"student_id": item.student_id, "status": "not_found"})
            continue

        existing = db.query(Attendance).filter(
            Attendance.student_id == item.student_id,
            Attendance.date == today
        ).first()
        
        if existing:
            results.append({"student_id": item.student_id, "status": "skipped"})
            continue

        calculated_status = "present" if current_time <= threshold_time else "late"
        
        try:
            new_att = Attendance(
                student_id=item.student_id,
                date=today,
                time=current_time,
                status=calculated_status,
                confidence=item.confidence
            )
            db.add(new_att)
            db.commit()
            db.refresh(new_att)
            
            # Individual broadcast for now to keep frontend simple (or can batch)
            broadcast_data = {
                "type": "NEW_ATTENDANCE",
                "data": {
                    "id": new_att.id,
                    "student_id": new_att.student_id,
                    "date": str(new_att.date),
                    "time": new_att.time.isoformat(),
                    "status": new_att.status,
                    "confidence": new_att.confidence,
                    "student": {
                        "name": student.name,
                        "roll_number": student.roll_number,
                        "department": student.department
                    }
                }
            }
            await manager.broadcast(json.dumps(broadcast_data))
            results.append({"student_id": item.student_id, "status": "success"})
        except Exception as e:
            db.rollback()
            results.append({"student_id": item.student_id, "status": "error", "message": str(e)})

    return {"status": "completed", "results": results}

@router.get("/logs", response_model=List[AttendanceResponse])
def get_attendance_logs(
    date: Optional[date] = None, 
    student_id: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    """
    Fetch and filter attendance logs from the database.
    """
    query = db.query(Attendance)
    
    if date:
        query = query.filter(Attendance.date == date)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
        
    # Order by most recent logs first
    return query.order_by(Attendance.time.desc()).all()

@router.websocket("/ws")
async def attendance_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time attendance updates.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


