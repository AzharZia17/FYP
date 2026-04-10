import logging
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.database import get_db, engine, Base
from app.routes import auth, dataset, attendance, dashboard, students, recognition
from app.models import User, Student, Attendance, FaceEncoding, Log, Camera, Notification, Report  # Import all models for Base.metadata.create_all

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/app.log")
    ]
)

logger = logging.getLogger("smart_attendance")

# Create database tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {str(e)}")

app = FastAPI(
    title="Smart Attendance System API",
    description="API for the Smart Attendance System backend using FastAPI.",
    version="1.0.0"
)

# CORS Middleware Setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000", # Common for React
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(dataset.router)
app.include_router(attendance.router)
app.include_router(dashboard.router)
app.include_router(students.router)
app.include_router(recognition.router)

from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled Exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal server error occurred.", "detail": str(exc)},
    )

@app.get("/health", tags=["Utilities"])
async def health_check():
    """
    Health check route to confirm the API is running correctly.
    """
    logger.info("Health check endpoint accessed.")
    return {"status": "ok", "message": "API is running"}

@app.get("/db-test", tags=["Utilities"])
async def test_db_connection(db: Session = Depends(get_db)):
    """
    Test the database connection by executing a simple query.
    """
    try:
        # Execute a simple query (SELECT 1) to check connectivity
        db.execute(text("SELECT 1"))
        logger.info("Database connection test successful.")
        return {"status": "ok", "message": "Database connection is working!"}
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database connection failed. Ensure .env is configured correctly. Error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
