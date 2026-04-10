from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date

from app.database.database import get_db
from app.models.student import Student
from app.models.attendance import Attendance

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns dynamically aggregated metrics for the admin dashboard UI.
    """
    today = date.today()
    
    try:
        # Dynamic Query Aggregation
        total_students = db.query(Student).count()
        today_attendance = db.query(Attendance).filter(Attendance.date == today).count()
        present_count = db.query(Attendance).filter(Attendance.date == today, Attendance.status == "present").count()
        late_count = db.query(Attendance).filter(Attendance.date == today, Attendance.status == "late").count()
        
        return {
            "status": "success",
            "data": {
                "total_students": total_students,
                "today_attendance": today_attendance,
                "present_count": present_count,
                "late_count": late_count
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to aggregate comprehensive metrics: {str(e)}"
        )
