from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta, datetime
from typing import List, Dict, Any

from app.database.database import get_db
from app.models.student import Student
from app.models.attendance import Attendance

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Aggregation engine for Dashboard Analytics.
    Calculates students counts, daily participation, and historical trends.
    """
    today = date.today()
    
    # 1. High-Level Summary
    total_students = db.query(Student).count()
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    
    present = len([r for r in today_records if r.status == "present"])
    late = len([r for r in today_records if r.status == "late"])
    # Logic: anyone not present or late is considered absent for the day
    absent = max(0, total_students - (present + late))
    
    participation_rate = (len(today_records) / total_students * 100) if total_students > 0 else 0

    # 2. Recent Attendance Activity (Last 10 records)
    # Join with Student to get names efficiently
    recent_activity = db.query(Attendance).join(Student).order_by(Attendance.time.desc()).limit(10).all()
    recent_list = []
    for r in recent_activity:
        recent_list.append({
            "name": r.student.name,
            "time": r.time.isoformat() if r.time else None,
            "status": r.status
        })

    # 3. Weekly Attendance Trends (Mon-Sat)
    # Reference the start of the relative week
    start_of_week = today - timedelta(days=today.weekday())
    weekly_trend = []
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    for i in range(6): # Mon to Sat
        target_day = start_of_week + timedelta(days=i)
        # We count unique student entries for each day
        count = db.query(Attendance).filter(Attendance.date == target_day).count()
        weekly_trend.append({
            "day": day_labels[i],
            "count": count
        })

    # 4. Pie Chart Composition Data
    distribution = [
        {"name": "Present", "value": present},
        {"name": "Late", "value": late},
        {"name": "Absent", "value": absent}
    ]

    return {
        "stats": {
            "total_students": total_students,
            "present_today": present,
            "late_today": late,
            "absent_today": absent,
            "attendance_percentage": f"{round(participation_rate, 1)}%"
        },
        "recent_activity": recent_list,
        "weekly_trend": weekly_trend,
        "distribution": distribution
    }

@router.get("/department-stats")
def get_department_stats(db: Session = Depends(get_db)):
    """
    Returns statistics grouped by department.
    """
    results = []
    departments = db.query(Student.department).distinct().all()
    today = date.today()
    
    for (dept,) in departments:
        if not dept: continue
        
        total = db.query(Student).filter(Student.department == dept).count()
        today_att = db.query(Attendance).join(Student).filter(
            Student.department == dept, 
            Attendance.date == today
        ).count()
        
        results.append({
            "department": dept,
            "total": total,
            "present": today_att,
            "absent": max(0, total - today_att)
        })
    
    return results

@router.get("/semester-stats")
def get_semester_stats(department: str, db: Session = Depends(get_db)):
    """
    Returns statistics grouped by semester for a specific department.
    """
    results = []
    today = date.today()
    
    for sem in range(1, 9):
        total = db.query(Student).filter(
            Student.department == department,
            Student.semester == sem
        ).count()
        
        if total == 0: continue
        
        today_att = db.query(Attendance).join(Student).filter(
            Student.department == department,
            Student.semester == sem,
            Attendance.date == today
        ).count()
        
        results.append({
            "semester": sem,
            "total": total,
            "present": today_att,
            "absent": max(0, total - today_att)
        })
        
    return results
