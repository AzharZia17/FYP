from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default="pending")  # sent, pending
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationship to User
    user = relationship("User", back_populates="notifications")
