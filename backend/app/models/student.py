from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    roll_number = Column(String, unique=True, index=True)
    department = Column(String, nullable=True) # Supported academic category
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Attendance
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    
    # Relationship to Face Encodings (One student can have multiple encodings)
    face_encodings = relationship("FaceEncoding", back_populates="student", cascade="all, delete-orphan")
