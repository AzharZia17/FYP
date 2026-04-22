from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.database.database import get_db
from app.models.student import Student
from app.utils.schemas import StudentCreate, StudentUpdate, StudentResponse

router = APIRouter(
    prefix="/api/students",
    tags=["Students"]
)

@router.get("/", response_model=List[StudentResponse])
def get_students(
    department: Optional[str] = None,
    semester: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Fetch all student records from the database with optional categorization filters.
    """
    query = db.query(Student)
    if department:
        query = query.filter(Student.department == department)
    if semester:
        query = query.filter(Student.semester == semester)
    
    return query.all()

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single student by their internal ID.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    """
    Create a new student record with department, semester, and section.
    """
    # Check if roll number already exists
    existing = db.query(Student).filter(Student.roll_number == student_data.roll_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student with this ID/Roll Number already exists.")
    
    new_student = Student(
        name=student_data.name,
        roll_number=student_data.roll_number,
        department=student_data.department,
        semester=student_data.semester,
        section=student_data.section
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, student_data: StudentUpdate, db: Session = Depends(get_db)):
    """
    Update details of an existing student.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Update fields if provided
    if student_data.name is not None:
        student.name = student_data.name
    if student_data.department is not None:
        student.department = student_data.department
    if student_data.semester is not None:
        student.semester = student_data.semester
    if student_data.section is not None:
        student.section = student_data.section
        
    if student_data.roll_number is not None:
        # Check uniqueness if roll number is changing
        if student_data.roll_number != student.roll_number:
            existing = db.query(Student).filter(Student.roll_number == student_data.roll_number).first()
            if existing:
                raise HTTPException(status_code=400, detail="New Roll Number is already assigned to another student.")
        student.roll_number = student_data.roll_number

    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    """
    Permanently delete a student and their associated data (cascade).
    Also cleans up the visual dataset on disk.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # 1. Calculate dataset directory for cleanup
    # Matches the structure used in upload-frame
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dataset_path = os.path.join(base_dir, "dataset", str(student.id))

    try:
        # 2. Database deletion (Cascade handles Logs/Attendance)
        db.delete(student)
        db.commit()

        # 3. Filesystem cleanup
        import shutil
        if os.path.exists(dataset_path):
            shutil.rmtree(dataset_path)
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")

    return None
