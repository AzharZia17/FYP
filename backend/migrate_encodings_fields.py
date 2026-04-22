import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load database settings from .env
load_dotenv()

user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
db_name = os.getenv("POSTGRES_DB")
host = os.getenv("POSTGRES_HOST")
port = os.getenv("POSTGRES_PORT")

# Construct Connection String
DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
engine = create_engine(DATABASE_URL)

def migrate():
    """
    Safely adds 'image_name' column to the 'face_encodings' table.
    """
    print(f"--- DATABASE MIGRATION START (Face Encodings) ---")
    print(f"Target Database: {db_name}")
    
    with engine.connect() as conn:
        try:
            # Add image_name column
            print("Adding 'image_name' column to 'face_encodings'...")
            conn.execute(text("ALTER TABLE face_encodings ADD COLUMN IF NOT EXISTS image_name VARCHAR"))
            
            # Commit the changes
            conn.commit()
            print("\nSUCCESS: Migration completed successfully.")
            print("Column 'image_name' (VARCHAR) is now available in 'face_encodings' table.")
            
        except Exception as e:
            print(f"\nFATAL ERROR during migration: {str(e)}")
            print("Rollback performed automatically by SQLAlchemy.")

if __name__ == "__main__":
    migrate()
