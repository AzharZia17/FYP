from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "staff"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(UserLogin):
    name: str
    role: Optional[str] = "staff"

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Student Schemas
class StudentBase(BaseModel):
    name: str
    roll_number: str
    department: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    date: date
    time: datetime
    status: str
    confidence: float
    student: Optional[StudentBase] = None

    class Config:
        from_attributes = True
