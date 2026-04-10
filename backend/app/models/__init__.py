# Import all models here to ensure they are registered with SQLAlchemy's metadata
# This allows Base.metadata.create_all() to discover them.
from app.models.user import User
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.face_encoding import FaceEncoding
from app.models.log import Log
from app.models.camera import Camera
from app.models.notification import Notification
from app.models.report import Report

__all__ = ["User", "Student", "Attendance", "FaceEncoding", "Log", "Camera", "Notification", "Report"]
