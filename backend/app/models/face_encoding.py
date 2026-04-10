from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    
    # Store the 128-dimensional face encoding vector as a PostgreSQL JSON
    encoding = Column(JSON, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Student
    student = relationship("Student", back_populates="face_encodings")
