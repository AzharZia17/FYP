from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="staff")  # Role can be 'admin' or 'staff'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Notifications
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
