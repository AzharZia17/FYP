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
    Safely adds 'semester' and 'section' columns to the 'students' table.
    Uses 'IF NOT EXISTS' to prevent errors on repeated runs.
    """
    print(f"--- DATABASE MIGRATION START ---")
    print(f"Target Database: {db_name}")
    print(f"Connection: {host}:{port}")
    
    with engine.connect() as conn:
        try:
            # 1. Add semester column (Default to 1st semester)
            print("Adding 'semester' column...")
            conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS semester INTEGER DEFAULT 1"))
            
            # 2. Add section column (Default to section 'A')
            print("Adding 'section' column...")
            conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS section VARCHAR DEFAULT 'A'"))
            
            # Commit the changes (Required for non-autocommit drivers)
            conn.commit()
            print("\nSUCCESS: Migration completed successfully.")
            print("Columns 'semester' (INT) and 'section' (VARCHAR) are now available.")
            
        except Exception as e:
            print(f"\nFATAL ERROR during migration: {str(e)}")
            print("Rollback performed automatically by SQLAlchemy.")

if __name__ == "__main__":
    migrate()
