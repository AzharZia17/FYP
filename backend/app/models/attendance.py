from sqlalchemy import Column, Integer, String, Date, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)  # Date only (YYYY-MM-DD)
    time = Column(DateTime(timezone=True), nullable=False)  # Timestamp of exact log
    status = Column(String, default="present")  # present, late, absent
    confidence = Column(Float, nullable=False)  # Confidence score of facial recognition
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Constraints: Prevent duplicate attendance for the same student on the same day
    __table_args__ = (
        UniqueConstraint('student_id', 'date', name='uq_student_date'),
    )

    # Relationship to Student
    student = relationship("Student", back_populates="attendances")
